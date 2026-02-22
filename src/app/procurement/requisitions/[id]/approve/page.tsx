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
  Package,
  MessageSquare,
  Clock
} from 'lucide-react';

interface PurchaseRequisition {
  id?: string;
  prNumber?: string;
  requestDate?: string;
  requesterId?: string;
  departmentId?: string;
  itemType?: 'STOCK' | 'NON_STOCK' | 'SERVICE';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status?: string;
  estimatedCost?: number;
  budgetCode?: string;
  justification?: string;
  items?: Array<{
    id?: string;
    item?: {
      itemCode?: string;
      nameEn?: string;
      unitOfMeasure?: string;
      category?: {
        nameEn?: string;
      };
    };
    quantity?: number;
    estimatedPrice?: number;
    specifications?: string;
    requiredDate?: string;
  }>;
  approvals?: Array<{
    id?: string;
    approverId?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    comments?: string;
    approvedAt?: string;
    level?: number;
  }>;
}

export default function PRApprovalPage() {
  const router = useRouter();
  const params = useParams();
  const prId = params.id as string;

  const [pr, setPr] = useState<PurchaseRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    if (prId) {
      fetchPR();
    }
    const role = (typeof window !== 'undefined' ? localStorage.getItem('role') : '') || '';
    setUserRole(role.toUpperCase());
  }, [prId]);

  const fetchPR = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase-requisitions/${prId}`);
      const data = await response.json();

      if (response.ok && data) {
        // Ensure all required fields have default values
        const sanitizedData: PurchaseRequisition = {
          id: data.id || '',
          prNumber: data.prNumber || '',
          requestDate: data.requestDate || new Date().toISOString(),
          requesterId: data.requesterId || '',
          departmentId: data.departmentId || '',
          itemType: data.itemType || 'STOCK',
          priority: data.priority || 'NORMAL',
          status: data.status || 'DRAFT',
          estimatedCost: data.estimatedCost || 0,
          budgetCode: data.budgetCode || '',
          justification: data.justification || '',
          items: data.items || [],
          approvals: data.approvals || []
        };
        setPr(sanitizedData);
      } else {
        setError(data?.error || 'Failed to fetch purchase requisition');
      }
    } catch (error) {
      console.error('Error fetching PR:', error);
      setError('Failed to fetch purchase requisition');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!action || !pr) return;

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch(`/api/purchase-requisitions/${prId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          comments
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh PR data to show updated status
        await fetchPR();
        
        // Show success message and redirect after delay
        setTimeout(() => {
          router.push('/procurement/requisitions');
        }, 2000);
      } else {
        setError(data.error || `Failed to ${action.toLowerCase()} purchase requisition`);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      setError(`Failed to ${action?.toLowerCase()} purchase requisition`);
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

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return 'bg-gray-100 text-gray-800';
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalCost = () => {
    if (!pr || !pr.items) return 0;
    return pr.items.reduce((total, item) => {
      const quantity = item.quantity || 0;
      const price = Number(item.estimatedPrice) || 0;
      return total + (quantity * price);
    }, 0);
  };

  const getApprovalRequirement = () => {
    const totalCost = calculateTotalCost();
    if (totalCost > 50000) {
      return {
        levels: 2,
        description: 'Requires approval from Department Head and Director (Amount > OMR 50,000)'
      };
    } else if (totalCost > 10000) {
      return {
        levels: 1,
        description: 'Requires approval from Department Head (Amount > OMR 10,000)'
      };
    } else {
      return {
        levels: 1,
        description: 'Requires approval from Department Head'
      };
    }
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

  if (error && !pr) {
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

  if (!pr) return null;

  const approvalReq = getApprovalRequirement();
  const canApprove = pr.status === 'SUBMITTED' || pr.status === 'PENDING_APPROVAL';
  const isAlreadyProcessed = ['APPROVED', 'REJECTED'].includes(pr.status || '');
  const isApproverRole = ['PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);

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
            Back to Requisitions
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium">PR:</span> {pr.prNumber || 'N/A'}
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium">Status:</span> {pr.status || 'N/A'}
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
                Purchase Requisition Approval
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and approve purchase requisition {pr.prNumber || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(pr.priority || 'NORMAL')}`}>
                {pr.priority || 'NORMAL'} Priority
              </span>
            </div>
          </div>
        </div>

        {/* PR Details */}
        <div className="px-8 py-8 space-y-8">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">PR Number</dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold">{pr.prNumber || 'N/A'}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Requestor</dt>
                <dd className="mt-1 text-sm text-gray-900">{pr.requesterId || 'N/A'}</dd>
                <dd className="text-xs text-gray-500">{pr.departmentId || 'N/A'}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Request Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(pr.requestDate)}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Cost</dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(calculateTotalCost())}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Items Count</dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">{pr.items?.length || 0}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Approval Level</dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">{approvalReq.levels}</dd>
              </div>
            </div>
          </div>

          {/* Justification */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Business Justification</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">{pr.justification || 'No justification provided'}</p>
            </div>
          </div>

          {/* Budget Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Budget Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-blue-700">Budget Code</span>
                <p className="text-sm font-medium text-blue-900">{pr.budgetCode || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-blue-700">Item Type</span>
                <p className="text-sm font-medium text-blue-900">{pr.itemType || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-blue-700">Estimated Cost</span>
                <p className="text-sm font-medium text-blue-900">{formatCurrency(calculateTotalCost())}</p>
              </div>
              <div>
                <span className="text-xs text-blue-700">Status</span>
                <p className="text-sm font-medium text-blue-900">{pr.status || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Approval Requirements */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Approval Requirements
            </h4>
            <p className="text-sm text-yellow-800">{approvalReq.description}</p>
          </div>

          {/* Items List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Requested Items ({pr.items?.length || 0})
            </h3>
            {pr.items && pr.items.length > 0 ? (
                          <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Item Details
                    </th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                      Quantity
                    </th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                      Unit Price
                    </th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                      Total
                    </th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                      Specifications
                    </th>
                  </tr>
                </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pr.items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50">
                                              <td className="px-8 py-6 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.item?.itemCode || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{item.item?.nameEn || 'N/A'}</div>
                          <div className="text-xs text-gray-400">{item.item?.category?.nameEn || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.quantity || 0} {item.item?.unitOfMeasure || 'units'}
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(Number(item.estimatedPrice) || 0)}
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency((item.quantity || 0) * (Number(item.estimatedPrice) || 0))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm text-gray-500 max-w-md">
                          {item.specifications || 'No specifications provided'}
                        </div>
                      </td>
                      </tr>
                    ))}
                  </tbody>
                                  <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-8 py-6 text-sm font-medium text-gray-900 text-right">
                      Total Estimated Cost:
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-900">
                      {formatCurrency(calculateTotalCost())}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-lg text-gray-600">No items found in this requisition</p>
                <p className="text-sm text-gray-500 mt-1">Please add items to proceed with the approval</p>
              </div>
            )}
          </div>

          {/* Previous Approvals */}
          {pr.approvals && pr.approvals.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Approval History</h3>
              <div className="space-y-3">
                {pr.approvals.map((approval, index) => (
                  <div key={approval.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
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
                          Level {approval.level || 'N/A'} - {approval.approverId || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {approval.approvedAt ? formatDate(approval.approvedAt) : 'Pending'}
                        </p>
                      </div>
                      {approval.comments && (
                        <p className="mt-1 text-sm text-gray-600">{approval.comments}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="h-16 w-16 mx-auto text-gray-300 mb-4 flex items-center justify-center">
                <Clock className="h-12 w-12" />
              </div>
              <p className="text-lg text-gray-600">No approval history available</p>
              <p className="text-sm text-gray-500 mt-1">This is a new requisition awaiting approval</p>
            </div>
          )}

          {/* Approval Actions */}
          {canApprove && isApproverRole && (
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
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
                      className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
                          Are you sure you want to {action.toLowerCase()} this purchase requisition?
                          {action === 'APPROVE' && calculateTotalCost() > 50000 && 
                            ' This will require additional approval from the Director.'
                          }
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
          {canApprove && !isApproverRole && (
            <div className="border-t border-gray-200 pt-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Approval Restricted</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      Only Procurement Manager or Admin can approve this requisition.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Already Processed Message */}
          {isAlreadyProcessed && (
            <div className={`rounded-md p-4 ${
              (pr.status || '') === 'APPROVED' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                {(pr.status || '') === 'APPROVED' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    (pr.status || '') === 'APPROVED' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Purchase Requisition {(pr.status || '') === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    (pr.status || '') === 'APPROVED' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    This purchase requisition has already been {(pr.status || '').toLowerCase()}.
                    {(pr.status || '') === 'APPROVED' && ' It can now be converted to a purchase order.'}
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
