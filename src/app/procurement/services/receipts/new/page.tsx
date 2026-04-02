'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
  Upload
} from 'lucide-react';
import Link from 'next/link';
import { SearchableSelect } from '@/components/common/searchable-select'

interface ServiceReceipt {
  id?: string;
  milestoneId?: string;
  description: string;
  completionDate: string;
  amount: string;
  deliverables: string;
  qualityScore: number;
  attachments: string[];
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

interface ServiceContract {
  id: string;
  contractNumber: string;
  totalValue: string;
  startDate: string;
  endDate: string;
  vendor: {
    nameEn: string;
  };
}

interface Milestone {
  id: string;
  name: string;
  amount: string;
  status: string;
}

function NewServiceReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractId = searchParams.get('contractId');
  
  const [contract, setContract] = useState<ServiceContract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<string>('');
  const [receipt, setReceipt] = useState<ServiceReceipt>({
    description: '',
    completionDate: '',
    amount: '0',
    deliverables: '',
    qualityScore: 5,
    attachments: [],
    status: 'DRAFT'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (contractId) {
      fetchContract();
      fetchMilestones();
    }
  }, [contractId]);

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/service-contracts/${contractId}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data);
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
    }
  };

  const fetchMilestones = async () => {
    try {
      const response = await fetch(`/api/service-milestones?contractId=${contractId}`);
      if (response.ok) {
        const data = await response.json();
        setMilestones(data.milestones || []);
      }
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const handleMilestoneChange = (milestoneId: string) => {
    setSelectedMilestone(milestoneId);
    const milestone = milestones.find(m => m.id === milestoneId);
    if (milestone) {
      setReceipt(prev => ({
        ...prev,
        amount: milestone.amount
      }));
    }
  };

  const updateReceipt = (field: keyof ServiceReceipt, value: any) => {
    setReceipt(prev => ({ ...prev, [field]: value }));
  };

  const addAttachment = () => {
    setReceipt(prev => ({
      ...prev,
      attachments: [...prev.attachments, '']
    }));
  };

  const removeAttachment = (index: number) => {
    setReceipt(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const updateAttachment = (index: number, value: string) => {
    setReceipt(prev => ({
      ...prev,
      attachments: prev.attachments.map((att, i) => i === index ? value : att)
    }));
  };

  const validateReceipt = () => {
    if (!contractId) {
      setError('Contract ID is required');
      return false;
    }

    if (!selectedMilestone) {
      setError('Please select a milestone');
      return false;
    }

    if (!receipt.description || !receipt.completionDate || !receipt.deliverables) {
      setError('All required fields must be filled');
      return false;
    }

    if (parseFloat(receipt.amount) <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateReceipt()) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/service-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          milestoneId: selectedMilestone,
          ...receipt
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Service receipt created successfully!');
        setTimeout(() => {
          router.push(`/procurement/services/contracts/${contractId}`);
        }, 1500);
      } else {
        setError(data.error || 'Failed to create service receipt');
      }
    } catch (error) {
      console.error('Error creating service receipt:', error);
      setError('Failed to create service receipt');
    } finally {
      setLoading(false);
    }
  };

  if (!contractId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Contract ID Required</h1>
            <p className="mt-2 text-gray-600">Please provide a contract ID to create a service receipt.</p>
            <Link href="/procurement/services/contracts" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/procurement/services/contracts/${contractId}`} className="inline-flex items-center text-sm text-wujha-primary hover:text-wujha-primary-hover mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Contract
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Create Service Receipt</h1>
              <p className="mt-2 text-gray-600">
                Document completed work and deliverables for payment processing
              </p>
            </div>
          </div>
        </div>

        {/* Contract Summary */}
        {contract && (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="h-6 w-6 text-orange-500 mr-3" />
              Contract Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 text-orange-500 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Contract</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{contract.contractNumber}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <DollarSign className="h-5 w-5 text-orange-500 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Total Value</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">OMR {parseFloat(contract.totalValue).toFixed(3)}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-orange-500 mr-2" />
                  <span className="text-sm font-medium text-gray-600">Vendor</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{contract.vendor.nameEn}</span>
              </div>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="rounded-md bg-green-50 p-4 mb-6">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-xl border border-gray-100">
          <div className="px-8 py-6 border-b border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <CheckCircle className="h-6 w-6 text-orange-500 mr-3" />
              Service Receipt Details
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Complete the form below to document the completed work and deliverables
            </p>
          </div>

          <div className="p-8 space-y-8">
            {/* Milestone Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Select Milestone *
              </label>
              <SearchableSelect
                value={selectedMilestone}
                onChange={(e) => handleMilestoneChange(e.target.value)}
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 text-sm"
                required
              >
                <option value="">Choose a milestone...</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone?.name} - OMR {parseFloat(milestone?.amount || '0').toFixed(3)}
                  </option>
                ))}
              </SearchableSelect>
              {milestones.length === 0 && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                  <p className="text-sm text-yellow-800">
                    No milestones found. Please create milestones first.
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Description of Work Completed *
              </label>
              <textarea
                value={receipt.description}
                onChange={(e) => updateReceipt('description', e.target.value)}
                rows={4}
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 text-sm resize-none"
                placeholder="Describe the work that was completed, services delivered, and outcomes achieved..."
                required
              />
            </div>

            {/* Completion Date and Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Completion Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={receipt.completionDate}
                    onChange={(e) => updateReceipt('completionDate', e.target.value)}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 text-sm"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Amount (OMR) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    OMR
                  </span>
                  <input
                    type="number"
                    step="0.001"
                    value={receipt.amount}
                    onChange={(e) => updateReceipt('amount', parseFloat(e.target.value) || 0)}
                    className="block w-full pl-14 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 text-sm"
                    placeholder="0.000"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Deliverables */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Deliverables *
              </label>
              <textarea
                value={receipt.deliverables}
                onChange={(e) => updateReceipt('deliverables', e.target.value)}
                rows={3}
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 text-sm resize-none"
                placeholder="List all deliverables, documents, or outputs that were provided..."
                required
              />
            </div>

            {/* Quality Score */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                Quality Score (1-10)
              </label>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div className="flex items-center space-x-6">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={receipt.qualityScore}
                    onChange={(e) => updateReceipt('qualityScore', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #f97316 0%, #f97316 ${(receipt.qualityScore - 1) * 11.11}%, #e5e7eb ${(receipt.qualityScore - 1) * 11.11}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex items-center justify-center w-16 h-12 bg-orange-100 rounded-lg border border-orange-200">
                    <span className="text-xl font-bold text-orange-600">
                      {receipt.qualityScore}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-3 px-1">
                  <span className="font-medium">Poor</span>
                  <span className="font-medium">Excellent</span>
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Attachments
                </label>
                <button
                  type="button"
                  onClick={addAttachment}
                  className="inline-flex items-center px-4 py-2 border border-orange-200 text-sm font-medium rounded-lg text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add File
                </button>
              </div>
              
              <div className="space-y-3">
                {receipt.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <Upload className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={attachment}
                      onChange={(e) => updateAttachment(index, e.target.value)}
                      placeholder="File name or URL"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              {receipt.attachments.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No attachments added. You can add file names, URLs, or document references.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Required fields</span> are marked with *
            </div>
            <div className="flex space-x-4">
              <Link
                href={`/procurement/services/contracts/${contractId}`}
                className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || milestones.length === 0}
                className="inline-flex items-center px-8 py-3 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewServiceReceipt() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    }>
      <NewServiceReceiptContent />
    </Suspense>
  );
}