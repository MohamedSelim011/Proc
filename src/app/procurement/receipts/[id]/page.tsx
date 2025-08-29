'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Printer, 
  Download, 
  CheckCircle, 
  XCircle, 
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

export default function GoodsReceiptView() {
  const params = useParams();
  const router = useRouter();
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'PARTIAL':
        return <AlertTriangle className="h-4 w-4" />;
      case 'PENDING':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
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
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Error</h2>
          <p className="mt-2 text-gray-600">{error || 'Goods receipt not found'}</p>
          <button
            onClick={() => router.back()}
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
                  onClick={() => router.push('/procurement/receipts')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Goods Receipt Note
                  </h1>
                  <p className="text-sm text-gray-600">
                    {receipt.grNumber} • Created {formatDateTime(receipt.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <Printer className="h-4 w-4 inline mr-1" />
                  Print
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <Download className="h-4 w-4 inline mr-1" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Status</h3>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(receipt.status)}`}>
                      {getStatusIcon(receipt.status)}
                      <span className="ml-2">{receipt.status}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">GR Number</p>
                  <p className="text-lg font-semibold text-gray-900">{receipt.grNumber}</p>
                </div>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Receipt Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Received Date</p>
                      <p className="font-medium text-gray-900">{formatDate(receipt.receivedDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Received By</p>
                      <p className="font-medium text-gray-900">{receipt.receivedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Storage Location</p>
                      <p className="font-medium text-gray-900">{receipt.storageLocation || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Delivery Note</p>
                      <p className="font-medium text-gray-900">{receipt.deliveryNote || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Truck className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Transport Details</p>
                      <p className="font-medium text-gray-900">{receipt.transportDetails || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Special Handling</p>
                      <p className="font-medium text-gray-900">{receipt.specialHandling || 'None'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Check */}
            {receipt.qualityChecked && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Check</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Quality Inspector</p>
                    <p className="font-medium text-gray-900">{receipt.qualityInspector || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Quality Status</p>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Passed
                      </span>
                    </div>
                  </div>
                </div>
                {receipt.qualityComments && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Comments</p>
                    <p className="mt-1 text-gray-900">{receipt.qualityComments}</p>
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Received Items</h3>
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
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receipt.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.item.nameEn}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.item.itemCode}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.orderedQuantity} {item.item.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.receivedQuantity} {item.item.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.acceptedQuantity} {item.item.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.rejectedQuantity} {item.item.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.rejectedQuantity > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accepted
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Order Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Order</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">PO Number</p>
                  <p className="font-medium text-gray-900">{receipt.po.poNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vendor</p>
                  <p className="font-medium text-gray-900">{receipt.po.vendor.nameEn}</p>
                  <p className="text-sm text-gray-500">{receipt.po.vendor.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Delivery Date</p>
                  <p className="font-medium text-gray-900">
                    {receipt.po.deliveryDate ? formatDate(receipt.po.deliveryDate) : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="font-medium text-gray-900">{receipt.po.currency}</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-medium">{receipt.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Received</span>
                  <span className="font-medium">
                    {receipt.items.reduce((sum, item) => sum + item.receivedQuantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Accepted</span>
                  <span className="font-medium text-green-600">
                    {receipt.items.reduce((sum, item) => sum + item.acceptedQuantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rejected</span>
                  <span className="font-medium text-red-600">
                    {receipt.items.reduce((sum, item) => sum + item.rejectedQuantity, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                  <Eye className="h-4 w-4 inline mr-2" />
                  View PO Details
                </button>
                <button className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 