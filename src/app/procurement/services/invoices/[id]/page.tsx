'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Edit,
  Download,
  Trash2,
  Package
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  vendor: {
    id: string;
    vendorCode: string;
    nameEn: string;
    nameAr: string;
    email: string;
    mobile: string;
  };
  po: {
    id: string;
    poNumber: string;
    items: Array<{
      item: {
        nameEn: string;
        nameAr: string;
      };
    }>;
  } | null;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  currency: string;
  status: string;
  matchingStatus: string;
  threeWayMatched: boolean;
  paymentStatus: string;
  description: string;
  paymentTerms: string;
  items: Array<{
    id: string;
    item: {
      nameEn: string;
      nameAr: string;
      itemCode: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    description: string;
  }>;
}

export default function ServiceInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceId, setInvoiceId] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setInvoiceId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        console.error('Failed to fetch invoice');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('success', 'Invoice deleted successfully!');
        router.push('/procurement/services/invoices');
      } else {
        showToast('error', 'Failed to delete invoice. Please try again.');
      }
    } catch (error) {
      showToast('error', 'An error occurred while deleting the invoice. Please try again.');
    }
  };

  const handleExportPDF = () => {
    if (!invoice) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 900px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #f97316;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #1f2937;
          }
          .invoice-number {
            font-size: 20px;
            color: #6b7280;
            margin-top: 10px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .section {
            border: 1px solid #e5e7eb;
            padding: 20px;
            border-radius: 8px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 15px;
            border-bottom: 2px solid #f97316;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .info-label {
            font-weight: bold;
            color: #6b7280;
          }
          .info-value {
            color: #1f2937;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          th {
            background-color: #f9fafb;
            font-weight: bold;
            color: #374151;
          }
          .amount-section {
            margin-top: 30px;
            text-align: right;
          }
          .amount-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 10px;
          }
          .amount-label {
            width: 200px;
            font-weight: bold;
            color: #6b7280;
          }
          .amount-value {
            width: 150px;
            text-align: right;
            color: #1f2937;
          }
          .total-row {
            border-top: 2px solid #f97316;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 18px;
            font-weight: bold;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
          }
          @media print {
            .no-print { display: none; }
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="invoice-title">SERVICE INVOICE</div>
          <div class="invoice-number">${invoice.invoiceNumber}</div>
        </div>

        <div class="grid">
          <div class="section">
            <div class="section-title">Vendor Information</div>
            <div class="info-row">
              <span class="info-label">Vendor Code:</span>
              <span class="info-value">${invoice.vendor.vendorCode}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Name (EN):</span>
              <span class="info-value">${invoice.vendor.nameEn}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Name (AR):</span>
              <span class="info-value">${invoice.vendor.nameAr}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${invoice.vendor.email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mobile:</span>
              <span class="info-value">${invoice.vendor.mobile}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Invoice Details</div>
            <div class="info-row">
              <span class="info-label">Invoice Date:</span>
              <span class="info-value">${new Date(invoice.invoiceDate).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Due Date:</span>
              <span class="info-value">${new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value">${invoice.status}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Status:</span>
              <span class="info-value">${invoice.paymentStatus}</span>
            </div>
            ${invoice.po ? `
            <div class="info-row">
              <span class="info-label">PO Number:</span>
              <span class="info-value">${invoice.po.poNumber}</span>
            </div>
            ` : ''}
          </div>
        </div>

        ${invoice.description ? `
        <div class="section" style="margin-bottom: 20px;">
          <div class="section-title">Description</div>
          <p>${invoice.description}</p>
        </div>
        ` : ''}

        ${invoice.items && invoice.items.length > 0 ? `
        <div class="section">
          <div class="section-title">Items</div>
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.item.itemCode}</td>
                  <td>${item.item.nameEn}</td>
                  <td>${item.quantity}</td>
                  <td>${(Number(item.unitPrice) || 0).toFixed(2)} ${invoice.currency}</td>
                  <td>${(Number(item.totalPrice) || 0).toFixed(2)} ${invoice.currency}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="amount-section">
          <div class="amount-row">
            <span class="amount-label">Subtotal:</span>
            <span class="amount-value">${((Number(invoice.totalAmount) || 0) - (Number(invoice.taxAmount) || 0) + (Number(invoice.discountAmount) || 0)).toFixed(2)} ${invoice.currency}</span>
          </div>
          ${(Number(invoice.discountAmount) || 0) > 0 ? `
          <div class="amount-row">
            <span class="amount-label">Discount:</span>
            <span class="amount-value">-${(Number(invoice.discountAmount) || 0).toFixed(2)} ${invoice.currency}</span>
          </div>
          ` : ''}
          ${(Number(invoice.taxAmount) || 0) > 0 ? `
          <div class="amount-row">
            <span class="amount-label">Tax:</span>
            <span class="amount-value">${(Number(invoice.taxAmount) || 0).toFixed(2)} ${invoice.currency}</span>
          </div>
          ` : ''}
          <div class="amount-row total-row">
            <span class="amount-label">Total Amount:</span>
            <span class="amount-value">${(Number(invoice.totalAmount) || 0).toFixed(2)} ${invoice.currency}</span>
          </div>
        </div>

        ${invoice.paymentTerms ? `
        <div class="section" style="margin-top: 30px;">
          <div class="section-title">Payment Terms</div>
          <p>${invoice.paymentTerms}</p>
        </div>
        ` : ''}

        <div class="no-print" style="margin-top: 40px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 30px; background-color: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-right: 10px;">
            Print Invoice
          </button>
          <button onclick="window.close()" style="padding: 10px 30px; background-color: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'PAID': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID': return 'bg-red-100 text-red-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
        <p className="text-gray-600 mb-6">The invoice you're looking for doesn't exist.</p>
        <Link
          href="/procurement/services/invoices"
          className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link
            href="/procurement/services/invoices"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Invoice Details</h1>
            <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          {invoice.status === 'DRAFT' && (
            <>
              <Link
                href={`/procurement/services/invoices/${invoice.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <span className={`inline-flex mt-2 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                {invoice.status.replace('_', ' ')}
              </span>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Payment Status</p>
              <span className={`inline-flex mt-2 px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                {invoice.paymentStatus}
              </span>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(Number(invoice.totalAmount) || 0).toFixed(2)} {invoice.currency}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Main Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building className="h-5 w-5" />
            Vendor Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Vendor Code</label>
              <p className="text-gray-900">{invoice.vendor.vendorCode}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Name (English)</label>
              <p className="text-gray-900">{invoice.vendor.nameEn}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Name (Arabic)</label>
              <p className="text-gray-900">{invoice.vendor.nameAr}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-gray-900">{invoice.vendor.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Mobile</label>
              <p className="text-gray-900">{invoice.vendor.mobile}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Invoice Details
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Invoice Number</label>
              <p className="text-gray-900">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Invoice Date</label>
              <p className="text-gray-900">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Due Date</label>
              <p className="text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
            {invoice.po && (
              <div>
                <label className="text-sm font-medium text-gray-600">Purchase Order</label>
                <p className="text-gray-900">{invoice.po.poNumber}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">Currency</label>
              <p className="text-gray-900">{invoice.currency}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {invoice.description && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
          <p className="text-gray-700">{invoice.description}</p>
        </div>
      )}

      {/* Items */}
      {invoice.items && invoice.items.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Invoice Items
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.item.itemCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{item.item.nameEn}</div>
                      {item.description && <div className="text-gray-500 text-xs">{item.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {(Number(item.unitPrice) || 0).toFixed(2)} {invoice.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {(Number(item.totalPrice) || 0).toFixed(2)} {invoice.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Summary</h2>
        <div className="space-y-2 max-w-md ml-auto">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-900 font-medium">
              {((Number(invoice.totalAmount) || 0) - (Number(invoice.taxAmount) || 0) + (Number(invoice.discountAmount) || 0)).toFixed(2)} {invoice.currency}
            </span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount:</span>
              <span className="font-medium">-{(Number(invoice.discountAmount) || 0).toFixed(2)} {invoice.currency}</span>
            </div>
          )}
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span className="text-gray-900 font-medium">{(Number(invoice.taxAmount) || 0).toFixed(2)} {invoice.currency}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-orange-500 pt-2 text-lg">
            <span className="font-semibold text-gray-900">Total Amount:</span>
            <span className="font-bold text-gray-900">
              {(Number(invoice.totalAmount) || 0).toFixed(2)} {invoice.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      {invoice.paymentTerms && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Terms</h2>
          <p className="text-gray-700">{invoice.paymentTerms}</p>
        </div>
      )}
    </div>
  );
}
