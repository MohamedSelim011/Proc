'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Upload, Calendar, DollarSign, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ToastProvider, useToast } from '@/components/ui/toast';

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
      serviceCategory?: string;
      serviceType?: string;
      paymentTerms?: string;
      technicalSpecifications?: string;
      qualityStandards?: string;
      duration: number;
      durationUnit: string;
      items: Array<{
        id: string;
        quantity: string | number;
        estimatedRate: string | number;
        unit?: string | null;
        duration: number;
        durationUnit: string;
        specifications?: string | null;
        deliverables?: unknown;
        performanceMetrics?: unknown;
        serviceItem: {
          serviceCode?: string;
          nameEn: string;
          description?: string | null;
          unitOfMeasure?: string;
          serviceCategory: {
            nameEn: string;
          };
        };
      }>;
    };
  };
}

export default function SubmitRFPProposalPage() {
  return (
    <ToastProvider>
      <SubmitRFPProposalContent />
    </ToastProvider>
  );
}

function SubmitRFPProposalContent() {
  const params = useParams();
  const { showToast } = useToast();
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

  const fetchRFPDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/services/rfp/submit/${params?.rfpId}/${params?.token}`);
      const data = await response.json();

      if (response.ok) {
        setRfpDetails(data);
      } else {
        setError(data.error || 'Failed to load RFP details');
      }
    } catch {
      setError('Failed to load RFP details');
    } finally {
      setLoading(false);
    }
  }, [params?.rfpId, params?.token]);

  useEffect(() => {
    fetchRFPDetails();
  }, [fetchRFPDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rfpDetails?.isOpen) {
      showToast('error', 'This RFP is no longer accepting proposals');
      return;
    }

    if (!formData.totalAmount || !formData.validUntil) {
      showToast('error', 'Please fill in all required fields');
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
        showToast('success', 'Proposal submitted successfully!');
      } else {
        showToast('error', result.error || 'Failed to submit proposal');
      }
    } catch {
      showToast('error', 'Failed to submit proposal');
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

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors';
  const textareaClassName =
    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors';
  const servicePR = rfpDetails.pr.servicePR;
  const requirementItems = servicePR?.items ?? [];
  const toSafeNumber = (value: string | number | null | undefined): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const formatMoney = (value: number): string =>
    new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  const formatValue = (value: string | number | null | undefined): string =>
    value === null || value === undefined || String(value).trim() === '' ? 'N/A' : String(value);
  const totalEstimatedValue = requirementItems.reduce(
    (sum, item) =>
      sum +
      toSafeNumber(item.quantity) *
        toSafeNumber(item.estimatedRate) *
        Math.max(toSafeNumber(item.duration) || 1, 1),
    0
  );
  const averageRate = requirementItems.length
    ? requirementItems.reduce((sum, item) => sum + toSafeNumber(item.estimatedRate), 0) / requirementItems.length
    : 0;
  const parseTextList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => entry.trim());
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
            .map((entry) => entry.trim());
        }
      } catch {
        return [trimmed];
      }

      return [trimmed];
    }

    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
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
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Service Details</h3>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Service Requisition</p>
                    <p className="mt-1 font-semibold text-gray-900">{rfpDetails.pr.prNumber}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Duration</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {servicePR?.duration ? `${servicePR.duration} ${formatValue(servicePR.durationUnit)}` : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Service Category</p>
                    <p className="mt-1 font-semibold text-gray-900">{formatValue(servicePR?.serviceCategory)}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Service Type</p>
                    <p className="mt-1 font-semibold text-gray-900">{formatValue(servicePR?.serviceType)}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Requirement Items</p>
                    <p className="mt-1 font-semibold text-gray-900">{requirementItems.length}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Estimated Value</p>
                    <p className="mt-1 font-semibold text-gray-900">{formatMoney(totalEstimatedValue)}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Average Rate</p>
                    <p className="mt-1 font-semibold text-gray-900">{formatMoney(averageRate)}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Closing Date</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {new Date(rfpDetails.closingDate).toLocaleDateString('en-OM')}
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2 sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Service Scope</p>
                    <p className="mt-1 whitespace-pre-wrap text-gray-800">
                      {servicePR?.serviceScope || rfpDetails.description || 'N/A'}
                    </p>
                  </div>
                  {servicePR?.technicalSpecifications && (
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Technical Specifications</p>
                      <p className="mt-1 whitespace-pre-wrap text-gray-800">{servicePR.technicalSpecifications}</p>
                    </div>
                  )}
                  {servicePR?.qualityStandards && (
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Quality Standards</p>
                      <p className="mt-1 whitespace-pre-wrap text-gray-800">{servicePR.qualityStandards}</p>
                    </div>
                  )}
                  {servicePR?.paymentTerms && (
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment Terms</p>
                      <p className="mt-1 text-gray-800">{servicePR.paymentTerms}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Service Requirements</h3>
                {requirementItems.length ? (
                  <div className="mt-3 space-y-3">
                    {requirementItems.map((item, index) => {
                      const deliverables = parseTextList(item.deliverables);
                      const performanceMetrics = parseTextList(item.performanceMetrics);
                      const itemEstimatedValue =
                        toSafeNumber(item.quantity) *
                        toSafeNumber(item.estimatedRate) *
                        Math.max(toSafeNumber(item.duration) || 1, 1);

                      return (
                        <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Service Item {index + 1}
                              </p>
                              <h4 className="mt-1 text-base font-semibold text-gray-900">{item.serviceItem.nameEn}</h4>
                              <p className="mt-1 text-xs text-gray-600">
                                Code: {formatValue(item.serviceItem.serviceCode)} | Category: {item.serviceItem.serviceCategory.nameEn}
                              </p>
                            </div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-right">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Estimated Value</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">
                                {formatMoney(itemEstimatedValue)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
                            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Quantity</p>
                              <p className="mt-1 font-semibold text-gray-900">{toSafeNumber(item.quantity)}</p>
                            </div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Unit</p>
                              <p className="mt-1 font-semibold text-gray-900">{formatValue(item.unit || item.serviceItem.unitOfMeasure)}</p>
                            </div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Rate</p>
                              <p className="mt-1 font-semibold text-gray-900">{formatMoney(toSafeNumber(item.estimatedRate))}</p>
                            </div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Duration</p>
                              <p className="mt-1 font-semibold text-gray-900">
                                {item.duration ? `${item.duration} ${formatValue(item.durationUnit)}` : 'N/A'}
                              </p>
                            </div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Description</p>
                              <p className="mt-1 text-gray-800">{formatValue(item.serviceItem.description)}</p>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Specifications</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{formatValue(item.specifications)}</p>
                            </div>
                            <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Deliverables</p>
                              {deliverables.length ? (
                                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-800">
                                  {deliverables.map((entry, idx) => (
                                    <li key={`${item.id}-del-${idx}`}>{entry}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-sm text-gray-800">N/A</p>
                              )}
                            </div>
                            <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Performance Metrics</p>
                              {performanceMetrics.length ? (
                                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-800">
                                  {performanceMetrics.map((entry, idx) => (
                                    <li key={`${item.id}-met-${idx}`}>{entry}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-sm text-gray-800">N/A</p>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-600">No service requirement items are available for this requisition.</p>
                )}
              </div>
            </div>
          </div>

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
                    className={`${inputClassName} pl-10`}
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
                    className={`${inputClassName} pl-10`}
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
                className={textareaClassName}
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
                className={textareaClassName}
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
                className={textareaClassName}
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
                className={textareaClassName}
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
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-wujha-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
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

