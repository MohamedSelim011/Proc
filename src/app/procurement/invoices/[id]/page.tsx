'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  FileText, 
  Building, 
  Calendar, 
  DollarSign, 
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Edit,
  Download,
  CreditCard,
  Shield,
  Calculator,
  Eye,
  FileDown
} from 'lucide-react';

interface InvoiceItem {
  id: string;
  poItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  item: {
    itemCode: string;
    nameEn: string;
    unit: string;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED' | 'OVERDUE';
  totalAmount: number;
  currency: string;
  taxAmount: number;
  discountAmount?: number;
  netAmount: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  matchingStatus: 'PENDING' | 'MATCHED' | 'DISCREPANCY';
  vendor: {
    id: string;
    nameEn: string;
    email: string;
    phone?: string;
    address?: string | {
      building?: string;
      street?: string;
      city?: string;
      governorate?: string;
      postalCode?: string;
      country?: string;
    };
  };
  po?: {
    id: string;
    poNumber: string;
    orderDate: string;
    deliveryDate: string;
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      item: {
        itemCode: string;
        nameEn: string;
        unit: string;
      };
    }>;
    goodsReceipts: Array<{
      id: string;
      grNumber: string;
      receivedDate: string;
      status: string;
      items: Array<{
        poItemId: string;
        acceptedQuantity: number;
        rejectedQuantity: number;
      }>;
    }>;
  };
  threeWayMatched: boolean;
  matchingComments?: string;
  paymentDate?: string;
  paymentReference?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchInvoice(params.id as string);
    }
  }, [params.id]);

  const fetchInvoice = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/${id}`);
      const data = await response.json();
      
      if (response.ok) {
        setInvoice(data);
      } else {
        console.error('Error fetching invoice:', data.error);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const response = await fetch(`/api/invoices/${invoice?.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchInvoice(invoice?.id as string);
      } else {
        console.error('Error updating status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchingStatusColor = (status: string) => {
    switch (status) {
      case 'MATCHED':
        return 'bg-green-100 text-green-800';
      case 'DISCREPANCY':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'OMR') => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;
    
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #000;
              background: white;
              font-size: 12px;
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
            .invoice-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }
            .info-section { 
              margin-bottom: 20px; 
            }
            .info-title { 
              font-size: 14px; 
              font-weight: bold; 
              margin-bottom: 8px; 
              background: #f5f5f5; 
              padding: 8px; 
              border: 1px solid #ddd;
            }
            .info-item { 
              display: flex; 
              justify-content: space-between; 
              padding: 4px 0; 
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
              margin: 20px 0; 
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
            .text-right { 
              text-align: right; 
            }
            .totals-section {
              margin-top: 30px;
              float: right;
              width: 300px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px solid #ddd;
            }
            .total-row.final {
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              font-weight: bold;
              font-size: 14px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-draft { background: #f3f4f6; color: #374151; }
            .status-submitted { background: #fef3c7; color: #92400e; }
            .status-approved { background: #dbeafe; color: #1e40af; }
            .status-paid { background: #d1fae5; color: #065f46; }
            .status-overdue { background: #fee2e2; color: #991b1b; }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 10px; 
              color: #666; 
              border-top: 1px solid #ddd;
              padding-top: 20px;
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
            <div class="document-title">INVOICE</div>
            <div>Invoice Number: ${invoice.invoiceNumber}</div>
            <div>Generated: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="invoice-info">
            <div>
              <div class="info-section">
                <div class="info-title">Invoice Details</div>
                <div class="info-item">
                  <span class="info-label">Invoice Number:</span>
                  <span class="info-value">${invoice.invoiceNumber}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Invoice Date:</span>
                  <span class="info-value">${formatDate(invoice.invoiceDate)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Due Date:</span>
                  <span class="info-value">${formatDate(invoice.dueDate)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Status:</span>
                  <span class="info-value">
                    <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Payment Terms:</span>
                  <span class="info-value">${invoice.paymentTerms || 'Net 30 days'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <div class="info-section">
                <div class="info-title">Vendor Information</div>
                <div class="info-item">
                  <span class="info-label">Vendor:</span>
                  <span class="info-value">${invoice.vendor.nameEn}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${invoice.vendor.email}</span>
                </div>
                ${invoice.po ? `
                <div class="info-item">
                  <span class="info-label">PO Number:</span>
                  <span class="info-value">${invoice.po.poNumber}</span>
                </div>
                ` : ''}
                <div class="info-item">
                  <span class="info-label">Currency:</span>
                  <span class="info-value">${invoice.currency}</span>
                </div>
              </div>
            </div>
          </div>

          ${invoice.description ? `
          <div class="info-section">
            <div class="info-title">Description</div>
            <p style="padding: 8px; background: #f9f9f9; border: 1px solid #ddd;">${invoice.description}</p>
          </div>
          ` : ''}

          <div class="info-section">
            <div class="info-title">Invoice Items</div>
            <table>
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td>${item.item?.itemCode || 'N/A'}</td>
                    <td>${item.item?.nameEn || item.description || 'Service Item'}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${formatCurrency(item.unitPrice, invoice.currency)}</td>
                    <td class="text-right">${formatCurrency(item.totalPrice, invoice.currency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(invoice.totalAmount - invoice.taxAmount + (invoice.discountAmount || 0), invoice.currency)}</span>
            </div>
            ${invoice.discountAmount && invoice.discountAmount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatCurrency(invoice.discountAmount, invoice.currency)}</span>
            </div>
            ` : ''}
            <div class="total-row">
              <span>Tax:</span>
              <span>${formatCurrency(invoice.taxAmount, invoice.currency)}</span>
            </div>
            <div class="total-row final">
              <span>Total Amount:</span>
              <span>${formatCurrency(invoice.totalAmount, invoice.currency)}</span>
            </div>
          </div>

          <div style="clear: both;"></div>

          <div class="footer">
            <p>This invoice was generated electronically and is valid without signature.</p>
            <p>Generated on ${new Date().toLocaleString()} by Wujha Procurement System</p>
            <p>For any queries, please contact our accounts department.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Invoice not found</h2>
        <p className="mt-2 text-gray-600">The invoice you're looking for doesn't exist.</p>
        <Link
          href="/procurement/invoices"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Link>
      </div>
    );
  }

  const daysUntilDue = getDaysUntilDue(invoice.dueDate);

  return (
    <div className="max-w-8xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/procurement/invoices"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
              <p className="text-sm text-gray-600">
                Created on {formatDate(invoice.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {invoice.status === 'DRAFT' && (
              <Link
                href={`/procurement/invoices/${invoice.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            )}
            
            {invoice.status === 'APPROVED' && invoice.paymentStatus !== 'PAID' && (
              <Link
                href={`/procurement/payments?invoiceId=${invoice.id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Process Payment
              </Link>
            )}
            
            <button 
              onClick={handleDownloadPDF}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              title="Download Invoice PDF"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Status</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Payment</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                      {invoice.paymentStatus}
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Matching</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMatchingStatusColor(invoice.matchingStatus)}`}>
                      {invoice.matchingStatus}
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'details', name: 'Details', icon: FileText },
              { id: 'matching', name: 'Three-Way Matching', icon: Shield },
              { id: 'payments', name: 'Payment History', icon: CreditCard },
              { id: 'documents', name: 'Related Documents', icon: Package }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 inline mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Information</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
                      <dd className="text-sm text-gray-900">{invoice.invoiceNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Invoice Date</dt>
                      <dd className="text-sm text-gray-900">{formatDate(invoice.invoiceDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                      <dd className="text-sm text-gray-900">
                        {formatDate(invoice.dueDate)}
                        <span className={`ml-2 text-xs ${
                          daysUntilDue < 0 
                            ? 'text-red-600' 
                            : daysUntilDue <= 7 
                              ? 'text-yellow-600' 
                              : 'text-gray-500'
                        }`}>
                          {daysUntilDue < 0 
                            ? `${Math.abs(daysUntilDue)} days overdue`
                            : daysUntilDue === 0
                              ? 'Due today'
                              : `${daysUntilDue} days left`
                          }
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Currency</dt>
                      <dd className="text-sm text-gray-900">{invoice.currency}</dd>
                    </div>
                    {invoice.description && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="text-sm text-gray-900">{invoice.description}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Vendor Name</dt>
                      <dd className="text-sm text-gray-900">{invoice.vendor.nameEn}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900">{invoice.vendor.email}</dd>
                    </div>
                    {invoice.vendor.phone && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="text-sm text-gray-900">{invoice.vendor.phone}</dd>
                      </div>
                    )}
                    {invoice.vendor.address && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="text-sm text-gray-900">
                          {typeof invoice.vendor.address === 'string' 
                            ? invoice.vendor.address 
                            : `${invoice.vendor.address.building || ''} ${invoice.vendor.address.street || ''}, ${invoice.vendor.address.city || ''}, ${invoice.vendor.address.governorate || ''} ${invoice.vendor.address.postalCode || ''}, ${invoice.vendor.address.country || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*,/g, ',')
                          }
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Financial Summary
                </h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Subtotal</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(Number(invoice.totalAmount) - Number(invoice.taxAmount), invoice.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tax Amount</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(Number(invoice.taxAmount), invoice.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Purchase Order Information */}
              {invoice.po && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Related Purchase Order</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">
                          <Link href={`/procurement/purchase-orders/${invoice.po.id}`} className="hover:underline">
                            {invoice.po.poNumber}
                          </Link>
                        </h4>
                        <p className="text-sm text-blue-700">
                          Order Date: {formatDate(invoice.po.orderDate)}
                        </p>
                        <p className="text-sm text-blue-700">
                          Delivery Date: {formatDate(invoice.po.deliveryDate)}
                        </p>
                      </div>
                      <Link
                        href={`/procurement/purchase-orders/${invoice.po.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View PO
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Three-Way Matching Tab */}
          {activeTab === 'matching' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Three-Way Matching Validation</h3>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getMatchingStatusColor(invoice.matchingStatus)}`}>
                  {invoice.matchingStatus}
                </span>
              </div>

              {invoice.threeWayMatched ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">Matching Complete</h4>
                      <p className="text-sm text-green-700">
                        This invoice has been validated against the PO and GR documents.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">Matching Pending</h4>
                      <p className="text-sm text-yellow-700">
                        This invoice requires three-way matching validation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {invoice.matchingComments && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Matching Comments</h4>
                  <p className="text-sm text-gray-700">{invoice.matchingComments}</p>
                </div>
              )}

              {/* Matching Details Table */}
              {invoice.po && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Matching Details</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            PO Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            PO Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Variance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoice.po.items.map((poItem, index) => {
                          const variance = poItem.quantity * Number(poItem.unitPrice) - poItem.totalPrice;
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {poItem.quantity} {poItem.item.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(Number(poItem.unitPrice), invoice.currency)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {poItem.quantity} {poItem.item.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(Number(poItem.unitPrice), invoice.currency)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm ${
                                  variance === 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {variance === 0 ? 'No variance' : formatCurrency(Math.abs(variance), invoice.currency)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment History Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                    </dd>
                  </div>
                  {invoice.paymentDate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Payment Date</dt>
                      <dd className="text-sm text-gray-900">{formatDate(invoice.paymentDate)}</dd>
                    </div>
                  )}
                  {invoice.paymentReference && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Payment Reference</dt>
                      <dd className="text-sm text-gray-900">{invoice.paymentReference}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {invoice.paymentStatus === 'PENDING' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">Payment Pending</h4>
                      <p className="text-sm text-yellow-700">
                        This invoice is awaiting payment processing.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Related Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Related Documents</h3>
              
              {invoice.po && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Purchase Order</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-sm font-medium text-blue-900">{invoice.po.poNumber}</h5>
                        <p className="text-sm text-blue-700">
                          Order Date: {formatDate(invoice.po.orderDate)}
                        </p>
                      </div>
                      <Link
                        href={`/procurement/purchase-orders/${invoice.po.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        <Eye className="h-4 w-4 inline mr-1" />
                        View PO
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {invoice.po?.goodsReceipts && invoice.po.goodsReceipts.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Goods Receipts</h4>
                  <div className="space-y-3">
                    {invoice.po.goodsReceipts.map((gr) => (
                      <div key={gr.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-medium text-green-900">{gr.grNumber}</h5>
                            <p className="text-sm text-green-700">
                              Received: {formatDate(gr.receivedDate)}
                            </p>
                            <p className="text-sm text-green-700">
                              Status: {gr.status}
                            </p>
                          </div>
                          <Link
                            href={`/procurement/goods-receipts/${gr.id}`}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            <Eye className="h-4 w-4 inline mr-1" />
                            View GR
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Document Actions</h4>
                <div className="flex space-x-3">
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <FileDown className="h-4 w-4 mr-2" />
                    Download Invoice
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 