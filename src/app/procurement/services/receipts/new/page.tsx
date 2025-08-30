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
            <Link href="/procurement/services/contracts" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
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
              <Link href={`/procurement/services/contracts/${contractId}`} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 mb-2">
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
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Contract Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Contract:</span>
                <span className="ml-2 font-medium">{contract.contractNumber}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Total Value:</span>
                <span className="ml-2 font-medium">OMR {parseFloat(contract.totalValue).toFixed(3)}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Vendor:</span>
                <span className="ml-2 font-medium">{contract.vendor.nameEn}</span>
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
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Service Receipt Details</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Milestone Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Milestone *
              </label>
              <select
                value={selectedMilestone}
                onChange={(e) => handleMilestoneChange(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Choose a milestone...</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone?.name} - OMR {parseFloat(milestone?.amount || '0').toFixed(3)}
                  </option>
                ))}
              </select>
              {milestones.length === 0 && (
                <p className="mt-2 text-sm text-yellow-600">
                  No milestones found. Please create milestones first.
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description of Work Completed *
              </label>
              <textarea
                value={receipt.description}
                onChange={(e) => updateReceipt('description', e.target.value)}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Describe the work that was completed, services delivered, and outcomes achieved..."
                required
              />
            </div>

            {/* Completion Date and Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Date *
                </label>
                <input
                  type="date"
                  value={receipt.completionDate}
                  onChange={(e) => updateReceipt('completionDate', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (OMR) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={receipt.amount}
                  onChange={(e) => updateReceipt('amount', parseFloat(e.target.value) || 0)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0.000"
                  required
                />
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deliverables *
              </label>
              <textarea
                value={receipt.deliverables}
                onChange={(e) => updateReceipt('deliverables', e.target.value)}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="List all deliverables, documents, or outputs that were provided..."
                required
              />
            </div>

            {/* Quality Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality Score (1-10)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={receipt.qualityScore}
                  onChange={(e) => updateReceipt('qualityScore', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-lg font-medium text-gray-900 w-12 text-center">
                  {receipt.qualityScore}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Attachments
                </label>
                <button
                  type="button"
                  onClick={addAttachment}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add File
                </button>
              </div>
              
              {receipt.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={attachment}
                    onChange={(e) => updateAttachment(index, e.target.value)}
                    placeholder="File name or URL"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {receipt.attachments.length === 0 && (
                <p className="text-sm text-gray-500">
                  No attachments added. You can add file names, URLs, or document references.
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
            <Link
              href={`/procurement/services/contracts/${contractId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || milestones.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Receipt
                </>
              )}
            </button>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NewServiceReceiptContent />
    </Suspense>
  );
}