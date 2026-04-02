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
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Milestone {
  id?: string;
  title: string;
  description: string;
  dueDate: string;
  amount: number;
  percentage: number;
}

interface ServiceContract {
  id: string;
  contractNumber: string;
  totalValue: string;
  serviceAmount?: string | number | null;
  startDate: string;
  endDate: string;
  vendor: {
    nameEn: string;
  };
  pr?: {
    servicePR?: {
      paymentSchedule?: string;
    };
  };
}

function NewMilestoneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractId = searchParams.get('contractId');
  const mode = searchParams.get('mode');
  
  const [contract, setContract] = useState<ServiceContract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      title: '',
      description: '',
      dueDate: '',
      amount: 0,
      percentage: 0
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const paymentSchedule = contract?.pr?.servicePR?.paymentSchedule || '';
  const maxServiceAmount = contract
    ? parseFloat((contract.serviceAmount ?? contract.totalValue) as string) || 0
    : 0;

  useEffect(() => {
    if (contractId) {
      fetchContract();
    }
  }, [contractId]);

  const fetchContract = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/service-contracts/${contractId}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data);
        
        const schedule = data.pr?.servicePR?.paymentSchedule || '';
        if (mode === 'edit') {
          const milestoneResponse = await fetch(`/api/service-milestones?contractId=${contractId}`);
          if (milestoneResponse.ok) {
            const milestoneData = await milestoneResponse.json();
            if (Array.isArray(milestoneData.milestones) && milestoneData.milestones.length > 0) {
              setMilestones(
                milestoneData.milestones.map((ms: any) => ({
                  title: ms.name || '',
                  description: ms.description || '',
                  dueDate: ms.targetDate ? new Date(ms.targetDate).toISOString().split('T')[0] : '',
                  amount: Number(ms.amount || 0),
                  percentage: Number(ms.paymentPercentage || 0)
                }))
              );
              return;
            }
          }
        }

        if (schedule && schedule !== 'MILESTONE') {
          const totalValue = parseFloat((data.serviceAmount ?? data.totalValue) as string) || 0;
          setMilestones([
            {
              title: 'Contract Delivery',
              description: 'Single milestone covering service amount.',
              dueDate: '',
              amount: totalValue,
              percentage: 100
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      setError('Failed to load milestones data');
    } finally {
      setLoadingData(false);
    }
  };

  const isSingleMilestoneMode = Boolean(paymentSchedule && paymentSchedule !== 'MILESTONE');

  const addMilestone = () => {
    if (isSingleMilestoneMode) return;
    setMilestones([...milestones, {
      title: '',
      description: '',
      dueDate: '',
      amount: 0,
      percentage: 0
    }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate percentage based on amount
    if (field === 'amount' && contract) {
      const totalValue = maxServiceAmount;
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      updated[index].percentage = Math.round(percentage * 100) / 100;
    }
    
    setMilestones(updated);
  };

  const validateMilestones = () => {
    if (!contractId) {
      setError('Contract ID is required');
      return false;
    }

    const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      setError(`Total percentage must equal 100%. Current: ${totalPercentage.toFixed(2)}%`);
      return false;
    }

    if (isSingleMilestoneMode && contract) {
      if (milestones.length !== 1) {
        setError('Only one milestone is allowed for this payment schedule.');
        return false;
      }
      const totalValue = maxServiceAmount;
      const singleAmount = milestones[0]?.amount || 0;
      if (Math.abs(singleAmount - totalValue) > 0.01) {
        setError('Single milestone amount must match the service amount.');
        return false;
      }
    }

    const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
    if (totalAmount - maxServiceAmount > 0.01) {
      setError('Total milestone amount cannot exceed the service amount.');
      return false;
    }

    for (const milestone of milestones) {
      if (!milestone.title || !milestone.description || !milestone.dueDate) {
        setError('All milestone fields are required');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateMilestones()) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/service-milestones', {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId,
          milestones
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(mode === 'edit' ? 'Milestones updated successfully!' : 'Milestones created successfully!');
        setTimeout(() => {
          router.push(`/procurement/services/contracts/${contractId}`);
        }, 1500);
      } else {
        setError(data.error || 'Failed to create milestones');
      }
    } catch (error) {
      console.error('Error creating milestones:', error);
      setError('Failed to create milestones');
    } finally {
      setLoading(false);
    }
  };

  if (!contractId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Contract ID Required</h1>
            <p className="mt-2 text-gray-600">Please provide a contract ID to create milestones.</p>
            <Link href="/procurement/services/contracts" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-10 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-wujha-primary mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading milestones...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/procurement/services/contracts/${contractId}`} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Contract
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {mode === 'edit' ? 'Edit Service Milestones' : 'Create Service Milestones'}
              </h1>
              <p className="mt-2 text-gray-600">
                Break down the service delivery into manageable phases with payment schedules
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
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Service Amount (Milestone Cap):</span>
                <span className="ml-2 font-medium">OMR {maxServiceAmount.toFixed(3)}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Vendor:</span>
                <span className="ml-2 font-medium">{contract.vendor.nameEn}</span>
              </div>
            </div>
            {contract.pr?.servicePR?.paymentSchedule && contract.pr.servicePR.paymentSchedule !== 'MILESTONE' && (
              <div className="mt-4 rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">
                      Payment schedule is set to {contract.pr.servicePR.paymentSchedule}. 
                      A single milestone equal to the total contract value will be created.
                    </p>
                  </div>
                </div>
              </div>
            )}
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

        {/* Milestones Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Milestones</h3>
              <button
                type="button"
                onClick={addMilestone}
                disabled={isSingleMilestoneMode}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {milestones.map((milestone, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Milestone {index + 1}</h4>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                      className="block w-full rounded-md border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                      placeholder="e.g., Project Setup, Development Phase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={milestone.dueDate}
                      onChange={(e) => updateMilestone(index, 'dueDate', e.target.value)}
                      className="block w-full rounded-md border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (OMR) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={milestone.amount}
                      onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="block w-full rounded-md border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                      placeholder="0.000"
                      readOnly={isSingleMilestoneMode}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Percentage
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={milestone.percentage}
                      onChange={(e) => updateMilestone(index, 'percentage', parseFloat(e.target.value) || 0)}
                      className="block w-full rounded-md border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                      placeholder="0.00"
                      readOnly
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={milestone.description}
                      onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                      rows={3}
                      className="block w-full rounded-md border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                      placeholder="Describe what will be delivered in this milestone..."
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Total Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                <span className="text-lg font-bold text-gray-900">
                  OMR {milestones.reduce((sum, m) => sum + m.amount, 0).toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-gray-700">Service Amount Cap:</span>
                <span className="text-sm font-semibold text-gray-700">
                  OMR {maxServiceAmount.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-gray-700">Total Percentage:</span>
                <span className={`text-lg font-bold ${
                  Math.abs(milestones.reduce((sum, m) => sum + m.percentage, 0) - 100) < 0.01 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {milestones.reduce((sum, m) => sum + m.percentage, 0).toFixed(2)}%
                </span>
              </div>
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
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                mode === 'edit' ? 'Update Milestones' : 'Create Milestones'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewMilestone() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    }>
      <NewMilestoneContent />
    </Suspense>
  );
}
