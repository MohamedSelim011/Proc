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

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [approvedPRs, setApprovedPRs] = useState<PurchaseRequisition[]>([]);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
  const [searchVendor, setSearchVendor] = useState('');

  const [formData, setFormData] = useState<POFormData>({
    prId: prId || '',
    vendorId: '',
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
  }, [prId]);

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

  const fetchPRDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/purchase-requisitions/${id}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedPR(data);
        setFormData(prev => ({
          ...prev,
          prId: id,
          items: data.items.map((item: any) => ({
            itemId: item.item.id,
            quantity: item.quantity,
            unitPrice: Number(item.estimatedPrice),
            totalPrice: item.quantity * Number(item.estimatedPrice)
          }))
        }));
      }
    } catch (error) {
      console.error('Error fetching PR details:', error);
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
      if (!formData.deliveryAddress.building) newErrors.building = 'Building is required';
      if (!formData.deliveryAddress.street) newErrors.street = 'Street is required';
      if (!formData.deliveryAddress.postalCode) newErrors.postalCode = 'Postal code is required';
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

  const handlePRSelection = (pr: PurchaseRequisition) => {
    setSelectedPR(pr);
    setFormData(prev => ({
      ...prev,
      prId: pr.id,
      items: pr.items.map(item => ({
        itemId: item.item.id,
        quantity: item.quantity,
        unitPrice: Number(item.estimatedPrice),
        totalPrice: item.quantity * Number(item.estimatedPrice)
      }))
    }));
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

      const submitData = {
        prId: formData.prId,
        vendorId: formData.vendorId,
        deliveryDate: formData.deliveryDate,
        deliveryAddress: formData.deliveryAddress,
        paymentTerms: formData.paymentTerms,
        currency: formData.currency,
        status: 'DRAFT',
        items: formData.items
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
        router.push(`/procurement/purchase-orders/${data.id}`);
      } else {
        console.error('Error creating PO:', data.error);
        setErrors({ submit: data.error || 'Failed to create purchase order' });
      }
    } catch (error) {
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

  const filteredVendors = vendors.filter(vendor =>
    vendor.nameEn.toLowerCase().includes(searchVendor.toLowerCase()) ||
    vendor.vendorCode.toLowerCase().includes(searchVendor.toLowerCase())
  );

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
              { id: 2, name: 'Delivery Details', description: 'Delivery and payment terms' },
              { id: 3, name: 'Items & Pricing', description: 'Confirm items and prices' },
              { id: 4, name: 'Terms & Review', description: 'Final terms and review' }
            ].map((step, stepIdx) => (
              <li key={step.id} className="relative flex-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx < 3 && (
                    <div className={`h-0.5 w-full transform -translate-y-px ${step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="relative flex flex-col items-center">
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    step.id < currentStep 
                      ? 'bg-blue-600 border-blue-600 scale-110' 
                      : step.id === currentStep 
                        ? 'border-blue-600 bg-white shadow-lg' 
                        : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}>
                    {step.id < currentStep ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <span className={`text-sm font-medium ${
                        step.id === currentStep ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {step.id}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <span className={`text-sm font-medium ${
                      step.id === currentStep ? 'text-blue-600' : 'text-gray-500'
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-blue-900">{selectedPR.prNumber}</h4>
                          <p className="text-sm text-blue-700">
                            {selectedPR.requesterId} • {selectedPR.departmentId}
                          </p>
                          <p className="text-sm text-blue-700">
                            {selectedPR.items.length} items • {formatCurrency(Number(selectedPR.estimatedCost))}
                          </p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-blue-600" />
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
                            ? 'border-blue-500 bg-blue-50'
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
                            <CheckCircle className="h-5 w-5 text-blue-600" />
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
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vendors..."
                      className="pl-10 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={searchVendor}
                      onChange={(e) => setSearchVendor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {filteredVendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.vendorId === vendor.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, vendorId: vendor.id }))}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {vendor.vendorCode} - {vendor.nameEn}
                          </h4>
                          <p className="text-sm text-gray-500">{vendor.email}</p>
                          {vendor.performanceScore && (
                            <p className="text-xs text-gray-400">
                              Performance: {vendor.performanceScore.toFixed(1)}/5
                            </p>
                          )}
                        </div>
                        {formData.vendorId === vendor.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
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
              <h3 className="text-lg font-medium text-gray-900">Delivery & Payment Details</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery Date *
                  </label>
                  <input
                    type="date"
                    className={`mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
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
                    className="mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    <option value="OMR">Omani Rial (OMR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>
              </div>

              {/* Delivery Address */}
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
                      className={`mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
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
                      className={`mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
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
                      className="mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                      className="mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                      className={`mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
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
                      className="mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={formData.deliveryAddress.country}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deliveryAddress: { ...prev.deliveryAddress, country: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payment Terms *
                </label>
                <select
                  className={`block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
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
                    {selectedPR?.items.map((prItem, index) => {
                      const poItem = formData.items[index];
                      return (
                        <tr key={prItem.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {prItem.item.itemCode}
                              </div>
                              <div className="text-sm text-gray-500">{prItem.item.nameEn}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {prItem.quantity} {prItem.item.unitOfMeasure}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {formatCurrency(Number(prItem.estimatedPrice))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                {formData.currency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className={`pl-12 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm ${
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
                    className="mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    className="mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    className="mt-1 block w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    value={formData.qualityStandards || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, qualityStandards: e.target.value }))}
                    placeholder="Quality standards and inspection requirements..."
                  />
                </div>
              </div>

              {/* PO Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Purchase Order Summary</h4>
                
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
                    <dt className="text-sm font-medium text-gray-500">Delivery Date</dt>
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Creating...'
            ) : currentStep === 4 ? (
              'Create Purchase Order'
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NewPurchaseOrderContent />
    </Suspense>
  );
}
