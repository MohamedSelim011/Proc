'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Building, 
  FileText,
  AlertCircle,
  DollarSign,
  Calendar,
  MessageSquare,
  X
} from 'lucide-react';
import Link from 'next/link';

interface ServiceRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  priority: string;
  status: string;
  estimatedCost: number;
  budgetCode: string;
  justification: string;
  createdAt: string;
  createdBy: string;
  servicePR: {
    serviceScope: string;
    technicalSpecifications?: string;
    duration: number;
    durationUnit: string;
    deliverables: string[];
    performanceMetrics: string[];
    paymentSchedule: string;
  };
  approvals: Array<{
    id: string;
    level: number;
    status: string;
    approverId: string;
    comments?: string;
    approvedAt?: string;
  }>;
}

interface ApprovalForm {
  action: 'SUBMIT' | 'APPROVE' | 'REJECT';
  approverId: string;
  comments: string;
  level?: number;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
};

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-yellow-100 text-yellow-800',
  URGENT: 'bg-red-100 text-red-800'
};

export default function ServiceRequisitionApproval() {
  const params = useParams();
  const router = useRouter();
  const [sr, setSr] = useState<ServiceRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    show: false,
    type: 'success',
    message: ''
  });

  const [approvalForm, setApprovalForm] = useState<ApprovalForm>({
    action: 'APPROVE',
    approverId: 'manager001',
    comments: '',
    level: 1
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 3
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  useEffect(() => {
    fetchServiceRequisition();
  }, [params.id]);

  const fetchServiceRequisition = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/services/requisitions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSr(data);
      } else {
        setError('Failed to fetch service requisition');
      }
    } catch (error) {
      setError('Error fetching service requisition');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      let endpoint = '';
      let payload = {};

      if (approvalForm.action === 'SUBMIT') {
        endpoint = `/api/purchase-requisitions/${params.id}/submit`;
        payload = {
          firstApproverId: approvalForm.approverId
        };
      } else {
        endpoint = `/api/purchase-requisitions/${params.id}/approve`;
        payload = {
          action: approvalForm.action,
          approverId: approvalForm.approverId,
          comments: approvalForm.comments,
          level: approvalForm.level
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        showToast('success', result.message || 'Action completed successfully');
        // Refresh the data
        setTimeout(() => {
          fetchServiceRequisition();
        }, 1000);
      } else {
        showToast('error', result.error || 'Failed to process action');
      }
    } catch (error) {
      showToast('error', 'Error processing request');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = sr?.status === 'DRAFT';
  const canApprove = sr?.status === 'SUBMITTED';
  const isApproved = sr?.status === 'APPROVED';
  const isRejected = sr?.status === 'REJECTED';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!sr) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Service requisition not found</h3>
        <p className="mt-1 text-sm text-gray-500">The service requisition you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link
            href="/procurement/services/requisitions"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Service Requisitions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/procurement/services/requisitions"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Service Requisition Approval
            </h1>
            <p className="text-sm text-gray-600">
              {sr?.prNumber} • {sr?.status}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[sr?.status as keyof typeof statusColors]}`}>
            {sr?.status}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[sr?.priority as keyof typeof priorityColors]}`}>
            {sr?.priority}
          </span>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`rounded-xl shadow-2xl border max-w-sm w-full ${
            toast.type === 'success' 
              ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' 
              : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
          }`}>
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {toast.type === 'success' ? (
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100">
                      <CheckCircle className="h-5 w-5 text-orange-600" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                </div>
                <div className="ml-3 w-0 flex-1">
                  <p className={`text-sm font-medium ${
                    toast.type === 'success' ? 'text-orange-800' : 'text-red-800'
                  }`}>
                    {toast.type === 'success' ? 'Success!' : 'Error!'}
                  </p>
                  <p className={`mt-1 text-sm ${
                    toast.type === 'success' ? 'text-orange-700' : 'text-red-700'
                  }`}>
                    {toast.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className={`rounded-md inline-flex ${
                      toast.type === 'success' 
                        ? 'text-orange-400 hover:text-orange-600 focus:ring-orange-600' 
                        : 'text-red-400 hover:text-red-600 focus:ring-red-600'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    onClick={hideToast}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Service Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Service Scope</dt>
                <dd className="mt-1 text-sm text-gray-900">{sr?.servicePR?.serviceScope}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">{sr?.servicePR?.duration} {sr?.servicePR?.durationUnit}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Payment Schedule</dt>
                <dd className="mt-1 text-sm text-gray-900">{sr?.servicePR?.paymentSchedule}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Budget Code</dt>
                <dd className="mt-1 text-sm text-gray-900">{sr?.budgetCode}</dd>
              </div>
            </div>
            
            {sr?.servicePR?.technicalSpecifications && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500">Technical Specifications</dt>
                <dd className="mt-1 text-sm text-gray-900">{sr?.servicePR?.technicalSpecifications}</dd>
              </div>
            )}

            <div className="mt-4">
              <dt className="text-sm font-medium text-gray-500">Deliverables</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <ul className="list-disc list-inside space-y-1">
                  {sr?.servicePR?.deliverables.map((deliverable, index) => (
                    <li key={index}>{deliverable}</li>
                  ))}
                </ul>
              </dd>
            </div>

            <div className="mt-4">
              <dt className="text-sm font-medium text-gray-500">Performance Metrics</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <ul className="list-disc list-inside space-y-1">
                  {sr?.servicePR?.performanceMetrics.map((metric, index) => (
                    <li key={index}>{metric}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </div>

          {/* Justification */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Justification</h2>
            <p className="text-sm text-gray-900">{sr?.justification}</p>
          </div>

          {/* Approval History */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Approval History</h2>
            {sr?.approvals?.length === 0 ? (
              <p className="text-sm text-gray-500">No approvals yet</p>
            ) : (
              <div className="space-y-3">
                {sr?.approvals?.map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        approval.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                        approval.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {approval.status === 'APPROVED' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : approval.status === 'REJECTED' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Level {approval.level} - {approval.approverId}
                        </p>
                        <p className="text-sm text-gray-500">
                          {approval.status} {approval.approvedAt && `• ${formatDate(approval.approvedAt)}`}
                        </p>
                        {approval.comments && (
                          <p className="text-sm text-gray-600 mt-1">{approval.comments}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Estimated Cost</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(sr?.estimatedCost || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm text-gray-900">{formatDate(sr?.createdAt || '')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Created By</span>
                <span className="text-sm text-gray-900">{sr?.createdBy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Department</span>
                <span className="text-sm text-gray-900">{sr?.departmentId}</span>
              </div>
            </div>
          </div>

          {/* Approval Actions */}
          {!isApproved && !isRejected && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Actions</h3>
              
              {/* Status-based guidance */}
              {sr?.status === 'SUBMITTED' && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-400 mr-2" />
                    <p className="text-sm text-blue-700">
                      This requisition is ready for approval. Select "Approve" to proceed or "Reject" if changes are needed.
                    </p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action
                  </label>
                  <select
                    value={approvalForm.action}
                    onChange={(e) => setApprovalForm({...approvalForm, action: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={submitting}
                  >
                    {canSubmit && <option value="SUBMIT">Submit for Approval</option>}
                    {canApprove && <option value="APPROVE">Approve</option>}
                    {(canSubmit || canApprove) && <option value="REJECT">Reject</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approver ID
                  </label>
                  <input
                    type="text"
                    value={approvalForm.approverId}
                    onChange={(e) => setApprovalForm({...approvalForm, approverId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter approver ID"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments
                  </label>
                  <textarea
                    value={approvalForm.comments}
                    onChange={(e) => setApprovalForm({...approvalForm, comments: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter approval comments..."
                    disabled={submitting}
                  />
                </div>

               {/*  {approvalForm.action === 'APPROVE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approval Level
                    </label>
                    <input
                      type="number"
                      value={approvalForm.level}
                      onChange={(e) => setApprovalForm({...approvalForm, level: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      disabled={submitting}
                    />
                  </div>
                )} */}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    approvalForm.action === 'REJECT' 
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400' 
                      : approvalForm.action === 'APPROVE'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                  }`}
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      {approvalForm.action === 'SUBMIT' && <FileText className="h-4 w-4 mr-2" />}
                      {approvalForm.action === 'APPROVE' && <CheckCircle className="h-4 w-4 mr-2" />}
                      {approvalForm.action === 'REJECT' && <XCircle className="h-4 w-4 mr-2" />}
                      {approvalForm.action === 'SUBMIT' ? 'Submit' : approvalForm.action === 'APPROVE' ? 'Approve' : 'Reject'}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Next Steps */}
          {isApproved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Approved!</h3>
                  <p className="text-sm text-green-700 mt-1">
                    This service requisition is now approved and ready for purchase order creation.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  href={`/procurement/purchase-orders/new?prId=${sr?.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                >
                  Create Purchase Order
                </Link>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Rejected</h3>
                  <p className="text-sm text-red-700 mt-1">
                    This service requisition has been rejected.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 