'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Activity,
  RefreshCw,
  ShieldAlert,
  DollarSign,
  Users,
  FileText,
  ShoppingCart,
  BarChart3,
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

interface ApiRequisition {
  id: string;
  prNumber: string;
  status: string;
  estimatedCost: number | string;
  createdAt: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requesterId: string;
}

interface ApiPurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: number | string;
  createdAt: string;
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

      const dashboardResponse = await fetch('/api/dashboard');
      const dashboardData = await dashboardResponse.json();

      const prResponse = await fetch('/api/purchase-requisitions?limit=5');
      const prData = await prResponse.json();

      const poResponse = await fetch('/api/purchase-orders?limit=5');
      const poData = await poResponse.json();

      const pendingPRResponse = await fetch('/api/purchase-requisitions?status=SUBMITTED');
      const pendingPRData = await pendingPRResponse.json();

      setStats({
        totalPRs: dashboardData.totalPRs || 0,
        pendingApprovals: dashboardData.pendingApprovals || 0,
        activePOs: dashboardData.activePOs || 0,
        pendingDeliveries: dashboardData.pendingDeliveries || 0,
        totalSpend: dashboardData.totalSpend || 0,
        budgetUtilization: dashboardData.budgetUtilization || 0,
        onTimeDelivery: dashboardData.onTimeDelivery || 0,
        costSavings: dashboardData.costSavings || 0,
        avgLeadTime: dashboardData.avgLeadTime || 0,
      });

      const activities: RecentActivity[] = [];

      prData.requisitions?.slice(0, 3).forEach((pr: ApiRequisition) => {
        activities.push({
          id: pr.id,
          type: 'PR',
          title: `PR ${pr.prNumber}`,
          status: pr.status,
          amount: Number(pr.estimatedCost),
          date: pr.createdAt,
          priority: pr.priority,
        });
      });

      poData.orders?.slice(0, 3).forEach((po: ApiPurchaseOrder) => {
        activities.push({
          id: po.id,
          type: 'PO',
          title: `PO ${po.poNumber}`,
          status: po.status,
          amount: Number(po.totalAmount),
          date: po.createdAt,
        });
      });

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 6));

      const approvals: PendingApproval[] =
        pendingPRData.requisitions?.map((pr: ApiRequisition) => ({
          id: pr.id,
          type: 'PR' as const,
          number: pr.prNumber,
          requestor: pr.requesterId,
          amount: Number(pr.estimatedCost),
          daysWaiting: Math.floor(
            (new Date().getTime() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          ),
          priority: pr.priority,
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
      currency: 'OMR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-600 bg-red-100';
      case 'HIGH':
        return 'text-wujha-primary bg-wujha-primary/10';
      case 'NORMAL':
        return 'text-blue-600 bg-blue-100';
      case 'LOW':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600 bg-green-100';
      case 'PENDING':
      case 'SUBMITTED':
        return 'text-wujha-primary bg-wujha-primary/10';
      case 'REJECTED':
        return 'text-red-600 bg-red-100';
      case 'DRAFT':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-wujha-primary bg-wujha-primary/10';
    }
  };

  const highPriorityApprovalsCount = pendingApprovals.filter(
    (approval) => approval.priority === 'HIGH' || approval.priority === 'URGENT'
  ).length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-2xl bg-slate-200"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-200"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="h-96 rounded-2xl bg-slate-200 xl:col-span-3"></div>
          <div className="h-96 rounded-2xl bg-slate-200 xl:col-span-2"></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-wujha-primary/20 bg-gradient-to-r from-wujha-primary via-wujha-secondary to-wujha-primary-hover px-6 py-7 shadow-xl sm:px-8">
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
        <div className="relative md:flex md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Procurement Command Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
              Live overview of requisitions, approvals, purchase orders, and spend execution.
            </p>
          </div>
          <div className="mt-5 md:ml-6 md:mt-0">
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Total Requisitions</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.totalPRs || 0}</p>
                <p className="mt-2 text-sm text-slate-500">Submitted and draft requisition volume.</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
                  <FileText className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Approvals</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.pendingApprovals || 0}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {highPriorityApprovalsCount} high-priority items require attention.
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
                  <Clock className="h-6 w-6 text-amber-700" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Active Purchases</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.activePOs || 0}</p>
                <p className="mt-2 text-sm text-slate-500">Purchase orders currently in progress.</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                  <ShoppingCart className="h-6 w-6 text-indigo-700" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Total Spend</p>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats?.totalSpend || 0)}</p>
                <p className="mt-2 text-sm text-slate-500">Aggregate approved and executed procurement spend.</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                  <DollarSign className="h-6 w-6 text-emerald-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              {recentActivity.length} items
            </span>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 flex-1 items-center space-x-3">
                      <div
                        className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(activity.status)}`}
                      >
                        {activity.type}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{activity.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {activity.status} - {formatDate(activity.date)}
                        </p>
                      </div>
                    </div>
                    {activity.amount && (
                      <div className="ml-4 flex-shrink-0 text-sm font-semibold text-slate-900">
                        {formatCurrency(activity.amount)}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <h3 className="text-lg font-semibold text-slate-900">Pending Approvals</h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
              {highPriorityApprovalsCount} priority
            </span>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-3">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.slice(0, 5).map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 flex-1 items-center space-x-3">
                      <div
                        className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getPriorityColor(approval.priority)}`}
                      >
                        {approval.priority}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{approval.number}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {approval.requestor} - {approval.daysWaiting} days waiting
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <div className="mb-1 text-sm font-semibold text-slate-900">{formatCurrency(approval.amount)}</div>
                      <Link
                        href={`/procurement/requisitions/${approval.id}`}
                        className="inline-flex items-center text-xs font-medium text-wujha-primary hover:text-wujha-primary-hover hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No pending approvals</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <p className="mt-1 text-sm text-slate-500">Start core procurement workflows with one click.</p>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Link
              href="/procurement/requisitions/new"
              className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-wujha-primary/50 hover:shadow-md focus-within:ring-2 focus-within:ring-wujha-primary"
            >
              <div>
                <span className="inline-flex rounded-xl bg-wujha-primary/10 p-3 text-wujha-primary ring-1 ring-wujha-primary/20">
                  <FileText className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-slate-900">Create PR</h3>
                <p className="mt-2 text-sm text-slate-600">Start a new purchase requisition</p>
              </div>
            </Link>

            <Link
              href="/procurement/purchase-orders/new"
              className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md focus-within:ring-2 focus-within:ring-wujha-primary"
            >
              <div>
                <span className="inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-100">
                  <ShoppingCart className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-slate-900">Create PO</h3>
                <p className="mt-2 text-sm text-slate-600">Create purchase order</p>
              </div>
            </Link>

            <Link
              href="/procurement/rfq/new"
              className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-md focus-within:ring-2 focus-within:ring-wujha-primary"
            >
              <div>
                <span className="inline-flex rounded-xl bg-cyan-50 p-3 text-cyan-700 ring-1 ring-cyan-100">
                  <Users className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-slate-900">Create RFQ</h3>
                <p className="mt-2 text-sm text-slate-600">Request for quotation</p>
              </div>
            </Link>

            <Link
              href="/procurement/reports"
              className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-md focus-within:ring-2 focus-within:ring-wujha-primary"
            >
              <div>
                <span className="inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-700 ring-1 ring-indigo-100">
                  <BarChart3 className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold text-slate-900">View Reports</h3>
                <p className="mt-2 text-sm text-slate-600">Analytics and insights</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
