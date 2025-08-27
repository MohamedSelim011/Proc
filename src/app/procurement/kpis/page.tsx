'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  DollarSign, 
  Users, 
  AlertTriangle,
  BarChart3,
  Calendar,
  Target,
  Package,
  Star,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

interface KPIData {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  kpis: {
    procurementCycleTime: KPIMetric;
    onTimeDeliveryRate: KPIMetric;
    vendorComplianceRate: KPIMetric;
    invoiceProcessingTime: KPIMetric;
    threeWayMatchSuccessRate: KPIMetric;
    costVarianceVsBudget: KPIMetric;
    vendorPerformanceScore: KPIMetric;
    pendingApprovalRate: KPIMetric;
    stockItemDeliveryAccuracy: KPIMetric;
    nonStockServiceQualityRating: KPIMetric;
    inventoryTurnoverRate: KPIMetric;
    dashboardUpdateTimeliness: KPIMetric;
    topVendorSpendContribution: KPIMetric;
  };
}

interface KPIMetric {
  value: number;
  unit: string;
  applicability: string;
  [key: string]: any;
}

const KPI_DEFINITIONS = [
  {
    key: 'procurementCycleTime',
    name: 'Procurement Cycle Time',
    description: 'Measures total time from PR creation to delivery of goods/services',
    formula: 'Delivery/Completion Date - PR Creation Date',
    frequency: 'Monthly',
    icon: Clock,
    target: 30, // days
    format: (value: number) => `${value} days`
  },
  {
    key: 'onTimeDeliveryRate',
    name: 'On-Time Delivery/Service Rate',
    description: '% of deliveries/services completed on or before committed date',
    formula: '(No. of On-Time Deliveries / Total Deliveries) × 100',
    frequency: 'Monthly',
    icon: CheckCircle,
    target: 95, // %
    format: (value: number) => `${value}%`
  },
  {
    key: 'vendorComplianceRate',
    name: 'Vendor Compliance Rate',
    description: 'Measures vendor adherence to contract/SLA terms (insurance, legal, quality)',
    formula: '(No. of Compliant Vendors / Total Vendors) × 100',
    frequency: 'Quarterly',
    icon: Users,
    target: 90, // %
    format: (value: number) => `${value}%`
  },
  {
    key: 'invoiceProcessingTime',
    name: 'Invoice Processing Time',
    description: 'Time from invoice submission to payment execution',
    formula: 'Payment Date - Invoice Submission Date',
    frequency: 'Monthly',
    icon: Clock,
    target: 15, // days
    format: (value: number) => `${value} days`
  },
  {
    key: 'threeWayMatchSuccessRate',
    name: 'Three-Way Match Success Rate',
    description: '% of invoices that match PO and Delivery Note/SRN without discrepancies',
    formula: '(Successful Matches / Total Invoices) × 100',
    frequency: 'Monthly',
    icon: CheckCircle,
    target: 85, // %
    format: (value: number) => `${value}%`
  },
  {
    key: 'costVarianceVsBudget',
    name: 'Cost Variance vs. Budget',
    description: 'Tracks actual procurement cost vs. allocated budget',
    formula: '(Actual Cost - Budgeted Cost) / Budgeted Cost × 100',
    frequency: 'Monthly',
    icon: DollarSign,
    target: 5, // % (within 5%)
    format: (value: number) => `${value > 0 ? '+' : ''}${value}%`
  },
  {
    key: 'vendorPerformanceScore',
    name: 'Vendor Performance Score',
    description: 'Score based on timeliness, quality, responsiveness (scored from SRN, feedback)',
    formula: 'Weighted score (e.g., Delivery 40%, Quality 30%, Support 30%)',
    frequency: 'Quarterly',
    icon: Star,
    target: 80, // score
    format: (value: number) => `${value}/100`
  },
  {
    key: 'pendingApprovalRate',
    name: 'Pending Approval Rate',
    description: '% of PRs/POs/invoices pending approval beyond internal SLA',
    formula: '(No. of Delayed Approvals / Total Pending Items) × 100',
    frequency: 'Weekly',
    icon: AlertTriangle,
    target: 10, // % (lower is better)
    format: (value: number) => `${value}%`
  },
  {
    key: 'stockItemDeliveryAccuracy',
    name: 'Stock Item Delivery Accuracy',
    description: '% of stock items received correctly against PO (quantity, quality, spec)',
    formula: '(Accurate Deliveries / Total Stock Deliveries) × 100',
    frequency: 'Monthly',
    icon: Package,
    target: 95, // %
    format: (value: number) => `${value}%`
  },
  {
    key: 'nonStockServiceQualityRating',
    name: 'Non-Stock Service Quality Rating',
    description: 'Average user or project team rating of delivered services',
    formula: 'Avg. rating from feedback forms (1–5 scale)',
    frequency: 'Monthly',
    icon: Star,
    target: 4.0, // rating
    format: (value: number) => `${value}/5`
  },
  {
    key: 'inventoryTurnoverRate',
    name: 'Inventory Turnover Rate',
    description: 'Measures how quickly inventory is used or sold',
    formula: 'Cost of Goods Sold / Average Inventory',
    frequency: 'Quarterly',
    icon: RefreshCw,
    target: 4, // times per year
    format: (value: number) => `${value}x`
  },
  {
    key: 'dashboardUpdateTimeliness',
    name: 'Dashboard Update Timeliness',
    description: '% of dashboards updated within defined reporting cycle',
    formula: '(No. of Timely Updates / Total Updates) × 100',
    frequency: 'Monthly',
    icon: BarChart3,
    target: 95, // %
    format: (value: number) => `${value}%`
  },
  {
    key: 'topVendorSpendContribution',
    name: 'Top Vendor Spend Contribution',
    description: '% of procurement spend concentrated among top 5 vendors',
    formula: '(Spend by Top 5 Vendors / Total Spend) × 100',
    frequency: 'Quarterly',
    icon: TrendingUp,
    target: 60, // % (balanced vendor portfolio)
    format: (value: number) => `${value}%`
  }
];

