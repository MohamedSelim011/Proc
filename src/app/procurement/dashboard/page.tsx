'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Package,
  Users,
  FileText,
  ShoppingCart,
  BarChart3,
  Settings
} from 'lucide-react';

interface DashboardStats {
  totalPRs: number;
  pendingApprovals: number;
  activePOs: number;
  pendingDeliveries: number;
  totalSpend: number;
  budgetUtilization: number;
  onTimeDelivery: number;
  costSavings: number;
}

interface RecentActivity {
  id: string;
  type: 'PR' | 'PO' | 'GR' | 'Invoice';
  title: string;
  status: string;
  amount?: number;
  date: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

interface PendingApproval {
  id: string;
  type: 'PR' | 'PO' | 'Invoice';
  number: string;
  requestor: string;
  amount: number;
  daysWaiting: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export default function ProcurementDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard statistics
      const dashboardResponse = await fetch('/api/dashboard');
      const dashboardData = await dashboardResponse.json();
      
      // Fetch recent purchase requisitions
      const prResponse = await fetch('/api/purchase-requisitions?limit=5');
      const prData = await prResponse.json();
      
      // Fetch recent purchase orders
      const poResponse = await fetch('/api/purchase-orders?limit=5');
      const poData = await poResponse.json();
      
      // Fetch pending approvals (PRs in submitted status)
      const pendingPRResponse = await fetch('/api/purchase-requisitions?status=SUBMITTED');
      const pendingPRData = await pendingPRResponse.json();

      // Process dashboard stats
      setStats({
        totalPRs: dashboardData.totalPRs || 0,
        pendingApprovals: pendingPRData.requisitions?.length || 0,
        activePOs: dashboardData.activePOs || 0,
        pendingDeliveries: dashboardData.pendingDeliveries || 0,
        totalSpend: dashboardData.totalSpend || 0,
        budgetUtilization: dashboardData.budgetUtilization || 0,
        onTimeDelivery: dashboardData.onTimeDelivery || 0,
        costSavings: dashboardData.costSavings || 0
      });

      // Process recent activity
      const activities: RecentActivity[] = [];
      
      // Add PRs to activity
      prData.requisitions?.slice(0, 3).forEach((pr: any) => {
        activities.push({
          id: pr.id,
          type: 'PR',
          title: `PR ${pr.prNumber}`,
          status: pr.status,
          amount: Number(pr.estimatedCost),
          date: pr.createdAt,
          priority: pr.priority
        });
      });

      // Add POs to activity
      poData.orders?.slice(0, 3).forEach((po: any) => {
        activities.push({
          id: po.id,
          type: 'PO',
          title: `PO ${po.poNumber}`,
          status: po.status,
          amount: Number(po.totalAmount),
          date: po.createdAt
        });
      });

      // Sort by date and take latest 6
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 6));

      // Process pending approvals
      const approvals: PendingApproval[] = pendingPRData.requisitions?.map((pr: any) => ({
        id: pr.id,
        type: 'PR' as const,
        number: pr.prNumber,
        requestor: pr.requesterId,
        amount: Number(pr.estimatedCost),
        daysWaiting: Math.floor((new Date().getTime() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        priority: pr.priority
      })) || [];

      setPendingApprovals(approvals);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'NORMAL': return 'text-blue-600 bg-blue-100';
      case 'LOW': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'PENDING': case 'SUBMITTED': return 'text-yellow-600 bg-yellow-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      case 'DRAFT': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Procurement Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Overview of procurement activities and performance metrics
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {/* Total PRs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Requisitions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalPRs || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Approvals
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.pendingApprovals || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Active POs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Purchase Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.activePOs || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Spend */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Spend (YTD)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats?.totalSpend || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Utilization */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Budget Utilization
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.budgetUtilization || 0}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Savings */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cost Savings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats?.costSavings || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                        {activity.type}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.status} • {formatDate(activity.date)}
                        </p>
                      </div>
                    </div>
                    {activity.amount && (
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(activity.amount)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Pending Approvals
            </h3>
            <div className="space-y-4">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.slice(0, 5).map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(approval.priority)}`}>
                        {approval.priority}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {approval.number}
                        </p>
                        <p className="text-sm text-gray-500">
                          {approval.requestor} • {approval.daysWaiting} days waiting
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(approval.amount)}
                      </div>
                      <Link 
                        href={`/procurement/requisitions/${approval.id}/approve`}
                        className="text-xs text-blue-600 hover:text-blue-500 hover:underline"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No pending approvals</p>
              )}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white shadow rounded-lg lg:col-span-2 xl:col-span-1">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Performance Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">On-Time Delivery</p>
                    <p className="text-xs text-gray-500">Last 30 days</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {stats?.onTimeDelivery || 0}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pending Deliveries</p>
                    <p className="text-xs text-gray-500">Active POs</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {stats?.pendingDeliveries || 0}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Average Lead Time</p>
                    <p className="text-xs text-gray-500">Days</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    12.5
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <button className="relative group bg-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:bg-gray-100">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                  <FileText className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <Link href="/procurement/requisitions/new" className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Create PR
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Start a new purchase requisition
                </p>
              </div>
            </button>

            <button className="relative group bg-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:bg-gray-100">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                  <ShoppingCart className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <Link href="/procurement/purchase-orders/new" className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Create PO
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create purchase order
                </p>
              </div>
            </button>

            <button className="relative group bg-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:bg-gray-100">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                  <Package className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <a href="/procurement/receipts/new" className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Goods Receipt
                  </a>
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Record goods receipt
                </p>
              </div>
            </button>

            <button className="relative group bg-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:bg-gray-100">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                  <Users className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <a href="/procurement/rfq/new" className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Create RFQ
                  </a>
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Request for quotation
                </p>
              </div>
            </button>

            <button className="relative group bg-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:bg-gray-100">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-indigo-50 text-indigo-700 ring-4 ring-white">
                  <BarChart3 className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <a href="/procurement/reports" className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    View Reports
                  </a>
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Analytics & insights
                </p>
              </div>
            </button>

            <button className="relative group bg-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:bg-gray-100">
              <div>
                <span className="rounded-lg inline-flex p-3 bg-rose-50 text-rose-700 ring-4 ring-white">
                  <Settings className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <a href="/procurement/settings" className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Settings
                  </a>
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  System configuration
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
