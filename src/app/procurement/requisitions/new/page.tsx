'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Search,
  AlertCircle,
  CheckCircle,
  Calculator
} from 'lucide-react';

interface PRItem {
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
  boqReference?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requiredByDate: string;
  justification: string;

  // Step 2: Items
  items: PRItem[];

  // Step 3: Budget
  budgetCode: string;
  costCenter?: string;
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

export default function NewPurchaseRequisition() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [budgetInfo, setBudgetInfo] = useState<any>(null);

  const [formData, setFormData] = useState<PRFormData>({
    itemType: 'STOCK',
    departmentId: '',
    priority: 'NORMAL',
    requiredByDate: '',
    justification: '',
    items: [],
    budgetCode: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentStep === 2) {
      fetchItems();
    }
  }, [currentStep]);

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
      if (!formData.departmentId) newErrors.departmentId = 'Department is required';
      if (!formData.requiredByDate) newErrors.requiredByDate = 'Required date is required';
      if (!formData.justification) newErrors.justification = 'Justification is required';
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

    if (step === 3) {
      if (!formData.budgetCode) newErrors.budgetCode = 'Budget code is required';
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
    try {
      setLoading(true);

      const submitData = {
        ...formData,
        requesterId: 'emp001', // This should come from auth context
        estimatedCost: calculateTotalCost(),
        autoSubmit: false // Keep as draft initially
      };

      const response = await fetch('/api/purchase-requisitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/procurement/requisitions/${data.id}`);
      } else {
        console.error('Error creating PR:', data.error);
        setErrors({ submit: data.error || 'Failed to create purchase requisition' });
      }
    } catch (error) {
      console.error('Error submitting PR:', error);
      setErrors({ submit: 'Failed to create purchase requisition' });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Requisition</h1>
        <p className="mt-2 text-sm text-gray-600">
          Follow the steps below to create a new purchase requisition
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {[
              { id: 1, name: 'Basic Information', description: 'Department and requirements' },
              { id: 2, name: 'Add Items', description: 'Select items and quantities' },
              { id: 3, name: 'Budget & Review', description: 'Budget validation and submit' }
            ].map((step, stepIdx) => (
              <li key={step.id} className={`${stepIdx !== 2 ? 'pr-8 sm:pr-20' : ''} relative`}>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className={`h-0.5 w-full ${step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                </div>
                <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                  step.id < currentStep 
                    ? 'bg-blue-600' 
                    : step.id === currentStep 
                      ? 'border-2 border-blue-600 bg-white' 
                      : 'border-2 border-gray-300 bg-white'
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
                <div className="mt-2">
                  <span className={`text-sm font-medium ${
                    step.id === currentStep ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Item Type *
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    value={formData.itemType}
                    onChange={(e) => setFormData(prev => ({ ...prev, itemType: e.target.value as any }))}
                  >
                    <option value="STOCK">Stock Items</option>
                    <option value="NON_STOCK">Non-Stock Items</option>
                    <option value="SERVICE">Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Department *
                  </label>
                  <input
                    type="text"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 ${
                      errors.departmentId ? 'border-red-300' : ''
                    }`}
                    value={formData.departmentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                    placeholder="Enter department ID"
                  />
                  {errors.departmentId && (
                    <p className="mt-1 text-sm text-red-600">{errors.departmentId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Project ID
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    value={formData.projectId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                    placeholder="Optional project reference"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priority *
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Required By Date *
                  </label>
                  <input
                    type="date"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 ${
                      errors.requiredByDate ? 'border-red-300' : ''
                    }`}
                    value={formData.requiredByDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiredByDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.requiredByDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.requiredByDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    BOQ Reference
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    value={formData.boqReference || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, boqReference: e.target.value }))}
                    placeholder="Bill of quantities reference"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Justification *
                </label>
                <textarea
                  rows={4}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 ${
                    errors.justification ? 'border-red-300' : ''
                  }`}
                  value={formData.justification}
                  onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                  placeholder="Explain the business need for this requisition..."
                />
                {errors.justification && (
                  <p className="mt-1 text-sm text-red-600">{errors.justification}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Add Items */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Add Items</h3>
                <button
                  onClick={addItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>

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

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-900">Item {index + 1}</h4>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Item *
                        </label>
                        <div className="mt-1 relative">
                          <input
                            type="text"
                            placeholder="Search items..."
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        {searchTerm && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                            {filteredItems.map((searchItem) => (
                              <div
                                key={searchItem.id}
                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                                onClick={() => {
                                  updateItem(index, 'itemId', searchItem.id);
                                  setSearchTerm('');
                                }}
                              >
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900 block truncate">
                                    {searchItem.itemCode}
                                  </span>
                                  <span className="text-gray-500 ml-2 block truncate">
                                    {searchItem.nameEn}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {searchItem.category.nameEn} • {searchItem.unitOfMeasure}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.itemName && (
                          <p className="mt-1 text-sm text-gray-600">
                            Selected: {item.itemCode} - {item.itemName}
                          </p>
                        )}
                        {errors[`item_${index}_id`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_id`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Quantity *
                        </label>
                        <div className="mt-1 flex">
                          <input
                            type="number"
                            min="1"
                            className={`block w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 ${
                              errors[`item_${index}_quantity`] ? 'border-red-300' : ''
                            }`}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                            {item.unit || 'Unit'}
                          </span>
                        </div>
                        {errors[`item_${index}_quantity`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Estimated Unit Price *
                        </label>
                        <div className="mt-1 relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">OMR</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 ${
                              errors[`item_${index}_price`] ? 'border-red-300' : ''
                            }`}
                            value={item.estimatedPrice}
                            onChange={(e) => updateItem(index, 'estimatedPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        {errors[`item_${index}_price`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_price`]}</p>
                        )}
                      </div>

                      <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Specifications
                        </label>
                        <textarea
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                          value={item.specifications || ''}
                          onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                          placeholder="Technical specifications, brand preferences, etc."
                        />
                      </div>

                      <div className="flex items-center justify-between lg:col-span-3 pt-2 border-t border-gray-200">
                        <span className="text-sm text-gray-500">
                          Line Total: {formatCurrency(item.quantity * item.estimatedPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formData.items.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calculator className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">Total Estimated Cost</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(calculateTotalCost())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Budget & Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Budget Validation & Review</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Budget Code *
                  </label>
                  <input
                    type="text"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 ${
                      errors.budgetCode ? 'border-red-300' : ''
                    }`}
                    value={formData.budgetCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, budgetCode: e.target.value }))}
                    placeholder="Enter budget code"
                  />
                  {errors.budgetCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.budgetCode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cost Center
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    value={formData.costCenter || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, costCenter: e.target.value }))}
                    placeholder="Optional cost center"
                  />
                </div>
              </div>

              {/* PR Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Purchase Requisition Summary</h4>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Department</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formData.departmentId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Priority</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formData.priority}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Required By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(formData.requiredByDate).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Items</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formData.items.length}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Total Estimated Cost</dt>
                    <dd className="mt-1 text-lg font-bold text-gray-900">
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
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Creating...'
            ) : currentStep === 3 ? (
              'Create Requisition'
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
