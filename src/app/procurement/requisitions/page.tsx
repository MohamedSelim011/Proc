'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import * as XLSX from 'xlsx';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';
import ConfirmActionModal from '@/components/ui/confirm-action-modal';

interface PurchaseRequisition {
  id: string;
  prNumber: string;
  requestDate: string;
  requesterId: string;
  departmentId: string;
  itemType: 'STOCK' | 'NON_STOCK' | 'SERVICE';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'CANCELLED';
  estimatedCost: number;
  budgetCode: string;
  justification?: string;
  items: any[];
  approvals: any[];
  createdBy?: string;
  _count: {
    purchaseOrders: number;
    rfqs: number;
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

export default function PurchaseRequisitionsPage() {
  const { showToast } = useToast();
  const [showNewReqMenu, setShowNewReqMenu] = useState(false);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryBaseUrlConfigured, setInventoryBaseUrlConfigured] = useState<boolean | null>(null);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalModalState, setApprovalModalState] = useState<{ prId: string; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Get user data from localStorage for permission checks
  const userRole = typeof window !== 'undefined' ? (localStorage.getItem('role') || '').toUpperCase() : '';
  const userData = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const userId = userData.id || '';
  const userEmployeeId = userData.employeeId || '';

  // Check permissions
  const canApprove = ['PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    itemType: '',
    requesterId: '',
    departmentId: '',
    search: ''
  });

  useEffect(() => {
    const loadIntegrationFlags = async () => {
      try {
        const response = await fetch('/api/system/integration-flags', { cache: 'no-store' });
        const data = await response.json();
        setInventoryBaseUrlConfigured(Boolean(data?.data?.inventoryBaseUrlConfigured));
      } catch {
        setInventoryBaseUrlConfigured(false);
      }
    };
    void loadIntegrationFlags();
  }, []);

