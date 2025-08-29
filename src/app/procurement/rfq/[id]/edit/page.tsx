'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  Clock, 
  FileText,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  description: string;
  purchaseRequisition: {
    id: string;
    prNumber: string;
    itemType: string;
  };
  issueDate: string;
  submissionDeadline: string;
  status: string;
  totalEstimatedValue: number;
  currency: string;
  evaluationCriteria: {
    technical: number;
    commercial: number;
    delivery: number;
    experience: number;
  };
}

export default function EditRFQPage() {
  const router = useRouter();
  const params = useParams();
  const rfqId = params.id as string;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    submissionDeadline: '',
    evaluationCriteria: {
      technical: 40,
      commercial: 30,
      delivery: 20,
      experience: 10
    }
  });

  useEffect(() => {
    if (rfqId) {
      fetchRFQ();
    }
  }, [rfqId]);

  const fetchRFQ = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rfq/${rfqId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch RFQ');
      }

      const data = await response.json();
      
      // Debug: Log the raw API response
      console.log('Raw API Response:', data);
      console.log('Data structure:', {
        hasRfq: !!data.rfq,
        rfqStatus: data.rfq?.status,
        directStatus: data.status,
        keys: Object.keys(data)
      });
      
      // Transform the data to match our interface
      // Handle both direct data and nested rfq data
      const rfqData = data.rfq || data;
      
      const transformedRFQ: RFQ = {
        id: rfqData.id,
        rfqNumber: rfqData.rfqNumber,
        title: rfqData.title,
        description: rfqData.description,
        purchaseRequisition: {
          id: rfqData.pr?.id || 'N/A',
          prNumber: rfqData.pr?.prNumber || 'N/A',
          itemType: rfqData.pr?.itemType || 'STOCK'
        },
        issueDate: rfqData.issueDate,
        submissionDeadline: rfqData.closingDate,
        status: rfqData.status, // Keep the original database status
        totalEstimatedValue: parseFloat(rfqData.pr?.estimatedCost || '0'),
        currency: 'OMR',
        evaluationCriteria: rfqData.evaluationCriteria ? 
          JSON.parse(rfqData.evaluationCriteria) : 
          { technical: 40, commercial: 30, delivery: 20, experience: 10 }
      };

      setRfq(transformedRFQ);
      setFormData({
        title: transformedRFQ.title,
        description: transformedRFQ.description,
        submissionDeadline: transformedRFQ.submissionDeadline,
        evaluationCriteria: transformedRFQ.evaluationCriteria
      });
    } catch (error) {
      console.error('Error fetching RFQ:', error);
      setError('Failed to load RFQ details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateEvaluationCriteria = () => {
    const { technical, commercial, delivery, experience } = formData.evaluationCriteria;
    const total = technical + commercial + delivery + experience;
    return total === 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEvaluationCriteria()) {
      setError('Evaluation criteria percentages must total 100%');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/rfq/${rfqId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          closingDate: formData.submissionDeadline,
          evaluationCriteria: JSON.stringify(formData.evaluationCriteria)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update RFQ');
      }

      setSuccess('RFQ updated successfully');
      setTimeout(() => {
        router.push(`/procurement/rfq/${rfqId}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating RFQ:', error);
      setError('Failed to update RFQ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">RFQ not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The RFQ you're looking for doesn't exist or has been removed.
        </p>
        <div className="mt-6">
          <Link
            href="/procurement/rfq"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            Back to RFQs
          </Link>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('RFQ Status Debug:', {
    status: rfq.status,
    statusType: typeof rfq.status,
    statusLength: rfq.status?.length,
    trimmedStatus: rfq.status?.trim(),
    canEdit: ['DRAFT', 'NEW', 'PENDING'].includes(rfq.status?.trim()),
    statusInArray: ['DRAFT', 'NEW', 'PENDING'].includes(rfq.status?.trim())
  });

  // Check if RFQ can be edited based on database status
  // Allow editing for DRAFT status, and potentially other early stages
  const canEdit = ['DRAFT', 'NEW', 'PENDING'].includes(rfq.status?.trim());

  if (!canEdit) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">RFQ cannot be edited</h3>
        <p className="mt-1 text-sm text-gray-500">
          This RFQ has already been issued and cannot be modified. Current status: "{rfq.status}" (Type: {typeof rfq.status})
        </p>
        <div className="mt-6">
          <Link
            href={`/procurement/rfq/${rfq.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            View RFQ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/procurement/rfq/${rfq.id}`}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit RFQ</h1>
            <p className="text-gray-600 mt-1">
              Modify RFQ: {rfq.rfqNumber} (Status: {rfq.status})
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RFQ Number
              </label>
              <input
                type="text"
                value={rfq.rfqNumber}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PR Reference
              </label>
              <input
                type="text"
                value={rfq.purchaseRequisition.prNumber}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter RFQ title"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter detailed description of requirements"
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Date
              </label>
              <input
                type="date"
                value={rfq.issueDate}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Submission Deadline *
              </label>
              <input
                type="date"
                value={formData.submissionDeadline}
                onChange={(e) => handleInputChange('submissionDeadline', e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Evaluation Criteria */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Criteria</h2>
          <p className="text-sm text-gray-600 mb-4">
            Set the weight percentages for different evaluation criteria. Total must equal 100%.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technical Evaluation (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.evaluationCriteria.technical}
                onChange={(e) => handleInputChange('evaluationCriteria.technical', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commercial Evaluation (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.evaluationCriteria.commercial}
                onChange={(e) => handleInputChange('evaluationCriteria.commercial', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Performance (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.evaluationCriteria.delivery}
                onChange={(e) => handleInputChange('evaluationCriteria.delivery', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Experience (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.evaluationCriteria.experience}
                onChange={(e) => handleInputChange('evaluationCriteria.experience', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          
          {/* Total Percentage Display */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Percentage:</span>
              <span className={`text-lg font-bold ${
                validateEvaluationCriteria() ? 'text-green-600' : 'text-red-600'
              }`}>
                {formData.evaluationCriteria.technical + 
                 formData.evaluationCriteria.commercial + 
                 formData.evaluationCriteria.delivery + 
                 formData.evaluationCriteria.experience}%
              </span>
            </div>
            {!validateEvaluationCriteria() && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Total must equal 100%
              </p>
            )}
          </div>
        </div>

        {/* Financial Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Value
              </label>
              <input
                type="text"
                value={`${rfq.totalEstimatedValue.toLocaleString()} ${rfq.currency}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <input
                type="text"
                value={rfq.currency}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Link
            href={`/procurement/rfq/${rfq.id}`}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !validateEvaluationCriteria()}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              <div className="flex items-center">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 