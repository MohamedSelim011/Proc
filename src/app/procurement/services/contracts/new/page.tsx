'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { SearchableSelect } from '@/components/common/searchable-select'

interface ServiceRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  requesterId: string;
  priority: string;
  status: string;
  estimatedCost: string;
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
  items?: Array<{
    id: string;
    quantity: number;
    estimatedPrice: string;
    item: {
      id: string;
      itemCode: string;
      nameEn: string;
      unitOfMeasure: string;
    };
  }>;
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

interface ServiceRFPResponseSummary {
  status: string;
  totalAmount?: string | number | null;
  vendor?: { id: string } | null;
}

interface ServiceRFPSummary {
  status: string;
  rfpNumber: string;
  responses?: ServiceRFPResponseSummary[];
}

interface ContractFormData {
  prId: string;
  vendorId: string;
  contractType: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  serviceAmount: number;
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
  const { showToast } = useToast();
  const prId = searchParams.get('prId');

  const [loading, setLoading] = useState(false);
  const [loadingPR, setLoadingPR] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedPR, setSelectedPR] = useState<ServiceRequisition | null>(null);
  const [searchVendor, setSearchVendor] = useState('');
  const [prs, setPRs] = useState<ServiceRequisition[]>([]);
  const [searchPR, setSearchPR] = useState('');

  const [formData, setContractFormData] = useState<ContractFormData>({
    prId: prId || '',
    vendorId: '',
    contractType: 'SERVICE_AGREEMENT',
    startDate: '',
    endDate: '',
    totalValue: 0,
    serviceAmount: 0,
    currency: 'OMR',
    paymentTerms: 'Net 30 days',
    slaTerms: '',
    penaltyClause: '',
    performanceBond: 0,
    retentionAmount: 0,
    insuranceRequirements: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const baseInputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:outline-none focus:ring-2 focus:ring-wujha-primary/30 focus:border-wujha-primary text-gray-900 bg-white placeholder:text-gray-500';
  const errorInputClass =
    'w-full px-3 py-2 border border-red-300 rounded-lg outline-none focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 text-gray-900 bg-white placeholder:text-gray-500';

  useEffect(() => {
    fetchVendors();
    if (prId) {
      fetchPRDetails(prId);
    } else {
      fetchPRs();
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

  const fetchPRs = async () => {
    try {
      setLoadingPR(true);
      const response = await fetch('/api/services/service-requests?limit=300');
      const data = await response.json();
      if (response.ok) {
        const serviceRequests = Array.isArray(data.serviceRequests) ? data.serviceRequests : [];
        const approvedRequests = serviceRequests.filter((request) => request.status === 'APPROVED');
        setPRs(approvedRequests);
      }
    } catch (error) {
      console.error('Error fetching PRs:', error);
    } finally {
      setLoadingPR(false);
    }
  };

  const fetchPRDetails = async (id: string) => {
    try {
      setLoadingPR(true);
      const response = await fetch(`/api/services/service-requests?prId=${id}&limit=1`);
      const data = await response.json();
      if (response.ok) {
        const serviceRequest = Array.isArray(data.serviceRequests) ? data.serviceRequests[0] : null;
        if (!serviceRequest) {
          showToast('error', 'Service request not found');
          return;
        }
        if (serviceRequest.status !== 'APPROVED') {
          showToast('error', 'Only approved service requests can be converted to contracts');
          return;
        }

        const serviceAmount = calculateServiceAmount(serviceRequest);
        const totalAmount = calculateRequisitionTotalAmount(serviceRequest);
        setSelectedPR(serviceRequest);
        setContractFormData(prev => ({
          ...prev,
          prId: id,
          totalValue: totalAmount,
          serviceAmount: serviceAmount > 0 ? serviceAmount : totalAmount
        }));
        
        // Check for awarded RFP and auto-select winning vendor
        await checkRFPForAwardedVendor(id);
      }
    } catch (error) {
      console.error('Error fetching PR details:', error);
    } finally {
      setLoadingPR(false);
    }
  };

  const calculateServiceAmount = (pr: ServiceRequisition): number => {
    const toNumber = (value: unknown): number => {
      const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const serviceItems = pr?.servicePR?.items || [];
    if (serviceItems.length === 0) return 0;
    return serviceItems.reduce((sum, item) => {
      const qty = toNumber(item.quantity);
      const rate = toNumber(item.estimatedRate);
      const duration = Math.max(toNumber(item.duration), 1);
      return sum + qty * rate * duration;
    }, 0);
  };

  const calculateMaterialAmount = (pr: ServiceRequisition): number => {
    const toNumber = (value: unknown): number => {
      const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const materialItems = pr?.items || [];
    if (materialItems.length === 0) return 0;

    return materialItems.reduce((sum, item) => {
      return sum + (toNumber(item.quantity) * toNumber(item.estimatedPrice));
    }, 0);
  };

  const calculateRequisitionTotalAmount = (pr: ServiceRequisition): number => {
    const serviceAmount = calculateServiceAmount(pr);
    const materialAmount = calculateMaterialAmount(pr);
    const computedTotal = serviceAmount + materialAmount;

    if (computedTotal > 0) return computedTotal;

    const fallback = parseFloat(pr.estimatedCost || '0');
    return Number.isFinite(fallback) ? fallback : 0;
  };

  const checkRFPForAwardedVendor = async (prId: string) => {
    try {
      // Check for Service RFP with AWARDED status
      const response = await fetch(`/api/services/rfp?prId=${prId}`);
      if (response.ok) {
        const data = (await response.json()) as { rfps?: ServiceRFPSummary[] };
        // Find RFP with AWARDED status and SELECTED response
        const awardedRFP = data.rfps?.find((rfp) => 
          rfp.status === 'AWARDED' && 
          rfp.responses?.some((r) => r.status === 'SELECTED')
        );
        
        if (awardedRFP) {
          const winningResponse = awardedRFP.responses?.find((r) => r.status === 'SELECTED');
          if (winningResponse && winningResponse.vendor) {
            const winnerId = winningResponse.vendor.id;
            setContractFormData(prev => ({ ...prev, vendorId: winnerId }));
            
            // For awarded RFP, contract totals must follow the winning vendor submission.
            if (winningResponse.totalAmount) {
              const awardedAmount = parseFloat(winningResponse.totalAmount.toString());
              if (Number.isFinite(awardedAmount) && awardedAmount > 0) {
                setContractFormData(prev => ({ 
                  ...prev, 
                  vendorId: winnerId,
                  totalValue: awardedAmount,
                  serviceAmount: awardedAmount
                }));
              }
            }
            
            showToast('info', `Awarded vendor from RFP ${awardedRFP.rfpNumber} has been automatically selected`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking RFP for awarded vendor:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendorId) newErrors.vendorId = 'Vendor is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.totalValue <= 0) newErrors.totalValue = 'Total value must be greater than 0';
    if (formData.serviceAmount <= 0) newErrors.serviceAmount = 'Service amount must be greater than 0';
    if (formData.serviceAmount > formData.totalValue) newErrors.serviceAmount = 'Service amount cannot exceed total value';
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
  ).sort((a, b) => {
    // Sort selected vendor to the top
    if (a.id === formData.vendorId) return -1;
    if (b.id === formData.vendorId) return 1;
    return 0;
  });

  const filteredPRs = prs.filter(pr =>
    pr.prNumber.toLowerCase().includes(searchPR.toLowerCase()) ||
    pr.servicePR?.serviceScope?.toLowerCase().includes(searchPR.toLowerCase())
  );

  if (loadingPR) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
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

      {/* Service Requisition Selection */}
      {!selectedPR ? (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Select Service Requisition</h3>
          <input
            type="text"
            placeholder="Search requisitions..."
            value={searchPR}
            onChange={(e) => setSearchPR(e.target.value)}
            className={`${baseInputClass} mb-4`}
          />
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredPRs.map((pr) => (
              <div
                key={pr.id}
                className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-wujha-primary/30 transition-colors"
                onClick={() => fetchPRDetails(pr.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{pr.prNumber}</h4>
                    <p className="text-sm text-gray-500">{pr.servicePR?.serviceScope}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(calculateRequisitionTotalAmount(pr))}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-wujha-primary" />
                </div>
              </div>
            ))}
            {filteredPRs.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No service requests found
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-wujha-primary/10 border border-wujha-primary/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-wujha-primary">Service Requisition Details</h3>
            <button
              onClick={() => {
                setSelectedPR(null);
                setContractFormData(prev => ({ ...prev, prId: '', totalValue: 0, serviceAmount: 0 }));
              }}
              className="text-sm text-wujha-primary hover:text-wujha-primary-hover"
            >
              Change Requisition
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-wujha-primary/80">Requisition Number</dt>
              <dd className="mt-1 text-sm text-wujha-primary">{selectedPR.prNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-wujha-primary/80">Service Scope</dt>
              <dd className="mt-1 text-sm text-wujha-primary">{selectedPR.servicePR?.serviceScope}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-wujha-primary/80">Duration</dt>
              <dd className="mt-1 text-sm text-wujha-primary">
                {selectedPR.servicePR?.duration} {selectedPR.servicePR?.durationUnit}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-wujha-primary/80">Total Value</dt>
              <dd className="mt-1 text-lg font-bold text-wujha-primary">
                {formatCurrency(calculateRequisitionTotalAmount(selectedPR))}
              </dd>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {selectedPR && (
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
                className={`${baseInputClass} mb-4`}
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
                <SearchableSelect
                  className={baseInputClass}
                  value={formData.contractType}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, contractType: e.target.value }))}
                >
                  <option value="SERVICE_AGREEMENT">Service Agreement</option>
                  <option value="CONSULTING_CONTRACT">Consulting Contract</option>
                  <option value="MAINTENANCE_CONTRACT">Maintenance Contract</option>
                  <option value="SUPPORT_CONTRACT">Support Contract</option>
                </SearchableSelect>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <SearchableSelect
                  className={baseInputClass}
                  value={formData.currency}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="OMR">Omani Rial (OMR)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </SearchableSelect>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  className={errors.startDate ? errorInputClass : baseInputClass}
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
                  className={errors.endDate ? errorInputClass : baseInputClass}
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
                  className={errors.totalValue ? errorInputClass : baseInputClass}
                  value={formData.totalValue}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, totalValue: parseFloat(e.target.value) || 0 }))}
                />
                {errors.totalValue && (
                  <p className="mt-1 text-sm text-red-600">{errors.totalValue}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={errors.serviceAmount ? errorInputClass : baseInputClass}
                  value={formData.serviceAmount}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, serviceAmount: parseFloat(e.target.value) || 0 }))}
                />
                {errors.serviceAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceAmount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Terms *
                </label>
                <SearchableSelect
                  className={errors.paymentTerms ? errorInputClass : baseInputClass}
                  value={formData.paymentTerms}
                  onChange={(e) => setContractFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  <option value="Net 30 days">Net 30 days</option>
                  <option value="Net 45 days">Net 45 days</option>
                  <option value="Net 60 days">Net 60 days</option>
                </SearchableSelect>
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
                  className={baseInputClass}
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
                  className={baseInputClass}
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
                    className={baseInputClass}
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
                    className={baseInputClass}
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
                  className={baseInputClass}
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
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
      )}
    </div>
  );
}

export default function NewServiceContract() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    }>
      <NewServiceContractContent />
    </Suspense>
  );
}
