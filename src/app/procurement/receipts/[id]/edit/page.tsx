'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  X,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  Package,
  Truck,
  MapPin,
  FileText,
  Eye
} from 'lucide-react';

interface GoodsReceiptItem {
  id: string;
  itemId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason: string | null;
  item: {
    id: string;
    nameEn: string;
    nameAr: string;
    itemCode: string;
    description: string | null;
    unitOfMeasure: string;
  };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: {
    id: string;
    nameEn: string;
    nameAr: string;
    email: string;
    phone: string;
  };
  deliveryDate: Date | null;
  currency: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    item: {
      id: string;
      nameEn: string;
      nameAr: string;
      itemCode: string;
      description: string | null;
      unitOfMeasure: string;
    };
  }>;
}

interface GoodsReceipt {
  id: string;
  grNumber: string;
  poId: string;
  receivedDate: Date;
  receivedBy: string;
  deliveryNote: string | null;
  transportDetails: string | null;
  qualityChecked: boolean;
  qualityComments: string | null;
  qualityInspector: string | null;
  storageLocation: string | null;
  specialHandling: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  po: PurchaseOrder;
  items: GoodsReceiptItem[];
}

interface FormData {
  receivedDate: string;
  receivedBy: string;
  deliveryNote: string;
  transportDetails: string;
  qualityChecked: boolean;
  qualityComments: string;
  qualityInspector: string;
  storageLocation: string;
  specialHandling: string;
  items: Array<{
    id: string;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    rejectionReason: string;
  }>;
}

export default function EditGoodsReceipt() {
  const params = useParams();
  const router = useRouter();
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    receivedDate: '',
    receivedBy: '',
    deliveryNote: '',
    transportDetails: '',
    qualityChecked: false,
    qualityComments: '',
    qualityInspector: '',
    storageLocation: '',
    specialHandling: '',
    items: []
  });

  useEffect(() => {
    if (params.id) {
      fetchReceipt();
    }
  }, [params.id]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/goods-receipts/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch goods receipt');
      }
      const data = await response.json();
      setReceipt(data);
      
      // Initialize form data
      setFormData({
        receivedDate: data.receivedDate ? new Date(data.receivedDate).toISOString().split('T')[0] : '',
        receivedBy: data.receivedBy || '',
        deliveryNote: data.deliveryNote || '',
        transportDetails: data.transportDetails || '',
        qualityChecked: data.qualityChecked || false,
        qualityComments: data.qualityComments || '',
        qualityInspector: data.qualityInspector || '',
        storageLocation: data.storageLocation || '',
        specialHandling: data.specialHandling || '',
        items: data.items.map((item: GoodsReceiptItem) => ({
          id: item.id,
          receivedQuantity: item.receivedQuantity,
          acceptedQuantity: item.acceptedQuantity,
          rejectedQuantity: item.rejectedQuantity,
          rejectionReason: item.rejectionReason || ''
        }))
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (itemId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateItemQuantity = (itemId: string, field: 'receivedQuantity' | 'acceptedQuantity' | 'rejectedQuantity', value: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/goods-receipts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update goods receipt');
      }

      // Redirect to view page
      router.push(`/procurement/receipts/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading goods receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Error</h2>
          <p className="mt-2 text-gray-600">{error || 'Goods receipt not found'}</p>
          <button
            onClick={() => router.push('/procurement/receipts')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/procurement/receipts/${params.id}`)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Edit Goods Receipt Note
                  </h1>
                  <p className="text-sm text-gray-600">
                    {receipt.grNumber} • {formatDate(receipt.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push(`/procurement/receipts/${params.id}`)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-4 w-4 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 inline mr-1" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Receipt Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Receipt Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.receivedDate}
                  onChange={(e) => handleInputChange('receivedDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received By *
                </label>
                <input
                  type="text"
                  required
                  value={formData.receivedBy}
                  onChange={(e) => handleInputChange('receivedBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Location
                </label>
                <input
                  type="text"
                  value={formData.storageLocation}
                  onChange={(e) => handleInputChange('storageLocation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Note
                </label>
                <input
                  type="text"
                  value={formData.deliveryNote}
                  onChange={(e) => handleInputChange('deliveryNote', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport Details
                </label>
                <input
                  type="text"
                  value={formData.transportDetails}
                  onChange={(e) => handleInputChange('transportDetails', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Handling
                </label>
                <input
                  type="text"
                  value={formData.specialHandling}
                  onChange={(e) => handleInputChange('specialHandling', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Quality Check */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Quality Check</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="qualityChecked"
                  checked={formData.qualityChecked}
                  onChange={(e) => handleInputChange('qualityChecked', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="qualityChecked" className="ml-2 block text-sm text-gray-900">
                  Quality inspection performed
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Inspector
                </label>
                <input
                  type="text"
                  value={formData.qualityInspector}
                  onChange={(e) => handleInputChange('qualityInspector', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Comments
                </label>
                <textarea
                  rows={3}
                  value={formData.qualityComments}
                  onChange={(e) => handleInputChange('qualityComments', e.target.value)}
                  placeholder="Quality inspection results, defects found, compliance notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Received Items</h3>
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
                      Received
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accepted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rejected
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rejection Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item) => {
                    const originalItem = receipt.items.find(ri => ri.id === item.id);
                    if (!originalItem) return null;
                    
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {originalItem.item.nameEn}
                            </div>
                            <div className="text-sm text-gray-500">
                              {originalItem.item.itemCode}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {originalItem.orderedQuantity} {originalItem.item.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            max={originalItem.orderedQuantity}
                            value={item.receivedQuantity}
                            onChange={(e) => updateItemQuantity(item.id, 'receivedQuantity', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            max={item.receivedQuantity}
                            value={item.acceptedQuantity}
                            onChange={(e) => updateItemQuantity(item.id, 'acceptedQuantity', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            max={item.receivedQuantity}
                            value={item.rejectedQuantity}
                            onChange={(e) => updateItemQuantity(item.id, 'rejectedQuantity', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.rejectionReason}
                            onChange={(e) => handleItemChange(item.id, 'rejectionReason', e.target.value)}
                            placeholder="Reason for rejection..."
                            className="w-48 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push(`/procurement/receipts/${params.id}`)}
              className="px-6 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 