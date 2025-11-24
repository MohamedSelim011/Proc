'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, 
  Building, 
  Calendar, 
  DollarSign, 
  Package, 
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Edit,
  Download,
  Mail,
  Phone,
  MapPin,
  User,
  CreditCard,
  XCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { getUserRole, getUserData } from '@/lib/jwt';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  itemType: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
    phone?: string;
    address?: string;
  };
  pr: {
    id: string;
    prNumber: string;
    departmentId: string;
    requestor: string;
  };
  items: {
    id: string;
    item: {
      id: string;
      nameEn: string;
      itemCode: string;
      unit: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specifications?: string;
  }[];
  totalAmount: number;
  currency: string;
  orderDate: string;
  deliveryDate?: string;
  deliveryAddress?: string | {
    building: string;
    street: string;
    city: string;
    governorate: string;
    postalCode: string;
    country: string;
  };
  paymentTerms?: string;
  notes?: string;
  createdBy?: string;
  approvals?: {
    id: string;
    level: number;
    status: string;
    approverId: string;
    comments?: string;
    actionDate?: string;
  }[];
  goodsReceipts: {
    id: string;
    grnNumber: string;
    receiptDate: string;
    status: string;
    totalReceived: number;
    totalRejected: number;
  }[];
  invoices: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    paymentStatus: string;
  }[];
  amendments: {
    id: string;
    amendmentNumber: string;
    amendmentDate: string;
    reason: string;
    changes: string;
  }[];
  deliveryStats?: {
    totalOrdered: number;
    totalReceived: number;
    totalRejected: number;
    totalPending: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [statusComments, setStatusComments] = useState('');
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [history, setHistory] = useState<Array<{
    id: string;
    processType: string;
    action: string;
    performedBy: string;
    performedAt: string;
    details: any;
  }>>([]);

  // Get user role and ID from localStorage
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userEmployeeId, setUserEmployeeId] = useState<string>('');

  useEffect(() => {
    // Function to update user info from JWT
    const updateUserInfo = () => {
      if (typeof window === 'undefined') return;
      
      // Try multiple sources for role
      let role = '';
      let user: any = {};
      
      // Method 1: From JWT utility
      const jwtRole = getUserRole();
      const jwtUser = getUserData();
      
      // Method 2: Direct from localStorage
      const localRole = localStorage.getItem('role');
      const localUserStr = localStorage.getItem('user');
      let localUser: any = null;
      if (localUserStr) {
        try {
          localUser = JSON.parse(localUserStr);
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }
      
      // Method 3: Decode from JWT token directly
      const token = localStorage.getItem('token');
      let tokenRole = '';
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            tokenRole = payload.role || '';
          }
        } catch (e) {
          console.error('Error decoding token:', e);
        }
      }
      
      // Priority: JWT util > localStorage role > token decode
      role = jwtRole || localRole || tokenRole || '';
      user = jwtUser || localUser || {};
      
      console.log('PO Detail - Role Detection:', {
        jwtRole,
        localRole,
        tokenRole,
        finalRole: role,
        jwtUser,
        localUser,
        finalUser: user,
        tokenExists: !!token
      });
      
      setUserRole(role);
      setUserId(user.id || '');
      setUserEmployeeId(user.employeeId || '');
    };

    // Initial load
    updateUserInfo();

    // Listen for storage changes (e.g., token updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'role' || e.key === 'user') {
        updateUserInfo();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchPurchaseOrder(params.id as string);
    }
  }, [params.id]);

  const fetchPurchaseOrder = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase-orders/${id}`);
      const data = await response.json();
      
      if (response.ok) {
        setPo(data);
        // Fetch history
        fetchHistory(id);
      } else {
        console.error('Error fetching purchase order:', data.error);
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (poId: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/history`);
      const data = await response.json();
      
      if (response.ok) {
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setPendingStatus(newStatus);
    setStatusComments('');
    setShowStatusDialog(true);
  };

  const confirmStatusUpdate = async () => {
    if (!po) return;
    
    try {
      setUpdatingStatus(true);
      const response = await fetch(`/api/purchase-orders/${po.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: pendingStatus,
          updatedBy: userId || userEmployeeId || po.createdBy || 'SYSTEM',
          comments: statusComments || `Status updated to ${pendingStatus}`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh PO data
        if (pendingStatus === 'SENT') {
          if (data.emailSent) {
            showToast('success', `Purchase Order sent to vendor via email successfully!`);
          } else {
            showToast('warning', `Status updated to ${pendingStatus}, but email could not be sent. Please contact the vendor manually.`);
          }
        } else {
          showToast('success', `Status updated to ${pendingStatus}`);
        }
        await fetchPurchaseOrder(po.id);
        setShowStatusDialog(false);
      } else {
        const error = await response.json();
        showToast('error', `Failed to update status: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('error', 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!po) return;
    
    try {
      setSubmittingForApproval(true);
      const response = await fetch(`/api/purchase-orders/${po.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submittedBy: userId || userEmployeeId || po.createdBy,
        }),
      });

      if (response.ok) {
        showToast('success', 'Purchase Order submitted for approval');
        await fetchPurchaseOrder(po.id);
      } else {
        const error = await response.json();
        showToast('error', `Failed to submit: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting for approval:', error);
      showToast('error', 'Failed to submit for approval');
    } finally {
      setSubmittingForApproval(false);
    }
  };

  // Check permissions
  const roleUpper = userRole?.toUpperCase() || '';
  const isSuperAdmin = roleUpper === 'SUPER_ADMIN';
  const isAdmin = roleUpper === 'ADMIN' || isSuperAdmin;
  
  // Only Department Manager, Procurement Manager, Finance Manager, Admin, and Super Admin can approve
  const hasApprovalRole = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(roleUpper);
  
  const isCreator = po?.createdBy === userId || po?.createdBy === userEmployeeId;
  
  // Super Admin can approve even if they're the creator, others cannot approve their own POs
  const canApprove = hasApprovalRole && (isSuperAdmin || !isCreator);
  
  // Only Buyer (REQUESTOR), Procurement Officer (PROCUREMENT_MANAGER), and Admin can submit POs for approval
  // Also allow if user is the creator of the PO
  const canSubmit = ['BUYER', 'REQUESTOR', 'PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(roleUpper) || isCreator;

  // Debug logging (only in browser)
  if (typeof window !== 'undefined') {
    console.log('PO Detail - Permissions Check:', {
      userRole,
      roleUpper,
      userId,
      userEmployeeId,
      poStatus: po?.status,
      poCreatedBy: po?.createdBy,
      isSuperAdmin,
      isAdmin,
      hasApprovalRole,
      canApprove,
      canSubmit,
      isCreator,
      localStorageRole: localStorage.getItem('role'),
      localStorageToken: localStorage.getItem('token') ? 'exists' : 'missing',
      jwtDecoded: (() => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
              return payload;
            }
          } catch (e) {}
        }
        return null;
      })()
    });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'ACKNOWLEDGED': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID': return 'bg-red-100 text-red-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-wujha-primary" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Purchase Order Not Found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The purchase order you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <div className="mt-6">
          <Link
            href="/procurement/purchase-orders"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
          >
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{po.poNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(po.status)}`}>
                {po.status}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-wujha-info/10 text-wujha-info">
                {po.itemType}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {po.vendor.nameEn}
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                PR: {po.pr.prNumber}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(po.orderDate).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {po.totalAmount.toLocaleString()} {po.currency}
            </p>
            <p className="text-sm text-gray-500">Total Amount</p>
            <div className="flex gap-2 mt-4">
              {po.status === 'DRAFT' && canSubmit && (
                <>
                  <button 
                    onClick={handleSubmitForApproval}
                    disabled={submittingForApproval}
                    className="px-4 py-2 text-sm font-medium text-white bg-wujha-primary rounded-lg hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingForApproval ? 'Submitting...' : 'Request Approval'}
                  </button>
                  <button 
                    onClick={() => router.push(`/procurement/purchase-orders/${po.id}/edit`)}
                    className="px-4 py-2 text-sm font-medium text-wujha-info bg-wujha-info/10 rounded-lg hover:bg-wujha-info/20"
                  >
                    <Edit className="h-4 w-4 inline mr-1" />
                    Edit
                  </button>
                </>
              )}
              {po.status === 'PENDING_APPROVAL' && canApprove && (
                <Link
                  href={`/procurement/purchase-orders/${po.id}/approve`}
                  className="px-4 py-2 text-sm font-medium text-white bg-wujha-primary rounded-lg hover:bg-wujha-primary-hover"
                >
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  Review & Approve
                </Link>
              )}
              {po.status === 'APPROVED' && (
                <button 
                  onClick={() => handleStatusUpdate('SENT')}
                  disabled={updatingStatus}
                  className="px-6 py-3 text-base font-semibold text-white bg-wujha-primary rounded-lg hover:bg-wujha-primary-hover shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Mail className="h-5 w-5" />
                  {updatingStatus ? 'Sending Email...' : 'Send to Vendor'}
                </button>
              )}
              {/* Only allow editing when status is DRAFT */}
              {po.status === 'DRAFT' && (
                <button 
                  onClick={() => router.push(`/procurement/purchase-orders/${po.id}/edit`)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <Edit className="h-4 w-4 inline mr-1" />
                  Edit
                </button>
              )}
              {/* Show disabled edit button for statuses that cannot be edited */}
              {(po.status === 'PENDING_APPROVAL' || po.status === 'SUBMITTED' || po.status === 'APPROVED' || po.status === 'SENT' || po.status === 'ACKNOWLEDGED' || po.status === 'PARTIAL' || po.status === 'COMPLETED') && po.status !== 'DRAFT' && (
                <button 
                  disabled
                  className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                  title="Cannot edit after submission for approval"
                >
                  <Edit className="h-4 w-4 inline mr-1" />
                  Edit (Disabled)
                </button>
              )}
              {po.status === 'SENT' && (
                <button 
                  onClick={() => handleStatusUpdate('ACKNOWLEDGED')}
                  disabled={updatingStatus}
                  className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {updatingStatus ? 'Updating...' : 'Mark Acknowledged'}
                </button>
              )}
              <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">
                <Download className="h-4 w-4 inline mr-1" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'details', name: 'Details', icon: FileText },
              { id: 'items', name: 'Items', icon: Package },
              { id: 'delivery', name: 'Delivery', icon: Truck },
              { id: 'invoices', name: 'Invoices', icon: CreditCard },
              { id: 'history', name: 'History', icon: Clock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-wujha-primary text-wujha-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* PO Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Order Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">PO Number:</span>
                    <span className="text-sm font-medium text-gray-900">{po.poNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Order Date:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(po.orderDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Delivery Date:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Terms:</span>
                    <span className="text-sm font-medium text-gray-900">{po.paymentTerms || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Currency:</span>
                    <span className="text-sm font-medium text-gray-900">{po.currency}</span>
                  </div>
                </div>

                {po.notes && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{po.notes}</p>
                  </div>
                )}

                {/* Status History */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Status History</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-gray-900">{new Date(po.createdAt).toLocaleDateString()}</span>
                    </div>
                    {po.updatedAt && po.updatedAt !== po.createdAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="text-gray-900">{new Date(po.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Workflow Progress */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Approval Workflow</h4>
                  <div className="space-y-3">
                    {(() => {
                      const workflowSteps = [
                        { status: 'DRAFT', label: 'Draft Created', icon: FileText },
                        { status: 'SUBMITTED', label: 'Submitted for Approval', icon: Clock },
                        { status: 'PENDING_APPROVAL', label: 'Pending Approval', icon: Clock },
                        { status: 'APPROVED', label: 'Approved', icon: CheckCircle },
                        { status: 'SENT', label: 'Sent to Vendor', icon: Mail },
                        { status: 'ACKNOWLEDGED', label: 'Vendor Acknowledged', icon: CheckCircle },
                        { status: 'COMPLETED', label: 'Completed', icon: CheckCircle }
                      ];
                      
                      // Define status order for completion check
                      const statusOrder = ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'COMPLETED'];
                      const currentStatusIndex = statusOrder.indexOf(po.status);
                      
                      return workflowSteps.map((step, index) => {
                        const stepStatusIndex = statusOrder.indexOf(step.status);
                        const isCompleted = currentStatusIndex >= stepStatusIndex && currentStatusIndex > -1;
                        const isCurrent = po.status === step.status;
                        const isRejected = po.status === 'REJECTED' && stepStatusIndex < currentStatusIndex;
                        const isCancelled = po.status === 'CANCELLED';
                        
                        return (
                          <div key={step.status} className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                              isRejected || isCancelled
                                ? 'bg-red-500 border-red-500 text-white'
                                : isCompleted 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : isCurrent
                                ? 'bg-wujha-primary border-wujha-primary text-white'
                                : 'bg-gray-100 border-gray-300 text-gray-400'
                            }`}>
                              {isCompleted || isCurrent ? (
                                <step.icon className="h-4 w-4" />
                              ) : (
                                <span className="text-sm font-medium">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${
                                isRejected || isCancelled
                                  ? 'text-red-700'
                                  : isCompleted 
                                  ? 'text-green-700' 
                                  : isCurrent 
                                  ? 'text-wujha-primary' 
                                  : 'text-gray-500'
                              }`}>
                                {step.label}
                              </div>
                              {isCurrent && (
                                <div className="text-xs text-wujha-primary">Current Step</div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Vendor Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Vendor Name:</span>
                    <span className="text-sm font-medium text-gray-900">{po.vendor.nameEn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium text-gray-900">
                      <Mail className="h-4 w-4 inline mr-1" />
                      {po.vendor.email}
                    </span>
                  </div>
                  {po.vendor.phone && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="text-sm font-medium text-gray-900">
                        <Phone className="h-4 w-4 inline mr-1" />
                        {po.vendor.phone}
                      </span>
                    </div>
                  )}
                  {po.deliveryAddress && (
                    <div>
                      <span className="text-sm text-gray-600">Delivery Address:</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        {typeof po.deliveryAddress === 'string' 
                          ? po.deliveryAddress 
                          : `${po.deliveryAddress.building}, ${po.deliveryAddress.street}, ${po.deliveryAddress.city}, ${po.deliveryAddress.governorate}, ${po.deliveryAddress.postalCode}, ${po.deliveryAddress.country}`
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* PR Reference */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Purchase Requisition</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-blue-900">{po.pr.prNumber}</p>
                        <p className="text-xs text-blue-700">Department: {po.pr.departmentId}</p>
                        <p className="text-xs text-blue-700">Requestor: {po.pr.requestor}</p>
                      </div>
                      <Link
                        href={`/procurement/requisitions/${po.pr.id}`}
                        className="text-wujha-info hover:text-wujha-info/80"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Specifications
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {po.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.item.nameEn}</div>
                            <div className="text-sm text-gray-500">{item.item.itemCode}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity} {item.item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.unitPrice.toLocaleString()} {po.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.totalPrice.toLocaleString()} {po.currency}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                          {item.specifications || 'Standard specifications'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                        Total Amount:
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-gray-900">
                        {po.totalAmount.toLocaleString()} {po.currency}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Status</h3>
              
              {po.deliveryStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Package className="h-8 w-8 text-wujha-info" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-900">Ordered</p>
                        <p className="text-2xl font-bold text-blue-900">{po.deliveryStats.totalOrdered}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-900">Received</p>
                        <p className="text-2xl font-bold text-green-900">{po.deliveryStats.totalReceived}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-900">Rejected</p>
                        <p className="text-2xl font-bold text-red-900">{po.deliveryStats.totalRejected}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-yellow-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-900">Pending</p>
                        <p className="text-2xl font-bold text-yellow-900">{po.deliveryStats.totalPending}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Goods Receipt Notes</h4>
                {po.goodsReceipts.length > 0 ? (
                  <div className="space-y-4">
                    {po.goodsReceipts.map((grn) => (
                      <div key={grn.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">{grn.grnNumber}</h5>
                            <p className="text-sm text-gray-500">
                              Receipt Date: {new Date(grn.receiptDate).toLocaleDateString()}
                            </p>
                            <div className="flex gap-4 mt-2">
                              <span className="text-sm text-green-600">
                                Received: {grn.totalReceived}
                              </span>
                              <span className="text-sm text-red-600">
                                Rejected: {grn.totalRejected}
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(grn.status)}`}>
                            {grn.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No goods receipts recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Related Invoices</h3>
              {po.invoices.length > 0 ? (
                <div className="space-y-4">
                  {po.invoices.map((invoice) => (
                    <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</h5>
                          <p className="text-sm text-gray-500">
                            Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            Amount: {invoice.totalAmount.toLocaleString()} {po.currency}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                            {invoice.paymentStatus}
                          </span>
                          <div className="mt-2">
                            <Link
                              href={`/procurement/invoices/${invoice.id}`}
                              className="text-wujha-primary hover:text-wujha-primary-hover text-sm"
                            >
                              View Invoice
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No invoices created yet.</p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Order History</h3>
              
              {/* Process Audit History */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Activity History</h4>
                {history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {item.action === 'SUBMITTED' && <Clock className="h-4 w-4 text-blue-500" />}
                              {item.action === 'APPROVED' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {item.action === 'REJECTED' && <XCircle className="h-4 w-4 text-red-500" />}
                              {item.action === 'CREATED' && <FileText className="h-4 w-4 text-gray-500" />}
                              <span className="text-sm font-medium text-gray-900">{item.action}</span>
                              <span className="text-xs text-gray-500">({item.processType})</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Performed by: <span className="font-medium">{item.performedBy}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.performedAt).toLocaleString()}
                            </p>
                            {item.details && (
                              <div className="mt-2 text-sm text-gray-600">
                                {item.details.comments && (
                                  <p className="mt-1"><strong>Comments:</strong> {item.details.comments}</p>
                                )}
                                {item.details.previousStatus && item.details.newStatus && (
                                  <p className="mt-1">
                                    Status: <span className="text-gray-500">{item.details.previousStatus}</span> → 
                                    <span className="text-wujha-primary font-medium"> {item.details.newStatus}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No activity history recorded.</p>
                )}
              </div>

              {/* Amendments */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Amendment History</h4>
                {po.amendments.length > 0 ? (
                  <div className="space-y-4">
                    {po.amendments.map((amendment) => (
                      <div key={amendment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-sm font-medium text-gray-900">{amendment.amendmentNumber}</h5>
                            <p className="text-sm text-gray-500">
                              Date: {new Date(amendment.amendmentDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Reason:</strong> {amendment.reason}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Changes:</strong> {amendment.changes}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No amendments recorded.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Confirmation Dialog */}
      {showStatusDialog && (
        <div
          className="fixed inset-0 bg-transparent bg-opacity-80 backdrop-blur-sm overflow-y-auto h-full w-full z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStatusDialog(false);
            }
          }}
        >
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
          Update Purchase Order Status
              </h3>
              <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to change the status to <strong>{pendingStatus}</strong>?
              </p>
              
              <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comments (Optional)
          </label>
          <textarea
            value={statusComments}
            onChange={(e) => setStatusComments(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-transparent"
            rows={3}
            placeholder="Add any comments about this status change..."
          />
              </div>

              <div className="flex gap-3 justify-end">
          <button
            onClick={() => setShowStatusDialog(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={confirmStatusUpdate}
            disabled={updatingStatus}
            className="px-4 py-2 text-sm font-medium text-white bg-wujha-primary rounded-md hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updatingStatus ? 'Updating...' : 'Confirm'}
          </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