  useEffect(() => {
    fetchRequisitions();
  }, [pagination.page, pagination.limit, filters]);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        scope: 'all',
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.itemType && { itemType: filters.itemType }),
        ...(filters.requesterId && { requesterId: filters.requesterId }),
        ...(filters.departmentId && { departmentId: filters.departmentId })
      });

      const response = await fetch(`/api/purchase-requisitions?${params}`);
      const data = await response.json();

      if (response.ok) {
        setRequisitions(data.requisitions || []);
        setPagination(data.pagination);
      } else {
        showToast('error', 'Failed to load requisitions. Please try again.');
      }
    } catch (error) {
      showToast('error', 'An error occurred while loading requisitions.');
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

  const handleSubmitDraft = async (prId: string) => {
    try {
      const response = await fetch(`/api/purchase-requisitions/${prId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        // Refresh the list to show updated status
        fetchRequisitions();
        showToast('success', 'Purchase requisition submitted successfully!');
      } else {
        const data = await response.json();
        showToast('error', data.error || 'Failed to submit requisition. Please try again.');
      }
    } catch (error) {
      showToast('error', 'An error occurred while submitting the requisition.');
    }
  };

  const handleApprovalAction = async (prId: string, action: 'APPROVE' | 'REJECT') => {
    const verb = action === 'APPROVE' ? 'approve' : 'reject';
    try {
      setApprovalSubmitting(true);
      const token =
        (typeof window !== 'undefined' && (
          localStorage.getItem('token') ||
          localStorage.getItem('authToken') ||
          localStorage.getItem('auth-token')
        )) || null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/purchase-requisitions/${prId}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast('error', data.error || `Failed to ${verb} requisition`);
        return;
      }

      showToast('success', action === 'APPROVE' ? 'Requisition approved successfully' : 'Requisition rejected successfully');
      await fetchRequisitions();
      setApprovalModalState(null);
    } catch (error) {
      showToast('error', `Failed to ${verb} requisition`);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
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
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING_APPROVAL':
        return <Clock className="h-4 w-4 text-wujha-primary" />;
      case 'SUBMITTED':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'CONVERTED':
        return <CheckCircle className="h-4 w-4 text-wujha-primary" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_APPROVAL':
        return 'bg-wujha-primary/10 text-wujha-primary';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CONVERTED':
        return 'bg-wujha-primary/10 text-wujha-primary';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = async () => {
    try {
      showToast('info', 'Preparing export...');
      
      // Build query params with current filters
      const params = new URLSearchParams({
        scope: 'all',
        export: 'true',
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.itemType && { itemType: filters.itemType }),
        ...(filters.requesterId && { requesterId: filters.requesterId }),
        ...(filters.departmentId && { departmentId: filters.departmentId })
      });

      const response = await fetch(`/api/purchase-requisitions?${params}`);
      const data = await response.json();

      if (!response.ok) {
        showToast('error', 'Failed to export requisitions');
        return;
      }

      // Prepare data for Excel
      const exportData = data.requisitions.map((pr: PurchaseRequisition) => ({
        'PR Number': pr.prNumber,
        'Request Date': formatDate(pr.requestDate),
        'Requester ID': pr.requesterId,
        'Department ID': pr.departmentId,
        'Item Type': pr.itemType,
        'Priority': pr.priority,
        'Status': pr.status,
        'Estimated Cost (OMR)': Number(pr.estimatedCost).toFixed(3),
        'Budget Code': pr.budgetCode,
        'Justification': pr.justification || '',
        'Number of Items': pr.items?.length || 0,
        'Purchase Orders': pr._count?.purchaseOrders || 0,
        'RFQs': pr._count?.rfqs || 0,
        'Created At': formatDate(pr.createdAt),
        'Updated At': formatDate(pr.updatedAt)
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Purchase Requisitions');

      // Set column widths
      const colWidths = [
        { wch: 15 }, // PR Number
        { wch: 12 }, // Request Date
        { wch: 12 }, // Requester ID
        { wch: 12 }, // Department ID
        { wch: 12 }, // Item Type
        { wch: 10 }, // Priority
        { wch: 15 }, // Status
        { wch: 18 }, // Estimated Cost
        { wch: 12 }, // Budget Code
        { wch: 30 }, // Justification
        { wch: 15 }, // Number of Items
        { wch: 15 }, // Purchase Orders
        { wch: 10 }, // RFQs
        { wch: 12 }, // Created At
        { wch: 12 }  // Updated At
      ];
      ws['!cols'] = colWidths;

      // Generate filename with timestamp
      const filename = `Purchase_Requisitions_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      showToast('success', `Exported ${data.total} requisitions successfully`);
    } catch (error) {
      console.error('Error exporting requisitions:', error);
      showToast('error', 'Failed to export requisitions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requisitions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track material, service, and mixed requisitions
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <div className="relative">
            <button
              onClick={() => setShowNewReqMenu((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Requisition
            </button>
            {showNewReqMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg z-20">
                {inventoryBaseUrlConfigured === false ? (
                  <Link
                    href="/procurement/requisitions/new"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowNewReqMenu(false)}
                  >
                    Material Requisition
                  </Link>
                ) : null}
                <Link
                  href="/procurement/services/requisitions/new"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowNewReqMenu(false)}
                >
                  Service Requisition
                </Link>
                <Link
                  href="/procurement/services/requisitions/new?mode=mixed"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowNewReqMenu(false)}
                >
                  Service + Materials
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <ListFiltersCard
        onClear={() => setFilters({ search: '', status: '', priority: '', itemType: '', requesterId: '', departmentId: '' })}
        className="mb-6"
        columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <ListFilterField label="Search">
          <input
            type="text"
            placeholder="Search by PR number..."
            className="erp-input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </ListFilterField>
        <ListFilterField label="Status">
          <select
            className="erp-input"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CONVERTED">Converted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </ListFilterField>
        <ListFilterField label="Priority">
          <select
            className="erp-input"
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </ListFilterField>
        <ListFilterField label="Type">
          <select
            className="erp-input"
            value={filters.itemType}
            onChange={(e) => handleFilterChange('itemType', e.target.value)}
          >
            <option value="">All</option>
            <option value="STOCK">Material - Stock</option>
            <option value="NON_STOCK">Material - Non-Stock</option>
            <option value="SERVICE">Service / Mixed</option>
          </select>
        </ListFilterField>
      </ListFiltersCard>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Requisitions ({pagination.total})
            </h3>
            <button 
              onClick={handleExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-wujha-primary mb-4" />
            <p>Loading requisitions...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PR Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requestor & Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type, Amount & Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requisitions.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(pr.status)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {pr.prNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(pr.requestDate)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pr.requesterId}</div>
                      <div className="text-sm text-gray-500">{pr.departmentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500 mb-1">{pr.itemType}</div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(Number(pr.estimatedCost))}
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(pr.priority)}`}>
                        {pr.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pr.status)}`}>
                        {pr.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {pr._count.purchaseOrders > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {pr._count.purchaseOrders} PO{pr._count.purchaseOrders > 1 ? 's' : ''}
                          </span>
                        )}
                        {pr._count.rfqs > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {pr._count.rfqs} RFQ{pr._count.rfqs > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={pr.itemType === 'SERVICE' ? `/procurement/services/requisitions/${pr.id}` : `/procurement/requisitions/${pr.id}`}
                          className="text-wujha-primary hover:text-wujha-primary-hover"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {pr.itemType !== 'SERVICE' && (pr.status === 'DRAFT' || pr.status === 'REJECTED') && (
                          <>
                            <Link
                              href={`/procurement/requisitions/${pr.id}/edit`}
                              className="text-gray-600 hover:text-gray-900"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          </>
                        )}
                        {pr.itemType !== 'SERVICE' && (pr.status === 'PENDING_APPROVAL' || pr.status === 'SUBMITTED') && 
                         canApprove && 
                         pr.requesterId !== userId && 
                         pr.requesterId !== userEmployeeId &&
                         pr.createdBy !== userId && (
                          <button
                            type="button"
                            onClick={() => setApprovalModalState({ prId: pr.id, action: 'APPROVE' })}
                            className="text-green-600 hover:text-green-700"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {pr.itemType !== 'SERVICE' && (pr.status === 'PENDING_APPROVAL' || pr.status === 'SUBMITTED') && 
                         canApprove && 
                         pr.requesterId !== userId && 
                         pr.requesterId !== userEmployeeId &&
                         pr.createdBy !== userId && (
                          <button
                            type="button"
                            onClick={() => setApprovalModalState({ prId: pr.id, action: 'REJECT' })}
                            className="text-red-600 hover:text-red-700"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-orange-50 border-wujha-primary text-wujha-primary'
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
      </div>

      <ConfirmActionModal
        open={approvalModalState !== null}
        title={approvalModalState?.action === 'APPROVE' ? 'Approve Requisition' : 'Reject Requisition'}
        message={`Are you sure you want to ${
          approvalModalState?.action === 'APPROVE' ? 'approve' : 'reject'
        } this requisition?`}
        confirmLabel={approvalModalState?.action === 'APPROVE' ? 'Approve' : 'Reject'}
        confirmVariant={approvalModalState?.action === 'APPROVE' ? 'success' : 'danger'}
        loading={approvalSubmitting}
        onCancel={() => setApprovalModalState(null)}
        onConfirm={() => {
          if (!approvalModalState) return;
          void handleApprovalAction(approvalModalState.prId, approvalModalState.action);
        }}
      />
    </div>
  );
}
