'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  Package,
  Building,
  Loader2,
  Send
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
      estimatedPrice: number;
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
  const router = useRouter();
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
    notes: ''
  });
  const [proposalFile, setProposalFile] = useState<File | null>(null);

  useEffect(() => {
    fetchRFQDetails();
  }, [rfqId, token]);

  const fetchRFQDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rfq/submit/${rfqId}/${token}`);
      const data = await response.json();

      if (response.ok) {
        setRfqDetails(data);
        
        // Set default valid until date (30 days from now)
        const defaultValidUntil = new Date();
        defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
        setFormData(prev => ({
          ...prev,
          validUntil: defaultValidUntil.toISOString().split('T')[0]
        }));
      } else {
        setError(data.error || 'Failed to load RFQ details');
      }
    } catch (error) {
      console.error('Error fetching RFQ details:', error);
      setError('Failed to load RFQ details');
    } finally {
      setLoading(false);
    }
  };

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
    
    // Check if RFQ is still open
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

      console.log('Submitting proposal...', { rfqId, token, totalAmount: formData.totalAmount, hasFile: !!proposalFile });
      
      const response = await fetch(`/api/rfq/submit/${rfqId}/${token}`, {
        method: 'POST',
        body: submitFormData,
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setSuccess(true);
        setError('');
        // Refresh details to show submitted state
        await fetchRFQDetails();
      } else {
        const errorMessage = data.error || 'Failed to submit proposal';
        setError(errorMessage);
        console.error('Submission error:', errorMessage, data);
      }
    } catch (error) {
      console.error('Error submitting proposal:', error);
      setError(`Failed to submit proposal: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-wujha-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading RFQ details...</p>
        </div>
      </div>
    );
  }

  if (error && !rfqDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Submitted</h2>
            <p className="text-gray-600 mb-4">
              Thank you! Your proposal has been successfully submitted.
            </p>
            {rfqDetails.submittedAt && (
              <p className="text-sm text-gray-500">
                Submitted on: {formatDate(rfqDetails.submittedAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!rfqDetails.isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">RFQ Closed</h2>
            <p className="text-gray-600">
              This RFQ is no longer accepting submissions. The deadline has passed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-wujha-primary to-[#821131] text-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Request for Quotation</h1>
              <p className="text-white/90">{rfqDetails.rfq.rfqNumber}</p>
            </div>
            <Building className="h-12 w-12 opacity-75" />
          </div>
        </div>

        {/* Vendor Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-3">
            <Building className="h-6 w-6 text-wujha-primary" />
            <div>
              <p className="text-sm text-gray-500">Submitting as</p>
              <p className="text-lg font-semibold text-gray-900">{rfqDetails.vendor.name}</p>
            </div>
          </div>
        </div>

        {/* RFQ Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-wujha-primary" />
            RFQ Details
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{rfqDetails.rfq.title}</h3>
              {rfqDetails.rfq.description && (
                <p className="text-gray-600 mt-2">{rfqDetails.rfq.description}</p>
              )}
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2 text-wujha-primary" />
              <span>Closing Date: <strong>{formatDate(rfqDetails.rfq.closingDate)}</strong></span>
            </div>

            {/* Items */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Package className="h-4 w-4 mr-2 text-wujha-primary" />
                Items Required
              </h4>
              <div className="space-y-2">
                {rfqDetails.rfq.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.specifications && (
                          <p className="text-sm text-gray-600 mt-1">{item.specifications}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        <p className="text-sm text-gray-500">Est: {formatCurrency(parseFloat(item.estimatedPrice.toString()))}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {rfqDetails.rfq.termsAndConditions && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Terms and Conditions</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {rfqDetails.rfq.termsAndConditions}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Send className="h-5 w-5 mr-2 text-wujha-primary" />
            Submit Your Proposal
          </h2>

          {/* RFQ Status Warning */}
          {rfqDetails && !rfqDetails.isOpen && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">RFQ Closed</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    This RFQ is no longer accepting submissions. The deadline has passed or the RFQ has been closed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Total Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Amount (OMR) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                  placeholder="0.000"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                />
              </div>
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quotation Valid Until *
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>

            {/* Proposal File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proposal Document (PDF) *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-wujha-primary transition-colors">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                  className="cursor-pointer inline-block bg-wujha-primary text-white px-6 py-2 rounded-lg hover:bg-wujha-primary-hover"
                >
                  Choose PDF File
                </label>
                {proposalFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {proposalFile.name} ({(proposalFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">Maximum file size: 10MB</p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Breakdown (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                placeholder="Provide a breakdown of your pricing..."
                value={formData.priceBreakdown}
                onChange={(e) => setFormData({ ...formData, priceBreakdown: e.target.value })}
              />
            </div>

            {/* Technical Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technical Details (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                placeholder="Provide technical specifications and details..."
                value={formData.technicalDetails}
                onChange={(e) => setFormData({ ...formData, technicalDetails: e.target.value })}
              />
            </div>

            {/* Delivery Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Terms (Optional)
              </label>
              <textarea
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                placeholder="Specify your delivery terms..."
                value={formData.deliveryTerms}
                onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                placeholder="Any additional information..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !rfqDetails?.isOpen}
              className="w-full bg-wujha-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Submit Proposal
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Wujha Procurement System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

