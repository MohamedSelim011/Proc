'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Clock, FileText } from 'lucide-react';

interface ContractData {
  contractNumber: string;
  contractType: string;
  vendorName: string;
  totalValue: number;
  currency: string;
  startDate: string;
  endDate: string;
  paymentTerms: string;
  slaTerms?: string | object;
  penaltyClause?: string;
  performanceBond?: number;
  retentionAmount?: number;
  insuranceRequirements?: string | object;
}

interface ResponseData {
  versionNumber: number;
  vendorEmail: string;
  vendorName: string;
  expiresAt: string;
}

export default function VendorResponsePage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [respondedBy, setRespondedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    fetchContractDetails();
  }, [token]);

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contracts/vendor-response/${token}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load contract details');
        return;
      }

      setContract(data.contract);
      setResponse(data.response);
    } catch (err) {
      setError('Failed to load contract details. Please try again.');
      console.error('Error fetching contract:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!action) {
      alert('Please select an action');
      return;
    }

    if (action === 'reject' && !comments.trim()) {
      alert('Please provide comments explaining the changes you need');
      return;
    }

    if (!respondedBy.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/contracts/vendor-response/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comments,
          respondedBy,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to submit response');
        return;
      }

      setSubmitted(true);
      setSubmitMessage(data.message);
    } catch (err) {
      alert('Failed to submit response. Please try again.');
      console.error('Error submitting response:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatJsonField = (value: string | object | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          return `${formattedKey}: ${val}`;
        })
        .join('\n');
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contract details...</p>
        </div>
      </div>
    );
  }

  if (error || !contract || !response) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
          <p className="text-gray-600 mb-4">{error || 'This link is no longer valid.'}</p>
          <p className="text-sm text-gray-500">Please contact the procurement team if you need assistance.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Response Submitted</h1>
          <p className="text-gray-600 mb-6">{submitMessage}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Contract Number:</strong> {contract.contractNumber}
            </p>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Action:</strong> {action === 'accept' ? 'Accepted' : 'Changes Requested'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const expiryDate = new Date(response.expiresAt);
  const isExpired = expiryDate < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-lg shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Service Contract Review</h1>
          <p className="text-blue-100">Wujha Procurement System</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-b-lg shadow-lg p-8">
          {/* Greeting */}
          <p className="text-lg text-gray-700 mb-6">
            Dear <strong>{response.vendorName}</strong>,
          </p>

          <p className="text-gray-600 mb-8">
            We are pleased to share the following Service Contract for your review and acceptance:
          </p>

          {/* Contract Details */}
          <div className="bg-gray-50 border-l-4 border-blue-600 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">Contract Number</p>
                <p className="text-lg font-semibold text-gray-900">{contract.contractNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Contract Type</p>
                <p className="text-lg text-gray-900">{contract.contractType.replace(/_/g, ' ')}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 font-medium">Total Value</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(contract.totalValue, contract.currency)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Contract Period</p>
                <p className="text-gray-900">{formatDate(contract.startDate)} to {formatDate(contract.endDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Payment Terms</p>
                <p className="text-gray-900">{contract.paymentTerms}</p>
              </div>
            </div>
          </div>

          {/* Expiry Warning */}
          <div className={`border rounded-lg p-4 mb-8 ${isExpired ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'}`}>
            <div className="flex items-start">
              <Clock className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${isExpired ? 'text-red-600' : 'text-yellow-600'}`} />
              <div>
                <p className={`text-sm font-medium ${isExpired ? 'text-red-800' : 'text-yellow-800'}`}>
                  {isExpired ? '⚠️ This link has expired' : '⏰ Response Required'}
                </p>
                <p className={`text-sm mt-1 ${isExpired ? 'text-red-700' : 'text-yellow-700'}`}>
                  {isExpired 
                    ? `This contract response link expired on ${formatDate(response.expiresAt)}. Please contact the procurement team.`
                    : `Please review and respond by ${formatDate(response.expiresAt)} at ${expiryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Additional Terms */}
          {(contract.slaTerms || contract.penaltyClause || contract.insuranceRequirements) && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Terms & Conditions</h3>
              
              {contract.slaTerms && (
                <div className="bg-orange-50 border-l-4 border-orange-500 rounded p-4 mb-4">
                  <h4 className="font-medium text-orange-900 mb-2">SLA Terms</h4>
                  <p className="text-sm text-orange-800 whitespace-pre-line">{formatJsonField(contract.slaTerms)}</p>
                </div>
              )}
              
              {contract.penaltyClause && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded p-4 mb-4">
                  <h4 className="font-medium text-red-900 mb-2">Penalty Clause</h4>
                  <p className="text-sm text-red-800 whitespace-pre-line">{contract.penaltyClause}</p>
                </div>
              )}
              
              {contract.insuranceRequirements && (
                <div className="bg-orange-50 border-l-4 border-orange-500 rounded p-4 mb-4">
                  <h4 className="font-medium text-orange-900 mb-2">Insurance Requirements</h4>
                  <p className="text-sm text-orange-800 whitespace-pre-line">{formatJsonField(contract.insuranceRequirements)}</p>
                </div>
              )}
            </div>
          )}

          {/* Financial Guarantees */}
          {(contract.performanceBond || contract.retentionAmount) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Financial Guarantees</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contract.performanceBond && (
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Performance Bond</p>
                    <p className="text-lg font-semibold text-blue-900">{formatCurrency(contract.performanceBond, contract.currency)}</p>
                  </div>
                )}
                {contract.retentionAmount && (
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Retention Amount</p>
                    <p className="text-lg font-semibold text-blue-900">{formatCurrency(contract.retentionAmount, contract.currency)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Section */}
          {!isExpired && (
            <form onSubmit={handleSubmit}>
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Action Required</h3>
                <p className="text-gray-600 mb-6">Please review the contract terms carefully and choose one of the following actions:</p>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setAction('accept')}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      action === 'accept'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${action === 'accept' ? 'text-green-600' : 'text-gray-400'}`} />
                    <p className="font-semibold text-center">Accept Contract</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAction('reject')}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      action === 'reject'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <XCircle className={`w-8 h-8 mx-auto mb-2 ${action === 'reject' ? 'text-red-600' : 'text-gray-400'}`} />
                    <p className="font-semibold text-center">Request Changes</p>
                  </button>
                </div>

                {/* Name Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={respondedBy}
                    onChange={(e) => setRespondedBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {/* Comments (required for reject) */}
                {action === 'reject' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments / Changes Requested <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={6}
                      placeholder="Please provide detailed comments about the changes you need..."
                      required={action === 'reject'}
                    />
                  </div>
                )}

                {/* Optional Comments for accept */}
                {action === 'accept' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Comments (Optional)
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Any additional notes..."
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!action || submitting}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                    !action || submitting
                      ? 'bg-gray-300 cursor-not-allowed'
                      : action === 'accept'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? 'Submitting...' : action === 'accept' ? 'Confirm Acceptance' : 'Submit Change Request'}
                </button>
              </div>
            </form>
          )}

          {/* Important Notes */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-6">
            <h4 className="font-semibold text-blue-900 mb-3">Important Notes:</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
              <li>If you accept, the contract will proceed to the signing phase</li>
              <li>If you request changes, please provide detailed comments about your concerns</li>
              <li>This link is unique and secure - do not share it with others</li>
              <li>After the expiry date, this link will no longer be valid</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>If you have any questions, please contact our procurement team</p>
            <p className="mt-2 font-medium">WUJHA HR Procurement System</p>
          </div>
        </div>
      </div>
    </div>
  );
}
