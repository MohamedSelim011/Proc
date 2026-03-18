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
  estimatedCost: number;
  status: string;
  priority: string;
  createdAt: string;
  servicePR?: {
    serviceScope: string;
    items: any[];
  };
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
      
      // Fetch service requisitions using the dedicated service API
      const serviceRequestsResponse = await fetch('/api/services/requisitions?limit=5&itemType=SERVICE');
      const serviceRequestsData = await serviceRequestsResponse.json();
      
      // Fetch contracts (using POs as contracts for now)
      const contractsResponse = await fetch('/api/purchase-orders?limit=10');
      const contractsData = await contractsResponse.json();
      
      // Calculate metrics from real data
      const serviceRequests = (serviceRequestsData.serviceRequisitions || []).filter((pr: any) =>
        pr.itemType === 'SERVICE'
      );

      const pendingRequests = serviceRequests.filter((pr: any) =>
        pr.status === 'SUBMITTED' || pr.status === 'DRAFT'
      ).length || 0;
      
      const activeContracts = contractsData.purchaseOrders?.filter((po: any) => 
        po.status === 'APPROVED' || po.status === 'DELIVERED'
      ).length || 0;
      
      const totalContractValue = contractsData.purchaseOrders?.reduce((sum: number, po: any) => 
        sum + Number(po.totalAmount || 0), 0
      ) || 0;

      setMetrics({
        totalActiveContracts: activeContracts,
        totalServiceValue: totalContractValue,
        pendingServiceRequests: pendingRequests
      });

      setRecentRequests(serviceRequests.slice(0, 5));
      
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
                  <dd className="text-lg font-medium text-gray-900">
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
                  <dd className="text-lg font-medium text-gray-900">
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
                  <dd className="text-lg font-medium text-gray-900">
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Service Requests</h3>
            <Link
              href="/procurement/services/requisitions"
              className="text-sm font-medium text-wujha-primary hover:text-wujha-primary-hover"
            >
              View all
            </Link>
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
                    {formatCurrency(request.estimatedCost || 0)}
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
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
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
