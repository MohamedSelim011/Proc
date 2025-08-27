'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Star,
  Target,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface ServicePerformance {
  id: string;
  contractNumber: string;
  vendor: {
    id: string;
    nameEn: string;
  };
  serviceType: string;
  reportingPeriod: string;
  performanceScore: number;
  slaCompliance: number;
  deliverableStatus: 'ON_TRACK' | 'DELAYED' | 'COMPLETED' | 'AT_RISK';
  nextMilestone: string;
  nextMilestoneDate: string;
  issuesCount: number;
  lastReportDate: string;
  status: string;
}

interface Filters {
  search: string;
  status: string;
  vendor: string;
  performanceRange: string;
}

export default function ServicePerformance() {
  const [performances, setPerformances] = useState<ServicePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    vendor: '',
    performanceRange: ''
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [currentPage, filters]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      // Use POs as active service contracts and generate performance data
      const response = await fetch('/api/purchase-orders?status=APPROVED');
      const data = await response.json();

      if (response.ok) {
        // Transform POs to performance monitoring format
        const performanceData = (data.purchaseOrders || []).map((po: any) => {
          const performanceScore = Math.random() * 2 + 3; // 3-5 score
          const slaCompliance = Math.random() * 20 + 80; // 80-100%
          const issuesCount = Math.floor(Math.random() * 5);
          
          // Determine deliverable status based on performance
          let deliverableStatus: ServicePerformance['deliverableStatus'];
          if (performanceScore >= 4.5 && slaCompliance >= 95) deliverableStatus = 'COMPLETED';
          else if (performanceScore >= 4.0 && slaCompliance >= 90) deliverableStatus = 'ON_TRACK';
          else if (performanceScore >= 3.5 && slaCompliance >= 80) deliverableStatus = 'DELAYED';
          else deliverableStatus = 'AT_RISK';

          return {
            id: po.id,
            contractNumber: po.poNumber,
            vendor: po.vendor,
            serviceType: 'Professional Services',
            reportingPeriod: 'Monthly',
            performanceScore,
            slaCompliance,
            deliverableStatus,
            nextMilestone: 'Phase 2 Completion',
            nextMilestoneDate: po.expectedDeliveryDate || new Date().toISOString(),
            issuesCount,
            lastReportDate: po.updatedAt,
            status: po.status
          };
        });

        setPerformances(performanceData);
        setTotal(performanceData.length);
        setTotalPages(Math.ceil(performanceData.length / 10));
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getDeliverableStatusColor = (status: ServicePerformance['deliverableStatus']) => {
    const colors = {
      'ON_TRACK': 'bg-green-100 text-green-800',
      'DELAYED': 'bg-yellow-100 text-yellow-800',
      'COMPLETED': 'bg-blue-100 text-blue-800',
      'AT_RISK': 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-blue-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSLAColor = (compliance: number) => {
    if (compliance >= 95) return 'text-green-600';
    if (compliance >= 90) return 'text-blue-600';
    if (compliance >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getDeliverableIcon = (status: ServicePerformance['deliverableStatus']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ON_TRACK':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'DELAYED':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'AT_RISK':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Performance Monitoring</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor active services, track milestones, and validate performance metrics
          </p>
        </div>
        <Link
          href="/procurement/services/performance/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Performance Report
        </Link>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Services
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {performances.length}
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
                <Target className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg. SLA Compliance
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {performances.length > 0 
                      ? `${(performances.reduce((sum, p) => sum + p.slaCompliance, 0) / performances.length).toFixed(1)}%`
                      : '0%'
                    }
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
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg. Performance
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {performances.length > 0 
                      ? (performances.reduce((sum, p) => sum + p.performanceScore, 0) / performances.length).toFixed(1)
                      : '0.0'
                    }/5.0
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
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    At Risk Services
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {performances.filter(p => p.deliverableStatus === 'AT_RISK').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search contracts..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deliverable Status
            </label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="ON_TRACK">On Track</option>
              <option value="DELAYED">Delayed</option>
              <option value="COMPLETED">Completed</option>
              <option value="AT_RISK">At Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
            <input
              type="text"
              placeholder="Vendor name"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              value={filters.vendor}
              onChange={(e) => handleFilterChange('vendor', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Performance Range
            </label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              value={filters.performanceRange}
              onChange={(e) => handleFilterChange('performanceRange', e.target.value)}
            >
              <option value="">All Performance</option>
              <option value="excellent">Excellent (4.5+)</option>
              <option value="good">Good (4.0-4.4)</option>
              <option value="average">Average (3.5-3.9)</option>
              <option value="poor">Poor (&lt;3.5)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * 10, total)}</span> of{' '}
            <span className="font-medium">{total}</span> active services
          </p>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {Object.values(filters).filter(Boolean).length} filters active
            </span>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Contract
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SLA Compliance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deliverable Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Next Milestone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : performances.length > 0 ? (
              performances.map((performance) => (
                <tr key={performance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {performance.contractNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {performance.serviceType}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {performance.vendor?.nameEn || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Last Report: {formatDate(performance.lastReportDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex mr-2">
                        {renderStars(performance.performanceScore)}
                      </div>
                      <span className={`text-sm font-medium ${getPerformanceColor(performance.performanceScore)}`}>
                        {performance.performanceScore.toFixed(1)}
                      </span>
                    </div>
                    {performance.issuesCount > 0 && (
                      <div className="text-xs text-red-600">
                        {performance.issuesCount} issue(s)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getSLAColor(performance.slaCompliance)}`}>
                      {performance.slaCompliance.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {performance.reportingPeriod} reporting
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getDeliverableIcon(performance.deliverableStatus)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDeliverableStatusColor(performance.deliverableStatus)}`}>
                        {performance.deliverableStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {performance.nextMilestone}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(performance.nextMilestoneDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/procurement/services/performance/${performance.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Performance Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/procurement/services/performance/${performance.id}/report`}
                        className="text-green-600 hover:text-green-900"
                        title="Create Performance Report"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                      {performance.deliverableStatus === 'COMPLETED' && (
                        <Link
                          href={`/procurement/services/performance/${performance.id}/accept`}
                          className="text-purple-600 hover:text-purple-900"
                          title="Service Acceptance"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No active services found for performance monitoring.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Performance Alerts */}
      {performances.some(p => p.deliverableStatus === 'AT_RISK' || p.issuesCount > 0) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            Performance Alerts
          </h3>
          <div className="space-y-3">
            {performances
              .filter(p => p.deliverableStatus === 'AT_RISK' || p.issuesCount > 0)
              .map(performance => (
                <div key={performance.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-red-900">
                        {performance.contractNumber} - {performance.vendor?.nameEn}
                      </div>
                      <div className="text-sm text-red-700">
                        {performance.deliverableStatus === 'AT_RISK' && 'Service at risk - '}
                        {performance.issuesCount > 0 && `${performance.issuesCount} unresolved issues`}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/procurement/services/performance/${performance.id}`}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Review →
                  </Link>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
