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
  BarChart3
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
  avgLeadTime: number;
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

      // Process dashboard stats - use real data from dashboard API
      setStats({
        totalPRs: dashboardData.totalPRs || 0,
        pendingApprovals: dashboardData.pendingApprovals || 0,
        activePOs: dashboardData.activePOs || 0,
        pendingDeliveries: dashboardData.pendingDeliveries || 0,
        totalSpend: dashboardData.totalSpend || 0,
        budgetUtilization: dashboardData.budgetUtilization || 0,
        onTimeDelivery: dashboardData.onTimeDelivery || 0,
        costSavings: dashboardData.costSavings || 0,
        avgLeadTime: dashboardData.avgLeadTime || 0
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
      case 'HIGH': return 'text-wujha-primary bg-wujha-primary/10';
      case 'NORMAL': return 'text-blue-600 bg-blue-100';
      case 'LOW': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'PENDING': case 'SUBMITTED': return 'text-wujha-primary bg-wujha-primary/10';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      case 'DRAFT': return 'text-gray-600 bg-gray-100';
      default: return 'text-wujha-primary bg-wujha-primary/10';
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
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-1">
            Procurement Dashboard
          </h2>
          <p className="text-sm text-gray-500">
            Overview of procurement activities and performance metrics
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center rounded-lg bg-wujha-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-wujha-primary-hover transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total PRs */}
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-2 leading-tight">
                  Total Requisitions
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalPRs || 0}
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-2 leading-tight">
                  Pending Approvals
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.pendingApprovals || 0}
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active POs */}
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-2 leading-tight">
                  Active Purchases
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.activePOs || 0}
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Spend */}
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-2 leading-tight">
                  Total Spend
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.totalSpend || 0)}
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Utilization */}
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-2 leading-tight">
                  Budget Utilization
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.budgetUtilization || 0}%
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Savings */}
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-200">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-2 leading-tight">
                  Cost Savings
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.costSavings || 0)}
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Recent Activity */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(activity.status)}`}>
                        {activity.type}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {activity.status} • {formatDate(activity.date)}
                        </p>
                      </div>
                    </div>
                    {activity.amount && (
                      <div className="flex-shrink-0 ml-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(activity.amount)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Pending Approvals
            </h3>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-3">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.slice(0, 5).map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getPriorityColor(approval.priority)}`}>
                        {approval.priority}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {approval.number}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {approval.requestor} • {approval.daysWaiting} days waiting
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4 text-right">
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {formatCurrency(approval.amount)}
                      </div>
                      <Link 
                        href={`/procurement/requisitions/${approval.id}/approve`}
                        className="inline-flex items-center text-xs font-medium text-wujha-primary hover:text-wujha-primary-hover hover:underline"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No pending approvals</p>
              )}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 lg:col-span-2 xl:col-span-1">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Performance Metrics
            </h3>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">On-Time Delivery</p>
                    <p className="text-xs text-gray-500 mt-0.5">Last 30 days</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4 text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {stats?.onTimeDelivery || 0}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Pending Deliveries</p>
                    <p className="text-xs text-gray-500 mt-0.5">Active POs</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4 text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {stats?.pendingDeliveries || 0}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0 w-3 h-3 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Average Lead Time</p>
                    <p className="text-xs text-gray-500 mt-0.5">Days</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4 text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {stats?.avgLeadTime || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Quick Actions
          </h3>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Link href="/procurement/requisitions/new" className="relative group bg-gradient-to-br from-white to-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-wujha-primary rounded-xl border border-gray-200 hover:border-wujha-primary/50 hover:shadow-md transition-all duration-200">
              <div>
                <span className="rounded-xl inline-flex p-3 bg-wujha-primary/10 text-wujha-primary">
                  <FileText className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-wujha-primary transition-colors">
                  Create PR
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Start a new purchase requisition
                </p>
              </div>
            </Link>

            <Link href="/procurement/purchase-orders/new" className="relative group bg-gradient-to-br from-white to-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-wujha-primary rounded-xl border border-gray-200 hover:border-green-500/50 hover:shadow-md transition-all duration-200">
              <div>
                <span className="rounded-xl inline-flex p-3 bg-green-50 text-green-600">
                  <ShoppingCart className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                  Create PO
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Create purchase order
                </p>
              </div>
            </Link>

            <Link href="/procurement/receipts/new" className="relative group bg-gradient-to-br from-white to-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-wujha-primary rounded-xl border border-gray-200 hover:border-yellow-500/50 hover:shadow-md transition-all duration-200">
              <div>
                <span className="rounded-xl inline-flex p-3 bg-yellow-50 text-yellow-600">
                  <Package className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
                  Goods Receipt
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Record goods receipt
                </p>
              </div>
            </Link>

            <Link href="/procurement/rfq/new" className="relative group bg-gradient-to-br from-white to-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-wujha-primary rounded-xl border border-gray-200 hover:border-purple-500/50 hover:shadow-md transition-all duration-200">
              <div>
                <span className="rounded-xl inline-flex p-3 bg-purple-50 text-purple-600">
                  <Users className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                  Create RFQ
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Request for quotation
                </p>
              </div>
            </Link>

            <Link href="/procurement/reports" className="relative group bg-gradient-to-br from-white to-gray-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-wujha-primary rounded-xl border border-gray-200 hover:border-indigo-500/50 hover:shadow-md transition-all duration-200">
              <div>
                <span className="rounded-xl inline-flex p-3 bg-indigo-50 text-indigo-600">
                  <BarChart3 className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  View Reports
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Analytics & insights
                </p>
              </div>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
