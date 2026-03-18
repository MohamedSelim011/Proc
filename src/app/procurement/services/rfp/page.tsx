'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Eye,
  Search,
  Download,
  Loader2,
  AlertTriangle,
  Send,
  XCircle,
  Plus
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import * as XLSX from 'xlsx';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';

interface ServiceRFP {
  id: string;
  rfpNumber: string;
  title: string;
  description?: string;
  status: string;
  issueDate: string;
  closingDate: string;
  createdAt: string;
  updatedAt: string;
  pr?: {
    prNumber: string;
    estimatedCost: number;
  };
  servicePR?: {
    serviceScope: string;
    duration: number;
    durationUnit: string;
  };
  invitedVendors?: Array<{
    vendor: {
      nameEn: string;
      email: string;
    };
  }>;
  responses?: Array<{
    status: string;
    submittedAt: string | null;
    totalAmount: number | null;
    vendor: {
      nameEn: string;
      email: string;
    };
  }>;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ServiceRFPListPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [rfps, setRfps] = useState<ServiceRFP[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [stats, setStats] = useState({
    draft: 0,
    sent: 0,
    evaluated: 0,
    total: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });

  useEffect(() => {
    fetchRFPs();
  }, [pagination.page, pagination.limit, filters]);

  const fetchRFPs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`/api/services/rfp?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        const rfpsList = data.rfps || [];
        setRfps(rfpsList);
        // Update pagination with actual counts
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          // If no pagination from API, calculate from the data
          setPagination({
            page: 1,
            limit: rfpsList.length,
            total: rfpsList.length,
            totalPages: 1
          });
        }
        // Update stats if provided by API
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        showToast('error', 'Failed to load Service RFPs. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching RFPs:', error);
      showToast('error', 'An error occurred while loading Service RFPs.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'PUBLISHED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-red-100 text-red-800';
      case 'EVALUATED': return 'bg-green-100 text-green-800';
      case 'AWARDED': return 'bg-purple-100 text-purple-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRFPs = rfps.filter(rfp => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      rfp.rfpNumber?.toLowerCase().includes(searchLower) ||
      rfp.title?.toLowerCase().includes(searchLower) ||
      rfp.pr?.prNumber?.toLowerCase().includes(searchLower)
    );
  });

  const handleExport = async () => {
    try {
      showToast('info', 'Preparing export...');
      
      // Build query params with current filters
      const params = new URLSearchParams({
        export: 'true',
        ...(filters.status && { status: filters.status })
      });

      const response = await fetch(`/api/services/rfp?${params}`);
      const data = await response.json();

      if (!response.ok) {
        showToast('error', 'Failed to export Service RFPs');
        return;
      }

      // Prepare data for Excel
      const exportData = data.rfps.map((rfp: ServiceRFP) => ({
        'RFP Number': rfp.rfpNumber,
        'Title': rfp.title,
        'Status': rfp.status,
        'SR Number': rfp.pr?.prNumber || 'N/A',
        'Issue Date': formatDate(rfp.issueDate),
        'Closing Date': formatDate(rfp.closingDate),
        'Invited Vendors': rfp.invitedVendors?.length || 0,
        'Submitted Responses': rfp.responses?.filter(r => r.submittedAt).length || 0,
        'Total Responses': rfp.responses?.length || 0,
        'Estimated Cost (OMR)': rfp.pr?.estimatedCost ? Number(rfp.pr.estimatedCost).toFixed(3) : 'N/A',
        'Created At': formatDate(rfp.createdAt),
        'Updated At': formatDate(rfp.updatedAt)
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Service RFPs');

      // Set column widths
      const colWidths = [
        { wch: 15 }, // RFP Number
        { wch: 30 }, // Title
        { wch: 12 }, // Status
        { wch: 15 }, // SR Number
        { wch: 12 }, // Issue Date
        { wch: 12 }, // Closing Date
        { wch: 15 }, // Invited Vendors
        { wch: 18 }, // Submitted Responses
        { wch: 15 }, // Total Responses
        { wch: 18 }, // Estimated Cost
        { wch: 15 }, // Created At
        { wch: 15 }  // Updated At
      ];
      ws['!cols'] = colWidths;

      // Generate Excel file
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Service_RFPs_${timestamp}.xlsx`);

      showToast('success', 'Service RFPs exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showToast('error', 'Failed to export Service RFPs');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service RFPs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage service Requests for Proposals
          </p>
        </div>
        <button
          onClick={() => router.push('/procurement/services/rfp/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Service RFP
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total RFPs</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total > 0 ? stats.total : (pagination.total > 0 ? pagination.total : rfps.length)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Send className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Sent</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.sent}
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
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Draft</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.draft}
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
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Evaluated</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.evaluated}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {stats.draft > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-orange-800">
                  Draft RFPs
                </h3>
                <p className="text-sm text-orange-700">
                  You have {stats.draft} draft RFP(s) that need to be published
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterChange('status', 'DRAFT')}
                className="inline-flex items-center px-3 py-2 border border-wujha-primary shadow-sm text-sm leading-4 font-medium rounded-md text-wujha-primary bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary"
              >
                View Draft RFPs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <ListFiltersCard
        onClear={() => setFilters({ search: '', status: '' })}
        className="mb-6"
        columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <ListFilterField label="Search">
          <input
            type="text"
            placeholder="Search by RFP number..."
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
            <option value="APPROVED">Approved</option>
            <option value="PUBLISHED">Published</option>
            <option value="SENT">Sent</option>
            <option value="CLOSED">Closed</option>
            <option value="EVALUATED">Evaluated</option>
            <option value="AWARDED">Awarded</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </ListFilterField>
      </ListFiltersCard>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Service RFPs ({pagination.total})
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
            <p>Loading Service RFPs...</p>
          </div>
        ) : filteredRFPs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Service RFPs</h3>
            <p className="mt-1 text-sm text-gray-500">
              No records are available for the selected filters.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/procurement/services/rfp/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Service RFP
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RFP Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Requisition
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendors & Responses
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRFPs.map((rfp) => (
                    <tr key={rfp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-wujha-primary mr-3 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {rfp.rfpNumber}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {rfp.title}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {rfp.pr?.prNumber || 'N/A'}
                        </div>
                        {rfp.pr?.estimatedCost && (
                          <div className="text-sm text-gray-500">
                            OMR {Number(rfp.pr.estimatedCost).toFixed(3)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center text-gray-500 mb-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(rfp.issueDate)}
                          </div>
                          <div className="flex items-center text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(rfp.closingDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Users className="h-3 w-3 mr-1 text-gray-400" />
                            <span>{rfp.invitedVendors?.length || 0} invited</span>
                          </div>
                          <div className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            <span>{rfp.responses?.filter(r => r.submittedAt).length || 0} responses</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rfp.status)}`}>
                          {rfp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/procurement/services/rfp/${rfp.id}`)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
                      Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {[...Array(pagination.totalPages)].map((_, idx) => {
                        const pageNum = idx + 1;
                        // Show first page, last page, current page, and pages around current
                        if (
                          pageNum === 1 ||
                          pageNum === pagination.totalPages ||
                          (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === pagination.page
                                  ? 'z-10 bg-wujha-primary border-wujha-primary text-white'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          pageNum === pagination.page - 2 ||
                          pageNum === pagination.page + 2
                        ) {
                          return (
                            <span
                              key={pageNum}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
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
          </>
        )}
      </div>
    </div>
  );
}
