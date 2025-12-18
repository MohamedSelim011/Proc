'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  CreditCard,
  Save,
  XCircle,
  Loader2
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

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  itemType: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
    phone?: string;
    address?: string;
  };
  pr: {
    id: string;
    prNumber: string;
    departmentId: string;
    requestor: string;
  };
  items: {
    id: string;
    item: {
      id: string;
      nameEn: string;
      itemCode: string;
      unit: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specifications?: string;
  }[];
  totalAmount: number;
  currency: string;
  orderDate: string;
  deliveryDate?: string;
  deliveryAddress?: string | {
    building: string;
    street: string;
    city: string;
    governorate: string;
    postalCode: string;
    country: string;
  };
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface POFormData {
  prId?: string;
  vendorId: string;
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
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deliveryDate?: string;
  }>;
  specialConditions?: string;
  warrantyRequirements?: string;
  qualityStandards?: string;
}

function EditPurchaseOrderContent() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const poId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [approvedPRs, setApprovedPRs] = useState<PurchaseRequisition[]>([]);
  const [searchVendor, setSearchVendor] = useState('');

  const [formData, setFormData] = useState<POFormData>({
    prId: '',
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
    if (poId) {
      fetchPurchaseOrder(poId);
      fetchVendors();
      fetchApprovedPRs();
    }
  }, [poId]);

  const fetchPurchaseOrder = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase-orders/${id}`);
      const data = await response.json();
      
      if (response.ok) {
        // Check if PO can be edited - only DRAFT status can be edited
        if (data.status !== 'DRAFT') {
          showToast('error', 'Cannot edit Purchase Order after it has been submitted for approval.');
          router.push(`/procurement/purchase-orders/${id}`);
          return;
        }
        
        setPo(data);
        // Populate form data
        setFormData({
          prId: data.prId || '',
          vendorId: data.vendorId,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString().split('T')[0] : '',
          deliveryAddress: typeof data.deliveryAddress === 'string' 
            ? {
                building: '',
                street: '',
                city: 'Muscat',
                governorate: 'Muscat',
                postalCode: '',
                country: 'Oman'
              }
            : data.deliveryAddress || {
                building: '',
                street: '',
                city: 'Muscat',
                governorate: 'Muscat',
                postalCode: '',
                country: 'Oman'
              },
          paymentTerms: data.paymentTerms || 'Net 30 days',
          currency: data.currency || 'OMR',
          items: data.items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate).toISOString().split('T')[0] : undefined
          })),
          specialConditions: data.specialConditions || '',
          warrantyRequirements: data.warrantyRequirements || '',
          qualityStandards: data.qualityStandards || ''
        });
      } else {
        console.error('Error fetching purchase order:', data.error);
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.prId) newErrors.prId = 'Purchase requisition is required';
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
      if (!formData.deliveryAddress.building || !formData.deliveryAddress.building.trim()) {
        newErrors.building = 'Building is required';
      }
      if (!formData.deliveryAddress.street || !formData.deliveryAddress.street.trim()) {
        newErrors.street = 'Street is required';
      }
      if (!formData.deliveryAddress.postalCode || !formData.deliveryAddress.postalCode.trim()) {
        newErrors.postalCode = 'Postal code is required';
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
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!validateStep(currentStep)) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast('success', 'Purchase order updated successfully');
        router.push(`/procurement/purchase-orders/${poId}`);
      } else {
        const error = await response.json();
        showToast('error', `Failed to update purchase order: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating purchase order:', error);
      showToast('error', 'Failed to update purchase order');
    } finally {
      setSaving(false);
    }
  };

  const updateItemPrice = (index: number, unitPrice: number) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      unitPrice,
      totalPrice: newItems[index].quantity * unitPrice
    };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount);
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.nameEn.toLowerCase().includes(searchVendor.toLowerCase()) ||
    vendor.vendorCode.toLowerCase().includes(searchVendor.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Purchase Order Not Found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The purchase order you're looking for doesn't exist or has been removed.
        </p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/procurement/purchase-orders')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
          >
            Back to Purchase Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Purchase Order</h1>
            <p className="mt-2 text-sm text-gray-600">
              {po.poNumber} - Update purchase order details
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/procurement/purchase-orders/${poId}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <XCircle className="h-4 w-4 inline mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-wujha-primary rounded-lg hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 inline mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
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
                <div className="space-y-3">
                  {approvedPRs.map((pr) => (
                    <div
                      key={pr.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.prId === pr.id
                          ? 'border-wujha-primary bg-wujha-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, prId: pr.id }))}
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
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
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
                          ? 'border-wujha-primary bg-wujha-primary/10'
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
                          <CheckCircle className="h-5 w-5 text-wujha-primary" />
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
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 bg-white ${
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
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
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 bg-white ${
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
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 bg-white ${
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
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
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 bg-white ${
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
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
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary ${
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
                      const prItem = approvedPRs.find(pr => pr.id === formData.prId)?.items.find(item => item.item.id === poItem.itemId);
                      return (
                        <tr key={poItem.itemId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {prItem?.item.itemCode}
                              </div>
                              <div className="text-sm text-gray-500">{prItem?.item.nameEn}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {poItem.quantity} {prItem?.item.unitOfMeasure}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {formatCurrency(Number(prItem?.estimatedPrice || 0))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-px text-gray-500 text-sm">
                                {formData.currency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className={`pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-sm ${
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
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
                    <dd className="mt-1 text-sm text-gray-900">
                      {approvedPRs.find(pr => pr.id === formData.prId)?.prNumber}
                    </dd>
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
                      {formData.deliveryDate ? new Date(formData.deliveryDate).toLocaleDateString() : 'Not specified'}
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
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            
            {currentStep < 4 && (
              <button
                onClick={handleNext}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditPurchaseOrder() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    }>
      <EditPurchaseOrderContent />
    </Suspense>
  );
} 