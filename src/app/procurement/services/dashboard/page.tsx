'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  Plus,
  Eye
} from 'lucide-react';
import Link from 'next/link';

interface ServiceMetrics {
  totalActiveContracts: number;
  totalServiceValue: number;
  pendingServiceRequests: number;
  expiringContracts: number;
  servicePerformanceScore: number;
  monthlyServiceSpend: number;
}

interface ServiceRequest {
  id: string;
  prNumber: string;
  serviceType: string;
  department: string;
  estimatedValue: number;
  status: string;
  priority: string;
  createdAt: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  vendor: {
    nameEn: string;
  };
  serviceType: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  status: string;
}

export default function ServiceDashboard() {
  const [metrics, setMetrics] = useState<ServiceMetrics>({
    totalActiveContracts: 0,
    totalServiceValue: 0,
    pendingServiceRequests: 0,
    expiringContracts: 0,
    servicePerformanceScore: 0,
    monthlyServiceSpend: 0
  });
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      // Fetch service-related PRs (NON_STOCK and SERVICE types)
      const serviceRequestsResponse = await fetch('/api/purchase-requisitions?itemType=NON_STOCK,SERVICE&limit=5');
      const serviceRequestsData = await serviceRequestsResponse.json();
      
      // Fetch contracts (using POs as contracts for now)
      const contractsResponse = await fetch('/api/purchase-orders?limit=10');
      const contractsData = await contractsResponse.json();
      
      // Calculate metrics from real data
      const totalServiceRequests = serviceRequestsData.total || 0;
      const pendingRequests = serviceRequestsData.purchaseRequisitions?.filter((pr: any) => 
        pr.status === 'SUBMITTED' || pr.status === 'DRAFT'
      ).length || 0;
      
      const activeContracts = contractsData.purchaseOrders?.filter((po: any) => 
        po.status === 'APPROVED' || po.status === 'DELIVERED'
      ).length || 0;
      
      const totalContractValue = contractsData.purchaseOrders?.reduce((sum: number, po: any) => 
        sum + Number(po.totalAmount || 0), 0
      ) || 0;
      
      // Check for expiring contracts (POs ending within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiring = contractsData.purchaseOrders?.filter((po: any) => {
        if (!po.expectedDeliveryDate) return false;
        const deliveryDate = new Date(po.expectedDeliveryDate);
        return deliveryDate <= thirtyDaysFromNow && po.status === 'APPROVED';
      }) || [];

      setMetrics({
        totalActiveContracts: activeContracts,
        totalServiceValue: totalContractValue,
        pendingServiceRequests: pendingRequests,
        expiringContracts: expiring.length,
        servicePerformanceScore: 4.2, // This would come from performance evaluations
        monthlyServiceSpend: totalContractValue * 0.1 // Estimated monthly spend
      });

      setRecentRequests(serviceRequestsData.purchaseRequisitions?.slice(0, 5) || []);
      setExpiringContracts(expiring.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'SUBMITTED': 'bg-blue-100 text-blue-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'DELIVERED': 'bg-purple-100 text-purple-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'LOW': 'bg-green-100 text-green-800',
      'NORMAL': 'bg-blue-100 text-blue-800',
      'HIGH': 'bg-yellow-100 text-yellow-800',
      'URGENT': 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <Link
            href="/procurement/services/requisitions/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Service Request
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-400" />
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

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Expiring Contracts
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics.expiringContracts}
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
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Performance Score
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics.servicePerformanceScore}/5.0
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
                <Building2 className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Monthly Spend
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(metrics.monthlyServiceSpend)}
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
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
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
                    {formatCurrency(request.totalEstimatedCost || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/procurement/services/requisitions/${request.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-3"
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

      {/* Expiring Contracts */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Contracts Expiring Soon</h3>
            <Link
              href="/procurement/services/contracts"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all contracts
            </Link>
          </div>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expiringContracts.length > 0 ? expiringContracts.map((contract) => (
                <tr key={contract.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {contract.poNumber || contract.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.vendor?.nameEn || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(contract.totalAmount || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(contract.expectedDeliveryDate || contract.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                      {contract.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No expiring contracts found
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
          <Link
            href="/procurement/services/requisitions/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Service Request
          </Link>
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
