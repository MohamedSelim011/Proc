'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  Loader2,
  Package,
  Send,
  ShieldCheck,
  Upload,
} from 'lucide-react';

interface RFQDetails {
  rfq: {
    id: string;
    rfqNumber: string;
    title: string;
    description: string;
    closingDate: string;
    termsAndConditions?: string;
    items: Array<{
      name: string;
      quantity: number;
      specifications?: string;
    }>;
  };
  vendor: {
    name: string;
  };
  alreadySubmitted: boolean;
  isOpen: boolean;
  submittedAt?: string;
}

export default function VendorSubmissionPage() {
  const params = useParams();
  const rfqId = params.rfqId as string;
  const token = params.token as string;

  const [rfqDetails, setRfqDetails] = useState<RFQDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    totalAmount: '',
    validUntil: '',
    priceBreakdown: '',
    technicalDetails: '',
    deliveryTerms: '',
    notes: '',
  });
  const [proposalFile, setProposalFile] = useState<File | null>(null);

  const fetchRFQDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rfq/submit/${rfqId}/${token}`);
      const data = await response.json();

      if (response.ok) {
        setRfqDetails(data);

        // Set default valid until date (30 days from now)
        const defaultValidUntil = new Date();
        defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
        setFormData((prev) => ({
          ...prev,
          validUntil: defaultValidUntil.toISOString().split('T')[0],
        }));
      } else {
        setError(data.error || 'Failed to load RFQ details');
      }
    } catch (fetchError) {
      console.error('Error fetching RFQ details:', fetchError);
      setError('Failed to load RFQ details');
    } finally {
      setLoading(false);
    }
  }, [rfqId, token]);

  useEffect(() => {
    fetchRFQDetails();
  }, [fetchRFQDetails]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are allowed');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must not exceed 10MB');
        return;
      }

      setProposalFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rfqDetails || !rfqDetails.isOpen) {
      setError('This RFQ is no longer accepting submissions. The deadline has passed or the RFQ has been closed.');
      return;
    }

    if (!proposalFile) {
      setError('Please upload your proposal PDF');
      return;
    }

    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      setError('Please enter a valid total amount');
      return;
    }

    if (!formData.validUntil) {
      setError('Please select a valid until date');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const submitFormData = new FormData();
      submitFormData.append('totalAmount', formData.totalAmount);
      submitFormData.append('validUntil', formData.validUntil);
      submitFormData.append('priceBreakdown', formData.priceBreakdown || '');
      submitFormData.append('technicalDetails', formData.technicalDetails || '');
      submitFormData.append('deliveryTerms', formData.deliveryTerms || '');
      submitFormData.append('notes', formData.notes || '');
      submitFormData.append('proposalFile', proposalFile);

      const response = await fetch(`/api/rfq/submit/${rfqId}/${token}`, {
        method: 'POST',
        body: submitFormData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setError('');
        await fetchRFQDetails();
      } else {
        const errorMessage = data.error || 'Failed to submit proposal';
        setError(errorMessage);
        console.error('Submission error:', errorMessage, data);
      }
    } catch (submitError) {
      console.error('Error submitting RFQ proposal:', submitError);
      setError(`Failed to submit proposal: ${submitError instanceof Error ? submitError.message : 'Unknown error'}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-wujha-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading RFQ details...</p>
        </div>
      </div>
    );
  }

  if (error && !rfqDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!rfqDetails) return null;

  if (rfqDetails.alreadySubmitted || success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full rounded-xl border border-emerald-200 bg-white p-8 shadow-lg">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Submitted</h2>
            <p className="text-gray-600 mb-4">Thank you! Your proposal has been successfully submitted.</p>
            {rfqDetails.submittedAt && (
              <p className="text-sm text-gray-500">Submitted on: {formatDate(rfqDetails.submittedAt)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!rfqDetails.isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full rounded-xl border border-amber-200 bg-white p-8 shadow-lg">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">RFQ Closed</h2>
            <p className="text-gray-600">This RFQ is no longer accepting submissions. The deadline has passed.</p>
          </div>
        </div>
      </div>
    );
  }

  const fieldClassName =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-500 transition-colors focus:border-wujha-primary focus:outline-none focus:ring-0';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative overflow-hidden rounded-2xl border border-wujha-primary/20 bg-gradient-to-r from-wujha-primary via-wujha-secondary to-wujha-primary-hover px-6 py-8 text-white shadow-xl sm:px-8">
          <div className="absolute -right-24 -top-24 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-black/10 blur-2xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
                Vendor Portal
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">Request for Quotation</h1>
              <p className="mt-2 text-sm text-white/90">{rfqDetails.rfq.rfqNumber}</p>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 p-4">
              <Building2 className="h-8 w-8 opacity-90" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center text-lg font-semibold text-gray-900">
                <ClipboardList className="mr-2 h-5 w-5 text-wujha-primary" />
                RFQ Details
              </h2>

              <div className="mt-4 space-y-5">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{rfqDetails.rfq.title}</h3>
                  {rfqDetails.rfq.description && (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{rfqDetails.rfq.description}</p>
                  )}
                </div>

                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                  <CalendarClock className="h-4 w-4 text-wujha-primary" />
                  <span>
                    Closing Date: <strong>{formatDate(rfqDetails.rfq.closingDate)}</strong>
                  </span>
                </div>

                <div>
                  <h4 className="mb-3 flex items-center font-semibold text-gray-900">
                    <Package className="mr-2 h-4 w-4 text-wujha-primary" />
                    Items Required
                  </h4>

                  <div className="space-y-3">
                    {rfqDetails.rfq.items.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            {item.specifications && (
                              <p className="mt-1 text-sm text-slate-600">{item.specifications}</p>
                            )}
                          </div>
                          <div className="rounded-md bg-white px-3 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                            Qty: {item.quantity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {rfqDetails.rfq.termsAndConditions && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h4 className="mb-2 font-semibold text-gray-900">Terms and Conditions</h4>
                    <p className="text-sm leading-6 text-slate-600">{rfqDetails.rfq.termsAndConditions}</p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 flex items-center text-xl font-semibold text-gray-900">
                <Send className="mr-2 h-5 w-5 text-wujha-primary" />
                Submit Your Proposal
              </h2>

              {rfqDetails && !rfqDetails.isOpen && (
                <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex">
                    <AlertTriangle className="mr-2 h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">RFQ Closed</p>
                      <p className="mt-1 text-sm text-yellow-700">
                        This RFQ is no longer accepting submissions. The deadline has passed or the RFQ has been closed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-400" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Total Amount (OMR) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      className={`${fieldClassName} appearance-none pl-10`}
                      placeholder="0.000"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Quotation Valid Until *</label>
                  <input
                    type="date"
                    required
                    className={fieldClassName}
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Proposal Document (PDF) *</label>
                  <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-wujha-primary">
                    <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <input
                      type="file"
                      accept=".pdf"
                      required
                      name="proposalFile"
                      className="hidden"
                      id="proposalFile"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="proposalFile"
                      className="inline-block cursor-pointer rounded-lg bg-wujha-primary px-6 py-2 text-white hover:bg-wujha-primary-hover"
                    >
                      Choose PDF File
                    </label>
                    {proposalFile && (
                      <p className="mt-2 text-sm text-gray-600">
                        Selected: {proposalFile.name} ({(proposalFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">Maximum file size: 10MB</p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Price Breakdown (Optional)</label>
                  <textarea
                    rows={3}
                    className={fieldClassName}
                    placeholder="Provide a breakdown of your pricing..."
                    value={formData.priceBreakdown}
                    onChange={(e) => setFormData({ ...formData, priceBreakdown: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Technical Details (Optional)</label>
                  <textarea
                    rows={3}
                    className={fieldClassName}
                    placeholder="Provide technical specifications and details..."
                    value={formData.technicalDetails}
                    onChange={(e) => setFormData({ ...formData, technicalDetails: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Delivery Terms (Optional)</label>
                  <textarea
                    rows={2}
                    className={fieldClassName}
                    placeholder="Specify your delivery terms..."
                    value={formData.deliveryTerms}
                    onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Additional Notes (Optional)</label>
                  <textarea
                    rows={2}
                    className={fieldClassName}
                    placeholder="Any additional information..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !rfqDetails?.isOpen}
                  className="flex w-full items-center justify-center rounded-lg bg-wujha-primary px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Submit Proposal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-wujha-primary/10 p-2">
                  <Building2 className="h-5 w-5 text-wujha-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Submitting As</p>
                  <p className="text-base font-semibold text-slate-900">{rfqDetails.vendor.name}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                <ShieldCheck className="mr-2 h-4 w-4 text-wujha-primary" />
                Secure Submission
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This link is assigned to your organization. Upload one signed PDF proposal and complete the pricing fields before the closing date.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wide text-slate-700">
                <FileText className="mr-2 h-4 w-4 text-wujha-primary" />
                Timeline
              </h3>
              <p className="text-sm text-slate-600">Submission deadline</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(rfqDetails.rfq.closingDate)}</p>
            </div>
          </aside>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>(c) {new Date().getFullYear()} Wujha Procurement System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
