'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CheckCircle, 
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

interface ServiceRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  requesterId: string;
  priority: string;
  status: string;
  estimatedCost: string;
  budgetCode: string;
  justification: string;
  createdAt: string;
  updatedAt: string;
  servicePR: {
    id: string;
    serviceScope: string;
    serviceType?: string;
    technicalSpecifications?: string;
    duration: number;
    durationUnit: string;
    items: Array<{
      id: string;
      quantity: string;
      estimatedRate: string;
      duration: number;
      durationUnit: string;
      specifications?: string;
      deliverables: string[];
      performanceMetrics: string[];
    }>;
  };
}

interface Filters {
  search: string;
  status: string;
  priority: string;
  department: string;
  serviceType: string;
}

export default function ServiceRequisitions() {
  const { showToast } = useToast();
  const [requisitions, setRequisitions] = useState<ServiceRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    priority: '',
    department: '',
    serviceType: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 3
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    fetchRequisitions();
  }, [currentPage, filters]);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      console.log('Fetching service requisitions...');
      
      // Build query parameters for service requisitions
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      // Add filters
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.department) params.append('departmentId', filters.department);
      if (filters.serviceType) params.append('serviceType', filters.serviceType);

      const url = `/api/services/requisitions?${params}`;
      console.log('Fetching from URL:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Service requisitions API response:', data);

      if (data.serviceRequisitions) {
        setRequisitions(data.serviceRequisitions);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        
        // Update service types from API response
        if (data.serviceTypes && Array.isArray(data.serviceTypes)) {
          setServiceTypes(data.serviceTypes);
        }
        
        console.log('Set requisitions:', data.serviceRequisitions.length);
        console.log('Set total:', data.pagination?.total);
        console.log('Set totalPages:', data.pagination?.totalPages);
      } else {
        console.error('No serviceRequisitions in response:', data);
        setRequisitions([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching service requisitions:', error);
      setRequisitions([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
      console.log('Fetch completed, loading set to false');
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleApprove = async (requisitionId: string) => {
    setPendingApprovalId(requisitionId);
    setShowConfirmModal(true);
  };

  const confirmApprove = async () => {
    if (!pendingApprovalId) return;

    try {
      setApprovingId(pendingApprovalId);
      setShowConfirmModal(false);
      
      const response = await fetch(`/api/services/requisitions/${pendingApprovalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          approvedBy: 'current-user-id', // In real app, get from auth
          approvedAt: new Date().toISOString(),
          comments: 'Approved'
        }),
      });

      if (response.ok) {
        showToast('success', 'Service requisition approved successfully!');
        // Refresh the list
        await fetchRequisitions();
      } else {
        const error = await response.json();
        showToast('error', `Failed to approve: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error approving requisition:', error);
      showToast('error', 'Failed to approve service requisition');
    } finally {
      setApprovingId(null);
      setPendingApprovalId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'SUBMITTED': 'bg-wujha-primary/10 text-wujha-primary',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'LOW': 'bg-green-100 text-green-800',
      'NORMAL': 'bg-wujha-primary/10 text-wujha-primary',
      'HIGH': 'bg-yellow-100 text-yellow-800',
      'URGENT': 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-wujha-primary/10 text-wujha-primary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'SUBMITTED':
        return <Clock className="h-4 w-4 text-wujha-primary" />;
      case 'REJECTED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requisitions</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage service and non-stock item purchase requisitions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchRequisitions}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <Link
            href="/procurement/services/requisitions/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Service Request
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by PR number, department..."
                className="block w-full h-10 pl-3 pr-10 py-2 rounded-md border border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-2 focus:ring-wujha-primary text-gray-900 bg-white"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="block w-full h-10 px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-2 focus:ring-wujha-primary text-gray-900 bg-white"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              className="block w-full h-10 px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-2 focus:ring-wujha-primary text-gray-900 bg-white"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">All Priority</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <input
              type="text"
              placeholder="Department ID"
              className="block w-full h-10 px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-2 focus:ring-wujha-primary text-gray-900 bg-white"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type
            </label>
            <select
              className="block w-full h-10 px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-2 focus:ring-wujha-primary text-gray-900 bg-white"
              value={filters.serviceType}
              onChange={(e) => handleFilterChange('serviceType', e.target.value)}
            >
              <option value="">All Types</option>
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * 10, total)}</span> of{' '}
            <span className="font-medium">{total}</span> service requisitions
          </p>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {Object.values(filters).filter(Boolean).length} filters active
            </span>
          </div>
        </div>
      
      </div>

      {/* Requisitions Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Requisition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Estimated Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Required By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-wujha-primary"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : requisitions.length > 0 ? (
              requisitions.map((requisition) => (
                <tr key={requisition.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                    <div className="flex items-center">
                      {getStatusIcon(requisition.status)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {requisition.prNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(requisition.createdAt)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                    <div className="text-sm text-gray-900">
                      {requisition.servicePR?.serviceType || (requisition.itemType === 'SERVICE' ? 'Services' : 'Non-Stock Items')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {requisition.servicePR?.items?.length || 0} item(s)
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[180px]">
                    <div className="text-sm text-gray-900">{requisition.departmentId}</div>
                    <div className="text-sm text-gray-500">Requester: {requisition.requesterId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(requisition.priority)}`}>
                      {requisition.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[130px]">
                    {formatCurrency(parseFloat(requisition.estimatedCost))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(requisition.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(requisition.status)}`}>
                      {requisition.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium min-w-[120px]">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/procurement/services/requisitions/${requisition.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-wujha-primary/10 text-wujha-primary hover:bg-wujha-primary/20 hover:text-wujha-primary-hover transition-colors duration-200"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {requisition.status === 'DRAFT' && (
                        <Link
                          href={`/procurement/services/requisitions/${requisition.id}/edit`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 transition-colors duration-200"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      )}
                      {requisition.status === 'SUBMITTED' && (
                        <button
                          onClick={() => handleApprove(requisition.id)}
                          disabled={approvingId === requisition.id}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Approve"
                        >
                          {approvingId === requisition.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  No service requisitions found. 
                  <Link 
                    href="/procurement/services/requisitions/new"
                    className="text-wujha-primary hover:text-wujha-primary-hover ml-1"
                  >
                    Create your first service request
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-wujha-primary mr-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Approval
                </h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to approve this service requisition? This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setPendingApprovalId(null);
                  }}
                  disabled={approvingId !== null}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApprove}
                  disabled={approvingId !== null}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {approvingId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
