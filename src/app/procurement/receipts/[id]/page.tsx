'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
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
  po: PurchaseOrder | null;
  items: GoodsReceiptItem[];
}

export default function GoodsReceiptView() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
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

  const generateProfessionalDocument = () => {
    if (!receipt) return '';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Goods Receipt Note - ${receipt.grNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #000;
              background: white;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .company-name { 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 5px; 
            }
            .document-title { 
              font-size: 20px; 
              margin-bottom: 10px; 
            }
            .info-section { 
              margin-bottom: 25px; 
            }
            .info-title { 
              font-size: 16px; 
              font-weight: bold; 
              margin-bottom: 10px; 
              background: #f5f5f5; 
              padding: 8px; 
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px; 
              margin-bottom: 15px; 
            }
            .info-item { 
              display: flex; 
              justify-content: space-between; 
              padding: 5px 0; 
              border-bottom: 1px dotted #ccc; 
            }
            .info-label { 
              font-weight: bold; 
              width: 40%; 
            }
            .info-value { 
              width: 60%; 
              text-align: right; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold; 
            }
            .status-completed { 
              color: #10b981; 
              font-weight: bold; 
            }
            .status-partial { 
              color: #f59e0b; 
              font-weight: bold; 
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #666; 
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">WUJHA PROCUREMENT</div>
            <div class="document-title">Goods Receipt Note</div>
            <div>GR Number: ${receipt.grNumber}</div>
            <div>Generated: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="info-section">
            <div class="info-title">Receipt Information</div>
            <div class="info-grid">
              <div>
                <div class="info-item">
                  <span class="info-label">GR Number:</span>
                  <span class="info-value">${receipt.grNumber}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Status:</span>
                  <span class="info-value status-${receipt.status.toLowerCase()}">${receipt.status}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Received Date:</span>
                  <span class="info-value">${formatDate(receipt.receivedDate)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Received By:</span>
                  <span class="info-value">${receipt.receivedBy}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Storage Location:</span>
                  <span class="info-value">${receipt.storageLocation || 'Not specified'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Delivery Note:</span>
                  <span class="info-value">${receipt.deliveryNote || 'Not specified'}</span>
                </div>
              </div>
              <div>
                <div class="info-item">
                  <span class="info-label">PO Number:</span>
                  <span class="info-value">${receipt.po?.poNumber || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Vendor:</span>
                  <span class="info-value">${receipt.po?.vendor?.nameEn || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Quality Check:</span>
                  <span class="info-value">${receipt.qualityChecked ? 'Checked' : 'Pending'}</span>
                </div>
                ${receipt.qualityInspector ? `
                <div class="info-item">
                  <span class="info-label">Quality Inspector:</span>
                  <span class="info-value">${receipt.qualityInspector}</span>
                </div>
                ` : ''}
                <div class="info-item">
                  <span class="info-label">Transport Details:</span>
                  <span class="info-value">${receipt.transportDetails || 'Not specified'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Special Handling:</span>
                  <span class="info-value">${receipt.specialHandling || 'None'}</span>
                </div>
              </div>
            </div>
            ${receipt.qualityComments ? `
            <div style="margin-top: 15px;">
              <div class="info-label">Quality Comments:</div>
              <div style="padding: 10px; background: #f9f9f9; border: 1px solid #ddd; margin-top: 5px;">
                ${receipt.qualityComments}
              </div>
            </div>
            ` : ''}
          </div>

          <div class="info-section">
            <div class="info-title">Received Items</div>
            <table>
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Ordered</th>
                  <th>Received</th>
                  <th>Accepted</th>
                  <th>Rejected</th>
                  <th>Unit</th>
                  <th>Rejection Reason</th>
                </tr>
              </thead>
              <tbody>
                ${receipt.items.map(item => `
                  <tr>
                    <td>${item.item.itemCode}</td>
                    <td>${item.item.nameEn}</td>
                    <td>${item.orderedQuantity}</td>
                    <td>${item.receivedQuantity}</td>
                    <td>${item.acceptedQuantity}</td>
                    <td>${item.rejectedQuantity}</td>
                    <td>${item.item.unitOfMeasure}</td>
                    <td>${item.rejectionReason || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="info-section">
            <div class="info-title">Summary</div>
            <div class="info-grid">
              <div>
                <div class="info-item">
                  <span class="info-label">Total Items:</span>
                  <span class="info-value">${receipt.items.length}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Received:</span>
                  <span class="info-value">${receipt.items.reduce((sum, item) => sum + item.receivedQuantity, 0)}</span>
                </div>
              </div>
              <div>
                <div class="info-item">
                  <span class="info-label">Total Accepted:</span>
                  <span class="info-value">${receipt.items.reduce((sum, item) => sum + item.acceptedQuantity, 0)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Rejected:</span>
                  <span class="info-value">${receipt.items.reduce((sum, item) => sum + item.rejectedQuantity, 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This document was generated electronically and is valid without signature.</p>
            <p>Generated on ${formatDateTime(new Date().toISOString())} by Wujha Procurement System</p>
          </div>

        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (!receipt) return;
    
    // Create a new window for print preview
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print this document');
      return;
    }

    const htmlContent = generateProfessionalDocument();
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleExport = async () => {
    if (!receipt) return;

    try {
      showToast('info', 'Generating PDF...');
      
      // Use the API endpoint to download the file (with cache busting)
      const response = await fetch(`/api/goods-receipts/${receipt.id}/download?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast('error', errorData.error || 'Failed to download Goods Receipt');
        return;
      }

      // Check if response is PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        showToast('error', 'Server returned non-PDF content');
        return;
      }

      // Get the blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Goods_Receipt_${receipt.grNumber}.pdf`;
      link.style.display = 'none';
      link.setAttribute('download', `Goods_Receipt_${receipt.grNumber}.pdf`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
        showToast('success', 'PDF downloaded successfully');
      }, 100);
    } catch (error) {
      console.error('Error downloading goods receipt:', error);
      showToast('error', 'Failed to download Goods Receipt');
    }
  };

  const handleGenerateReport = () => {
    if (!receipt) return;
    
    // Generate a comprehensive report with all details
    const reportContent = generateProfessionalDocument();
    
    // Create a blob and download
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GR-Report-${receipt.grNumber}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PARTIALLY_ACCEPTED':
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
      case 'PARTIALLY_ACCEPTED':
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
    <>

      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/procurement/receipts')}
                  className="p-2 text-gray-400 hover:text-gray-600 no-print"
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
              <div className="flex items-center space-x-3 no-print">
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Printer className="h-4 w-4 inline mr-1" />
                  Print
                </button>
                <button 
                  onClick={handleExport}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
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
                    {receipt.qualityChecked ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Pending
                      </span>
                    )}
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
                  <p className="font-medium text-gray-900">{receipt.po?.poNumber || 'WITHOUT PO'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vendor</p>
                  <p className="font-medium text-gray-900">{receipt.po?.vendor?.nameEn || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{receipt.po?.vendor?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Delivery Date</p>
                  <p className="font-medium text-gray-900">
                    {receipt.po?.deliveryDate ? formatDate(receipt.po.deliveryDate) : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="font-medium text-gray-900">{receipt.po?.currency || 'OMR'}</p>
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
                <button 
                  onClick={() => {
                    if (receipt?.po?.id || receipt?.poId) {
                      router.push(`/procurement/purchase-orders/${receipt.po?.id || receipt.poId}`);
                    }
                  }}
                  disabled={!receipt?.po?.id && !receipt?.poId}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="h-4 w-4 inline mr-2" />
                  View PO Details
                </button>
                <button 
                  onClick={handleGenerateReport}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
} 
