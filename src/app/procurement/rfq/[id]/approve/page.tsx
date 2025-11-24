'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  AlertTriangle,
  FileText,
  User,
  Calendar,
  DollarSign,
  Building,
  MessageSquare,
  Clock
} from 'lucide-react';
import { getUserRole, getUserData } from '@/lib/jwt';

interface RFQ {
  id?: string;
  rfqNumber?: string;
  title?: string;
  description?: string;
  issueDate?: string;
  closingDate?: string;
  status?: string;
  createdBy?: string;
  pr?: {
    id?: string;
    prNumber?: string;
    departmentId?: string;
    estimatedCost?: number;
  };
  approvals?: Array<{
    id?: string;
    approverId?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    comments?: string;
    approvedAt?: string;
    level?: number;
  }>;
}

export default function RFQApprovalPage() {
  const router = useRouter();
  const params = useParams();
  const rfqId = params.id as string;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const role = getUserRole() || '';
    setUserRole(role);
  }, []);

  useEffect(() => {
    if (rfqId) {
      fetchRFQ();
    }
  }, [rfqId]);

  const fetchRFQ = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rfq/${rfqId}`);
      const data = await response.json();

      if (response.ok && data.rfq) {
        setRfq(data.rfq);
      } else {
        setError(data?.error || 'Failed to fetch RFQ');
      }
    } catch (error) {
      console.error('Error fetching RFQ:', error);
      setError('Failed to fetch RFQ');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!action || !rfq) return;

    try {
      setSubmitting(true);
      setError('');

      // Get user data from localStorage
      const userData = getUserData() || {};
      const approverId = userData.employeeId || userData.id || 'admin001';

      // Parallel approval - any manager can approve, no level needed
      const response = await fetch(`/api/rfq/${rfqId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          approverId,
          comments
          // No level needed - any manager can approve
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh RFQ data to show updated status
        await fetchRFQ();
        
        // Show success message and redirect after delay
        setTimeout(() => {
          router.push('/procurement/rfq');
        }, 2000);
      } else {
        setError(data.error || `Failed to ${action.toLowerCase()} RFQ`);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      setError(`Failed to ${action?.toLowerCase()} RFQ`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return 'OMR 0.000';
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-OM', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getApprovalRequirement = () => {
    return {
      description: 'This RFQ requires approval from any manager: Department Manager, Procurement Manager, or Finance Manager. Only one approval is needed.'
    };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !rfq) {
    return (
      <div className="w-full">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!rfq) return null;

  const approvalReq = getApprovalRequirement();
  const canApprove = rfq.status === 'PENDING_APPROVAL' || rfq.status === 'SUBMITTED';
  const isAlreadyProcessed = ['APPROVED', 'REJECTED'].includes(rfq.status || '');
  
  // Check if user has permission to approve
  const hasApprovalPermission = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole?.toUpperCase());

  // If user doesn't have permission, show warning
  if (!hasApprovalPermission) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between bg-white shadow-sm rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to RFQs
            </button>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-red-800">Access Denied</h3>
              <p className="mt-2 text-sm text-red-700">
                You do not have permission to approve RFQs. Only Department Managers, Procurement Managers, Finance Managers, and Administrators can approve RFQs.
              </p>
              <p className="mt-2 text-sm text-red-700">
                Your current role: <span className="font-semibold">{userRole || 'Unknown'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white shadow-sm rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to RFQs
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium">RFQ:</span> {rfq.rfqNumber || 'N/A'}
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium">Status:</span> {rfq.status || 'N/A'}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Header Section */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                RFQ Approval
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and approve RFQ {rfq.rfqNumber || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* RFQ Details */}
        <div className="px-8 py-8 space-y-8">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">RFQ Number</dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold">{rfq.rfqNumber || 'N/A'}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Issue Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(rfq.issueDate)}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Closing Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(rfq.closingDate)}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Estimated Value</dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(Number(rfq.pr?.estimatedCost || 0))}</dd>
              </div>
            </div>
          </div>

          {/* PR Reference */}
          {rfq.pr && (
            <div className="bg-wujha-primary/10 rounded-lg p-4">
              <h4 className="text-sm font-medium text-wujha-primary mb-2">Purchase Requisition Reference</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-700">PR Number</span>
                  <p className="text-sm font-medium text-gray-900">{rfq.pr.prNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-700">Department</span>
                  <p className="text-sm font-medium text-gray-900">{rfq.pr.departmentId || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* RFQ Description */}
          {rfq.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{rfq.description}</p>
            </div>
          )}

          {/* Approval Requirements */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Approval Requirements
            </h4>
            <p className="text-sm text-yellow-800 mb-2">{approvalReq.description}</p>
            {/* <p className="text-sm font-semibold text-yellow-900 mt-2">
              ⚡ Parallel Approval: Any manager can approve this RFQ. Only one approval is required.
            </p> */}
          </div>

          {/* Previous Approvals */}
          {rfq.approvals && rfq.approvals.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Approval History</h3>
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Manager Approval Required:</strong> This RFQ can be approved by any manager with the following roles: Department Manager, Procurement Manager, or Finance Manager. Once approved, the RFQ status will change to Approved immediately.
                </p>
              </div>
              <div className="space-y-3">
                {rfq.approvals.map((approval, index) => {
                  // Map level to role name for display
                  const roleNames: { [key: number]: string } = {
                    1: 'Department Manager',
                    2: 'Procurement Manager',
                    3: 'Finance Manager'
                  };
                  const roleName = approval.level ? roleNames[approval.level] || `Level ${approval.level}` : 'Manager';
                  
                  return (
                    <div key={approval.id || index} className={`flex items-start space-x-3 p-3 rounded-lg border ${
                      approval.status === 'APPROVED' 
                        ? 'bg-green-50 border-green-200' 
                        : approval.status === 'REJECTED'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex-shrink-0">
                        {approval.status === 'APPROVED' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : approval.status === 'REJECTED' ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-yellow-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {roleName}
                            {approval.status === 'APPROVED' && (
                              <span className="ml-2 text-xs text-green-700 font-semibold">✓ Approved</span>
                            )}
                            {approval.status === 'REJECTED' && (
                              <span className="ml-2 text-xs text-red-700 font-semibold">✗ Rejected</span>
                            )}
                            {approval.status === 'PENDING' && (
                              <span className="ml-2 text-xs text-yellow-700 font-semibold">Pending</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {approval.approvedAt ? formatDate(approval.approvedAt) : 'Awaiting approval'}
                          </p>
                        </div>
                        {approval.comments && (
                          <p className="mt-1 text-sm text-gray-600">{approval.comments}</p>
                        )}
                        {approval.approverId && approval.status === 'APPROVED' && (
                          <p className="mt-1 text-xs text-gray-500">
                            Approved by: {approval.approverId}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg text-gray-600">No approval history available</p>
              <p className="text-sm text-gray-500 mt-1">This is a new RFQ awaiting approval</p>
            </div>
          )}

          {/* Approval Actions */}
          {canApprove && (
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Approval Decision
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments (Optional)
                  </label>
                  <textarea
                    rows={4}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary resize-none"
                    placeholder="Add any comments about your decision..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => setAction('APPROVE')}
                      disabled={submitting}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      {submitting && action === 'APPROVE' ? 'Approving...' : 'Approve'}
                    </button>

                    <button
                      onClick={() => setAction('REJECT')}
                      disabled={submitting}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      {submitting && action === 'REJECT' ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                  
                  <div className="flex-1 sm:flex-none">
                    <button
                      onClick={() => router.back()}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {action && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Confirm {action === 'APPROVE' ? 'Approval' : 'Rejection'}
                        </h3>
                        <p className="mt-1 text-sm text-yellow-700">
                          Are you sure you want to {action.toLowerCase()} this RFQ?
                        </p>
                        <div className="mt-3 flex space-x-3">
                          <button
                            onClick={handleApproval}
                            disabled={submitting}
                            className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded text-white ${
                              action === 'APPROVE' 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-red-600 hover:bg-red-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {submitting ? 'Processing...' : `Confirm ${action === 'APPROVE' ? 'Approval' : 'Rejection'}`}
                          </button>
                          <button
                            onClick={() => setAction(null)}
                            disabled={submitting}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <XCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <p className="mt-1 text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Already Processed Message */}
          {isAlreadyProcessed && (
            <div className={`rounded-md p-4 ${
              (rfq.status || '') === 'APPROVED' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                {(rfq.status || '') === 'APPROVED' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    (rfq.status || '') === 'APPROVED' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    RFQ {(rfq.status || '') === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    (rfq.status || '') === 'APPROVED' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    This RFQ has already been {(rfq.status || '').toLowerCase()}.
                    {(rfq.status || '') === 'APPROVED' && ' It can now be published to vendors.'}
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

