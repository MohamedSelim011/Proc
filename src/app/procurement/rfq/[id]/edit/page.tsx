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
  CheckCircle,
  Users,
  Building
} from 'lucide-react';
import Link from 'next/link';

interface Vendor {
  id: string;
  nameEn: string;
  vendorCode: string;
  email: string;
  mobile: string;
  categories: {
    category: {
      nameEn: string;
    };
  }[];
}

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
  invitedVendors?: {
    vendorId: string;
  }[];
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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      fetchVendors();
    }
  }, [rfqId]);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors?status=ACTIVE');
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchRFQ = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rfq/${rfqId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch RFQ');
      }

      const data = await response.json();
      
      // Debug: Log the raw API response
      
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
      
      // Format dates for HTML date inputs (YYYY-MM-DD format)
      setFormData({
        title: transformedRFQ.title,
        description: transformedRFQ.description,
        submissionDeadline: formatDateForInput(transformedRFQ.submissionDeadline),
        evaluationCriteria: transformedRFQ.evaluationCriteria
      });
      
      // Set selected vendors
      if (rfqData.invitedVendors) {
        setSelectedVendorIds(rfqData.invitedVendors.map((inv: any) => inv.vendorId));
      }
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

  const handleVendorToggle = (vendorId: string) => {
    setSelectedVendorIds(prev => 
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  // Format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Get local date in YYYY-MM-DD format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const validateEvaluationCriteria = () => {
    const { technical, commercial, delivery, experience } = formData.evaluationCriteria;
    const total = technical + commercial + delivery + experience;
    return total === 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form fields
    const newErrors: Record<string, string> = {};
    
    if (!formData.title || !formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.submissionDeadline) {
      newErrors.submissionDeadline = 'Submission deadline is required';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      setError('Please fix the errors in the form');
      return;
    }
    
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
          evaluationCriteria: JSON.stringify(formData.evaluationCriteria),
          vendorIds: selectedVendorIds
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

  // Check if RFQ can be edited based on database status
  // Only allow editing for DRAFT status (not approved or pending approval)
  const canEdit = rfq.status === 'DRAFT';

  if (!canEdit) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">RFQ cannot be edited</h3>
        <p className="mt-1 text-sm text-gray-500">
          This RFQ has already been issued and cannot be modified. Current status: "{rfq.status}"
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
                onChange={(e) => {
                  const inputValue = e.target.value;
                  handleInputChange('title', inputValue);
                  
                  // Validate in real-time: if value is only whitespace, show error
                  if (inputValue && !inputValue.trim()) {
                    setErrors(prev => ({ ...prev, title: 'Title cannot be only whitespace' }));
                  } else {
                    // Clear error when user types valid content
                    if (errors.title) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.title;
                        return newErrors;
                      });
                    }
                  }
                }}
                onBlur={(e) => {
                  const inputValue = e.target.value;
                  const trimmedValue = inputValue.trim();
                  
                  // If value is only whitespace, clear it and show error
                  if (inputValue && !trimmedValue) {
                    handleInputChange('title', '');
                    setErrors(prev => ({ ...prev, title: 'Title is required' }));
                  } else if (trimmedValue !== inputValue) {
                    // Trim leading/trailing whitespace but keep the value
                    handleInputChange('title', trimmedValue);
                  }
                }}
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  errors.title ? 'border-red-300 ring-red-100' : 'border-gray-300'
                }`}
                placeholder="Enter RFQ title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span>
                  {errors.title}
                </p>
              )}
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
                value={formatDateForInput(rfq.issueDate)}
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

        {/* Vendor Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-wujha-primary" />
            Invited Vendors
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Select vendors to invite for this RFQ. Selected vendors will receive email invitations when the RFQ is published.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedVendorIds.includes(vendor.id)
                    ? 'border-wujha-primary bg-wujha-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleVendorToggle(vendor.id)}
              >
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={selectedVendorIds.includes(vendor.id)}
                    onChange={() => handleVendorToggle(vendor.id)}
                    className="h-4 w-4 text-wujha-primary focus:ring-wujha-primary border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-gray-400 mr-1" />
                      <h3 className="font-medium text-gray-900">{vendor.nameEn}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Code: {vendor.vendorCode}</p>
                    <p className="text-xs text-gray-500">Email: {vendor.email}</p>
                    {vendor.categories.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {vendor.categories.map(c => c.category.nameEn).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {selectedVendorIds.length === 0 && (
            <p className="text-sm text-amber-600 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠️ No vendors selected. You must select at least one vendor to invite for this RFQ.
            </p>
          )}
          
          {selectedVendorIds.length > 0 && (
            <p className="text-sm text-green-600 mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              ✓ {selectedVendorIds.length} vendor{selectedVendorIds.length > 1 ? 's' : ''} selected
            </p>
          )}
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
            disabled={saving || !validateEvaluationCriteria() || selectedVendorIds.length === 0}
            className="px-6 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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