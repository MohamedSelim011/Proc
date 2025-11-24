'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  AlertCircle,
  CheckCircle,
  Calculator,
  FileText,
  User,
  Calendar,
  MapPin,
  CreditCard
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Vendor {
  id: string;
  vendorCode: string;
  nameEn: string;
  nameAr: string;
  email: string;
  mobile: string;
  performanceScore?: number;
  status: string;
}

interface PurchaseRequisition {
  id: string;
  prNumber: string;
  requesterId: string;
  departmentId: string;
  itemType: string;
  estimatedCost: number;
  items: Array<{
    id: string;
    quantity: number;
    estimatedPrice: number;
    item: {
      id: string;
      itemCode: string;
      nameEn: string;
      unitOfMeasure: string;
    };
  }>;
  servicePR?: {
    items: Array<{
      id: string;
      quantity: string;
      estimatedRate: string;
      duration: number;
      durationUnit: string;
      serviceItem: {
        id: string;
        serviceCode: string;
        nameEn: string;
        unitOfMeasure: string;
      };
    }>;
  };
}

interface POFormData {
  // Step 1: PR Selection & Vendor
  prId?: string;
  vendorId: string;
  
  // Step 2: PO Details
  deliveryDate: string;
  deliveryAddress: {
    building: string;
    street: string;
    city: string;
    governorate: string;
    postalCode: string;
    country: string;
  };
  paymentTerms: string;
  currency: string;
  
  // Step 3: Items & Pricing
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deliveryDate?: string;
  }>;
  
  // Step 4: Terms & Conditions
  specialConditions?: string;
  warrantyRequirements?: string;
  qualityStandards?: string;
}

function NewPurchaseOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prId = searchParams.get('prId');
  const rfqId = searchParams.get('rfqId');
  const vendorIdFromUrl = searchParams.get('vendorId');
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [approvedPRs, setApprovedPRs] = useState<PurchaseRequisition[]>([]);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
  const [searchVendor, setSearchVendor] = useState('');
  const [winningVendorId, setWinningVendorId] = useState<string | null>(null);
  const [rfqData, setRfqData] = useState<any>(null);

  const [formData, setFormData] = useState<POFormData>({
    prId: prId || '',
    vendorId: vendorIdFromUrl || '',
    deliveryDate: '',
    deliveryAddress: {
      building: '',
      street: '',
      city: 'Muscat',
      governorate: 'Muscat',
      postalCode: '',
      country: 'Oman'
    },
    paymentTerms: 'Net 30 days',
    currency: 'OMR',
    items: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchVendors();
    fetchApprovedPRs();
    if (prId) {
      fetchPRDetails(prId);
    }
    if (rfqId) {
      fetchRFQDetails(rfqId);
    }
    if (vendorIdFromUrl) {
      setWinningVendorId(vendorIdFromUrl);
      setFormData(prev => ({ ...prev, vendorId: vendorIdFromUrl }));
    }
  }, [prId, rfqId, vendorIdFromUrl]);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors?status=ACTIVE');
      const data = await response.json();
      if (response.ok) {
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchApprovedPRs = async () => {
    try {
      const response = await fetch('/api/purchase-requisitions?status=APPROVED');
      const data = await response.json();
      if (response.ok) {
        setApprovedPRs(data.requisitions || []);
      }
    } catch (error) {
      console.error('Error fetching approved PRs:', error);
    }
  };

  const fetchRFQDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/rfq/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRfqData(data.rfq);
        
        // Find the selected/winning vendor
        const winningResponse = data.rfq.responses?.find((r: any) => r.status === 'SELECTED');
        if (winningResponse) {
          const winnerId = winningResponse.vendor.id;
          setWinningVendorId(winnerId);
          setFormData(prev => ({ ...prev, vendorId: winnerId }));
          
          // Also set the PR ID if not already set
          if (data.rfq.prId && !formData.prId) {
            setFormData(prev => ({ ...prev, prId: data.rfq.prId }));
            fetchPRDetails(data.rfq.prId);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching RFQ details:', error);
    }
  };

  const fetchPRDetails = async (id: string) => {
    try {
      // First try to fetch as a service requisition
      let response = await fetch(`/api/services/requisitions/${id}`);
      let data = await response.json();
      
      if (!response.ok) {
        // If not found, try as a regular purchase requisition
        response = await fetch(`/api/purchase-requisitions/${id}`);
        data = await response.json();
      }
      
      if (response.ok) {
        setSelectedPR(data);
        
        let items = [];
        if (data.itemType === 'SERVICE' && data.servicePR?.items) {
          // Handle service items
          items = data.servicePR.items.map((item: any) => ({
            itemId: item.serviceItem.id,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.estimatedRate),
            totalPrice: parseFloat(item.quantity) * parseFloat(item.estimatedRate) * (item.duration || 1)
          }));
        } else {
          // Handle goods items
          items = data.items.map((item: any) => ({
            itemId: item.item.id,
            quantity: item.quantity,
            unitPrice: Number(item.estimatedPrice),
            totalPrice: item.quantity * Number(item.estimatedPrice)
          }));
        }
        
        setFormData(prev => ({
          ...prev,
          prId: id,
          items: items
        }));
        
        // Check if this PR has an RFQ with a selected winner
        await checkRFQForPR(id);
      }
    } catch (error) {
      console.error('Error fetching PR details:', error);
    }
  };

  const checkRFQForPR = async (prId: string) => {
    try {
      // Fetch RFQs for this PR
      const response = await fetch(`/api/rfq?prId=${prId}`);
      if (response.ok) {
        const data = await response.json();
        // Find RFQ with AWARDED status and SELECTED response
        const awardedRFQ = data.rfqs?.find((rfq: any) => 
          rfq.status === 'AWARDED' && 
          rfq.responses?.some((r: any) => r.status === 'SELECTED')
        );
        
        if (awardedRFQ) {
          const winningResponse = awardedRFQ.responses.find((r: any) => r.status === 'SELECTED');
          if (winningResponse) {
            setRfqData(awardedRFQ);
            const winnerId = winningResponse.vendor.id;
            setWinningVendorId(winnerId);
            setFormData(prev => ({ ...prev, vendorId: winnerId }));
            showToast('info', `Winning vendor from RFQ ${awardedRFQ.rfqNumber} has been pre-selected`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking RFQ for PR:', error);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.prId) newErrors.prId = 'Purchase requisition is required';
      if (!formData.vendorId) newErrors.vendorId = 'Vendor is required';
    }

    if (step === 2) {
      if (!formData.deliveryDate) newErrors.deliveryDate = 'Delivery date is required';
      
      // Only validate delivery address for goods, not services
      if (selectedPR?.itemType !== 'SERVICE') {
        if (!formData.deliveryAddress.building) newErrors.building = 'Building is required';
        if (!formData.deliveryAddress.street) newErrors.street = 'Street is required';
        if (!formData.deliveryAddress.postalCode) newErrors.postalCode = 'Postal code is required';
      }
      
      if (!formData.paymentTerms) newErrors.paymentTerms = 'Payment terms are required';
    }

    if (step === 3) {
      if (formData.items.length === 0) {
        newErrors.items = 'At least one item is required';
      } else {
        formData.items.forEach((item, index) => {
          if (!item.unitPrice || item.unitPrice <= 0) {
            newErrors[`item_${index}_price`] = 'Valid unit price is required';
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 4) {
        handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handlePRSelection = async (pr: PurchaseRequisition) => {
    setSelectedPR(pr);
    console.log('Selected PR:', pr);
    
    let items = [];
    if (pr.itemType === 'SERVICE' && pr.servicePR?.items) {
      // Handle service items
      items = pr.servicePR.items.map(item => ({
        itemId: item.serviceItem.id,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.estimatedRate),
        totalPrice: parseFloat(item.quantity) * parseFloat(item.estimatedRate) * (item.duration || 1)
      }));
      console.log('Service items mapped:', items);
    } else {
      // Handle goods items
      items = pr.items.map(item => ({
        itemId: item.item.id,
        quantity: item.quantity,
        unitPrice: Number(item.estimatedPrice),
        totalPrice: item.quantity * Number(item.estimatedPrice)
      }));
      console.log('Goods items mapped:', items);
    }
    
    setFormData(prev => ({
      ...prev,
      prId: pr.id,
      items: items
    }));
    
    // Check if this PR has an RFQ with a selected winner
    await checkRFQForPR(pr.id);
  };

  const updateItemPrice = (index: number, unitPrice: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index 
          ? { 
              ...item, 
              unitPrice, 
              totalPrice: item.quantity * unitPrice 
            } 
          : item
      )
    }));
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce((total, item) => total + item.totalPrice, 0);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // For service requisitions, redirect to service contract creation
      if (selectedPR?.itemType === 'SERVICE') {
        router.push(`/procurement/services/contracts/new?prId=${formData.prId}`);
        return;
      }

      // Get current user ID
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const createdBy = userData.employeeId || userData.id || '';

      const submitData = {
        prId: formData.prId,
        vendorId: formData.vendorId,
        deliveryDate: formData.deliveryDate,
        deliveryAddress: formData.deliveryAddress,
        paymentTerms: formData.paymentTerms,
        currency: formData.currency,
        status: 'DRAFT',
        items: formData.items,
        createdBy: createdBy
      };

      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', 'Purchase order created successfully!');
        router.push(`/procurement/purchase-orders/${data.id}`);
      } else {
        showToast('error', data.error || 'Failed to create purchase order');
        console.error('Error creating PO:', data.error);
        setErrors({ submit: data.error || 'Failed to create purchase order' });
      }
    } catch (error) {
      showToast('error', 'An error occurred while creating the purchase order');
      console.error('Error submitting PO:', error);
      setErrors({ submit: 'Failed to create purchase order' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount);
  };

  const filteredVendors = vendors.filter(vendor => {
    // If coming from RFQ, only show the winning vendor
    if (winningVendorId) {
      return vendor.id === winningVendorId;
    }
    // Otherwise, filter by search
    return vendor.nameEn.toLowerCase().includes(searchVendor.toLowerCase()) ||
           vendor.vendorCode.toLowerCase().includes(searchVendor.toLowerCase());
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
        <p className="mt-2 text-sm text-gray-600">
          Convert approved purchase requisition to purchase order
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress" className="bg-gray-50 rounded-lg p-6">
          <ol className="flex items-center justify-between w-full max-w-6xl mx-auto">
            {[
              { id: 1, name: 'PR & Vendor', description: 'Select requisition and vendor' },
              { 
                id: 2, 
                name: selectedPR?.itemType === 'SERVICE' ? 'Service Details' : 'Delivery Details', 
                description: selectedPR?.itemType === 'SERVICE' ? 'Service and payment terms' : 'Delivery and payment terms' 
              },
              { id: 3, name: 'Items & Pricing', description: 'Confirm items and prices' },
              { id: 4, name: 'Terms & Review', description: 'Final terms and review' }
            ].map((step, stepIdx) => (
              <li key={step.id} className="relative flex-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx < 3 && (
                    <div className={`h-0.5 w-full transform -translate-y-px ${step.id < currentStep ? 'bg-wujha-primary' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="relative flex flex-col items-center">
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    step.id < currentStep 
                      ? 'bg-wujha-primary border-wujha-primary scale-110' 
                      : step.id === currentStep 
                        ? 'border-wujha-primary bg-white shadow-lg' 
                        : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}>
                    {step.id < currentStep ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <span className={`text-sm font-medium ${
                        step.id === currentStep ? 'text-wujha-primary' : 'text-gray-500'
                      }`}>
                        {step.id}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <span className={`text-sm font-medium ${
                      step.id === currentStep ? 'text-wujha-primary' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                    <p className="text-xs text-gray-500 mt-1 max-w-32 hidden sm:block">{step.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          {/* Step 1: PR & Vendor Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Select Purchase Requisition & Vendor</h3>
              
              {/* PR Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Purchase Requisition *
                </label>
                {prId ? (
                  selectedPR && (
                    <div className="bg-wujha-primary/10 border border-wujha-primary/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-wujha-primary">{selectedPR.prNumber}</h4>
                          <p className="text-sm text-gray-700">
                            {selectedPR.requesterId} • {selectedPR.departmentId}
                          </p>
                          <p className="text-sm text-gray-700">
                            {selectedPR?.items?.length} items • {formatCurrency(Number(selectedPR?.estimatedCost))}
                          </p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-wujha-primary" />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {approvedPRs.map((pr) => (
                      <div
                        key={pr.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          formData.prId === pr.id
                            ? 'border-wujha-primary bg-wujha-primary/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePRSelection(pr)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{pr.prNumber}</h4>
                            <p className="text-sm text-gray-500">
                              {pr.requesterId} • {pr.departmentId}
                            </p>
                            <p className="text-sm text-gray-500">
                              {pr.items.length} items • {formatCurrency(Number(pr.estimatedCost))}
                            </p>
                          </div>
                          {formData.prId === pr.id && (
                            <CheckCircle className="h-5 w-5 text-wujha-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.prId && (
                  <p className="mt-1 text-sm text-red-600">{errors.prId}</p>
                )}
              </div>

              {/* Vendor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Vendor *
                </label>
                
                {/* RFQ Winner Notice */}
                {winningVendorId && rfqData && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">
                          Selected Vendor from RFQ
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          This vendor was selected as the winner from RFQ {rfqData.rfqNumber}. Only this vendor can be used for this Purchase Order.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={winningVendorId ? "Winning vendor is pre-selected" : "Search vendors..."}
                      className="pl-10 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={searchVendor}
                      onChange={(e) => !winningVendorId && setSearchVendor(e.target.value)}
                      disabled={!!winningVendorId}
                    />
                  </div>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {filteredVendors.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      {winningVendorId ? 'Winning vendor not found' : 'No vendors found'}
                    </div>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className={`border rounded-lg p-4 transition-colors ${
                          winningVendorId && vendor.id === winningVendorId
                            ? 'border-green-500 bg-green-50'
                            : formData.vendorId === vendor.id
                            ? 'border-wujha-primary bg-wujha-primary/10'
                            : winningVendorId
                            ? 'border-gray-200 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!winningVendorId || vendor.id === winningVendorId) {
                            setFormData(prev => ({ ...prev, vendorId: vendor.id }));
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {vendor.vendorCode} - {vendor.nameEn}
                              </h4>
                              {winningVendorId && vendor.id === winningVendorId && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  RFQ Winner
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{vendor.email}</p>
                            {vendor.performanceScore && (
                              <p className="text-xs text-gray-400">
                                Performance: {vendor.performanceScore.toFixed(1)}/5
                              </p>
                            )}
                          </div>
                          {formData.vendorId === vendor.id && (
                            <CheckCircle className="h-5 w-5 text-wujha-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {errors.vendorId && (
                  <p className="mt-1 text-sm text-red-600">{errors.vendorId}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Delivery Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedPR?.itemType === 'SERVICE' ? 'Service & Payment Details' : 'Delivery & Payment Details'}
              </h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {selectedPR?.itemType === 'SERVICE' ? 'Service Date *' : 'Delivery Date *'}
                  </label>
                  <input
                    type="date"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      errors.deliveryDate ? 'border-red-300' : ''
                    }`}
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.deliveryDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.deliveryDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Currency
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    <option value="OMR">Omani Rial (OMR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
              </div>

              {/* Delivery Address - Only for Goods */}
              {selectedPR?.itemType !== 'SERVICE' && (
                <div>
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Delivery Address
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Building *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        errors.building ? 'border-red-300' : ''
                      }`}
                      value={formData.deliveryAddress.building}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deliveryAddress: { ...prev.deliveryAddress, building: e.target.value }
                      }))}
                      placeholder="Building name/number"
                    />
                    {errors.building && (
                      <p className="mt-1 text-sm text-red-600">{errors.building}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Street *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        errors.street ? 'border-red-300' : ''
                      }`}
                      value={formData.deliveryAddress.street}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deliveryAddress: { ...prev.deliveryAddress, street: e.target.value }
                      }))}
                      placeholder="Street name"
                    />
                    {errors.street && (
                      <p className="mt-1 text-sm text-red-600">{errors.street}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={formData.deliveryAddress.city}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deliveryAddress: { ...prev.deliveryAddress, city: e.target.value }
                      }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Governorate
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={formData.deliveryAddress.governorate}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deliveryAddress: { ...prev.deliveryAddress, governorate: e.target.value }
                      }))}
                    >
                      <option value="Muscat">Muscat</option>
                      <option value="Dhofar">Dhofar</option>
                      <option value="Al Batinah North">Al Batinah North</option>
                      <option value="Al Batinah South">Al Batinah South</option>
                      <option value="Al Sharqiyah North">Al Sharqiyah North</option>
                      <option value="Al Sharqiyah South">Al Sharqiyah South</option>
                      <option value="Ad Dakhiliyah">Ad Dakhiliyah</option>
                      <option value="Al Dhahirah">Al Dhahirah</option>
                      <option value="Al Wusta">Al Wusta</option>
                      <option value="Musandam">Musandam</option>
                      <option value="Al Buraimi">Al Buraimi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        errors.postalCode ? 'border-red-300' : ''
                      }`}
                      value={formData.deliveryAddress.postalCode}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deliveryAddress: { ...prev.deliveryAddress, postalCode: e.target.value }
                      }))}
                      placeholder="Postal code"
                    />
                    {errors.postalCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={formData.deliveryAddress.country}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deliveryAddress: { ...prev.deliveryAddress, country: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>
              )}

              {/* Service-Specific Information - Only for Services */}
              {selectedPR?.itemType === 'SERVICE' && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Service Details
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Service Location
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Where service will be performed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Service Start Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Service End Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payment Terms *
                </label>
                <select
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.paymentTerms ? 'border-red-300' : ''
                  }`}
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  <option value="Net 30 days">Net 30 days</option>
                  <option value="Net 45 days">Net 45 days</option>
                  <option value="Net 60 days">Net 60 days</option>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Advance Payment">Advance Payment</option>
                  <option value="Letter of Credit">Letter of Credit</option>
                </select>
                {errors.paymentTerms && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentTerms}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Items & Pricing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Items & Pricing</h3>
              
              {errors.items && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{errors.items}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estimated Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price *
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.items.map((poItem, index) => {
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {selectedPR?.itemType === 'SERVICE' 
                                  ? selectedPR.servicePR?.items[index]?.serviceItem?.serviceCode 
                                  : selectedPR?.items[index]?.item?.itemCode}
                              </div>
                              <div className="text-sm text-gray-500">
                                {selectedPR?.itemType === 'SERVICE' 
                                  ? selectedPR.servicePR?.items[index]?.serviceItem?.nameEn 
                                  : selectedPR?.items[index]?.item?.nameEn}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {poItem.quantity} {
                                selectedPR?.itemType === 'SERVICE' 
                                  ? selectedPR.servicePR?.items[index]?.serviceItem?.unitOfMeasure 
                                  : selectedPR?.items[index]?.item?.unitOfMeasure
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {formatCurrency(poItem.unitPrice)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none z-10">
                                {formData.currency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className={`w-2/3 pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                  errors[`item_${index}_price`] ? 'border-red-300' : ''
                                }`}
                                value={poItem?.unitPrice || 0}
                                onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            {errors[`item_${index}_price`] && (
                              <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_price`]}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(poItem?.totalPrice || 0)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        Total Amount:
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {formatCurrency(calculateTotalAmount())}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Step 4: Terms & Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Terms & Conditions</h3>
              
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Special Conditions
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    value={formData.specialConditions || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialConditions: e.target.value }))}
                    placeholder="Any special conditions or requirements..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Warranty Requirements
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    value={formData.warrantyRequirements || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, warrantyRequirements: e.target.value }))}
                    placeholder="Warranty terms and requirements..."
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Quality Standards
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    value={formData.qualityStandards || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, qualityStandards: e.target.value }))}
                    placeholder="Quality standards and inspection requirements..."
                  />
                </div>
              </div>

              {/* PO Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedPR?.itemType === 'SERVICE' ? 'Service Contract Summary' : 'Purchase Order Summary'}
                </h4>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Purchase Requisition</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedPR?.prNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {vendors.find(v => v.id === formData.vendorId)?.nameEn}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      {selectedPR?.itemType === 'SERVICE' ? 'Service Date' : 'Delivery Date'}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(formData.deliveryDate).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formData.paymentTerms}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Items</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formData.items.length}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                    <dd className="mt-1 text-lg font-bold text-gray-900">
                      {formatCurrency(calculateTotalAmount())} {formData.currency}
                    </dd>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{errors.submit}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Creating...'
            ) : currentStep === 4 ? (
              selectedPR?.itemType === 'SERVICE' ? 'Create Service Contract' : 'Create Purchase Order'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewPurchaseOrder() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    }>
      <NewPurchaseOrderContent />
    </Suspense>
  );
}
