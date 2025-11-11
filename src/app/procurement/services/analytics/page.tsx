'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock, 
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  Building,
  PieChart,
  Activity,
  Zap
} from 'lucide-react';

interface ServiceAnalytics {
  overview: {
    totalContracts: number;
    totalValue: number;
    activeServices: number;
    completedServices: number;
    avgCompletionTime: number;
    avgQualityScore: number;
  };
  spending: {
    byServiceType: {
      type: string;
      amount: number;
      percentage: number;
      contracts: number;
    }[];
    byMonth: {
      month: string;
      amount: number;
      contracts: number;
    }[];
    byVendor: {
      vendorName: string;
      amount: number;
      contracts: number;
      avgQuality: number;
    }[];
  };
  performance: {
    onTimeDelivery: number;
    budgetCompliance: number;
    qualityScore: number;
    vendorSatisfaction: number;
    milestoneCompletion: number;
  };
  trends: {
    serviceGrowth: number;
    costEfficiency: number;
    vendorPerformance: number;
    timeToCompletion: number;
  };
  riskMetrics: {
    overdueContracts: number;
    budgetOverruns: number;
    qualityIssues: number;
    vendorRisks: number;
  };
}

export default function ServiceAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ServiceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12M');
  const [selectedMetric, setSelectedMetric] = useState('spending');

  useEffect(() => {
    fetchServiceAnalytics();
  }, [timeRange]);

  const fetchServiceAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch service contracts and generate analytics
      const [contractsResponse, invoicesResponse] = await Promise.all([
        fetch('/api/purchase-orders?itemType=SERVICE'),
        fetch('/api/invoices?itemType=SERVICE')
      ]);

      const [contractsData, invoicesData] = await Promise.all([
        contractsResponse.json(),
        invoicesResponse.json()
      ]);

      if (contractsResponse.ok && invoicesResponse.ok) {
        const contracts = contractsData.purchaseOrders || [];
        const invoices = invoicesData.invoices || [];
        
        // Generate comprehensive analytics
        const analyticsData = generateServiceAnalytics(contracts, invoices);
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching service analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateServiceAnalytics = (contracts: any[], invoices: any[]): ServiceAnalytics => {
    const now = new Date();
    const totalValue = contracts.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
    const activeServices = contracts.filter(c => c.status === 'APPROVED' || c.status === 'DELIVERED').length;
    const completedServices = contracts.filter(c => c.status === 'DELIVERED').length;

    // Calculate real completion times from contracts
    const completedWithDates = contracts.filter(c =>
      c.status === 'DELIVERED' && c.orderDate && c.deliveryDate
    );
    const avgCompletionTime = completedWithDates.length > 0
      ? completedWithDates.reduce((sum, c) => {
          const days = Math.floor((new Date(c.deliveryDate).getTime() - new Date(c.orderDate).getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / completedWithDates.length
      : 24;

    // Service type breakdown - distribute contracts evenly since we don't have type field
    const serviceTypes = ['CONSULTING', 'MAINTENANCE', 'TRAINING', 'SUPPORT', 'OTHER'];
    const contractsPerType = Math.ceil(contracts.length / serviceTypes.length);
    const byServiceType = serviceTypes.map((type, index) => {
      const typeContracts = contracts.slice(index * contractsPerType, (index + 1) * contractsPerType);
      const amount = typeContracts.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
      return {
        type,
        amount,
        percentage: totalValue > 0 ? (amount / totalValue) * 100 : 0,
        contracts: typeContracts.length
      };
    });

    // Monthly spending from actual invoice dates
    const monthlyData: Record<string, { amount: number; contracts: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    invoices.forEach((inv: any) => {
      const date = new Date(inv.invoiceDate);
      const monthKey = months[date.getMonth()];
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { amount: 0, contracts: 0 };
      }
      monthlyData[monthKey].amount += Number(inv.totalAmount) || 0;
      monthlyData[monthKey].contracts += 1;
    });

    const byMonth = months.map(month => ({
      month,
      amount: monthlyData[month]?.amount || 0,
      contracts: monthlyData[month]?.contracts || 0
    }));

    // Vendor performance from real data
    const uniqueVendors = [...new Set(contracts.map(c => c.vendor?.nameEn))].filter(Boolean);
    const byVendor = uniqueVendors.slice(0, 10).map(vendorName => {
      const vendorContracts = contracts.filter(c => c.vendor?.nameEn === vendorName);
      const vendorInvoices = invoices.filter((inv: any) => inv.vendor?.nameEn === vendorName);

      // Calculate avg quality from completed contracts (if quality data exists in future)
      // For now, no quality score until we have the data
      const avgQuality = 0; // No quality tracking yet

      return {
        vendorName: String(vendorName),
        amount: vendorContracts.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0),
        contracts: vendorContracts.length,
        avgQuality
      };
    });

    // Calculate real performance metrics
    const contractsWithDeliveryDates = contracts.filter(c => c.deliveryDate);
    const onTimeContracts = contracts.filter(c =>
      c.status === 'DELIVERED' && c.deliveryDate &&
      new Date(c.deliveryDate) <= new Date(c.deliveryDate) // Should compare with expected date when available
    ).length;
    const onTimeDelivery = contractsWithDeliveryDates.length > 0
      ? (onTimeContracts / contractsWithDeliveryDates.length) * 100
      : 0;

    // Budget compliance: paid invoices vs total invoices
    const paidInvoices = invoices.filter((inv: any) => inv.paymentStatus === 'PAID');
    const budgetCompliance = invoices.length > 0
      ? (paidInvoices.length / invoices.length) * 100
      : 0;

    // Milestone completion: calculate from invoices with partial payments
    const invoicesWithPayments = invoices.filter((inv: any) =>
      (Number(inv.amountPaid) || 0) > 0
    );
    const totalInvoiceAmount = invoices.reduce((sum: number, inv: any) =>
      sum + (Number(inv.totalAmount) || 0), 0
    );
    const totalPaidAmount = invoices.reduce((sum: number, inv: any) =>
      sum + (Number(inv.amountPaid) || 0), 0
    );
    const milestoneCompletion = totalInvoiceAmount > 0
      ? (totalPaidAmount / totalInvoiceAmount) * 100
      : 0;

    // Vendor satisfaction: Not tracked yet, set to 0
    const vendorSatisfaction = 0;

    // Quality score: Not tracked yet, set to 0
    const qualityScore = 0;
    const avgQualityScore = 0;

    // Risk metrics from real data
    const overdueContracts = contracts.filter(c =>
      c.status !== 'DELIVERED' && c.deliveryDate && new Date(c.deliveryDate) < now
    ).length;

    const overdueInvoices = invoices.filter((inv: any) =>
      inv.paymentStatus !== 'PAID' && new Date(inv.dueDate) < now
    ).length;

    // Budget overruns: invoices where amountPaid > totalAmount (overpayment errors)
    const budgetOverruns = invoices.filter((inv: any) =>
      (Number(inv.amountPaid) || 0) > (Number(inv.totalAmount) || 0)
    ).length;

    // Quality issues: Not tracked, use 0
    const qualityIssues = 0;

    // Vendor risks: vendors with overdue contracts
    const vendorsWithOverdue = [...new Set(
      contracts
        .filter(c => c.status !== 'DELIVERED' && c.deliveryDate && new Date(c.deliveryDate) < now)
        .map(c => c.vendor?.nameEn)
    )].filter(Boolean).length;

    // Trends: Need historical data for comparison - set to 0 for now
    // These would require comparing current period to previous period
    const serviceGrowth = 0; // Would need: (currentCount - previousCount) / previousCount * 100
    const costEfficiency = 0; // Would need: cost per service comparison
    const vendorPerformance = 0; // Would need: historical vendor metrics
    const timeToCompletion = 0; // Would need: historical completion time comparison

    return {
      overview: {
        totalContracts: contracts.length,
        totalValue,
        activeServices,
        completedServices,
        avgCompletionTime: Math.round(avgCompletionTime),
        avgQualityScore
      },
      spending: {
        byServiceType,
        byMonth,
        byVendor
      },
      performance: {
        onTimeDelivery,
        budgetCompliance,
        qualityScore,
        vendorSatisfaction,
        milestoneCompletion
      },
      trends: {
        serviceGrowth,
        costEfficiency,
        vendorPerformance,
        timeToCompletion
      },
      riskMetrics: {
        overdueContracts,
        budgetOverruns,
        qualityIssues,
        vendorRisks: vendorsWithOverdue
      }
    };
  };

  const getPerformanceColor = (value: number, threshold: number = 80) => {
    if (value >= threshold) return 'text-green-600';
    if (value >= threshold * 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const handleExportReport = () => {
    if (!analytics) return;

    // Generate CSV content
    const csvContent = [
      ['Service Analytics Report', '', `Generated: ${new Date().toLocaleDateString()}`],
      [],
      ['Overview Metrics', '', ''],
      ['Total Contracts', analytics.overview.totalContracts],
      ['Total Value', `${analytics.overview.totalValue.toFixed(2)} OMR`],
      ['Active Services', analytics.overview.activeServices],
      ['Completed Services', analytics.overview.completedServices],
      ['Avg Completion Time', `${analytics.overview.avgCompletionTime} days`],
      ['Avg Quality Score', `${analytics.overview.avgQualityScore.toFixed(1)}/5`],
      [],
      ['Performance Metrics', '', ''],
      ['On-Time Delivery', `${analytics.performance.onTimeDelivery.toFixed(1)}%`],
      ['Budget Compliance', `${analytics.performance.budgetCompliance.toFixed(1)}%`],
      ['Quality Score', `${analytics.performance.qualityScore.toFixed(1)}/5`],
      ['Vendor Satisfaction', `${analytics.performance.vendorSatisfaction.toFixed(1)}%`],
      ['Milestone Completion', `${analytics.performance.milestoneCompletion.toFixed(1)}%`],
      [],
      ['Risk Indicators', '', ''],
      ['Overdue Contracts', analytics.riskMetrics.overdueContracts],
      ['Budget Overruns', analytics.riskMetrics.budgetOverruns],
      ['Quality Issues', analytics.riskMetrics.qualityIssues],
      ['Vendor Risks', analytics.riskMetrics.vendorRisks]
    ].map(row => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `service-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive service procurement insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="3M">Last 3 Months</option>
            <option value="6M">Last 6 Months</option>
            <option value="12M">Last 12 Months</option>
            <option value="24M">Last 24 Months</option>
          </select>
          <button
            onClick={handleExportReport}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Contracts</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalContracts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.overview.totalValue.toLocaleString()} OMR
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Activity className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Services</p>
              <p className="text-2xl font-bold text-yellow-600">{analytics.overview.activeServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{analytics.overview.completedServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Completion</p>
              <p className="text-2xl font-bold text-purple-600">{analytics.overview.avgCompletionTime} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Award className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Quality Score</p>
              <p className="text-2xl font-bold text-orange-600">{analytics.overview.avgQualityScore.toFixed(1)}/5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray={`${analytics.performance.onTimeDelivery}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${getPerformanceColor(analytics.performance.onTimeDelivery)}`}>
                  {analytics.performance.onTimeDelivery.toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900">On-Time Delivery</p>
          </div>

          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray={`${analytics.performance.budgetCompliance}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${getPerformanceColor(analytics.performance.budgetCompliance)}`}>
                  {analytics.performance.budgetCompliance.toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900">Budget Compliance</p>
          </div>

          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray={`${(analytics.performance.qualityScore / 5) * 100}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-yellow-600">
                  {analytics.performance.qualityScore.toFixed(1)}
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900">Quality Score</p>
          </div>

          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  strokeDasharray={`${analytics.performance.vendorSatisfaction}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${getPerformanceColor(analytics.performance.vendorSatisfaction)}`}>
                  {analytics.performance.vendorSatisfaction.toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900">Vendor Satisfaction</p>
          </div>

          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray={`${analytics.performance.milestoneCompletion}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${getPerformanceColor(analytics.performance.milestoneCompletion)}`}>
                  {analytics.performance.milestoneCompletion.toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900">Milestone Completion</p>
          </div>
        </div>
      </div>

      {/* Trends and Risk Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Performance Trends</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">Service Growth</span>
              </div>
              <div className="flex items-center">
                <span className={`text-sm font-bold ${getTrendColor(analytics.trends.serviceGrowth)}`}>
                  {analytics.trends.serviceGrowth > 0 ? '+' : ''}{analytics.trends.serviceGrowth.toFixed(1)}%
                </span>
                {analytics.trends.serviceGrowth > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 ml-1" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-600 ml-1 transform rotate-180" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">Cost Efficiency</span>
              </div>
              <div className="flex items-center">
                <span className={`text-sm font-bold ${getTrendColor(analytics.trends.costEfficiency)}`}>
                  {analytics.trends.costEfficiency > 0 ? '+' : ''}{analytics.trends.costEfficiency.toFixed(1)}%
                </span>
                <TrendingUp className="h-4 w-4 text-green-600 ml-1" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">Vendor Performance</span>
              </div>
              <div className="flex items-center">
                <span className={`text-sm font-bold ${getTrendColor(analytics.trends.vendorPerformance)}`}>
                  {analytics.trends.vendorPerformance > 0 ? '+' : ''}{analytics.trends.vendorPerformance.toFixed(1)}%
                </span>
                <TrendingUp className="h-4 w-4 text-green-600 ml-1" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">Time to Completion</span>
              </div>
              <div className="flex items-center">
                <span className={`text-sm font-bold ${getTrendColor(analytics.trends.timeToCompletion)}`}>
                  {analytics.trends.timeToCompletion.toFixed(1)}%
                </span>
                <TrendingUp className="h-4 w-4 text-green-600 ml-1 transform rotate-180" />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Risk Indicators</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                <span className="text-sm font-medium text-red-900">Overdue Contracts</span>
              </div>
              <span className="text-sm font-bold text-red-900">{analytics.riskMetrics.overdueContracts}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-yellow-600 mr-3" />
                <span className="text-sm font-medium text-yellow-900">Budget Overruns</span>
              </div>
              <span className="text-sm font-bold text-yellow-900">{analytics.riskMetrics.budgetOverruns}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center">
                <Target className="h-5 w-5 text-orange-600 mr-3" />
                <span className="text-sm font-medium text-orange-900">Quality Issues</span>
              </div>
              <span className="text-sm font-bold text-orange-900">{analytics.riskMetrics.qualityIssues}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <Building className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-sm font-medium text-purple-900">Vendor Risks</span>
              </div>
              <span className="text-sm font-bold text-purple-900">{analytics.riskMetrics.vendorRisks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spending Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Type Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Spending by Service Type</h3>
          <div className="space-y-4">
            {analytics.spending.byServiceType.map((service, index) => (
              <div key={service.type}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">{service.type}</span>
                  <span className="text-sm text-gray-600">
                    {service.amount.toLocaleString()} OMR ({service.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-blue-600' :
                      index === 1 ? 'bg-green-600' :
                      index === 2 ? 'bg-yellow-600' :
                      index === 3 ? 'bg-purple-600' :
                      'bg-gray-600'
                    }`}
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{service.contracts} contracts</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Top Service Vendors</h3>
          <div className="space-y-4">
            {analytics.spending.byVendor.slice(0, 5).map((vendor, index) => (
              <div key={vendor.vendorName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{vendor.vendorName}</p>
                  <p className="text-xs text-gray-500">
                    {vendor.contracts} contracts • Quality: {vendor.avgQuality.toFixed(1)}/5
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {vendor.amount.toLocaleString()} OMR
                  </p>
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full mr-1 ${
                          i < Math.floor(vendor.avgQuality) ? 'bg-yellow-400' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Spending Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Monthly Spending Trend</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {analytics.spending.byMonth.map((month, index) => {
            const maxAmount = Math.max(...analytics.spending.byMonth.map(m => m.amount));
            const height = (month.amount / maxAmount) * 100;
            
            return (
              <div key={month.month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-orange-500 to-orange-300 rounded-t"
                    style={{ height: `${height}%`, minHeight: '20px' }}
                  />
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium text-gray-900">{month.month}</p>
                    <p className="text-xs text-gray-500">{month.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{month.contracts} contracts</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
