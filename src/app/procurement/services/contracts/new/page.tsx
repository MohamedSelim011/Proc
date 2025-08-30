'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface ServiceRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  requesterId: string;
  priority: string;
  status: string;
  estimatedCost: string;
  budgetCode: string;
  justification: string;
  createdAt: string;
  updatedAt: string;
  servicePR: {
    id: string;
    serviceScope: string;
    technicalSpecifications?: string;
    duration: number;
    durationUnit: string;
    items: Array<{
      id: string;
      quantity: string;
      estimatedRate: string;
      duration: number;
      durationUnit: string;
      specifications?: string;
      deliverables: string[];
      performanceMetrics: string[];
      serviceItem: {
        id: string;
        serviceCode: string;
        nameEn: string;
        nameAr: string;
        unitOfMeasure: string;
        serviceCategory: {
          id: string;
          nameEn: string;
          nameAr: string;
        };
      };
    }>;
  };
}

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

interface ContractFormData {
  prId: string;
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

function NewServiceContractContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prId = searchParams.get('prId');

  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedPR, setSelectedPR] = useState<ServiceRequisition | null>(null);
  const [searchVendor, setSearchVendor] = useState('');

  const [formData, setContractFormData] = useState<ContractFormData>({
    prId: prId || '',
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
    fetchVendors();
    if (prId) {
      fetchPRDetails(prId);
    }
  }, [prId]);

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

  const fetchPRDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/services/requisitions/${id}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedPR(data);
        setContractFormData(prev => ({
          ...prev,
          prId: id,
          totalValue: parseFloat(data.estimatedCost) || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching PR details:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendorId) newErrors.vendorId = 'Vendor is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.totalValue <= 0) newErrors.totalValue = 'Total value must be greater than 0';
    if (!formData.paymentTerms) newErrors.paymentTerms = 'Payment terms are required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        status: 'DRAFT'
      };

      const response = await fetch('/api/service-contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/procurement/services/contracts/${data.id}`);
      } else {
        console.error('Error creating service contract:', data.error);
        setErrors({ submit: data.error || 'Failed to create service contract' });
      }
    } catch (error) {
      console.error('Error submitting service contract:', error);
      setErrors({ submit: 'Failed to create service contract' });
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
  );

  if (!selectedPR) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/procurement/services/contracts')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Service Contracts
          </button>
        </div>
      </div>

      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Create Service Contract</h1>
        <p className="mt-2 text-lg text-gray-600">
          Convert approved service requisition to service contract
        </p>
      </div>

      {/* Service Requisition Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Service Requisition Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-blue-700">Requisition Number</dt>
            <dd className="mt-1 text-sm text-blue-900">{selectedPR.prNumber}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-blue-700">Service Scope</dt>
            <dd className="mt-1 text-sm text-blue-900">{selectedPR.servicePR?.serviceScope}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-blue-700">Duration</dt>
            <dd className="mt-1 text-sm text-blue-900">
              {selectedPR.servicePR?.duration} {selectedPR.servicePR?.durationUnit}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-blue-700">Total Value</dt>
            <dd className="mt-1 text-lg font-bold text-blue-900">
              {formatCurrency(parseFloat(selectedPR.estimatedCost))}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              />
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.vendorId === vendor.id
                        ? 'border-blue-500 bg-blue-50'
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
                        <CheckCircle className="h-5 w-5 text-blue-600" />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.startDate ? 'border-red-300' : ''
                  }`}
                  value={formData.startDate}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
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
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.endDate ? 'border-red-300' : ''
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
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.totalValue ? 'border-red-300' : ''
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
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.paymentTerms ? 'border-red-300' : ''
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Create Service Contract
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

export default function NewServiceContract() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NewServiceContractContent />
    </Suspense>
  );
}