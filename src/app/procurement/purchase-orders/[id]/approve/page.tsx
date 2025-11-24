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
  Clock,
  Building
} from 'lucide-react';

interface PurchaseOrder {
  id?: string;
  poNumber?: string;
  orderDate?: string;
  deliveryDate?: string;
  status?: string;
  totalAmount?: number;
  currency?: string;
  paymentTerms?: string;
  notes?: string;
  vendor?: {
    id?: string;
    nameEn?: string;
    email?: string;
  };
  pr?: {
    id?: string;
    prNumber?: string;
    departmentId?: string;
  };
  items?: Array<{
    id?: string;
    item?: {
      itemCode?: string;
      nameEn?: string;
      unit?: string;
    };
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    specifications?: string;
  }>;
  approvals?: Array<{
    id?: string;
    approverId?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    comments?: string;
    actionDate?: string;
    level?: number;
  }>;
}

export default function POApprovalPage() {
  const router = useRouter();
  const params = useParams();
  const poId = params.id as string;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const role = localStorage.getItem('role') || '';
    setUserRole(role);
  }, []);

  useEffect(() => {
    if (poId) {
      fetchPO();
    }
  }, [poId]);

  const fetchPO = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase-orders/${poId}`);
      const data = await response.json();

      if (response.ok && data) {
        setPo(data);
      } else {
        setError(data?.error || 'Failed to fetch purchase order');
      }
    } catch (error) {
      console.error('Error fetching PO:', error);
      setError('Failed to fetch purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!action || !po) return;

    try {
      setSubmitting(true);
      setError('');

      // Find the next pending approval level
      const pendingApproval = po.approvals?.find(a => a.status === 'PENDING');
      const currentLevel = pendingApproval?.level || 1;

      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const approverId = userData.employeeId || userData.id || 'admin001';

      const response = await fetch(`/api/purchase-orders/${poId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          approverId,
          comments,
          level: currentLevel
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh PO data to show updated status
        await fetchPO();
        
        // Show success message and redirect after delay
        setTimeout(() => {
          router.push('/procurement/purchase-orders');
        }, 2000);
      } else {
        setError(data.error || `Failed to ${action.toLowerCase()} purchase order`);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      setError(`Failed to ${action?.toLowerCase()} purchase order`);
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

  const calculateTotalCost = () => {
    return po?.totalAmount || 0;
  };

  const getApprovalRequirement = () => {
    const totalCost = calculateTotalCost();
    if (totalCost > 10000) {
      return {
        levels: 3,
        description: 'Requires approval from Department Manager, Procurement Manager, and Finance Manager (Amount > OMR 10,000)'
      };
    } else if (totalCost > 5000) {
      return {
        levels: 2,
        description: 'Requires approval from Department Manager and Procurement Manager (Amount > OMR 5,000)'
      };
    } else {
      return {
        levels: 1,
        description: 'Requires approval from Department Manager'
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

  if (error && !po) {
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

  if (!po) return null;

  const approvalReq = getApprovalRequirement();
  const canApprove = po.status === 'PENDING_APPROVAL';
  const isAlreadyProcessed = ['APPROVED', 'REJECTED'].includes(po.status || '');
  
  // Check if user has permission to approve
  const hasApprovalPermission = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN'].includes(userRole);

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
              Back to Purchase Orders
            </button>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-red-800">Access Denied</h3>
              <p className="mt-2 text-sm text-red-700">
                You do not have permission to approve purchase orders. Only Department Managers, Procurement Managers, Finance Managers, and Administrators can approve purchase orders.
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
            Back to Purchase Orders
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium">PO:</span> {po.poNumber || 'N/A'}
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium">Status:</span> {po.status || 'N/A'}
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
                Purchase Order Approval
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and approve purchase order {po.poNumber || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* PO Details */}
        <div className="px-8 py-8 space-y-8">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold">{po.poNumber || 'N/A'}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Building className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                <dd className="mt-1 text-sm text-gray-900">{po.vendor?.nameEn || 'N/A'}</dd>
                <dd className="text-xs text-gray-500">{po.vendor?.email || 'N/A'}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Order Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(po.orderDate)}</dd>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(calculateTotalCost())}</dd>
              </div>
            </div>
          </div>

          {/* PR Reference */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Purchase Requisition Reference</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-blue-700">PR Number</span>
                <p className="text-sm font-medium text-blue-900">{po.pr?.prNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-blue-700">Department</span>
                <p className="text-sm font-medium text-blue-900">{po.pr?.departmentId || 'N/A'}</p>
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
              Order Items ({po.items?.length || 0})
            </h3>
            {po.items && po.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Details
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {po.items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50">
                        <td className="px-8 py-6">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.item?.itemCode || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">{item.item?.nameEn || 'N/A'}</div>
                            {item.specifications && (
                              <div className="text-xs text-gray-400 mt-1">{item.specifications}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.quantity || 0} {item.item?.unit || 'units'}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(Number(item.unitPrice) || 0)}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency((item.quantity || 0) * (Number(item.unitPrice) || 0))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-8 py-6 text-sm font-medium text-gray-900 text-right">
                        Total Amount:
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-gray-900">
                        {formatCurrency(calculateTotalCost())}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-lg text-gray-600">No items found in this purchase order</p>
              </div>
            )}
          </div>

          {/* Previous Approvals */}
          {po.approvals && po.approvals.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Approval History</h3>
              <div className="space-y-3">
                {po.approvals.map((approval, index) => (
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
                          {approval.actionDate ? formatDate(approval.actionDate) : 'Pending'}
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
              <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg text-gray-600">No approval history available</p>
              <p className="text-sm text-gray-500 mt-1">This is a new purchase order awaiting approval</p>
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
                          Are you sure you want to {action.toLowerCase()} this purchase order?
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
              (po.status || '') === 'APPROVED' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                {(po.status || '') === 'APPROVED' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    (po.status || '') === 'APPROVED' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Purchase Order {(po.status || '') === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    (po.status || '') === 'APPROVED' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    This purchase order has already been {(po.status || '').toLowerCase()}.
                    {(po.status || '') === 'APPROVED' && ' It can now be sent to the vendor.'}
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

