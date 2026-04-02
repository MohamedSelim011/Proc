'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SearchableSelect } from '@/components/common/searchable-select'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Search,
  AlertCircle,
  CheckCircle,
  Calculator,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface PRItem {
  id?: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  quantity: number;
  estimatedPrice: number;
  specifications?: string;
  requiredDate?: string;
  unit?: string;
}

interface PRFormData {
  // Step 1: Basic Information
  itemType: 'STOCK' | 'NON_STOCK' | 'SERVICE';
  departmentId: string;
  projectId?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requiredByDate: string;
  justification: string;

  // Step 2: Items
  items: PRItem[];
}

interface Item {
  id: string;
  itemCode: string;
  nameEn: string;
  nameAr: string;
  unitOfMeasure: string;
  category: {
    nameEn: string;
  };
}

interface PurchaseRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  projectId?: string;
  priority: string;
  requiredByDate: string;
  justification: string;
  status: string;
  items: Array<{
    id: string;
    itemId: string;
    quantity: number;
    estimatedPrice: number;
    specifications?: string;
    requiredDate?: string;
    item: {
      id: string;
      itemCode: string;
      nameEn: string;
      unitOfMeasure: string;
    };
  }>;
}

export default function EditPurchaseRequisition() {
  const params = useParams();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pr, setPr] = useState<PurchaseRequisition | null>(null);

  const [formData, setFormData] = useState<PRFormData>({
    itemType: 'STOCK',
    departmentId: '',
    priority: 'NORMAL',
    requiredByDate: '',
    justification: '',
    items: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPR();
  }, [params.id]);

  useEffect(() => {
    if (currentStep === 2) {
      fetchItems();
    }
  }, [currentStep]);

  const fetchPR = async () => {
    try {
      setInitialLoading(true);
      const response = await fetch(`/api/purchase-requisitions/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setPr(data);
        // Populate form data
        setFormData({
          itemType: data.itemType as 'STOCK' | 'NON_STOCK' | 'SERVICE',
          departmentId: data.departmentId,
          projectId: data.projectId,
          priority: data.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
          requiredByDate: data.requiredByDate ? new Date(data.requiredByDate).toISOString().split('T')[0] : '',
          justification: data.justification,
          items: data.items.map((item: any) => ({
            id: item.id,
            itemId: item.itemId,
            itemCode: item.item.itemCode,
            itemName: item.item.nameEn,
            quantity: item.quantity,
            estimatedPrice: Number(item.estimatedPrice),
            specifications: item.specifications,
            requiredDate: item.requiredDate ? new Date(item.requiredDate).toISOString().split('T')[0] : '',
            unit: item.item.unitOfMeasure
          }))
        });
      } else {
        setErrors({ fetch: data.error || 'Failed to fetch purchase requisition' });
      }
    } catch (error) {
      console.error('Error fetching PR:', error);
      setErrors({ fetch: 'Failed to fetch purchase requisition' });
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      if (response.ok) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.departmentId || !formData.departmentId.trim()) newErrors.departmentId = 'Department is required';
      if (formData.projectId && !formData.projectId.trim()) newErrors.projectId = 'Project ID cannot be only whitespace';
      
      // Validate Required By Date
      if (!formData.requiredByDate) {
        newErrors.requiredByDate = 'Required date is required';
      } else {
        const selectedDate = new Date(formData.requiredByDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to compare dates only
        
        // Check if date is valid
        if (isNaN(selectedDate.getTime())) {
          newErrors.requiredByDate = 'Invalid date format';
        } else {
          // Check if date is too far in the past (before year 1900)
          if (selectedDate.getFullYear() < 1900) {
            newErrors.requiredByDate = 'Date cannot be before year 1900';
          }
          // Check if date is in the past
          else if (selectedDate < today) {
            newErrors.requiredByDate = 'Required date must be today or in the future';
          }
          // Check if date is too far in the future (more than 10 years)
          else {
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() + 10);
            if (selectedDate > maxDate) {
              newErrors.requiredByDate = 'Date cannot be more than 10 years in the future';
            }
          }
        }
      }
      
      if (!formData.justification || !formData.justification.trim()) newErrors.justification = 'Justification is required';
    }

    if (step === 2) {
      if (formData.items.length === 0) {
        newErrors.items = 'At least one item is required';
      } else {
        formData.items.forEach((item, index) => {
          if (!item.itemId) newErrors[`item_${index}_id`] = 'Item is required';
          if (!item.quantity || item.quantity <= 0) newErrors[`item_${index}_quantity`] = 'Valid quantity is required';
          if (!item.estimatedPrice || item.estimatedPrice <= 0) newErrors[`item_${index}_price`] = 'Valid price is required';
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        itemId: '',
        quantity: 1,
        estimatedPrice: 0,
        specifications: '',
        requiredDate: prev.requiredByDate
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof PRItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));

    // If item is selected, populate details
    if (field === 'itemId' && value) {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((item, i) => 
            i === index ? { 
              ...item, 
              itemCode: selectedItem.itemCode,
              itemName: selectedItem.nameEn,
              unit: selectedItem.unitOfMeasure
            } : item
          )
        }));
      }
    }
  };

  const calculateTotalCost = () => {
    return formData.items.reduce((total, item) => 
      total + (item.quantity * item.estimatedPrice), 0
    );
  };

  const handleSubmit = async () => {
    // Validate step 3 before submitting
    if (!validateStep(3)) {
      return;
    }

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        estimatedCost: calculateTotalCost(),
        items: formData.items.map(item => ({
          id: item.id, // Include ID for existing items
          itemId: item.itemId,
          quantity: item.quantity,
          estimatedPrice: item.estimatedPrice,
          specifications: item.specifications,
          requiredDate: item.requiredDate
        }))
      };

      const response = await fetch(`/api/purchase-requisitions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/procurement/requisitions/${params.id}`);
      } else {
        console.error('Error updating PR:', data.error);
        setErrors({ submit: data.error || 'Failed to update purchase requisition' });
      }
    } catch (error) {
      console.error('Error submitting PR:', error);
      setErrors({ submit: 'Failed to update purchase requisition' });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    const validAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
    }).format(validAmount);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-96">
            <Loader2 className="animate-spin h-8 w-8 text-wujha-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (errors.fetch || !pr) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">
                  {errors.fetch || 'Purchase requisition not found'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if PR can be edited
  if (pr.status !== 'DRAFT') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Cannot Edit</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This purchase requisition cannot be edited because its status is "{pr.status}". 
                  Only draft requisitions can be edited.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push(`/procurement/requisitions/${params.id}`)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => router.push(`/procurement/requisitions/${params.id}`)}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Details
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Edit Purchase Requisition</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Update the details of purchase requisition {pr.prNumber}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <nav aria-label="Progress" className="max-w-4xl mx-auto">
            <ol className="flex items-center justify-between">
              {[
                { id: 1, name: 'Basic Information', description: 'Department and requirements' },
                { id: 2, name: 'Edit Items', description: 'Update items and quantities' },
                { id: 3, name: 'Review & Save', description: 'Review details and save' }
              ].map((step, stepIdx) => (
                <li key={step.id} className="relative flex-1">
                  {stepIdx !== 2 && (
                    <div className="absolute top-4 left-1/2 w-full h-0.5 bg-gray-200 -translate-y-1/2" aria-hidden="true">
                      <div className={`h-full transition-all duration-300 ${
                        step.id < currentStep ? 'bg-wujha-primary w-full' : 'w-0'
                      }`} />
                    </div>
                  )}
                  <div className="relative flex flex-col items-center group">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                      step.id < currentStep 
                        ? 'bg-wujha-primary border-wujha-primary shadow-lg' 
                        : step.id === currentStep 
                          ? 'border-wujha-primary bg-white shadow-md ring-4 ring-wujha-primary/20' 
                          : 'border-gray-300 bg-white group-hover:border-gray-400'
                    }`}>
                      {step.id < currentStep ? (
                        <CheckCircle className="h-6 w-6 text-white" />
                      ) : (
                        <span className={`text-sm font-semibold ${
                          step.id === currentStep ? 'text-wujha-primary' : 'text-gray-500'
                        }`}>
                          {step.id}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      <span className={`text-sm font-semibold block ${
                        step.id === currentStep ? 'text-wujha-primary' : step.id < currentStep ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </span>
                      <p className="text-xs text-gray-500 mt-1 max-w-24">{step.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Form Content */}
        <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-10">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="text-center pb-6 border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h3>
                  <p className="text-gray-600">Update essential details for your purchase requisition</p>
                </div>
              
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Item Type <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200"
                      value={formData.itemType}
                      onChange={(e) => setFormData(prev => ({ ...prev, itemType: e.target.value as any }))}
                    >
                      <option value="STOCK">Stock Items</option>
                      <option value="NON_STOCK">Non-Stock Items</option>
                      <option value="SERVICE">Services</option>
                    </SearchableSelect>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                        errors.departmentId ? 'border-red-300 ring-red-100' : ''
                      }`}
                      value={formData.departmentId}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setFormData(prev => ({ ...prev, departmentId: inputValue }));
                        // Clear error when user types
                        if (errors.departmentId) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.departmentId;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Enter department ID"
                    />
                    {errors.departmentId && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.departmentId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Project ID
                    </label>
                    <input
                      type="text"
                      className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                        errors.projectId ? 'border-red-300 ring-red-100' : ''
                      }`}
                      value={formData.projectId || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setFormData(prev => ({ ...prev, projectId: inputValue }));
                        // Clear error when user types
                        if (errors.projectId) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.projectId;
                            return newErrors;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        const inputValue = e.target.value;
                        const trimmedValue = inputValue.trim();
                        
                        // If value is only whitespace, clear it and show error
                        if (inputValue && !trimmedValue) {
                          setFormData(prev => ({ ...prev, projectId: '' }));
                          setErrors(prev => ({ ...prev, projectId: 'Project ID cannot be only whitespace' }));
                        } else if (trimmedValue !== inputValue) {
                          // Trim leading/trailing whitespace but keep the value
                          setFormData(prev => ({ ...prev, projectId: trimmedValue || '' }));
                        }
                      }}
                      placeholder="Optional project reference"
                    />
                    {errors.projectId && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.projectId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    >
                      <option value="LOW">🟢 Low Priority</option>
                      <option value="NORMAL">🟡 Normal Priority</option>
                      <option value="HIGH">🟠 High Priority</option>
                      <option value="URGENT">🔴 Urgent Priority</option>
                    </SearchableSelect>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Required By Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                        errors.requiredByDate ? 'border-red-300 ring-red-100' : ''
                      }`}
                      value={formData.requiredByDate}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setFormData(prev => ({ ...prev, requiredByDate: inputValue }));
                        
                        // Validate in real-time
                        if (inputValue) {
                          const selectedDate = new Date(inputValue);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          if (isNaN(selectedDate.getTime())) {
                            setErrors(prev => ({ ...prev, requiredByDate: 'Invalid date format' }));
                          } else if (selectedDate.getFullYear() < 1900) {
                            setErrors(prev => ({ ...prev, requiredByDate: 'Date cannot be before year 1900' }));
                          } else if (selectedDate < today) {
                            setErrors(prev => ({ ...prev, requiredByDate: 'Required date must be today or in the future' }));
                          } else {
                            const maxDate = new Date();
                            maxDate.setFullYear(maxDate.getFullYear() + 10);
                            if (selectedDate > maxDate) {
                              setErrors(prev => ({ ...prev, requiredByDate: 'Date cannot be more than 10 years in the future' }));
                            } else {
                              // Clear error if date is valid
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.requiredByDate;
                                return newErrors;
                              });
                            }
                          }
                        } else {
                          // Clear error if field is empty (will be caught by required validation)
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.requiredByDate;
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
                    {errors.requiredByDate && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.requiredByDate}
                      </p>
                    )}
                  </div>

                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Justification <span className="text-red-500">*</span>
                  </label>
                    <textarea
                      rows={5}
                      className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 resize-none ${
                        errors.justification ? 'border-red-300 ring-red-100' : ''
                      }`}
                      value={formData.justification}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setFormData(prev => ({ ...prev, justification: inputValue }));
                        // Clear error when user types
                        if (errors.justification) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.justification;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Explain the business need for this requisition in detail..."
                    />
                  {errors.justification && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.justification}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Edit Items */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="text-center pb-6 border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Edit Items</h3>
                  <p className="text-gray-600">Update items and quantities for this requisition</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-wujha-primary/10 rounded-lg">
                      <Plus className="h-5 w-5 text-wujha-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Item Management</h4>
                      <p className="text-sm text-gray-600">Add, remove, or modify items</p>
                    </div>
                  </div>
                  <button
                    onClick={addItem}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Item
                  </button>
                </div>

                {errors.items && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{errors.items}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-wujha-primary/10 rounded-full">
                            <span className="text-sm font-bold text-wujha-primary">{index + 1}</span>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900">Item {index + 1}</h4>
                        </div>
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Remove item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            Item <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative">
                            <input
                              type="text"
                              placeholder="Search items by code or name..."
                              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 pr-10 text-base transition-colors duration-200"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          </div>
                          {searchTerm && (
                            <div className="absolute z-20 mt-2 w-full bg-white shadow-xl max-h-64 rounded-lg border border-gray-200 overflow-hidden">
                              <div className="py-2">
                                {filteredItems.map((searchItem) => (
                                  <div
                                    key={searchItem.id}
                                    className="cursor-pointer select-none relative px-4 py-3 hover:bg-wujha-primary/5 transition-colors duration-150"
                                    onClick={() => {
                                      updateItem(index, 'itemId', searchItem.id);
                                      setSearchTerm('');
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                          <span className="font-semibold text-gray-900 text-sm">
                                            {searchItem.itemCode}
                                          </span>
                                          <span className="text-gray-600 text-sm">
                                            {searchItem.nameEn}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <span className="text-xs text-wujha-primary bg-wujha-primary/10 px-2 py-1 rounded-full">
                                            {searchItem.category.nameEn}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {searchItem.unitOfMeasure}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.itemName && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm text-green-800 font-medium">
                                ✓ Selected: <span className="font-semibold">{item.itemCode}</span> - {item.itemName}
                              </p>
                            </div>
                          )}
                          {errors[`item_${index}_id`] && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors[`item_${index}_id`]}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 flex rounded-lg shadow-sm">
                            <input
                              type="number"
                              min="1"
                              className={`block w-full rounded-l-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                                errors[`item_${index}_quantity`] ? 'border-red-300 ring-red-100' : ''
                              }`}
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            />
                            <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-600 text-sm font-medium">
                              {item.unit || 'Unit'}
                            </span>
                          </div>
                          {errors[`item_${index}_quantity`] && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors[`item_${index}_quantity`]}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            Estimated Unit Price <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">OMR</span>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              className={`pl-16 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                                errors[`item_${index}_price`] ? 'border-red-300 ring-red-100' : ''
                              }`}
                              value={item.estimatedPrice}
                              onChange={(e) => updateItem(index, 'estimatedPrice', parseFloat(e.target.value) || 0)}
                              placeholder="0.000"
                            />
                          </div>
                          {errors[`item_${index}_price`] && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors[`item_${index}_price`]}
                            </p>
                          )}
                        </div>

                        <div className="lg:col-span-3 space-y-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            Specifications
                          </label>
                          <textarea
                            rows={3}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 resize-none"
                            value={item.specifications || ''}
                            onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                            placeholder="Technical specifications, brand preferences, quality requirements, etc."
                          />
                        </div>

                        <div className="lg:col-span-3 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between p-4 bg-wujha-primary/10 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Calculator className="h-5 w-5 text-wujha-primary" />
                              <span className="text-sm font-semibold text-wujha-primary">Line Total</span>
                            </div>
                            <span className="text-lg font-bold text-wujha-primary">
                              {formatCurrency(item.quantity * item.estimatedPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.items.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-wujha-primary/5 border border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                          <Calculator className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <span className="text-lg font-bold text-gray-900">Total Estimated Cost</span>
                          <p className="text-sm text-gray-600">{formData.items.length} item{formData.items.length !== 1 ? 's' : ''} selected</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatCurrency(calculateTotalCost())}
                        </span>
                        <p className="text-sm text-gray-600">Omani Rial</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="text-center pb-6 border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Review & Save</h3>
                  <p className="text-gray-600">Review your changes before saving</p>
                </div>

                {/* PR Summary */}
                <div className="bg-gradient-to-br from-gray-50 to-wujha-primary/5 border border-gray-200 rounded-xl p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 bg-wujha-primary/10 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-wujha-primary" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Updated Purchase Requisition Summary</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">PR Number</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900">{pr.prNumber}</dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Department</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900">{formData.departmentId}</dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Priority</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900 flex items-center">
                        {formData.priority === 'LOW' && '🟢'}
                        {formData.priority === 'NORMAL' && '🟡'}
                        {formData.priority === 'HIGH' && '🟠'}
                        {formData.priority === 'URGENT' && '🔴'}
                        <span className="ml-2">{formData.priority}</span>
                      </dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Required By</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900">
                        {new Date(formData.requiredByDate).toLocaleDateString('en-GB')}
                      </dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Items</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900">{formData.items.length} item{formData.items.length !== 1 ? 's' : ''}</dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm sm:col-span-2">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Estimated Cost</dt>
                      <dd className="mt-2 text-2xl font-bold text-wujha-primary">
                        {formatCurrency(calculateTotalCost())}
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
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-wujha-primary/5 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </button>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Step {currentStep} of 3</span>
              <div className="flex space-x-1">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`w-2 h-2 rounded-full ${
                      step <= currentStep ? 'bg-wujha-primary' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : currentStep === 3 ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  Next Step
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
