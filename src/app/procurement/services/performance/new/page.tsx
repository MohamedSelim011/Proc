'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Calendar,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Target,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ServiceContract {
  id: string;
  contractNumber: string;
  vendor: {
    nameEn: string;
    vendorCode: string;
  };
  totalValue: number;
  startDate: string;
  endDate: string;
  status: string;
}

interface PerformanceFormData {
  contractId: string;
  evaluationPeriod: string;
  startDate: string;
  endDate: string;
  qualityScore: number;
  timelinessScore: number;
  complianceScore: number;
  penalties: number;
  bonuses: number;
  comments: string;
  kpiMetrics: {
    deliveryAccuracy?: number;
    responseTime?: number;
    customerSatisfaction?: number;
    defectRate?: number;
  };
  slaCompliance: {
    availability?: number;
    responseTime?: number;
    resolutionTime?: number;
  };
}

function NewPerformanceReportContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const contractId = searchParams.get('contractId');

  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<ServiceContract | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<PerformanceFormData>({
    contractId: contractId || '',
    evaluationPeriod: 'Monthly',
    startDate: '',
    endDate: '',
    qualityScore: 0,
    timelinessScore: 0,
    complianceScore: 0,
    penalties: 0,
    bonuses: 0,
    comments: '',
    kpiMetrics: {
      deliveryAccuracy: 0,
      responseTime: 0,
      customerSatisfaction: 0,
      defectRate: 0
    },
    slaCompliance: {
      availability: 0,
      responseTime: 0,
      resolutionTime: 0
    }
  });

  useEffect(() => {
    fetchContracts();
    if (contractId) {
      fetchContractDetails(contractId);
    }
  }, [contractId]);

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/service-contracts?status=ACTIVE');
      const data = await response.json();
      if (response.ok) {
        setContracts(data.contracts || []);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchContractDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/service-contracts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedContract(data);
      }
    } catch (error) {
      console.error('Error fetching contract details:', error);
    }
  };

  const handleContractChange = (id: string) => {
    setFormData(prev => ({ ...prev, contractId: id }));
    const contract = contracts.find(c => c.id === id);
    if (contract) {
      setSelectedContract(contract);
    }
  };

  const handleInputChange = (field: keyof PerformanceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleKPIChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      kpiMetrics: {
        ...prev.kpiMetrics,
        [field]: value
      }
    }));
  };

  const handleSLAChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      slaCompliance: {
        ...prev.slaCompliance,
        [field]: value
      }
    }));
  };

  const calculateOverallScore = () => {
    const { qualityScore, timelinessScore, complianceScore } = formData;
    return (
      (qualityScore * 0.4) +
      (timelinessScore * 0.3) +
      (complianceScore * 0.3)
    ).toFixed(1);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-wujha-primary';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.contractId) {
      newErrors.contractId = 'Service contract is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (formData.qualityScore < 0 || formData.qualityScore > 100) {
      newErrors.qualityScore = 'Quality score must be between 0 and 100';
    }
    if (formData.timelinessScore < 0 || formData.timelinessScore > 100) {
      newErrors.timelinessScore = 'Timeliness score must be between 0 and 100';
    }
    if (formData.complianceScore < 0 || formData.complianceScore > 100) {
      newErrors.complianceScore = 'Compliance score must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/service-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          evaluatedBy: 'current-user-id' // This should come from user context
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', 'Performance report created successfully!');
        router.push('/procurement/services/performance');
      } else {
        showToast('error', data.error || 'Failed to create performance report.');
        setErrors({ submit: data.error || 'Failed to create performance report' });
      }
    } catch (error) {
      showToast('error', 'An error occurred while creating the performance report. Please try again.');
      setErrors({ submit: 'Failed to create performance report. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/procurement/services/performance"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Performance Reports
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Performance Report</h1>
        <p className="mt-1 text-sm text-gray-500">
          Evaluate service contract performance for the reporting period
        </p>
      </div>

      {errors.submit && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-800">{errors.submit}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Contract Selection */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-gray-400" />
            Service Contract Information
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Service Contract <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.contractId}
                onChange={(e) => handleContractChange(e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.contractId ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
              >
                <option value="">Select a service contract</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contractNumber} - {contract.vendor.nameEn}
                  </option>
                ))}
              </select>
              {errors.contractId && (
                <p className="mt-1 text-sm text-red-600">{errors.contractId}</p>
              )}
            </div>

            {selectedContract && (
              <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-900">Vendor:</span>
                    <p className="text-blue-700">{selectedContract.vendor.nameEn}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-900">Contract Value:</span>
                    <p className="text-blue-700">
                      {new Intl.NumberFormat('en-OM', {
                        style: 'currency',
                        currency: 'OMR',
                        minimumFractionDigits: 3
                      }).format(selectedContract.totalValue)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-900">Status:</span>
                    <p className="text-blue-700">{selectedContract.status}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Evaluation Period
              </label>
              <select
                value={formData.evaluationPeriod}
                onChange={(e) => handleInputChange('evaluationPeriod', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
              >
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>

            <div>
              {/* Spacer */}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Evaluation Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.startDate ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Evaluation End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.endDate ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Performance Scores */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Star className="h-5 w-5 mr-2 text-gray-400" />
            Performance Scores (0-100)
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quality Score (40%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.qualityScore}
                onChange={(e) => handleInputChange('qualityScore', parseFloat(e.target.value) || 0)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.qualityScore ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="0-100"
              />
              {errors.qualityScore && (
                <p className="mt-1 text-sm text-red-600">{errors.qualityScore}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Service quality & deliverables</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Timeliness Score (30%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.timelinessScore}
                onChange={(e) => handleInputChange('timelinessScore', parseFloat(e.target.value) || 0)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.timelinessScore ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="0-100"
              />
              {errors.timelinessScore && (
                <p className="mt-1 text-sm text-red-600">{errors.timelinessScore}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">On-time delivery & milestones</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Compliance Score (30%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.complianceScore}
                onChange={(e) => handleInputChange('complianceScore', parseFloat(e.target.value) || 0)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.complianceScore ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="0-100"
              />
              {errors.complianceScore && (
                <p className="mt-1 text-sm text-red-600">{errors.complianceScore}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Contract & SLA compliance</p>
            </div>
          </div>

          {/* Overall Score Display */}
          <div className="mt-6 bg-wujha-primary/10 border-2 border-wujha-primary/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Performance Score</p>
                <p className="text-xs text-gray-500 mt-1">Weighted average of all scores</p>
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(parseFloat(calculateOverallScore()))}`}>
                {calculateOverallScore()}%
              </div>
            </div>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-gray-400" />
            KPI Metrics (0-100, Optional)
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery Accuracy
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.kpiMetrics.deliveryAccuracy || 0}
                onChange={(e) => handleKPIChange('deliveryAccuracy', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Response Time
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.kpiMetrics.responseTime || 0}
                onChange={(e) => handleKPIChange('responseTime', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer Satisfaction
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.kpiMetrics.customerSatisfaction || 0}
                onChange={(e) => handleKPIChange('customerSatisfaction', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Defect Rate (Inverse)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.kpiMetrics.defectRate || 0}
                onChange={(e) => handleKPIChange('defectRate', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0-100"
              />
            </div>
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-gray-400" />
            SLA Compliance (0-100, Optional)
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Availability %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.slaCompliance.availability || 0}
                onChange={(e) => handleSLAChange('availability', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Response Time Compliance
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.slaCompliance.responseTime || 0}
                onChange={(e) => handleSLAChange('responseTime', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Resolution Time Compliance
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.slaCompliance.resolutionTime || 0}
                onChange={(e) => handleSLAChange('resolutionTime', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0-100"
              />
            </div>
          </div>
        </div>

        {/* Financial Adjustments */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
            Financial Adjustments (Optional)
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Penalties (OMR)
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={formData.penalties}
                onChange={(e) => handleInputChange('penalties', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0.000"
              />
              <p className="mt-1 text-xs text-gray-500">Financial penalties for non-compliance</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bonuses (OMR)
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={formData.bonuses}
                onChange={(e) => handleInputChange('bonuses', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0.000"
              />
              <p className="mt-1 text-xs text-gray-500">Performance bonuses for exceeding targets</p>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Additional Comments
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Evaluation Comments
            </label>
            <textarea
              rows={4}
              value={formData.comments}
              onChange={(e) => handleInputChange('comments', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
              placeholder="Enter detailed comments about the service performance, issues encountered, recommendations, etc."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/procurement/services/performance"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Creating...' : 'Create Performance Report'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewPerformanceReport() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    }>
      <NewPerformanceReportContent />
    </Suspense>
  );
}
