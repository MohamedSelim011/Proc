'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  DollarSign,
  Users,
  FileText,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';

interface DashboardStats {
  totalPRs: number;
  draftPRs: number;
  submittedPRs: number;
  approvedPRs: number;
  rejectedPRs: number;
  totalPRValue: number;
  totalMaterialRequests: number;
  approvedMaterialRequests: number;
  pendingMaterialRequests: number;
  totalMaterialValue: number;
  activePOs: number;
  completedPOs: number;
  pendingDeliveries: number;
  totalSpend: number;
  monthlySpend: number;
  monthlyOrders: number;
  activeVendors: number;
  averageVendorScore: number;
  totalInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  totalUnpaid: number;
  avgLeadTime: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  status: string;
  amount?: number;
  date: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}
interface ApiActivity {
  id: string;
  type: string;
  title: string;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  createdAt: string;
}

interface StatCard {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrapClass: string;
  iconClass: string;
}

export default function ProcurementDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [allActivity, setAllActivity] = useState<RecentActivity[]>([]);
  const [allActivityLoading, setAllActivityLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const dashboardResponse = await fetch('/api/dashboard');
      const dashboardData = await dashboardResponse.json();

      const activityResponse = await fetch('/api/activity-logs?limit=5');
      const activityData = await activityResponse.json();

      setStats({
        totalPRs: dashboardData.totalPRs || 0,
        draftPRs: dashboardData.draftPRs || 0,
        submittedPRs: dashboardData.submittedPRs || 0,
        approvedPRs: dashboardData.approvedPRs || 0,
        rejectedPRs: dashboardData.rejectedPRs || 0,
        totalPRValue: dashboardData.totalPRValue || 0,
        totalMaterialRequests: dashboardData.materialRequests?.total || 0,
        approvedMaterialRequests: dashboardData.materialRequests?.approved || 0,
        pendingMaterialRequests: dashboardData.materialRequests?.pending || 0,
        totalMaterialValue: dashboardData.materialRequests?.totalValue || 0,
        activePOs: dashboardData.activePOs || 0,
        completedPOs: dashboardData.completedPOs || 0,
        pendingDeliveries: dashboardData.pendingDeliveries || 0,
        totalSpend: dashboardData.totalSpend || 0,
        monthlySpend: dashboardData.monthlySpend || 0,
        monthlyOrders: dashboardData.monthlyOrders || 0,
        activeVendors: dashboardData.activeVendors || 0,
        averageVendorScore: dashboardData.averageVendorScore || 0,
        totalInvoices: dashboardData.totalInvoices || 0,
        unpaidInvoices: dashboardData.unpaidInvoices || 0,
        overdueInvoices: dashboardData.overdueInvoices || 0,
        totalUnpaid: dashboardData.totalUnpaid || 0,
        avgLeadTime: dashboardData.avgLeadTime || 0,
      });

      const activities: RecentActivity[] = (activityData.activities || []).map((row: ApiActivity) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        status: row.status || 'N/A',
        amount: row.amount ? Number(row.amount) : undefined,
        date: row.createdAt,
      }));

      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllActivity = async () => {
    try {
      setAllActivityLoading(true);
      const response = await fetch('/api/activity-logs?limit=100');
      const data = await response.json();
      const activities: RecentActivity[] = (data.activities || []).map((row: ApiActivity) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        status: row.status || 'N/A',
        amount: row.amount ? Number(row.amount) : undefined,
        date: row.createdAt,
      }));
      setAllActivity(activities);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setAllActivity([]);
    } finally {
      setAllActivityLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR',
    }).format(amount);
  };
  const formatNumber = (value: number) => new Intl.NumberFormat('en-OM').format(value);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const statCards: StatCard[] = [
    {
      label: 'Material Requests',
      value: formatNumber(stats?.totalMaterialRequests || 0),
      icon: <ClipboardCheck className="h-6 w-6 text-indigo-700" />,
      iconWrapClass: 'bg-indigo-50 ring-indigo-100',
      iconClass: 'text-indigo-700',
    },
    {
      label: 'Material Approved',
      value: formatNumber(stats?.approvedMaterialRequests || 0),
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50 ring-emerald-100',
      iconClass: 'text-emerald-700',
    },
    {
      label: 'Purchase Requisitions',
      value: formatNumber(stats?.totalPRs || 0),
      icon: <FileText className="h-6 w-6 text-blue-700" />,
      iconWrapClass: 'bg-blue-50 ring-blue-100',
      iconClass: 'text-blue-700',
    },
    {
      label: 'PR Total Value',
      value: formatCurrency(stats?.totalPRValue || 0),
      icon: <DollarSign className="h-6 w-6 text-teal-700" />,
      iconWrapClass: 'bg-teal-50 ring-teal-100',
      iconClass: 'text-teal-700',
    },
  ];
  const primaryStatCards = statCards;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-2xl bg-slate-200"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-200"></div>
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-slate-200"></div>
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
              Live overview of requisitions, purchase orders, deliveries, and spend execution.
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
        {primaryStatCards.map((card) => (
          <div
            key={card.label}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="whitespace-nowrap text-2xl font-bold text-slate-900 xl:text-3xl">{card.value}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className={`rounded-xl p-3 ring-1 ${card.iconWrapClass}`}>
                    <span className={card.iconClass}>{card.icon}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                {recentActivity.length} items
              </span>
              <button
                onClick={() => {
                  setShowAllActivity(true);
                  fetchAllActivity();
                }}
                className="text-xs font-semibold text-wujha-primary hover:text-wujha-primary-hover"
              >
                View All
              </button>
            </div>
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
      </section>

      {showAllActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowAllActivity(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">All Recent Activities</h4>
                <p className="text-xs text-slate-500">Showing the most recent events across the system.</p>
              </div>
              <button
                onClick={() => setShowAllActivity(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
              {allActivityLoading ? (
                <div className="py-10 text-center text-sm text-slate-500">Loading activities...</div>
              ) : allActivity.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">No activities yet.</div>
              ) : (
                <div className="space-y-3">
                  {allActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <p className="mt-1 text-sm text-slate-500">Start core procurement workflows with one click.</p>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Link
              href="/procurement/services/requisitions/new"
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
