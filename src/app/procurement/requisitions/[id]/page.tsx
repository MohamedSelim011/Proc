'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Building, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText,
  Edit,
  Trash2,
  Download,
  Loader2,
  Send
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { getUserRole, getUserData } from '@/lib/jwt';

interface PRItem {
  id: string;
  itemId: string;
  quantity: number;
  estimatedPrice: number;
  specifications?: string;
  requiredDate?: string;
  item: {
    id: string;
    itemCode: string;
    nameEn: string;
    nameAr: string;
    unitOfMeasure: string;
    category: {
      nameEn: string;
    };
  };
}

interface PurchaseRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  requesterId?: string;
  projectId?: string;
  boqReference?: string;
  priority: string;
  requiredByDate: string;
  justification: string;
  budgetCode: string;
  costCenter?: string;
  status: string;
  totalEstimatedCost: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  creatorName?: string; // The name of the user who created the PR
  items: PRItem[];
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-wujha-primary/10 text-wujha-primary',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
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

export default function PurchaseRequisitionDetail() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [pr, setPr] = useState<PurchaseRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userEmployeeId, setUserEmployeeId] = useState<string>('');
  
  useEffect(() => {
    // Get user data from JWT token or localStorage
    const role = getUserRole() || '';
    const user = getUserData() || {};
    
    console.log('PR Detail - User Role:', role);
    console.log('PR Detail - User Data:', user);
    
    setUserRole(role);
    setUserId(user.id || '');
    setUserEmployeeId(user.employeeId || '');
  }, []);
  
  // Check permissions
  const canRequestApproval = ['REQUESTOR', 'DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole?.toUpperCase());
  const canApprove = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole?.toUpperCase());
  const isRequester = pr?.requesterId === userId || pr?.requesterId === userEmployeeId || pr?.createdBy === userId;
  
  // Debug logging
  useEffect(() => {
    if (pr) {
      console.log('PR Detail - Permissions Check:', {
        userRole,
        userId,
        userEmployeeId,
        prStatus: pr.status,
        prRequesterId: pr.requesterId,
        prCreatedBy: pr.createdBy,
        canApprove,
        isRequester,
        shouldShowApproveButton: (pr.status === 'PENDING_APPROVAL' || pr.status === 'SUBMITTED') && canApprove
      });
    }
  }, [pr, userRole, userId, userEmployeeId, canApprove, isRequester]);

  const formatCurrency = (amount: number) => {
    // Handle NaN, null, undefined, or invalid numbers
    const validAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 3
    }).format(validAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateTotalCost = () => {
    if (!pr || !pr.items) return 0;
    return pr.items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.estimatedPrice) || 0;
      return total + (quantity * price);
    }, 0);
  };

  const handleDownloadPDF = async () => {
    if (!pr) return;

    try {
      showToast('info', 'Generating PDF...');
      const response = await fetch(`/api/purchase-requisitions/${pr.id}/download?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast('error', errorData.error || 'Failed to download Purchase Requisition');
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        showToast('error', 'Server returned non-PDF content');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Purchase_Requisition_${pr.prNumber}.pdf`;
      link.style.display = 'none';
      link.setAttribute('download', `Purchase_Requisition_${pr.prNumber}.pdf`);
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
        showToast('success', 'PDF downloaded successfully');
      }, 100);
    } catch (error) {
      console.error('Error downloading purchase requisition:', error);
      showToast('error', 'Failed to download Purchase Requisition');
    }
  };

  useEffect(() => {
    fetchPR();
  }, [params.id]);

  const fetchPR = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase-requisitions/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setPr(data);
      } else {
        setError(data.error || 'Failed to fetch purchase requisition');
      }
    } catch (error) {
      console.error('Error fetching PR:', error);
      setError('Failed to fetch purchase requisition');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!canRequestApproval) {
      showToast('error', 'You do not have permission to request approval');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/purchase-requisitions/${params.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstApproverId: 'manager001' // This should be determined based on routing rules
        }),
      });

      if (response.ok) {
        showToast('success', 'Requisition submitted for approval successfully!');
        fetchPR(); // Refresh the data
      } else {
        const data = await response.json();
        showToast('error', data.error || 'Failed to submit requisition for approval');
      }
    } catch (error) {
      showToast('error', 'An error occurred while submitting the requisition');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="animate-spin h-8 w-8 text-wujha-primary" />
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error || 'Purchase requisition not found'}</p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/procurement/requisitions')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requisitions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/procurement/requisitions')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Requisitions
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            title="Download Purchase Requisition as PDF"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </button>
          {pr.status === 'DRAFT' && (
            <>
              <Link
                href={`/procurement/requisitions/${pr.id}/edit`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </>
          )}
        </div>
      </div>

      {/* PR Header Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pr.prNumber}</h1>
              <p className="mt-1 text-sm text-gray-500">Purchase Requisition Details</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[pr.priority as keyof typeof priorityColors]}`}>
                {pr.priority}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[pr.status as keyof typeof statusColors]}`}>
                {pr.status}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Department
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{pr.departmentId}</dd>
            </div>
            
            {pr.projectId && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Project ID
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{pr.projectId}</dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Required By
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(pr.requiredByDate)}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Item Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{pr.itemType.replace('_', ' ')}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Budget Code</dt>
              <dd className="mt-1 text-sm text-gray-900">{pr.budgetCode}</dd>
            </div>

            {pr.costCenter && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Cost Center</dt>
                <dd className="mt-1 text-sm text-gray-900">{pr.costCenter}</dd>
              </div>
            )}

            {pr.boqReference && (
              <div>
                <dt className="text-sm font-medium text-gray-500">BOQ Reference</dt>
                <dd className="mt-1 text-sm text-gray-900">{pr.boqReference}</dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Created By
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{pr.creatorName || pr.createdBy}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Created Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(pr.createdAt)}</dd>
            </div>
          </dl>
        </div>

        {pr.justification && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Justification</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{pr.justification}</dd>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Requested Items</h3>
          <p className="mt-1 text-sm text-gray-500">{pr.items.length} item(s) requested</p>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pr.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.item.itemCode}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.item.nameEn}
                      </div>
                      {item.specifications && (
                        <div className="text-xs text-gray-400 mt-1">
                          {item.specifications}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.item.category.nameEn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantity} {item.item.unitOfMeasure}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.estimatedPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency((Number(item.quantity) || 0) * (Number(item.estimatedPrice) || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  Total Estimated Cost:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatCurrency(calculateTotalCost())}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
        <div className="flex space-x-3">
          {pr.status === 'DRAFT' && canRequestApproval && (
            <>
              <Link
                href={`/procurement/requisitions/${pr.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Requisition
              </Link>
              <button
                onClick={handleRequestApproval}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Request Approval
                  </>
                )}
              </button>
            </>
          )}
          {(pr.status === 'PENDING_APPROVAL' || pr.status === 'SUBMITTED') && canApprove && (
            <button
              onClick={() => router.push(`/procurement/requisitions/${pr.id}/approve`)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Review & Approve
            </button>
          )}
          {(pr.status === 'PENDING_APPROVAL' || pr.status === 'SUBMITTED') && !canApprove && (
            <p className="text-sm text-gray-500">Waiting for approval from authorized approvers</p>
          )}
        </div>
      </div>
    </div>
  );
}

