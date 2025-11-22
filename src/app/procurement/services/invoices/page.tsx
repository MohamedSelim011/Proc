'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Calendar,
  Building,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  AlertCircle,
  TrendingUp,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

interface ServiceInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
  };
  contract: {
    id: string;
    contractNumber: string;
    serviceType: string;
  };
  srn?: {
    id: string;
    srnNumber: string;
    completionDate: string;
    acceptanceStatus: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  };
  totalAmount: number;
  currency: string;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  matchingStatus: 'PENDING' | 'MATCHED' | 'DISCREPANCY' | 'APPROVED';
  serviceDetails: {
    serviceType: 'CONSULTING' | 'MAINTENANCE' | 'TRAINING' | 'SUPPORT' | 'OTHER';
    duration: string;
    completionPercentage: number;
    milestonesPaid: number;
    totalMilestones: number;
  };
  discrepancies?: {
    type: 'AMOUNT' | 'SERVICE' | 'TIMELINE' | 'QUALITY';
    description: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
  attachments: string[];
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  amountPaid: number;
  createdAt: string;
  updatedAt: string;
}

export default function ServiceInvoicesPage() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    matchingStatus: '',
    serviceType: '',
    vendorId: '',
    search: ''
  });

  useEffect(() => {
    fetchServiceInvoices();
  }, [currentPage, filters]);

  const fetchServiceInvoices = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        itemType: 'SERVICE' // Filter for service invoices
      });
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/invoices?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        // Transform regular invoices into service invoice format
        const serviceInvoices: ServiceInvoice[] = data.invoices?.map((invoice: any) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          vendor: invoice.vendor,
          contract: {
            id: invoice.po?.id || 'N/A',
            contractNumber: invoice.po?.poNumber || 'N/A',
            serviceType: invoice.po?.items?.[0]?.item?.nameEn || 'Service Contract'
          },
          srn: generateSRN(invoice.id), // Generate SRN data
          totalAmount: invoice.totalAmount,
          currency: invoice.currency,
          paymentStatus: invoice.paymentStatus,
          matchingStatus: getMatchingStatus(invoice.status, invoice.paymentStatus),
          serviceDetails: generateServiceDetails(invoice),
          discrepancies: generateDiscrepancies(invoice),
          attachments: ['service-report.pdf', 'timesheet.xlsx', 'completion-certificate.pdf'],
          status: invoice.status,
          submittedBy: 'Service Manager',
          submittedAt: invoice.createdAt,
          approvedBy: invoice.status === 'APPROVED' ? 'Finance Manager' : undefined,
          approvedAt: invoice.status === 'APPROVED' ? invoice.updatedAt : undefined,
          amountPaid: invoice.amountPaid || 0,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt
        })) || [];
        
        setInvoices(serviceInvoices);
        setTotalPages(Math.ceil((data.total || 0) / 10));
      }
    } catch (error) {
      console.error('Error fetching service invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSRN = (invoiceId: string) => {
    return {
      id: `srn-${invoiceId}`,
      srnNumber: `SRN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      completionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      acceptanceStatus: Math.random() > 0.3 ? 'ACCEPTED' : 'PENDING' as 'ACCEPTED' | 'REJECTED' | 'PENDING'
    };
  };

  const getMatchingStatus = (status: string, paymentStatus: string) => {
    if (status === 'APPROVED' && paymentStatus === 'PAID') return 'MATCHED';
    if (status === 'APPROVED') return 'APPROVED';
    if (status === 'REJECTED') return 'DISCREPANCY';
    return 'PENDING';
  };

  const generateServiceDetails = (invoice: any) => {
    const serviceTypes = ['CONSULTING', 'MAINTENANCE', 'TRAINING', 'SUPPORT', 'OTHER'] as const;
    return {
      serviceType: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
      duration: `${Math.floor(Math.random() * 12) + 1} months`,
      completionPercentage: Math.floor(Math.random() * 100),
      milestonesPaid: Math.floor(Math.random() * 3),
      totalMilestones: Math.floor(Math.random() * 3) + 2
    };
  };

  const generateDiscrepancies = (invoice: any) => {
    if (Math.random() > 0.7) {
      return [{
        type: 'AMOUNT' as const,
        description: 'Invoice amount exceeds contracted milestone value',
        impact: 'MEDIUM' as const
      }];
    }
    return undefined;
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // Fetch full invoice data
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (!response.ok) {
        showToast('error', 'Failed to fetch invoice. Please try again.');
        return;
      }

      const invoice = await response.json();

      // Generate and open PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('info', 'Please allow popups to download the invoice.');
        return;
      }

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
                <span class="info-value">${invoice.vendor?.vendorCode || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Name (EN):</span>
                <span class="info-value">${invoice.vendor?.nameEn || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Name (AR):</span>
                <span class="info-value">${invoice.vendor?.nameAr || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${invoice.vendor?.email || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Mobile:</span>
                <span class="info-value">${invoice.vendor?.mobile || 'N/A'}</span>
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
    } catch (error) {
      showToast('error', 'Failed to download invoice. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
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

  const getMatchingStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'MATCHED': return 'bg-green-100 text-green-800';
      case 'DISCREPANCY': return 'bg-red-100 text-red-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate statistics
  const stats = {
    total: invoices.length,
    totalValue: invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0),
    pending: invoices.filter(inv => inv.matchingStatus === 'PENDING').length,
    matched: invoices.filter(inv => inv.matchingStatus === 'MATCHED').length,
    discrepancies: invoices.filter(inv => inv.matchingStatus === 'DISCREPANCY').length,
    avgProcessingTime: '3.2 days'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Invoices</h1>
          <p className="text-gray-600 mt-1">Process and manage service invoices with SRN matching</p>
        </div>
        <Link
          href="/procurement/services/invoices/new"
          className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium"
        >
          New Service Invoice
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4 overflow-hidden">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 break-words">
                {(Number(stats.totalValue) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} OMR
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Matched</p>
              <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Discrepancies</p>
              <p className="text-2xl font-bold text-red-600">{stats.discrepancies}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Processing</p>
              <p className="text-2xl font-bold text-purple-600">{stats.avgProcessingTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search invoices..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              value={filters.paymentStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
            >
              <option value="">Payment Status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              value={filters.matchingStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, matchingStatus: e.target.value }))}
            >
              <option value="">Matching Status</option>
              <option value="PENDING">Pending</option>
              <option value="MATCHED">Matched</option>
              <option value="DISCREPANCY">Discrepancy</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              value={filters.serviceType}
              onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
            >
              <option value="">Service Type</option>
              <option value="CONSULTING">Consulting</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="TRAINING">Training</option>
              <option value="SUPPORT">Support</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => setFilters({ status: '', paymentStatus: '', matchingStatus: '', serviceType: '', vendorId: '', search: '' })}
              className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SRN Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount & Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.vendor.nameEn}
                      </div>
                      <div className="text-sm text-gray-500">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.contract.contractNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.serviceDetails.serviceType}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.serviceDetails.completionPercentage}% Complete
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {invoice.srn ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.srn.srnNumber}
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.srn.acceptanceStatus === 'ACCEPTED' 
                            ? 'bg-green-100 text-green-800'
                            : invoice.srn.acceptanceStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.srn.acceptanceStatus}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No SRN</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {(Number(invoice.totalAmount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} {invoice.currency}
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus}
                      </span>
                      {invoice.amountPaid > 0 && (
                        <div className="text-xs text-gray-500">
                          Paid: {(Number(invoice.amountPaid) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} {invoice.currency}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMatchingStatusColor(invoice.matchingStatus)}`}>
                        {invoice.matchingStatus}
                      </span>
                      {invoice.discrepancies && invoice.discrepancies.length > 0 && (
                        <div className="flex items-center text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {invoice.discrepancies.length} issue(s)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/procurement/services/invoices/${invoice.id}`}
                        className="text-orange-600 hover:text-orange-900 inline-block"
                        title="View Invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {invoice.status === 'DRAFT' && (
                        <Link
                          href={`/procurement/services/invoices/${invoice.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 inline-block"
                          title="Edit Invoice"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="text-gray-600 hover:text-gray-900 inline-block"
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {invoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No service invoices found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new service invoice.
          </p>
          <div className="mt-6">
            <Link
              href="/procurement/services/invoices/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              New Service Invoice
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
