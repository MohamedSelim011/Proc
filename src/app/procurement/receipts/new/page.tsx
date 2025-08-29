'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  AlertCircle,
  CheckCircle,
  Package,
  FileText,
  User,
  Calendar,
  Truck,
  ClipboardCheck
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  deliveryDate: string;
  vendor: {
    nameEn: string;
    email: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    item: {
      id: string;
      itemCode: string;
      nameEn: string;
      unitOfMeasure: string;
    };
  }>;
}

interface GRFormData {
  // Step 1: PO Selection
  poId: string;
  
  // Step 2: Receipt Details
  receivedDate: string;
  receivedBy: string;
  deliveryNote?: string;
  transportDetails?: string;
  
  // Step 3: Items Inspection
  items: Array<{
    poItemId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    rejectionReason?: string;
    inspectionNotes?: string;
  }>;
  
  // Step 4: Quality Check
  qualityChecked: boolean;
  qualityComments?: string;
  qualityInspector?: string;
  
  // Additional fields
  storageLocation?: string;
  specialHandling?: string;
}

function NewGoodsReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get('poId');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availablePOs, setAvailablePOs] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [searchPO, setSearchPO] = useState('');

  const [formData, setFormData] = useState<GRFormData>({
    poId: poId || '',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedBy: 'warehouse001', // This should come from auth context
    items: [],
    qualityChecked: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAvailablePOs();
    if (poId) {
      fetchPODetails(poId);
    }
  }, [poId]);

  const fetchAvailablePOs = async () => {
    try {
      const response = await fetch('/api/purchase-orders?status=ACKNOWLEDGED');
      const data = await response.json();
      if (response.ok) {
        setAvailablePOs(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching available POs:', error);
    }
  };

  const fetchPODetails = async (id: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedPO(data);
        setFormData(prev => ({
          ...prev,
          poId: id,
          items: data.items.map((item: any) => ({
            poItemId: item.id,
            orderedQuantity: item.quantity,
            receivedQuantity: 0,
            acceptedQuantity: 0,
            rejectedQuantity: 0
          }))
        }));
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.poId) newErrors.poId = 'Purchase order is required';
    }

    if (step === 2) {
      if (!formData.receivedDate) newErrors.receivedDate = 'Received date is required';
      if (!formData.receivedBy) newErrors.receivedBy = 'Received by is required';
    }

    if (step === 3) {
      if (formData.items.length === 0) {
        newErrors.items = 'At least one item must be processed';
      } else {
        formData.items.forEach((item, index) => {
          if (item.receivedQuantity < 0) {
            newErrors[`item_${index}_received`] = 'Received quantity cannot be negative';
          }
          if (item.acceptedQuantity < 0) {
            newErrors[`item_${index}_accepted`] = 'Accepted quantity cannot be negative';
          }
          if (item.rejectedQuantity < 0) {
            newErrors[`item_${index}_rejected`] = 'Rejected quantity cannot be negative';
          }
          if (item.acceptedQuantity + item.rejectedQuantity !== item.receivedQuantity) {
            newErrors[`item_${index}_total`] = 'Accepted + Rejected must equal Received quantity';
          }
          if (item.rejectedQuantity > 0 && !item.rejectionReason) {
            newErrors[`item_${index}_reason`] = 'Rejection reason is required for rejected items';
          }
        });
      }
    }

    if (step === 4) {
      if (formData.qualityChecked && !formData.qualityInspector) {
        newErrors.qualityInspector = 'Quality inspector is required when quality check is performed';
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

  const handlePOSelection = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setFormData(prev => ({
      ...prev,
      poId: po.id,
      items: po.items.map(item => ({
        poItemId: item.id,
        orderedQuantity: item.quantity,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        rejectedQuantity: 0
      }))
    }));
  };

  const updateItemQuantity = (index: number, field: 'receivedQuantity' | 'acceptedQuantity' | 'rejectedQuantity', value: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value };
          
          // Auto-calculate accepted quantity when received quantity changes
          if (field === 'receivedQuantity') {
            updated.acceptedQuantity = Math.max(0, value - updated.rejectedQuantity);
          }
          
          // Auto-calculate rejected quantity when accepted quantity changes
          if (field === 'acceptedQuantity') {
            updated.rejectedQuantity = Math.max(0, updated.receivedQuantity - value);
          }
          
          // Auto-calculate accepted quantity when rejected quantity changes
          if (field === 'rejectedQuantity') {
            updated.acceptedQuantity = Math.max(0, updated.receivedQuantity - value);
          }
          
          return updated;
        }
        return item;
      })
    }));
  };

  const updateItemField = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateTotalStats = () => {
    const totalOrdered = formData.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
    const totalReceived = formData.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
    const totalAccepted = formData.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
    const totalRejected = formData.items.reduce((sum, item) => sum + item.rejectedQuantity, 0);

    return {
      totalOrdered,
      totalReceived,
      totalAccepted,
      totalRejected,
      receiptPercentage: totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0,
      acceptancePercentage: totalOrdered > 0 ? (totalAccepted / totalOrdered) * 100 : 0
    };
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const stats = calculateTotalStats();
      let status = 'COMPLETED';
      
      if (stats.totalReceived < stats.totalOrdered) {
        status = 'PARTIAL';
      }
      if (stats.totalRejected > 0) {
        status = 'PARTIAL';
      }

      const submitData = {
        poId: formData.poId,
        receivedDate: formData.receivedDate,
        receivedBy: formData.receivedBy,
        deliveryNote: formData.deliveryNote,
        transportDetails: formData.transportDetails,
        qualityChecked: formData.qualityChecked,
        qualityComments: formData.qualityComments,
        qualityInspector: formData.qualityInspector,
        storageLocation: formData.storageLocation,
        specialHandling: formData.specialHandling,
        status,
        items: formData.items
      };

      const response = await fetch('/api/goods-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/procurement/receipts/${data.id}`);
      } else {
        console.error('Error creating GRN:', data.error);
        setErrors({ submit: data.error || 'Failed to create goods receipt' });
      }
    } catch (error) {
      console.error('Error submitting GRN:', error);
      setErrors({ submit: 'Failed to create goods receipt' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredPOs = availablePOs.filter(po =>
    po.poNumber.toLowerCase().includes(searchPO.toLowerCase()) ||
    po.vendor.nameEn.toLowerCase().includes(searchPO.toLowerCase())
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Goods Receipt Note</h1>
        <p className="mt-2 text-sm text-gray-600">
          Record receipt of goods from purchase order
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress" className="bg-gray-50 rounded-lg p-6">
          <ol className="flex items-center justify-between w-full">
            {[
              { id: 1, name: 'PO Selection', description: 'Select purchase order' },
              { id: 2, name: 'Receipt Details', description: 'Receipt information' },
              { id: 3, name: 'Items Inspection', description: 'Inspect and count items' },
              { id: 4, name: 'Quality Check', description: 'Quality verification' }
            ].map((step, stepIdx) => (
              <li key={step.id} className="relative flex-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx < 4 && (
                    <div className={`h-0.5 w-full ${step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
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
          {/* Step 1: PO Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Select Purchase Order</h3>
              
              {poId ? (
                selectedPO && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">{selectedPO.poNumber}</h4>
                        <p className="text-sm text-blue-700">
                          {selectedPO.vendor.nameEn}
                        </p>
                        <p className="text-sm text-blue-700">
                          {selectedPO.items.length} items • Delivery: {formatDate(selectedPO.deliveryDate)}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                )
              ) : (
                <div>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search purchase orders..."
                        className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={searchPO}
                        onChange={(e) => setSearchPO(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredPOs.map((po) => (
                      <div
                        key={po.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          formData.poId === po.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePOSelection(po)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{po.poNumber}</h4>
                            <p className="text-sm text-gray-500">{po.vendor.nameEn}</p>
                            <p className="text-sm text-gray-500">
                              {po.items.length} items • Delivery: {formatDate(po.deliveryDate)}
                            </p>
                          </div>
                          {formData.poId === po.id && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.poId && (
                <p className="mt-1 text-sm text-red-600">{errors.poId}</p>
              )}
            </div>
          )}

          {/* Step 2: Receipt Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Receipt Details</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Received Date *
                  </label>
                  <input
                    type="date"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.receivedDate ? 'border-red-300' : ''
                    }`}
                    value={formData.receivedDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, receivedDate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.receivedDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.receivedDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Received By *
                  </label>
                  <input
                    type="text"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.receivedBy ? 'border-red-300' : ''
                    }`}
                    value={formData.receivedBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, receivedBy: e.target.value }))}
                    placeholder="Employee ID or name"
                  />
                  {errors.receivedBy && (
                    <p className="mt-1 text-sm text-red-600">{errors.receivedBy}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery Note Number
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={formData.deliveryNote || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryNote: e.target.value }))}
                    placeholder="Delivery note reference"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={formData.storageLocation || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, storageLocation: e.target.value }))}
                    placeholder="Warehouse location, bin number..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transport Details
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={formData.transportDetails || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, transportDetails: e.target.value }))}
                    placeholder="Vehicle details, driver info, condition on arrival..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Special Handling Instructions
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={formData.specialHandling || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialHandling: e.target.value }))}
                    placeholder="Any special handling requirements..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Items Inspection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Items Inspection</h3>
              
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
                        Ordered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Received *
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Accepted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rejected
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPO?.items.map((poItem, index) => {
                      const grItem = formData.items[index];
                      return (
                        <tr key={poItem.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {poItem.item.itemCode}
                              </div>
                              <div className="text-sm text-gray-500">{poItem.item.nameEn}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {poItem.quantity} {poItem.item.unitOfMeasure}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max={poItem.quantity}
                              className={`block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm ${
                                errors[`item_${index}_received`] ? 'border-red-300' : ''
                              }`}
                              value={grItem?.receivedQuantity || 0}
                              onChange={(e) => updateItemQuantity(index, 'receivedQuantity', parseInt(e.target.value) || 0)}
                            />
                            {errors[`item_${index}_received`] && (
                              <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_received`]}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max={grItem?.receivedQuantity || 0}
                              className={`block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm ${
                                errors[`item_${index}_accepted`] ? 'border-red-300' : ''
                              }`}
                              value={grItem?.acceptedQuantity || 0}
                              onChange={(e) => updateItemQuantity(index, 'acceptedQuantity', parseInt(e.target.value) || 0)}
                            />
                            {errors[`item_${index}_accepted`] && (
                              <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_accepted`]}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-2">
                              <input
                                type="number"
                                min="0"
                                max={grItem?.receivedQuantity || 0}
                                className={`block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm ${
                                  errors[`item_${index}_rejected`] ? 'border-red-300' : ''
                                }`}
                                value={grItem?.rejectedQuantity || 0}
                                onChange={(e) => updateItemQuantity(index, 'rejectedQuantity', parseInt(e.target.value) || 0)}
                              />
                              {(grItem?.rejectedQuantity || 0) > 0 && (
                                <input
                                  type="text"
                                  placeholder="Reason"
                                  className={`block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs ${
                                    errors[`item_${index}_reason`] ? 'border-red-300' : ''
                                  }`}
                                  value={grItem?.rejectionReason || ''}
                                  onChange={(e) => updateItemField(index, 'rejectionReason', e.target.value)}
                                />
                              )}
                              {errors[`item_${index}_rejected`] && (
                                <p className="text-xs text-red-600">{errors[`item_${index}_rejected`]}</p>
                              )}
                              {errors[`item_${index}_reason`] && (
                                <p className="text-xs text-red-600">{errors[`item_${index}_reason`]}</p>
                              )}
                              {errors[`item_${index}_total`] && (
                                <p className="text-xs text-red-600">{errors[`item_${index}_total`]}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <textarea
                              rows={2}
                              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs"
                              placeholder="Inspection notes..."
                              value={grItem?.inspectionNotes || ''}
                              onChange={(e) => updateItemField(index, 'inspectionNotes', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Stats */}
              {formData.items.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Receipt Summary</h4>
                  {(() => {
                    const stats = calculateTotalStats();
                    return (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div>
                          <dt className="text-xs text-gray-500">Total Ordered</dt>
                          <dd className="text-sm font-medium text-gray-900">{stats.totalOrdered}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Total Received</dt>
                          <dd className="text-sm font-medium text-blue-600">{stats.totalReceived}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Total Accepted</dt>
                          <dd className="text-sm font-medium text-green-600">{stats.totalAccepted}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Total Rejected</dt>
                          <dd className="text-sm font-medium text-red-600">{stats.totalRejected}</dd>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Quality Check */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Quality Check & Final Review</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="quality-check"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.qualityChecked}
                    onChange={(e) => setFormData(prev => ({ ...prev, qualityChecked: e.target.checked }))}
                  />
                  <label htmlFor="quality-check" className="ml-2 block text-sm text-gray-900">
                    Quality inspection performed
                  </label>
                </div>

                {formData.qualityChecked && (
                  <div className="space-y-4 ml-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quality Inspector *
                      </label>
                      <input
                        type="text"
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                          errors.qualityInspector ? 'border-red-300' : ''
                        }`}
                        value={formData.qualityInspector || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, qualityInspector: e.target.value }))}
                        placeholder="Inspector ID or name"
                      />
                      {errors.qualityInspector && (
                        <p className="mt-1 text-sm text-red-600">{errors.qualityInspector}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quality Comments
                      </label>
                      <textarea
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={formData.qualityComments || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, qualityComments: e.target.value }))}
                        placeholder="Quality inspection results, defects found, compliance notes..."
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Special Handling Instructions
                  </label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={formData.specialHandling || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialHandling: e.target.value }))}
                    placeholder="Special storage requirements, handling instructions..."
                  />
                </div>
              </div>

              {/* Final Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ClipboardCheck className="h-5 w-5 mr-2" />
                  Goods Receipt Summary
                </h4>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Purchase Order</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedPO?.poNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedPO?.vendor.nameEn}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Received Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(formData.receivedDate).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Received By</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formData.receivedBy}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Items</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formData.items.length}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Quality Check</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formData.qualityChecked ? 'Completed' : 'Not performed'}
                    </dd>
                  </div>
                </div>

                {(() => {
                  const stats = calculateTotalStats();
                  return (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{stats.totalOrdered}</div>
                          <div className="text-xs text-gray-500">Ordered</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{stats.totalReceived}</div>
                          <div className="text-xs text-gray-500">Received</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{stats.totalAccepted}</div>
                          <div className="text-xs text-gray-500">Accepted</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600">{stats.totalRejected}</div>
                          <div className="text-xs text-gray-500">Rejected</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
            ) : currentStep === 4 ? (
              'Create Goods Receipt'
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

export default function NewGoodsReceipt() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NewGoodsReceiptContent />
    </Suspense>
  );
}
