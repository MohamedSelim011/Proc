'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import InvoiceApprovalModal from '@/components/invoices/InvoiceApprovalModal';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  DollarSign,
  CreditCard,
  CheckSquare,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED' | 'OVERDUE';
  totalAmount: number;
  currency: string;
  taxAmount?: number;
  discountAmount?: number;
  netAmount: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  matchingStatus: 'PENDING' | 'MATCHED' | 'DISCREPANCY';
  vendor: {
    nameEn: string;
    email: string;
  };
  po?: {
    poNumber: string;
  };
  gr?: {
    grNumber: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function InvoicesPage() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    matchingStatus: '',
    vendorId: '',
    search: ''
  });

  // Approval modal state
  const [approvalModal, setApprovalModal] = useState({
    isOpen: false,
    invoice: null as Invoice | null
  });

  useEffect(() => {
    fetchInvoices();
  }, [pagination.page, pagination.limit, filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
        ...(filters.matchingStatus && { matchingStatus: filters.matchingStatus }),
        ...(filters.vendorId && { vendorId: filters.vendorId })
      });

      const response = await fetch(`/api/invoices?${params}`);
      const data = await response.json();

      if (response.ok) {
        setInvoices(data.invoices || []);
        setPagination(data.pagination);
      } else {
        console.error('Error fetching invoices:', data.error);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
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
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'APPROVED':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'OVERDUE':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'APPROVED':
        return 'bg-wujha-info/10 text-wujha-info';
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

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Approval functions
  const openApprovalModal = (invoice: Invoice) => {
    setApprovalModal({
      isOpen: true,
      invoice
    });
  };

  const closeApprovalModal = () => {
    setApprovalModal({
      isOpen: false,
      invoice: null
    });
  };

  const handleApproval = async (status: string, comments: string) => {
    if (!approvalModal.invoice) return;

    try {
      const response = await fetch(`/api/invoices/${approvalModal.invoice.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          comments,
          approverId: 'current-user-id' // This should come from auth context
        }),
      });

      if (response.ok) {
        // Refresh invoices to show updated status
        showToast('success', `Invoice ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`);
        await fetchInvoices();
        closeApprovalModal();
      } else {
        const error = await response.json();
        console.error('Error updating invoice status:', error);
        showToast('error', 'Failed to update invoice status: ' + error.error);
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      showToast('error', 'Failed to update invoice status');
    }
  };

  const calculateTotalsByStatus = () => {
    const totals = {
      draft: { count: 0, amount: 0 },
      submitted: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 }
    };

    invoices.forEach(invoice => {
      const status = invoice.status.toLowerCase() as keyof typeof totals;
      if (totals[status]) {
        totals[status].count++;
        totals[status].amount += Number(invoice.netAmount);
      }
    });

    return totals;
  };

  const totals = calculateTotalsByStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage vendor invoices and process payments
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/procurement/invoices/new"
            className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
                  <dd className="text-lg font-medium text-gray-900">{pagination.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{totals.submitted.count}</dd>
                  <dd className="text-xs text-gray-500">{formatCurrency(totals.submitted.amount)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                  <dd className="text-lg font-medium text-gray-900">{totals.approved.count}</dd>
                  <dd className="text-xs text-gray-500">{formatCurrency(totals.approved.amount)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Paid</dt>
                  <dd className="text-lg font-medium text-gray-900">{totals.paid.count}</dd>
                  <dd className="text-xs text-gray-500">{formatCurrency(totals.paid.amount)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                  <dd className="text-lg font-medium text-gray-900">{totals.overdue.count}</dd>
                  <dd className="text-xs text-gray-500">{formatCurrency(totals.overdue.amount)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search invoices..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            >
              <option value="">All Payment Status</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => setFilters({ search: '', status: '', paymentStatus: '', matchingStatus: '', vendorId: '' })}
              className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Invoices ({pagination.total})
            </h3>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matching
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => {
                  const daysUntilDue = getDaysUntilDue(invoice.dueDate);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(invoice.status)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(invoice.invoiceDate)}
                            </div>
                            {invoice.po && (
                              <div className="text-xs text-wujha-info">
                                PO: {invoice.po.poNumber}
                              </div>
                            )}
                            {invoice.gr && (
                              <div className="text-xs text-green-600">
                                GR: {invoice.gr.grNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.vendor.nameEn}</div>
                        <div className="text-sm text-gray-500">{invoice.vendor.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(Number(invoice.netAmount), invoice.currency)}
                        </div>
                        {invoice.taxAmount && Number(invoice.taxAmount) > 0 && (
                          <div className="text-xs text-gray-500">
                            Tax: {formatCurrency(Number(invoice.taxAmount), invoice.currency)}
                          </div>
                        )}
                        {invoice.discountAmount && Number(invoice.discountAmount) > 0 && (
                          <div className="text-xs text-green-600">
                            Discount: -{formatCurrency(Number(invoice.discountAmount), invoice.currency)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                          {invoice.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMatchingStatusColor(invoice.matchingStatus)}`}>
                          {invoice.matchingStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(invoice.dueDate)}
                        </div>
                        <div className={`text-xs ${
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
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/procurement/invoices/${invoice.id}`}
                            className="text-wujha-info hover:text-wujha-info/80"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {invoice.status === 'DRAFT' && (
                            <Link
                              href={`/procurement/invoices/${invoice.id}/edit`}
                              className="text-gray-600 hover:text-gray-900"
                              title="Edit Invoice"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          )}
                          {(invoice.status === 'DRAFT' || invoice.status === 'SUBMITTED') && (
                            <button
                              onClick={() => openApprovalModal(invoice)}
                              className="text-green-600 hover:text-green-900"
                              title="Approve/Reject Invoice"
                            >
                              <CheckSquare className="h-4 w-4" />
                            </button>
                          )}
                          {invoice.status === 'APPROVED' && invoice.paymentStatus !== 'PAID' && (
                            <Link
                              href={`/procurement/payments?invoiceId=${invoice.id}`}
                              className="text-green-600 hover:text-green-900"
                              title="Process Payment"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-wujha-primary/10 border-wujha-primary text-wujha-primary'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {approvalModal.invoice && (
          <InvoiceApprovalModal
            isOpen={approvalModal.isOpen}
            onClose={closeApprovalModal}
            invoice={approvalModal.invoice}
            onApproval={handleApproval}
          />
        )}
      </div>
    </div>
  );
}
