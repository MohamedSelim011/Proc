'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Upload, Calendar, DollarSign, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface RFPDetails {
  id: string;
  rfpNumber: string;
  title: string;
  description: string;
  closingDate: string;
  isOpen: boolean;
  pr: {
    prNumber: string;
    servicePR?: {
      serviceScope: string;
      duration: number;
      durationUnit: string;
      items: Array<{
        serviceItem: {
          nameEn: string;
          serviceCategory: {
            nameEn: string;
          };
        };
      }>;
    };
  };
  evaluationCriteria: string;
}

export default function SubmitRFPProposalPage() {
  const params = useParams();
  const router = useRouter();
  const [rfpDetails, setRfpDetails] = useState<RFPDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    totalAmount: '',
    validUntil: '',
    priceBreakdown: '',
    technicalDetails: '',
    deliveryTerms: '',
    notes: ''
  });

  useEffect(() => {
    fetchRFPDetails();
  }, [params?.rfpId, params?.token]);

  const fetchRFPDetails = async () => {
    try {
      const response = await fetch(`/api/services/rfp/submit/${params?.rfpId}/${params?.token}`);
      const data = await response.json();

      if (response.ok) {
        setRfpDetails(data);
      } else {
        setError(data.error || 'Failed to load RFP details');
      }
    } catch (err) {
      setError('Failed to load RFP details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rfpDetails?.isOpen) {
      alert('This RFP is no longer accepting proposals');
      return;
    }

    if (!formData.totalAmount || !formData.validUntil) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const submitFormData = new FormData();
      submitFormData.append('totalAmount', formData.totalAmount);
      submitFormData.append('validUntil', formData.validUntil);
      submitFormData.append('priceBreakdown', formData.priceBreakdown);
      submitFormData.append('technicalDetails', formData.technicalDetails);
      submitFormData.append('deliveryTerms', formData.deliveryTerms);
      submitFormData.append('notes', formData.notes);

      const fileInput = document.querySelector('input[name="proposalFile"]') as HTMLInputElement;
      if (fileInput?.files?.[0]) {
        submitFormData.append('proposalFile', fileInput.files[0]);
      }

      const response = await fetch(`/api/services/rfp/submit/${params?.rfpId}/${params?.token}`, {
        method: 'POST',
        body: submitFormData,
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitted(true);
      } else {
        alert(result.error || 'Failed to submit proposal');
      }
    } catch (err) {
      alert('Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-wujha-primary mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading RFP details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Error</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Proposal Submitted Successfully!</h2>
          <p className="mt-2 text-gray-600">
            Thank you for submitting your proposal for RFP {rfpDetails?.rfpNumber}.
            We will review your submission and contact you soon.
          </p>
        </div>
      </div>
    );
  }

  if (!rfpDetails) {
    return null;
  }

  const evaluationCriteria = rfpDetails.evaluationCriteria ? JSON.parse(rfpDetails.evaluationCriteria) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-wujha-primary px-6 py-4">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-white mr-3" />
              <div>
                <h1 className="text-xl font-bold text-white">{rfpDetails.title}</h1>
                <p className="text-sm text-white/80">RFP Number: {rfpDetails.rfpNumber}</p>
              </div>
            </div>
          </div>

          {/* RFP Details */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Service Requirements</h3>
            {rfpDetails.description && (
              <p className="text-sm text-gray-600 mb-3">{rfpDetails.description}</p>
            )}
            {rfpDetails.pr.servicePR && (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Scope: </span>
                  <span className="text-gray-600">{rfpDetails.pr.servicePR.serviceScope}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duration: </span>
                  <span className="text-gray-600">
                    {rfpDetails.pr.servicePR.duration} {rfpDetails.pr.servicePR.durationUnit}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Evaluation Criteria */}
          {evaluationCriteria.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Evaluation Criteria</h3>
              <div className="space-y-2">
                {evaluationCriteria.map((criteria: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700">{criteria.name}</span>
                    <span className="font-medium text-wujha-primary">{criteria.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning if closed */}
          {!rfpDetails.isOpen && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">
                  This RFP is closed and no longer accepting proposals.
                </p>
              </div>
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Amount (OMR) <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valid Until <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    required
                    value={formData.validUntil}
                    onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Price Breakdown
              </label>
              <textarea
                rows={3}
                value={formData.priceBreakdown}
                onChange={(e) => setFormData({...formData, priceBreakdown: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                placeholder="Provide detailed cost breakdown..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Technical Details
              </label>
              <textarea
                rows={3}
                value={formData.technicalDetails}
                onChange={(e) => setFormData({...formData, technicalDetails: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                placeholder="Describe your technical approach..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery Terms
              </label>
              <textarea
                rows={3}
                value={formData.deliveryTerms}
                onChange={(e) => setFormData({...formData, deliveryTerms: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                placeholder="Specify delivery timeline and terms..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                placeholder="Any additional information..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Proposal Document (PDF)
              </label>
              <div className="mt-1">
                <input
                  type="file"
                  name="proposalFile"
                  accept=".pdf"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-wujha-primary file:text-white hover:file:bg-wujha-primary-hover"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting || !rfpDetails.isOpen}
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Submit Proposal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Closing Date: {new Date(rfpDetails.closingDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

