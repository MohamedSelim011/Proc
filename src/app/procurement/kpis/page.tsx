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
  Filter,
  X,
  Eye
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
    applicability: 'Stock & Non-Stock',
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
    applicability: 'Stock & Non-Stock',
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
    applicability: 'Stock & Non-Stock',
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
    applicability: 'Stock & Non-Stock',
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
    applicability: 'Stock & Non-Stock',
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
    applicability: 'All Departments / Projects (for rentals only)',
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
    applicability: 'Stock & Non-Stock',
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
    applicability: 'Stock & Non-Stock',
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
    applicability: 'Stock Only',
    icon: Package,
    target: 95, // %
    format: (value: number) => `${value}%`
  },
  {
    key: 'nonStockServiceQualityRating',
    name: 'Non-Stock Service Quality Rating',
    description: 'Average user or project team rating of delivered services',
    formula: 'Avg. rating from feedback forms (1-5 scale)',
    frequency: 'Monthly',
    applicability: 'Non-Stock Only',
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
    applicability: 'Stock Only',
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
    applicability: 'Stock & Non-Stock',
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
    applicability: 'Stock & Non-Stock',
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [kpiDetails, setKpiDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [kpiTargets, setKpiTargets] = useState<Record<string, number>>({});
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState<string>('');

  useEffect(() => {
    fetchKPITargets();
    fetchKPIData();
  }, [period]);

  const fetchKPITargets = async () => {
    try {
      const response = await fetch('/api/kpis/targets');
      const data = await response.json();
      if (response.ok && data.targets) {
        setKpiTargets(data.targets);
      }
    } catch (error) {
      console.error('Error fetching KPI targets:', error);
    }
  };

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/kpis?period=${period}`);
      const data = await response.json();
      
      if (response.ok) {
        setKpiData(data);
      } else {
        console.error('Failed to fetch KPI data:', data.error);
        // Set empty data structure so table view still works
        setKpiData(null);
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getKPITarget = (kpiKey: string): number => {
    // Use API target if available, otherwise fall back to default
    if (kpiTargets[kpiKey] !== undefined) {
      return kpiTargets[kpiKey];
    }
    const definition = KPI_DEFINITIONS.find(def => def.key === kpiKey);
    return definition?.target || 0;
  };

  const getKPIStatus = (kpiKey: string, value: number) => {
    const target = getKPITarget(kpiKey);
    
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

  const handleEditTarget = (kpiKey: string) => {
    const currentTarget = getKPITarget(kpiKey);
    setEditingTarget(kpiKey);
    setTargetInput(currentTarget.toString());
  };

  const handleSaveTarget = async (kpiKey: string) => {
    const targetValue = parseFloat(targetInput);
    if (isNaN(targetValue)) {
      alert('Please enter a valid number');
      return;
    }

    try {
      const user = localStorage.getItem('user');
      const updatedBy = user ? JSON.parse(user).id || JSON.parse(user).employeeId : null;

      const response = await fetch(`/api/kpis/targets/${kpiKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: targetValue,
          updatedBy
        })
      });

      if (response.ok) {
        // Update local state
        setKpiTargets(prev => ({
          ...prev,
          [kpiKey]: targetValue
        }));
        setEditingTarget(null);
        setTargetInput('');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update target');
      }
    } catch (error) {
      console.error('Error updating target:', error);
      alert('Failed to update target');
    }
  };

  const handleCancelEdit = () => {
    setEditingTarget(null);
    setTargetInput('');
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
        'Target': getKPITarget(def.key),
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

  const handleKPIClick = async (kpiKey: string) => {
    setSelectedKPI(kpiKey);
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/kpis/${kpiKey}?period=${period}`);
      const data = await response.json();
      if (response.ok) {
        setKpiDetails(data);
      } else {
        console.error('Failed to fetch KPI details:', data.error);
      }
    } catch (error) {
      console.error('Error fetching KPI details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setSelectedKPI(null);
    setKpiDetails(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">High-Level KPIs for Procure-to-Pay</h1>
            <p className="mt-2 text-gray-600">
              Key Performance Indicators for Stock & Non-Stock Items
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cards
              </button>
            </div>
            <button
              onClick={fetchKPIData}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
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

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    KPI Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Measurement Formula
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Applicability
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {KPI_DEFINITIONS.map((definition, index) => {
                  const applicability = definition.applicability || 
                    (definition.key.includes('stock') && !definition.key.includes('nonStock') ? 'Stock Only' :
                     definition.key.includes('nonStock') ? 'Non-Stock Only' :
                     'Stock & Non-Stock');
                  
                  return (
                    <tr 
                      key={definition.key} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleKPIClick(definition.key)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <definition.icon className="h-5 w-5 mr-2 text-wujha-primary" />
                          <span className="text-sm font-medium text-gray-900">
                            {definition.name}
                          </span>
                          <Eye className="h-4 w-4 ml-2 text-gray-400" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {definition.description}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 font-mono">
                          {definition.formula}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {definition.frequency}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {applicability}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPI Grid - Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {KPI_DEFINITIONS.map((definition) => {
            const kpi = kpiData?.kpis[definition.key as keyof typeof kpiData.kpis];
            const value = kpi?.value ?? 0;
            const status = kpiData ? getKPIStatus(definition.key, value) : 'neutral';
            const IconComponent = definition.icon;

            return (
              <div
                key={definition.key}
                className={`bg-white rounded-lg shadow border-2 p-6 ${getStatusColor(status)} cursor-pointer transition-all hover:shadow-lg`}
                onClick={() => handleKPIClick(definition.key)}
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
                        {kpiData ? definition.format(value) : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Target: {definition.format(getKPITarget(definition.key))}
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
                    <span>{definition.applicability || (definition.key.includes('stock') && !definition.key.includes('nonStock') ? 'Stock Only' : definition.key.includes('nonStock') ? 'Non-Stock Only' : 'Stock & Non-Stock')}</span>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {kpiData && kpi && definition.key === 'procurementCycleTime' && kpi.totalCompleted !== undefined && (
                      <div>
                        <span className="text-gray-500">Completed:</span>
                        <span className="ml-1 font-medium">{kpi.totalCompleted}</span>
                      </div>
                    )}
                    {kpiData && kpi && definition.key === 'onTimeDeliveryRate' && kpi.onTimeDeliveries !== undefined && (
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
                    {kpiData && kpi && definition.key === 'vendorComplianceRate' && kpi.compliantVendors !== undefined && (
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
                    {kpiData && kpi && definition.key === 'threeWayMatchSuccessRate' && kpi.successfulMatches !== undefined && (
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
                    {kpiData && kpi && definition.key === 'costVarianceVsBudget' && kpi.totalBudgeted !== undefined && (
                      <>
                        <div>
                          <span className="text-gray-500">Budgeted:</span>
                          <span className="ml-1 font-medium">{(kpi.totalBudgeted || 0).toLocaleString()} OMR</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Actual:</span>
                          <span className="ml-1 font-medium">{(kpi.totalActual || 0).toLocaleString()} OMR</span>
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

      {/* KPI Details Modal */}
      {selectedKPI && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {KPI_DEFINITIONS.find(d => d.key === selectedKPI)?.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {kpiDetails?.dateRange && (
                    <>Period: {new Date(kpiDetails.dateRange.start).toLocaleDateString()} - {new Date(kpiDetails.dateRange.end).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
                </div>
              ) : kpiDetails ? (
                <div className="space-y-6">
                  {/* Summary */}
                  {kpiDetails.summary && (
                    <div className="bg-wujha-primary/10 border-2 border-wujha-primary/30 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(kpiDetails.summary).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">
                              {typeof value === 'number' 
                                ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                : String(value ?? '')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items/Details Table */}
                  {kpiDetails.items && kpiDetails.items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Detailed Data</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(kpiDetails.items[0]).map((key) => (
                                <th
                                  key={key}
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider"
                                >
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {kpiDetails.items.slice(0, 100).map((item: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                {Object.values(item).map((value: any, idx: number) => (
                                  <td key={idx} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {value instanceof Date
                                      ? value.toLocaleDateString()
                                      : typeof value === 'number'
                                      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                      : String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {kpiDetails.items.length > 100 && (
                          <p className="text-sm text-gray-500 mt-2 text-center">
                            Showing first 100 of {kpiDetails.items.length} items
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Top Vendors (for Top Vendor Spend Contribution) */}
                  {kpiDetails.topVendors && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Top 5 Vendors</h3>
                      <div className="space-y-2">
                        {kpiDetails.topVendors.map((vendor: any, index: number) => (
                          <div key={vendor.vendorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-lg font-bold text-wujha-primary mr-3">#{index + 1}</span>
                              <div>
                                <p className="font-medium text-gray-900">{vendor.vendorName}</p>
                                <p className="text-sm text-gray-500">{vendor.vendorCode}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {new Intl.NumberFormat('en-OM', {
                                  style: 'currency',
                                  currency: 'OMR',
                                  minimumFractionDigits: 3
                                }).format(vendor.totalSpend)}
                              </p>
                              <p className="text-xs text-gray-500">{vendor.orderCount} orders</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No details available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