export default function KPIDashboard() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>([]);

  useEffect(() => {
    fetchKPIData();
  }, [period]);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/kpis?period=${period}`);
      const data = await response.json();
      
      if (response.ok) {
        setKpiData(data);
      } else {
        console.error('Failed to fetch KPI data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getKPIStatus = (kpiKey: string, value: number) => {
    const definition = KPI_DEFINITIONS.find(def => def.key === kpiKey);
    if (!definition) return 'neutral';

    const target = definition.target;
    
    // Different logic for different KPIs
    if (kpiKey === 'costVarianceVsBudget') {
      return Math.abs(value) <= target ? 'good' : 'bad';
    } else if (kpiKey === 'pendingApprovalRate') {
      return value <= target ? 'good' : 'bad';
    } else if (kpiKey === 'procurementCycleTime' || kpiKey === 'invoiceProcessingTime') {
      return value <= target ? 'good' : 'bad';
    } else {
      return value >= target ? 'good' : 'bad';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'bad': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const exportKPIData = () => {
    if (!kpiData) return;
    
    const csvData = KPI_DEFINITIONS.map(def => {
      const kpi = kpiData.kpis[def.key as keyof typeof kpiData.kpis];
      return {
        'KPI Name': def.name,
        'Value': kpi.value,
        'Unit': kpi.unit,
        'Target': def.target,
        'Status': getKPIStatus(def.key, kpi.value),
        'Applicability': kpi.applicability,
        'Frequency': def.frequency
      };
    });

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-kpis-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Procurement KPIs</h1>
            <p className="mt-2 text-gray-600">
              High-Level Key Performance Indicators for Procure-to-Pay Process
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
            <button
              onClick={fetchKPIData}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={exportKPIData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
        
        {kpiData && (
          <div className="mt-4 text-sm text-gray-500">
            Period: {new Date(kpiData.dateRange.start).toLocaleDateString()} - {new Date(kpiData.dateRange.end).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* KPI Grid */}
      {kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {KPI_DEFINITIONS.map((definition) => {
            const kpi = kpiData.kpis[definition.key as keyof typeof kpiData.kpis];
            const status = getKPIStatus(definition.key, kpi.value);
            const IconComponent = definition.icon;

            return (
              <div
                key={definition.key}
                className={`bg-white rounded-lg shadow border-2 p-6 ${getStatusColor(status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <IconComponent className="h-5 w-5 mr-2" />
                      <h3 className="text-sm font-medium truncate">
                        {definition.name}
                      </h3>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-bold">
                        {definition.format(kpi.value)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Target: {definition.format(definition.target)}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status === 'good' ? 'bg-green-100 text-green-800' :
                      status === 'bad' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {status === 'good' ? '✓' : status === 'bad' ? '✗' : '—'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {definition.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{definition.frequency}</span>
                    <span>{kpi.applicability}</span>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {definition.key === 'procurementCycleTime' && (
                      <>
                        <div>
                          <span className="text-gray-500">Completed:</span>
                          <span className="ml-1 font-medium">{kpi.totalCompleted}</span>
                        </div>
                      </>
                    )}
                    {definition.key === 'onTimeDeliveryRate' && (
                      <>
                        <div>
                          <span className="text-gray-500">On-time:</span>
                          <span className="ml-1 font-medium">{kpi.onTimeDeliveries}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <span className="ml-1 font-medium">{kpi.totalDeliveries}</span>
                        </div>
                      </>
                    )}
                    {definition.key === 'vendorComplianceRate' && (
                      <>
                        <div>
                          <span className="text-gray-500">Compliant:</span>
                          <span className="ml-1 font-medium">{kpi.compliantVendors}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <span className="ml-1 font-medium">{kpi.totalVendors}</span>
                        </div>
                      </>
                    )}
                    {definition.key === 'threeWayMatchSuccessRate' && (
                      <>
                        <div>
                          <span className="text-gray-500">Matched:</span>
                          <span className="ml-1 font-medium">{kpi.successfulMatches}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <span className="ml-1 font-medium">{kpi.totalInvoices}</span>
                        </div>
                      </>
                    )}
                    {definition.key === 'costVarianceVsBudget' && (
                      <>
                        <div>
                          <span className="text-gray-500">Budgeted:</span>
                          <span className="ml-1 font-medium">{kpi.totalBudgeted.toLocaleString()} OMR</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Actual:</span>
                          <span className="ml-1 font-medium">{kpi.totalActual.toLocaleString()} OMR</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Section */}
      {kpiData && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">KPI Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {KPI_DEFINITIONS.filter(def => {
                  const kpi = kpiData.kpis[def.key as keyof typeof kpiData.kpis];
                  return getKPIStatus(def.key, kpi.value) === 'good';
                }).length}
              </div>
              <div className="text-sm text-gray-500">KPIs Meeting Target</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {KPI_DEFINITIONS.filter(def => {
                  const kpi = kpiData.kpis[def.key as keyof typeof kpiData.kpis];
                  return getKPIStatus(def.key, kpi.value) === 'bad';
                }).length}
              </div>
              <div className="text-sm text-gray-500">KPIs Below Target</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((KPI_DEFINITIONS.filter(def => {
                  const kpi = kpiData.kpis[def.key as keyof typeof kpiData.kpis];
                  return getKPIStatus(def.key, kpi.value) === 'good';
                }).length / KPI_DEFINITIONS.length) * 100)}%
              </div>
              <div className="text-sm text-gray-500">Overall Performance</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
