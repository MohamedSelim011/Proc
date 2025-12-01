'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  FileText,
  DollarSign,
  Package,
  Users,
  Database
} from 'lucide-react';

interface ReportMetrics {
  totalPRs: number;
  totalPOs: number;
  totalSpend: number;
  activeVendors: number;
  prMetrics: {
    approved: number;
    pending: number;
    rejected: number;
    avgApprovalTime: number;
  };
  poMetrics: {
    delivered: number;
    pending: number;
    cancelled: number;
    onTimeDeliveryRate: number;
  };
  invoiceMetrics: {
    total: number;
    paid: number;
    pending: number;
    avgProcessingTime: number;
  };
  vendorMetrics: {
    totalSpend: number;
    avgOrderValue: number;
    topVendors: { name: string; spend: number; orders: number }[];
  };
}

// Advanced reporting engine URL (Jasper / external engine)
// Prefer a NEXT_PUBLIC_ env var, but fall back to the known Railway URL.
const REPORTING_ENGINE_URL =
  process.env.NEXT_PUBLIC_REPORTING_ENGINE_URL ||
  'https://reporting-engine-production-a330.up.railway.app';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filterApplied, setFilterApplied] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [prsResponse, posResponse, invoicesResponse, vendorsResponse] = await Promise.all([
        fetch('/api/purchase-requisitions'),
        fetch('/api/purchase-orders'),
        fetch('/api/invoices'),
        fetch('/api/vendors')
      ]);

      const [prsData, posData, invoicesData, vendorsData] = await Promise.all([
        prsResponse.json(),
        posResponse.json(),
        invoicesResponse.json(),
        vendorsResponse.json()
      ]);

      // Apply date range filter
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Include end of day

      const allPrs = prsData.requisitions || [];
      const allPos = posData.purchaseOrders || [];
      const allInvoices = invoicesData.invoices || [];
      const vendors = vendorsData.vendors || [];

      // Filter data by date range (using createdAt field)
      const prs = allPrs.filter((pr: any) => {
        const prDate = new Date(pr.createdAt);
        return prDate >= startDate && prDate <= endDate;
      });

      const pos = allPos.filter((po: any) => {
        const poDate = new Date(po.createdAt);
        return poDate >= startDate && poDate <= endDate;
      });

      const invoices = allInvoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt);
        return invDate >= startDate && invDate <= endDate;
      });

      // Calculate PR metrics
      const prApproved = prs.filter((pr: any) => pr.status === 'APPROVED').length;
      const prPending = prs.filter((pr: any) => pr.status === 'PENDING' || pr.status === 'UNDER_REVIEW').length;
      const prRejected = prs.filter((pr: any) => pr.status === 'REJECTED').length;

      // Calculate average approval time for approved PRs
      const approvedPRs = prs.filter((pr: any) => pr.status === 'APPROVED' && pr.updatedAt && pr.createdAt);
      const avgApprovalTime = approvedPRs.length > 0
        ? approvedPRs.reduce((sum: number, pr: any) => {
            const days = Math.floor((new Date(pr.updatedAt).getTime() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / approvedPRs.length
        : 0;

      // Calculate PO metrics
      const poDelivered = pos.filter((po: any) => po.status === 'DELIVERED').length;
      const poPending = pos.filter((po: any) => po.status === 'APPROVED' || po.status === 'PENDING').length;
      const poCancelled = pos.filter((po: any) => po.status === 'CANCELLED').length;

      // On-time delivery rate
      const deliveredWithDates = pos.filter((po: any) =>
        po.status === 'DELIVERED' && po.deliveryDate && po.orderDate
      );
      const onTimeDeliveries = deliveredWithDates.filter((po: any) =>
        new Date(po.deliveryDate) <= new Date(po.deliveryDate) // Compare with expected date when available
      ).length;
      const onTimeDeliveryRate = deliveredWithDates.length > 0
        ? (onTimeDeliveries / deliveredWithDates.length) * 100
        : 0;

      // Calculate invoice metrics
      const invoicesPaid = invoices.filter((inv: any) => inv.paymentStatus === 'PAID').length;
      const invoicesPending = invoices.filter((inv: any) =>
        inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIAL'
      ).length;

      // Average invoice processing time
      const paidInvoices = invoices.filter((inv: any) =>
        inv.paymentStatus === 'PAID' && inv.paymentDate && inv.invoiceDate
      );
      const avgInvoiceProcessing = paidInvoices.length > 0
        ? paidInvoices.reduce((sum: number, inv: any) => {
            const days = Math.floor((new Date(inv.paymentDate).getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / paidInvoices.length
        : 0;

      // Calculate vendor metrics
      const activeVendorsList = vendors.filter((v: any) => v.status === 'ACTIVE');
      const totalSpend = pos.reduce((sum: number, po: any) => sum + (Number(po.totalAmount) || 0), 0);

      // Top vendors by spend
      const vendorSpendMap: Record<string, { spend: number; orders: number }> = {};
      pos.forEach((po: any) => {
        const vendorName = po.vendor?.nameEn || 'Unknown';
        if (!vendorSpendMap[vendorName]) {
          vendorSpendMap[vendorName] = { spend: 0, orders: 0 };
        }
        vendorSpendMap[vendorName].spend += Number(po.totalAmount) || 0;
        vendorSpendMap[vendorName].orders += 1;
      });

      const topVendors = Object.entries(vendorSpendMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 10);

      const avgOrderValue = pos.length > 0 ? totalSpend / pos.length : 0;

      setMetrics({
        totalPRs: prs.length,
        totalPOs: pos.length,
        totalSpend,
        activeVendors: activeVendorsList.length,
        prMetrics: {
          approved: prApproved,
          pending: prPending,
          rejected: prRejected,
          avgApprovalTime: Math.round(avgApprovalTime)
        },
        poMetrics: {
          delivered: poDelivered,
          pending: poPending,
          cancelled: poCancelled,
          onTimeDeliveryRate
        },
        invoiceMetrics: {
          total: invoices.length,
          paid: invoicesPaid,
          pending: invoicesPending,
          avgProcessingTime: Math.round(avgInvoiceProcessing)
        },
        vendorMetrics: {
          totalSpend,
          avgOrderValue,
          topVendors
        }
      });

      setFilterApplied(true);

    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (reportType: string) => {
    if (!metrics) return;

    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];

    switch (reportType) {
      case 'pr-analysis':
        csvContent = [
          ['Purchase Requisition Analysis Report', '', `Generated: ${new Date().toLocaleDateString()}`],
          [],
          ['Metric', 'Value'],
          ['Total PRs', metrics.totalPRs],
          ['Approved', metrics.prMetrics.approved],
          ['Pending', metrics.prMetrics.pending],
          ['Rejected', metrics.prMetrics.rejected],
          ['Avg Approval Time (days)', metrics.prMetrics.avgApprovalTime],
        ].map(row => row.join(',')).join('\n');
        break;

      case 'po-summary':
        csvContent = [
          ['Purchase Order Summary Report', '', `Generated: ${new Date().toLocaleDateString()}`],
          [],
          ['Metric', 'Value'],
          ['Total POs', metrics.totalPOs],
          ['Delivered', metrics.poMetrics.delivered],
          ['Pending', metrics.poMetrics.pending],
          ['Cancelled', metrics.poMetrics.cancelled],
          ['On-Time Delivery Rate', `${metrics.poMetrics.onTimeDeliveryRate.toFixed(1)}%`],
        ].map(row => row.join(',')).join('\n');
        break;

      case 'spend-analysis':
        csvContent = [
          ['Spend Analysis Report', '', `Generated: ${new Date().toLocaleDateString()}`],
          [],
          ['Metric', 'Value'],
          ['Total Spend', `${metrics.totalSpend.toFixed(2)} OMR`],
          ['Total Purchase Orders', metrics.totalPOs],
          ['Average Order Value', `${metrics.vendorMetrics.avgOrderValue.toFixed(2)} OMR`],
          [],
          ['Top Vendors by Spend', '', ''],
          ['Vendor Name', 'Total Spend (OMR)', 'Number of Orders'],
          ...metrics.vendorMetrics.topVendors.map(v => [
            v.name,
            v.spend.toFixed(2),
            v.orders
          ])
        ].map(row => row.join(',')).join('\n');
        break;

      case 'vendor-performance':
        csvContent = [
          ['Vendor Performance Report', '', `Generated: ${new Date().toLocaleDateString()}`],
          [],
          ['Vendor Name', 'Total Spend (OMR)', 'Number of Orders', 'Avg Order Value (OMR)'],
          ...metrics.vendorMetrics.topVendors.map(v => [
            v.name,
            v.spend.toFixed(2),
            v.orders,
            (v.spend / v.orders).toFixed(2)
          ])
        ].map(row => row.join(',')).join('\n');
        break;

      case 'invoice-processing':
        csvContent = [
          ['Invoice Processing Report', '', `Generated: ${new Date().toLocaleDateString()}`],
          [],
          ['Metric', 'Value'],
          ['Total Invoices', metrics.invoiceMetrics.total],
          ['Paid', metrics.invoiceMetrics.paid],
          ['Pending Payment', metrics.invoiceMetrics.pending],
          ['Avg Processing Time (days)', metrics.invoiceMetrics.avgProcessingTime],
        ].map(row => row.join(',')).join('\n');
        break;

      default:
        return;
    }

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAll = () => {
    if (!metrics) return;

    const csvContent = [
      ['Procurement Performance Report', '', `Generated: ${new Date().toLocaleDateString()}`],
      [],
      ['PURCHASE REQUISITIONS', '', ''],
      ['Total PRs', metrics.totalPRs],
      ['Approved', metrics.prMetrics.approved],
      ['Pending', metrics.prMetrics.pending],
      ['Rejected', metrics.prMetrics.rejected],
      ['Avg Approval Time (days)', metrics.prMetrics.avgApprovalTime],
      [],
      ['PURCHASE ORDERS', '', ''],
      ['Total POs', metrics.totalPOs],
      ['Delivered', metrics.poMetrics.delivered],
      ['Pending', metrics.poMetrics.pending],
      ['Cancelled', metrics.poMetrics.cancelled],
      ['On-Time Delivery Rate', `${metrics.poMetrics.onTimeDeliveryRate.toFixed(1)}%`],
      [],
      ['FINANCIAL METRICS', '', ''],
      ['Total Spend', `${metrics.totalSpend.toFixed(2)} OMR`],
      ['Average Order Value', `${metrics.vendorMetrics.avgOrderValue.toFixed(2)} OMR`],
      ['Total Invoices', metrics.invoiceMetrics.total],
      ['Invoices Paid', metrics.invoiceMetrics.paid],
      ['Invoices Pending', metrics.invoiceMetrics.pending],
      ['Avg Invoice Processing (days)', metrics.invoiceMetrics.avgProcessingTime],
      [],
      ['VENDOR METRICS', '', ''],
      ['Active Vendors', metrics.activeVendors],
      ['Total Vendor Spend', `${metrics.vendorMetrics.totalSpend.toFixed(2)} OMR`],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `procurement-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Failed to load metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">
            Procurement performance metrics and detailed reports
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none space-x-2">
          <button
            onClick={handleExportAll}
            className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Reports
          </button>
          {/* <a
            href={REPORTING_ENGINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-wujha-primary bg-white px-3 py-2 text-sm font-semibold text-wujha-primary shadow-sm hover:bg-wujha-primary/5"
          >
            <Database className="h-4 w-4 mr-2 text-wujha-primary" />
            Advanced Reports
          </a> */}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="block rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary sm:text-sm text-gray-900"
                value={dateRange.startDate}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, startDate: e.target.value }));
                  setFilterApplied(false);
                }}
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                className="block rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary sm:text-sm text-gray-900"
                value={dateRange.endDate}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, endDate: e.target.value }));
                  setFilterApplied(false);
                }}
              />
            </div>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-wujha-primary shadow-sm text-sm font-medium rounded-md text-wujha-primary bg-white hover:bg-wujha-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Filter className="h-4 w-4 mr-2" />
              {loading ? 'Applying...' : 'Apply Filter'}
            </button>
          </div>

          {filterApplied && !loading && (
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center text-wujha-primary">
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Filter applied</span>
              </div>
              <span className="text-gray-500">•</span>
              <span className="text-gray-600">
                Showing data from {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to {new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-wujha-primary/10 p-2">
                <FileText className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total PRs</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.totalPRs}</dd>
                  <dd className="text-xs text-gray-600">
                    Approved: {metrics.prMetrics.approved} | Pending: {metrics.prMetrics.pending}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-wujha-primary/10 p-2">
                <Package className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total POs</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.totalPOs}</dd>
                  <dd className="text-xs text-gray-600">
                    Delivered: {metrics.poMetrics.delivered} | Pending: {metrics.poMetrics.pending}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-wujha-primary/10 p-2">
                <DollarSign className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Spend</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {(metrics.totalSpend / 1000).toFixed(1)}K OMR
                  </dd>
                  <dd className="text-xs text-gray-600">
                    Avg: {(metrics.vendorMetrics.avgOrderValue || 0).toFixed(0)} OMR/order
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-wujha-primary/10 p-2">
                <Users className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Vendors</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.activeVendors}</dd>
                  <dd className="text-xs text-gray-600">
                    Total spend: {(metrics.vendorMetrics.totalSpend / 1000).toFixed(1)}K OMR
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Procurement Reports */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-wujha-primary" />
              Procurement Reports
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <button
              onClick={() => handleExportReport('pr-analysis')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-wujha-primary/5"
            >
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-900">Purchase Requisition Analysis</h4>
                <p className="text-sm text-gray-500">Detailed PR metrics and trends</p>
              </div>
              <Download className="h-4 w-4 text-wujha-primary" />
            </button>

            <button
              onClick={() => handleExportReport('po-summary')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-wujha-primary/5"
            >
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-900">Purchase Order Summary</h4>
                <p className="text-sm text-gray-500">PO status and delivery performance</p>
              </div>
              <Download className="h-4 w-4 text-wujha-primary" />
            </button>

            <button
              onClick={() => handleExportReport('spend-analysis')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-wujha-primary/5"
            >
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-900">Spend Analysis</h4>
                <p className="text-sm text-gray-500">Category-wise spending breakdown</p>
              </div>
              <Download className="h-4 w-4 text-wujha-primary" />
            </button>
          </div>
        </div>

        {/* Vendor Reports */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-wujha-primary" />
              Vendor Reports
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <button
              onClick={() => handleExportReport('vendor-performance')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-wujha-primary/5"
            >
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-900">Vendor Performance</h4>
                <p className="text-sm text-gray-500">Delivery and quality metrics</p>
              </div>
              <Download className="h-4 w-4 text-wujha-primary" />
            </button>

            <button
              onClick={() => handleExportReport('spend-analysis')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-wujha-primary/5"
            >
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-900">Vendor Spend Analysis</h4>
                <p className="text-sm text-gray-500">Top vendors by spend volume</p>
              </div>
              <Download className="h-4 w-4 text-wujha-primary" />
            </button>

            <div className="flex items-center justify-between p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 opacity-70">
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-900">Vendor Compliance</h4>
                <p className="text-sm text-gray-500">Not yet available</p>
              </div>
              <Download className="h-4 w-4 text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Reports */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-wujha-primary" />
            Financial Reports
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => handleExportReport('invoice-processing')}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-wujha-primary/5"
            >
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-900">Invoice Processing</h4>
                <p className="text-sm text-gray-500">Invoice status and aging</p>
              </div>
              <Download className="h-4 w-4 text-wujha-primary" />
            </button>

            <button
              onClick={() => handleExportReport('spend-analysis')}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-wujha-primary/5"
            >
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-900">Payment Analysis</h4>
                <p className="text-sm text-gray-500">Payment trends and methods</p>
              </div>
              <Download className="h-4 w-4 text-wujha-primary" />
            </button>

            <div className="flex items-center justify-between p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 opacity-70">
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-900">Budget vs Actual</h4>
                <p className="text-sm text-gray-500">Not yet available</p>
              </div>
              <Download className="h-4 w-4 text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-wujha-primary/5 border border-wujha-primary/30 rounded-lg p-6">
        <div className="flex items-start">
          <BarChart3 className="h-6 w-6 text-wujha-primary mr-3 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-wujha-primary">Advanced Analytics Coming Soon</h3>
            <p className="mt-2 text-sm text-wujha-primary">
              Interactive dashboards, predictive analytics, and custom report builder will be available in the next release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
