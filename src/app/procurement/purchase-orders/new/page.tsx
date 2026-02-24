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

interface InventoryMaterialRequisition {
  id: string;
  externalId: string;
  requisitionNumber?: string | null;
  status: string;
  departmentExternalId?: string | null;
  departmentName?: string | null;
  projectExternalId?: string | null;
  projectName?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  rawPayload?: any;
}

interface POFormData {
  // Step 1: PR Selection & Vendor
  sourceType: 'PR' | 'MR';
  prId?: string;
  sourceMaterialRequisitionId?: string;
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
    itemCode?: string;
    inventoryItemId?: string;
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
  const [materialRequisitions, setMaterialRequisitions] = useState<InventoryMaterialRequisition[]>([]);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
  const [selectedMR, setSelectedMR] = useState<InventoryMaterialRequisition | null>(null);
  const [searchVendor, setSearchVendor] = useState('');
  const [winningVendorId, setWinningVendorId] = useState<string | null>(null);
  const [rfqData, setRfqData] = useState<any>(null);

  const [formData, setFormData] = useState<POFormData>({
    sourceType: 'PR',
    prId: prId || '',
    sourceMaterialRequisitionId: '',
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
    fetchMaterialRequisitions();
    if (prId) {
      fetchPRDetails(prId);
    }
    // Check for both RFQ and RFP
    if (rfqId) {
      fetchRFQDetails(rfqId);
    }
    const rfpId = searchParams.get('rfpId');
    if (rfpId) {
      fetchRFPDetails(rfpId);
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

  const fetchMaterialRequisitions = async () => {
    try {
      const response = await fetch('/api/inventory/material-requisitions?limit=100');
      const data = await response.json();
      if (response.ok) {
        setMaterialRequisitions(Array.isArray(data.data) ? data.data : []);
      }

      // Keep list synced from inventory in background
      void fetch('/api/inventory/material-requisitions/sync', { method: 'POST' })
        .then(async (syncRes) => {
          if (!syncRes.ok) return;
          const refetch = await fetch('/api/inventory/material-requisitions?limit=100');
          if (!refetch.ok) return;
          const refetchedData = await refetch.json();
          setMaterialRequisitions(Array.isArray(refetchedData.data) ? refetchedData.data : []);
        })
        .catch(() => {
          // no-op
        });
    } catch (error) {
      console.error('Error fetching material requisitions:', error);
    }
  };

  const fetchRFPDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/services/rfp/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRfqData(data); // Reuse rfqData state for display purposes
        
        // Find the selected/winning vendor
        const winningResponse = data.responses?.find((r: any) => r.status === 'SELECTED');
        if (winningResponse) {
          const winnerId = winningResponse.vendor.id;
          setWinningVendorId(winnerId);
          setFormData(prev => ({ ...prev, vendorId: winnerId }));
          
          // Also set the PR ID if not already set
          if (data.prId && !formData.prId) {
            setFormData(prev => ({ ...prev, prId: data.prId }));
            fetchPRDetails(data.prId);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching RFP details:', error);
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
          sourceType: 'PR',
          prId: id,
          sourceMaterialRequisitionId: '',
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
      // First check for RFQ
      let response = await fetch(`/api/rfq?prId=${prId}`);
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
            return;
          }
        }
      }

      // Then check for RFP (Service RFP)
      response = await fetch(`/api/services/rfp?prId=${prId}`);
      if (response.ok) {
        const data = await response.json();
        // Find RFP with AWARDED status and SELECTED response
        const awardedRFP = data.rfps?.find((rfp: any) => 
          rfp.status === 'AWARDED' && 
          rfp.responses?.some((r: any) => r.status === 'SELECTED')
        );
        
        if (awardedRFP) {
          const winningResponse = awardedRFP.responses.find((r: any) => r.status === 'SELECTED');
          if (winningResponse) {
            setRfqData(awardedRFP);
            const winnerId = winningResponse.vendor.id;
            setWinningVendorId(winnerId);
            setFormData(prev => ({ ...prev, vendorId: winnerId }));
            showToast('info', `Winning vendor from RFP ${awardedRFP.rfpNumber} has been pre-selected`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking RFQ/RFP for PR:', error);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (formData.sourceType === 'PR') {
        if (!formData.prId) newErrors.prId = 'Purchase requisition is required';
      } else {
        if (!formData.sourceMaterialRequisitionId) {
          newErrors.sourceMaterialRequisitionId = 'Material requisition is required';
        }
      }
      if (!formData.vendorId) newErrors.vendorId = 'Vendor is required';
    }

    if (step === 2) {
      if (!formData.deliveryDate) {
        newErrors.deliveryDate = 'Delivery date is required';
      } else {
        // Validate date format and range
        const selectedDate = new Date(formData.deliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if date is valid
        if (isNaN(selectedDate.getTime())) {
          newErrors.deliveryDate = 'Please enter a valid date';
        } else {
          // Check if year is before 1900
          if (selectedDate.getFullYear() < 1900) {
            newErrors.deliveryDate = 'Date cannot be before year 1900';
          }
          // Check if date is in the past
          else if (selectedDate < today) {
            newErrors.deliveryDate = 'Delivery date cannot be in the past';
          }
          // Check if date is more than 10 years in the future
          else {
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() + 10);
            if (selectedDate > maxDate) {
              newErrors.deliveryDate = 'Delivery date cannot be more than 10 years in the future';
            }
          }
        }
      }
      
      // Only validate delivery address for goods, not services
      if (selectedPR?.itemType !== 'SERVICE') {
        if (!formData.deliveryAddress.building || !formData.deliveryAddress.building.trim()) {
          newErrors.building = 'Building is required';
        }
        if (!formData.deliveryAddress.street || !formData.deliveryAddress.street.trim()) {
          newErrors.street = 'Street is required';
        }
        if (!formData.deliveryAddress.postalCode || !formData.deliveryAddress.postalCode.trim()) {
          newErrors.postalCode = 'Postal code is required';
        }
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
    setSelectedMR(null);
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
      sourceType: 'PR',
      prId: pr.id,
      sourceMaterialRequisitionId: '',
      items: items
    }));
    
    // Check if this PR has an RFQ with a selected winner
    await checkRFQForPR(pr.id);
  };

  const handleMRSelection = (mr: InventoryMaterialRequisition) => {
    setSelectedMR(mr);
    setSelectedPR(null);
    setWinningVendorId(null);
    setRfqData(null);

    const raw = mr.rawPayload || {};
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const mappedItems = rawItems.map((item: any) => {
      const quantity = Number(item?.quantity ?? item?.requestedQuantity ?? 0) || 0;
      const unitPrice = Number(item?.unitPrice ?? item?.estimatedUnitCost ?? item?.estimatedPrice ?? 0) || 0;
      const inventoryItemId =
        typeof item?.itemId === 'string'
          ? item.itemId
          : typeof item?.inventoryItemId === 'string'
            ? item.inventoryItemId
            : '';
      const itemCode =
        typeof item?.itemCode === 'string'
          ? item.itemCode
          : typeof item?.code === 'string'
            ? item.code
            : '';

      return {
        itemId: inventoryItemId || itemCode || '',
        inventoryItemId: inventoryItemId || undefined,
        itemCode: itemCode || undefined,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
      };
    }).filter((item: any) => item.quantity > 0);

    setFormData((prev) => ({
      ...prev,
      sourceType: 'MR',
      prId: '',
      sourceMaterialRequisitionId: mr.id,
      items: mappedItems,
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

      // For service requisitions, redirect to service contract creation
      if (formData.sourceType === 'PR' && selectedPR?.itemType === 'SERVICE') {
        router.push(`/procurement/services/contracts/new?prId=${formData.prId}`);
        return;
      }

      // Get current user ID
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const createdBy = userData.employeeId || userData.id || '';

      const submitData = {
        prId: formData.sourceType === 'PR' ? formData.prId : null,
        sourceMaterialRequisitionId:
          formData.sourceType === 'MR' ? formData.sourceMaterialRequisitionId : null,
        vendorId: formData.vendorId,
        deliveryDate: formData.deliveryDate,
        deliveryAddress: formData.deliveryAddress,
        paymentTerms: formData.paymentTerms,
        currency: formData.currency,
        status: 'DRAFT',
        items: formData.items,
        createdBy: createdBy,
        sourceDepartmentId: selectedMR?.departmentExternalId || null,
        sourceDepartmentName: selectedMR?.departmentName || null,
        sourceProjectId: selectedMR?.projectExternalId || null,
        sourceProjectName: selectedMR?.projectName || null,
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
          Create a purchase order from an approved requisition or synced material requisition
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
                <button
                  type="button"
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  className="relative flex flex-col items-center w-full"
                  disabled={step.id > currentStep}
                >
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    step.id < currentStep 
                      ? 'bg-wujha-primary border-wujha-primary scale-110 cursor-pointer hover:scale-115' 
                      : step.id === currentStep 
                        ? 'border-wujha-primary bg-white shadow-lg' 
                        : 'border-gray-300 bg-white'
                  } ${step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
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
                </button>
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
              <h3 className="text-lg font-medium text-gray-900">Select Source & Vendor</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Source Type *
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMR(null);
                      setFormData((prev) => ({
                        ...prev,
                        sourceType: 'PR',
                        sourceMaterialRequisitionId: '',
                      }));
                    }}
                    className={`rounded-lg border px-4 py-3 text-left ${
                      formData.sourceType === 'PR'
                        ? 'border-wujha-primary bg-wujha-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">Purchase Requisition</p>
                    <p className="mt-1 text-xs text-gray-600">Create PO from approved PR</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        sourceType: 'MR',
                        prId: '',
                      }));
                      setSelectedPR(null);
                    }}
                    className={`rounded-lg border px-4 py-3 text-left ${
                      formData.sourceType === 'MR'
                        ? 'border-wujha-primary bg-wujha-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">Material Requisition</p>
                    <p className="mt-1 text-xs text-gray-600">Create PO from synced Inventory MR</p>
                  </button>
                </div>
              </div>
              
              {/* PR Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {formData.sourceType === 'PR' ? 'Purchase Requisition *' : 'Material Requisition *'}
                </label>
                {formData.sourceType === 'PR' && prId ? (
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
                ) : formData.sourceType === 'PR' ? (
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
                ) : (
                  <div className="space-y-3">
                    {materialRequisitions.map((mr) => (
                      <div
                        key={mr.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          formData.sourceMaterialRequisitionId === mr.id
                            ? 'border-wujha-primary bg-wujha-primary/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleMRSelection(mr)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {mr.requisitionNumber || 'MR'} ({mr.externalId})
                            </h4>
                            <p className="text-sm text-gray-500">
                              {mr.requesterName || mr.requesterEmail || 'N/A'} • {mr.projectName || 'No project'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {mr.departmentName || mr.departmentExternalId || 'No department'} • {mr.status}
                            </p>
                          </div>
                          {formData.sourceMaterialRequisitionId === mr.id && (
                            <CheckCircle className="h-5 w-5 text-wujha-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                    {materialRequisitions.length === 0 && (
                      <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
                        No synced material requisitions found.
                      </div>
                    )}
                  </div>
                )}
                {(errors.prId || errors.sourceMaterialRequisitionId) && (
                  <p className="mt-1 text-sm text-red-600">{errors.prId || errors.sourceMaterialRequisitionId}</p>
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white ${
                      errors.deliveryDate ? 'border-red-300 ring-red-100' : ''
                    }`}
                    value={formData.deliveryDate}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setFormData(prev => ({ ...prev, deliveryDate: inputValue }));
                      
                      // Real-time validation
                      if (inputValue) {
                        const selectedDate = new Date(inputValue);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        // Check if date is valid
                        if (isNaN(selectedDate.getTime())) {
                          setErrors(prev => ({ ...prev, deliveryDate: 'Please enter a valid date' }));
                        } else {
                          // Check if year is before 1900
                          if (selectedDate.getFullYear() < 1900) {
                            setErrors(prev => ({ ...prev, deliveryDate: 'Date cannot be before year 1900' }));
                          }
                          // Check if date is in the past
                          else if (selectedDate < today) {
                            setErrors(prev => ({ ...prev, deliveryDate: 'Delivery date cannot be in the past' }));
                          }
                          // Check if date is more than 10 years in the future
                          else {
                            const maxDate = new Date();
                            maxDate.setFullYear(maxDate.getFullYear() + 10);
                            if (selectedDate > maxDate) {
                              setErrors(prev => ({ ...prev, deliveryDate: 'Delivery date cannot be more than 10 years in the future' }));
                            } else {
                              // Clear error if date is valid
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.deliveryDate;
                                return newErrors;
                              });
                            }
                          }
                        }
                      } else {
                        // Clear error if field is empty (will be caught by required validation)
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.deliveryDate;
                          return newErrors;
                        });
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    max={(() => {
                      const maxDate = new Date();
                      maxDate.setFullYear(maxDate.getFullYear() + 10);
                      return maxDate.toISOString().split('T')[0];
                    })()}
                  />
                  {errors.deliveryDate && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.deliveryDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Currency
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    style={{ color: '#111827' }}
                  >
                    <option value="OMR" style={{ color: '#111827' }}>Omani Rial (OMR)</option>
                    <option value="USD" style={{ color: '#111827' }}>US Dollar (USD)</option>
                    <option value="EUR" style={{ color: '#111827' }}>Euro (EUR)</option>
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
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white ${
                        errors.building ? 'border-red-300 ring-red-100' : ''
                      }`}
                      value={formData.deliveryAddress.building}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setFormData(prev => ({ 
                          ...prev, 
                          deliveryAddress: { ...prev.deliveryAddress, building: inputValue }
                        }));
                        
                        // Real-time validation: if value is only whitespace, show error
                        if (inputValue && !inputValue.trim()) {
                          setErrors(prev => ({ ...prev, building: 'Building cannot be only whitespace' }));
                        } else {
                          // Clear error when user types valid content
                          if (errors.building) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.building;
                              return newErrors;
                            });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const inputValue = e.target.value;
                        const trimmedValue = inputValue.trim();
                        
                        // If value is only whitespace, clear it and show error
                        if (inputValue && !trimmedValue) {
                          setFormData(prev => ({ 
                            ...prev, 
                            deliveryAddress: { ...prev.deliveryAddress, building: '' }
                          }));
                          setErrors(prev => ({ ...prev, building: 'Building is required' }));
                        } else if (trimmedValue !== inputValue) {
                          // Trim leading/trailing whitespace but keep the value
                          setFormData(prev => ({ 
                            ...prev, 
                            deliveryAddress: { ...prev.deliveryAddress, building: trimmedValue }
                          }));
                        }
                      }}
                      placeholder="Building name/number"
                    />
                    {errors.building && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.building}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Street *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white ${
                        errors.street ? 'border-red-300 ring-red-100' : ''
                      }`}
                      value={formData.deliveryAddress.street}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setFormData(prev => ({ 
                          ...prev, 
                          deliveryAddress: { ...prev.deliveryAddress, street: inputValue }
                        }));
                        
                        // Real-time validation: if value is only whitespace, show error
                        if (inputValue && !inputValue.trim()) {
                          setErrors(prev => ({ ...prev, street: 'Street cannot be only whitespace' }));
                        } else {
                          // Clear error when user types valid content
                          if (errors.street) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.street;
                              return newErrors;
                            });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const inputValue = e.target.value;
                        const trimmedValue = inputValue.trim();
                        
                        // If value is only whitespace, clear it and show error
                        if (inputValue && !trimmedValue) {
                          setFormData(prev => ({ 
                            ...prev, 
                            deliveryAddress: { ...prev.deliveryAddress, street: '' }
                          }));
                          setErrors(prev => ({ ...prev, street: 'Street is required' }));
                        } else if (trimmedValue !== inputValue) {
                          // Trim leading/trailing whitespace but keep the value
                          setFormData(prev => ({ 
                            ...prev, 
                            deliveryAddress: { ...prev.deliveryAddress, street: trimmedValue }
                          }));
                        }
                      }}
                      placeholder="Street name"
                    />
                    {errors.street && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.street}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
                      value={formData.deliveryAddress.governorate}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        deliveryAddress: { ...prev.deliveryAddress, governorate: e.target.value }
                      }))}
                      style={{ color: '#111827' }}
                    >
                      <option value="Muscat" style={{ color: '#111827' }}>Muscat</option>
                      <option value="Dhofar" style={{ color: '#111827' }}>Dhofar</option>
                      <option value="Al Batinah North" style={{ color: '#111827' }}>Al Batinah North</option>
                      <option value="Al Batinah South" style={{ color: '#111827' }}>Al Batinah South</option>
                      <option value="Al Sharqiyah North" style={{ color: '#111827' }}>Al Sharqiyah North</option>
                      <option value="Al Sharqiyah South" style={{ color: '#111827' }}>Al Sharqiyah South</option>
                      <option value="Ad Dakhiliyah" style={{ color: '#111827' }}>Ad Dakhiliyah</option>
                      <option value="Al Dhahirah" style={{ color: '#111827' }}>Al Dhahirah</option>
                      <option value="Al Wusta" style={{ color: '#111827' }}>Al Wusta</option>
                      <option value="Musandam" style={{ color: '#111827' }}>Musandam</option>
                      <option value="Al Buraimi" style={{ color: '#111827' }}>Al Buraimi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white ${
                        errors.postalCode ? 'border-red-300 ring-red-100' : ''
                      }`}
                      value={formData.deliveryAddress.postalCode}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setFormData(prev => ({ 
                          ...prev, 
                          deliveryAddress: { ...prev.deliveryAddress, postalCode: inputValue }
                        }));
                        
                        // Real-time validation: if value is only whitespace, show error
                        if (inputValue && !inputValue.trim()) {
                          setErrors(prev => ({ ...prev, postalCode: 'Postal code cannot be only whitespace' }));
                        } else {
                          // Clear error when user types valid content
                          if (errors.postalCode) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.postalCode;
                              return newErrors;
                            });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const inputValue = e.target.value;
                        const trimmedValue = inputValue.trim();
                        
                        // If value is only whitespace, clear it and show error
                        if (inputValue && !trimmedValue) {
                          setFormData(prev => ({ 
                            ...prev, 
                            deliveryAddress: { ...prev.deliveryAddress, postalCode: '' }
                          }));
                          setErrors(prev => ({ ...prev, postalCode: 'Postal code is required' }));
                        } else if (trimmedValue !== inputValue) {
                          // Trim leading/trailing whitespace but keep the value
                          setFormData(prev => ({ 
                            ...prev, 
                            deliveryAddress: { ...prev.deliveryAddress, postalCode: trimmedValue }
                          }));
                        }
                      }}
                      placeholder="Postal code"
                    />
                    {errors.postalCode && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.postalCode}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
                        placeholder="Where service will be performed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Service Start Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Service End Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
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
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white ${
                    errors.paymentTerms ? 'border-red-300' : ''
                  }`}
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  style={{ color: '#111827' }}
                >
                  <option value="Net 30 days" style={{ color: '#111827' }}>Net 30 days</option>
                  <option value="Net 45 days" style={{ color: '#111827' }}>Net 45 days</option>
                  <option value="Net 60 days" style={{ color: '#111827' }}>Net 60 days</option>
                  <option value="Cash on Delivery" style={{ color: '#111827' }}>Cash on Delivery</option>
                  <option value="Advance Payment" style={{ color: '#111827' }}>Advance Payment</option>
                  <option value="Letter of Credit" style={{ color: '#111827' }}>Letter of Credit</option>
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
                                {formData.sourceType === 'PR'
                                  ? selectedPR?.itemType === 'SERVICE'
                                    ? selectedPR.servicePR?.items[index]?.serviceItem?.serviceCode
                                    : selectedPR?.items[index]?.item?.itemCode
                                  : poItem.itemCode || poItem.inventoryItemId || poItem.itemId}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formData.sourceType === 'PR'
                                  ? selectedPR?.itemType === 'SERVICE'
                                    ? selectedPR.servicePR?.items[index]?.serviceItem?.nameEn
                                    : selectedPR?.items[index]?.item?.nameEn
                                  : 'Material requisition item'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {poItem.quantity} {
                                formData.sourceType === 'PR'
                                  ? selectedPR?.itemType === 'SERVICE'
                                    ? selectedPR.servicePR?.items[index]?.serviceItem?.unitOfMeasure
                                    : selectedPR?.items[index]?.item?.unitOfMeasure
                                  : 'EA'
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
                                className={`w-2/3 pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white ${
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
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
                    <dt className="text-sm font-medium text-gray-500">
                      {formData.sourceType === 'PR' ? 'Purchase Requisition' : 'Material Requisition'}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formData.sourceType === 'PR'
                        ? selectedPR?.prNumber
                        : (selectedMR?.requisitionNumber || selectedMR?.externalId)}
                    </dd>
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
                  {formData.sourceType === 'MR' ? (
                    <>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Department</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedMR?.departmentName || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Project</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedMR?.projectName || 'N/A'}</dd>
                      </div>
                    </>
                  ) : null}
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
