'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  User,
  Calendar,
  DollarSign,
  FileText,
  Clock
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Vendor {
  id: string;
  vendorCode: string;
  nameEn: string;
  nameAr: string;
  email: string;
  mobile: string;
  performanceScore?: number;
  status: string;
}

interface ServiceContract {
  id: string;
  contractNumber: string;
  prId: string;
  vendorId: string;
  contractType: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  currency: string;
  paymentTerms: string;
  slaTerms?: string | object;
  penaltyClause?: string;
  performanceBond?: number;
  retentionAmount?: number;
  insuranceRequirements?: string | object;
  status: string;
  vendor: {
    id: string;
    vendorCode: string;
    nameEn: string;
    email: string;
  };
  pr: {
    id: string;
    prNumber: string;
    servicePR: {
      serviceScope: string;
      duration: number;
      durationUnit: string;
    };
  };
}

interface ContractFormData {
  vendorId: string;
  contractType: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  currency: string;
  paymentTerms: string;
  slaTerms?: string;
  penaltyClause?: string;
  performanceBond?: number;
  retentionAmount?: number;
  insuranceRequirements?: string;
}

export default function EditServiceContract() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const contractId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingContract, setLoadingContract] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contract, setContract] = useState<ServiceContract | null>(null);
  const [searchVendor, setSearchVendor] = useState('');

  const [formData, setContractFormData] = useState<ContractFormData>({
    vendorId: '',
    contractType: 'SERVICE_AGREEMENT',
    startDate: '',
    endDate: '',
    totalValue: 0,
    currency: 'OMR',
    paymentTerms: 'Net 30 days',
    slaTerms: '',
    penaltyClause: '',
    performanceBond: 0,
    retentionAmount: 0,
    insuranceRequirements: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (contractId) {
      fetchContract();
      fetchVendors();
    }
  }, [contractId]);

  const fetchContract = async () => {
    try {
      setLoadingContract(true);
      const response = await fetch(`/api/service-contracts/${contractId}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data);
        
        // Format JSON fields for display
        const formatJsonField = (value: string | object | undefined): string => {
          if (!value) return '';
          if (typeof value === 'string') return value;
          if (typeof value === 'object') {
            try {
              return JSON.stringify(value, null, 2);
            } catch {
              return String(value);
            }
          }
          return String(value);
        };

        // Populate form with existing contract data
        setContractFormData({
          vendorId: data.vendorId,
          contractType: data.contractType,
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
          totalValue: parseFloat(data.totalValue?.toString() || '0'),
          currency: data.currency || 'OMR',
          paymentTerms: data.paymentTerms || 'Net 30 days',
          slaTerms: formatJsonField(data.slaTerms),
          penaltyClause: data.penaltyClause || '',
          performanceBond: parseFloat(data.performanceBond?.toString() || '0'),
          retentionAmount: parseFloat(data.retentionAmount?.toString() || '0'),
          insuranceRequirements: formatJsonField(data.insuranceRequirements)
        });
      } else {
        showToast('error', 'Failed to load contract');
        router.push('/procurement/services/contracts');
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      showToast('error', 'Error loading contract');
      router.push('/procurement/services/contracts');
    } finally {
      setLoadingContract(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors?status=ACTIVE');
      const data = await response.json();
      if (response.ok) {
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendorId) newErrors.vendorId = 'Vendor is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.totalValue <= 0) newErrors.totalValue = 'Total value must be greater than 0';
    if (!formData.paymentTerms) newErrors.paymentTerms = 'Payment terms are required';

    // Validate date range
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const submitData = {
        ...formData
      };

      const response = await fetch(`/api/service-contracts/${contractId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', 'Service contract updated successfully');
        router.push(`/procurement/services/contracts/${contractId}`);
      } else {
        console.error('Error updating service contract:', data.error);
        setErrors({ submit: data.error || 'Failed to update service contract' });
        showToast('error', data.error || 'Failed to update service contract');
      }
    } catch (error) {
      console.error('Error submitting service contract:', error);
      setErrors({ submit: 'Failed to update service contract' });
      showToast('error', 'Failed to update service contract');
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

  const filteredVendors = vendors.filter(vendor =>
    vendor.nameEn.toLowerCase().includes(searchVendor.toLowerCase()) ||
    vendor.vendorCode.toLowerCase().includes(searchVendor.toLowerCase())
  ).sort((a, b) => {
    // Sort selected vendor to the top
    if (a.id === formData.vendorId) return -1;
    if (b.id === formData.vendorId) return 1;
    return 0;
  });

  if (loadingContract) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Contract not found</h3>
          <p className="mt-2 text-sm text-gray-500">The contract you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/procurement/services/contracts')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push(`/procurement/services/contracts/${contractId}`)}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Contract Details
          </button>
        </div>
      </div>

      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Edit Service Contract</h1>
        <p className="mt-2 text-lg text-gray-600">
          {contract.contractNumber}
        </p>
      </div>

      {/* Contract Info Display */}
      <div className="bg-wujha-primary/10 border border-wujha-primary/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-wujha-primary">Contract Information</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-wujha-primary/80">Contract Number</dt>
            <dd className="mt-1 text-sm text-wujha-primary">{contract.contractNumber}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-wujha-primary/80">Purchase Requisition</dt>
            <dd className="mt-1 text-sm text-wujha-primary">{contract.pr?.prNumber}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-wujha-primary/80">Service Scope</dt>
            <dd className="mt-1 text-sm text-wujha-primary">{contract.pr?.servicePR?.serviceScope}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-wujha-primary/80">Duration</dt>
            <dd className="mt-1 text-sm text-wujha-primary">
              {contract.pr?.servicePR?.duration} {contract.pr?.servicePR?.durationUnit}
            </dd>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          <div className="space-y-6">
            {/* Vendor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Vendor *
              </label>
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchVendor}
                onChange={(e) => setSearchVendor(e.target.value)}
                className="w-full px-3 py-2 border border-wujha-primary rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary mb-4 text-gray-900 bg-white placeholder:text-gray-600"
              />
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.vendorId === vendor.id
                        ? 'border-wujha-primary bg-wujha-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setContractFormData(prev => ({ ...prev, vendorId: vendor.id }))}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{vendor.nameEn}</h4>
                        <p className="text-sm text-gray-500">{vendor.vendorCode}</p>
                        <p className="text-sm text-gray-500">{vendor.email}</p>
                      </div>
                      {formData.vendorId === vendor.id && (
                        <CheckCircle className="h-5 w-5 text-wujha-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {errors.vendorId && (
                <p className="mt-1 text-sm text-red-600">{errors.vendorId}</p>
              )}
            </div>

            {/* Contract Details */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contract Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-wujha-primary rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.contractType}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, contractType: e.target.value }))}
                >
                  <option value="SERVICE_AGREEMENT">Service Agreement</option>
                  <option value="CONSULTING_CONTRACT">Consulting Contract</option>
                  <option value="MAINTENANCE_CONTRACT">Maintenance Contract</option>
                  <option value="SUPPORT_CONTRACT">Support Contract</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  className="w-full px-3 py-2 border border-wujha-primary rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.currency}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="OMR">Omani Rial (OMR)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white ${
                    errors.startDate ? 'border-red-300' : 'border-wujha-primary'
                  }`}
                  value={formData.startDate}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Date *
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white ${
                    errors.endDate ? 'border-red-300' : 'border-wujha-primary'
                  }`}
                  value={formData.endDate}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Value *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white ${
                    errors.totalValue ? 'border-red-300' : 'border-wujha-primary'
                  }`}
                  value={formData.totalValue}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, totalValue: parseFloat(e.target.value) || 0 }))}
                />
                {errors.totalValue && (
                  <p className="mt-1 text-sm text-red-600">{errors.totalValue}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Terms *
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white ${
                    errors.paymentTerms ? 'border-red-300' : 'border-wujha-primary'
                  }`}
                  value={formData.paymentTerms}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  <option value="Net 30 days">Net 30 days</option>
                  <option value="Net 45 days">Net 45 days</option>
                  <option value="Net 60 days">Net 60 days</option>
                  <option value="Advance Payment">Advance Payment</option>
                  <option value="Milestone-based">Milestone-based</option>
                </select>
                {errors.paymentTerms && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentTerms}</p>
                )}
              </div>
            </div>

            {/* Additional Terms */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  SLA Terms
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-wujha-primary rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white placeholder:text-gray-600"
                  placeholder="Service Level Agreement terms..."
                  value={formData.slaTerms}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, slaTerms: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Penalty Clause
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-wujha-primary rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white placeholder:text-gray-600"
                  placeholder="Penalty terms for non-compliance..."
                  value={formData.penaltyClause}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, penaltyClause: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Performance Bond
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-wujha-primary rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white placeholder:text-gray-600"
                    placeholder="0.00"
                    value={formData.performanceBond}
                    onChange={(e) => setContractFormData(prev => ({ ...prev, performanceBond: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Retention Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-wujha-primary rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white placeholder:text-gray-600"
                    placeholder="0.00"
                    value={formData.retentionAmount}
                    onChange={(e) => setContractFormData(prev => ({ ...prev, retentionAmount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Insurance Requirements
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-wujha-primary rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white placeholder:text-gray-600"
                  placeholder="Insurance requirements and coverage..."
                  value={formData.insuranceRequirements}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, insuranceRequirements: e.target.value }))}
                />
              </div>
            </div>

            {/* Error Messages */}
            {errors.submit && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => router.push(`/procurement/services/contracts/${contractId}`)}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Update Contract
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

