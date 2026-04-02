'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Clock,
  Plus,
  Eye
} from 'lucide-react';
import Link from 'next/link';

interface ServiceMetrics {
  totalActiveContracts: number;
  totalServiceValue: number;
  pendingServiceRequests: number;
}

interface ServiceRequest {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  projectId?: string;
  estimatedCost: number;
  status: string;
  priority: string;
  createdAt: string;
  servicePR?: {
    serviceScope: string;
    items: Array<{
      quantity?: number | string;
      estimatedRate?: number | string;
      duration?: number | string;
    }>;
  };
  items?: Array<{
    quantity?: number | string;
    estimatedPrice?: number | string;
  }>;
}

export default function ServiceDashboard() {
  const [metrics, setMetrics] = useState<ServiceMetrics>({
    totalActiveContracts: 0,
    totalServiceValue: 0,
    pendingServiceRequests: 0
  });
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReqMenu, setShowNewReqMenu] = useState(false);
  const [showQuickActionNewReqMenu, setShowQuickActionNewReqMenu] = useState(false);

  const toNumber = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getRequestValue = (request: ServiceRequest) => {
    const serviceTotal = (request.servicePR?.items || []).reduce((sum, item) => {
      const quantity = toNumber(item.quantity);
      const estimatedRate = toNumber(item.estimatedRate);
      const duration = Math.max(toNumber(item.duration) || 1, 1);
      return sum + quantity * estimatedRate * duration;
    }, 0);

    const materialTotal = (request.items || []).reduce((sum, item) => {
      return sum + toNumber(item.quantity) * toNumber(item.estimatedPrice);
    }, 0);

    const computed = serviceTotal + materialTotal;
    if (computed > 0) return computed;
    return toNumber(request.estimatedCost);
  };

  const fetchAllServiceRequests = async () => {
    const pageSize = 200;
    let page = 1;
    let totalPages = 1;
    const allRows: ServiceRequest[] = [];

    do {
      const response = await fetch(`/api/services/service-requests?limit=${pageSize}&page=${page}`);
      if (!response.ok) {
        throw new Error('Failed to fetch service requests');
      }
      const data = await response.json();
      const rows = Array.isArray(data?.serviceRequests) ? data.serviceRequests : [];
      allRows.push(...rows);
      totalPages = Number(data?.pagination?.totalPages || 1);
      page += 1;
    } while (page <= totalPages);

    return allRows;
  };

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
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [serviceRequests, contractsResponse] = await Promise.all([
        fetchAllServiceRequests(),
        fetch('/api/services/contracts?limit=200'),
      ]);
      if (!contractsResponse.ok) {
        throw new Error('Failed to fetch service contracts');
      }
      const contractsData = await contractsResponse.json();

      const pendingRequests = serviceRequests.filter((pr: ServiceRequest) =>
        pr.status === 'DRAFT' || pr.status === 'SUBMITTED' || pr.status === 'PENDING_APPROVAL'
      ).length;
      const contracts = Array.isArray(contractsData.contracts) ? contractsData.contracts : [];
      const activeContractStatuses = new Set(['PENDING_APPROVAL', 'APPROVED', 'SIGNED', 'ACTIVE']);
      const activeContracts = contracts.filter((contract: { status?: string }) =>
        activeContractStatuses.has(String(contract.status || '').toUpperCase())
      );
      const totalServiceValue = serviceRequests.reduce((sum, request) => sum + getRequestValue(request), 0);

      setMetrics({
        totalActiveContracts: activeContracts.length,
        totalServiceValue,
        pendingServiceRequests: pendingRequests
      });
      setRecentRequests(
        [...serviceRequests]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'SUBMITTED': 'bg-wujha-primary/10 text-wujha-primary',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'DELIVERED': 'bg-purple-100 text-purple-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Planning Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor service requirements, contracts, and performance metrics
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <button
              onClick={() => {
                setShowNewReqMenu((prev) => !prev);
                setShowQuickActionNewReqMenu(false);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Service Request
            </button>
            {showNewReqMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg z-20">
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Contracts
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 whitespace-nowrap">
                    {metrics.totalActiveContracts}
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
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Service Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 whitespace-nowrap">
                    {formatCurrency(metrics.totalServiceValue)}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 whitespace-nowrap">
                    {metrics.pendingServiceRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Service Requests */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900">Recent Service Requests</h3>
          </div>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
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
              {recentRequests.length > 0 ? recentRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {request.prNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(request.createdAt)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.itemType || 'Service'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.departmentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.projectId || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(getRequestValue(request))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/procurement/services/requisitions/${request.id}`}
                      className="text-wujha-primary hover:text-wujha-primary-hover mr-3"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No service requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <button
              onClick={() => {
                setShowQuickActionNewReqMenu((prev) => !prev);
                setShowNewReqMenu(false);
              }}
              className="inline-flex w-full items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Service Request
            </button>
            {showQuickActionNewReqMenu && (
              <div className="absolute left-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg z-20">
                <Link
                  href="/procurement/services/requisitions/new"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowQuickActionNewReqMenu(false)}
                >
                  Service Requisition
                </Link>
                <Link
                  href="/procurement/services/requisitions/new?mode=mixed"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowQuickActionNewReqMenu(false)}
                >
                  Service + Materials
                </Link>
              </div>
            )}
          </div>
          <Link
            href="/procurement/services/vendors"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Vendors
          </Link>
          <Link
            href="/procurement/services/contracts"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Contracts
          </Link>
          <Link
            href="/procurement/services/performance"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
