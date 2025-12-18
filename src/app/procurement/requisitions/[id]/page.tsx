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

  const handleDownloadPDF = () => {
    if (!pr) return;

    // Create a new window for PDF download
    const downloadWindow = window.open('', '_blank');
    if (!downloadWindow) return;

    // Generate HTML content for PDF download
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Requisition ${pr.prNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #000;
              background: white;
              font-size: 12px;
            }
            .download-buttons {
              position: fixed;
              top: 10px;
              right: 10px;
              display: flex;
              gap: 10px;
              z-index: 1000;
              background: white;
              padding: 10px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            @media print {
              .download-buttons {
                display: none;
              }
            }
            .download-btn {
              padding: 8px 16px;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: white;
              cursor: pointer;
              font-size: 12px;
              transition: all 0.2s;
            }
            .download-btn:hover {
              background: #f5f5f5;
            }
            .download-btn.primary {
              background: #f97316;
              color: white;
              border-color: #f97316;
            }
            .download-btn.primary:hover {
              background: #ea580c;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #f97316;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #f97316;
              margin-bottom: 5px;
            }
            .document-title {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            .pr-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }
            .info-section {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
            }
            .info-title {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 10px;
              color: #f97316;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .info-label {
              color: #6b7280;
              font-weight: 500;
            }
            .info-value {
              color: #111827;
              font-weight: 600;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th {
              background: #f97316;
              color: white;
              padding: 10px;
              text-align: left;
              font-size: 11px;
              font-weight: bold;
            }
            .items-table td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 11px;
            }
            .items-table tr:nth-child(even) {
              background: #f9fafb;
            }
            .total-row {
              background: #fef3c7 !important;
              font-weight: bold;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 10px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="download-buttons">
            <button class="download-btn primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
            <button class="download-btn secondary" onclick="window.close()">✕ Close</button>
          </div>

          <div class="header">
            <div class="company-name">WUJHA PROCUREMENT</div>
            <div class="document-title">PURCHASE REQUISITION</div>
            <div>PR Number: ${pr.prNumber}</div>
            <div>Generated: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="pr-info">
            <div class="info-section">
              <div class="info-title">Requisition Details</div>
              <div class="info-item">
                <span class="info-label">PR Number:</span>
                <span class="info-value">${pr.prNumber}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">
                  <span class="status-badge" style="background: ${pr.status === 'APPROVED' ? '#10b981' : pr.status === 'PENDING_APPROVAL' ? '#f59e0b' : pr.status === 'DRAFT' ? '#6b7280' : pr.status === 'REJECTED' ? '#ef4444' : '#3b82f6'}; color: white;">${pr.status}</span>
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Priority:</span>
                <span class="info-value">
                  <span class="status-badge" style="background: ${pr.priority === 'URGENT' ? '#ef4444' : pr.priority === 'HIGH' ? '#f59e0b' : pr.priority === 'NORMAL' ? '#3b82f6' : '#10b981'}; color: white;">${pr.priority}</span>
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Item Type:</span>
                <span class="info-value">${pr.itemType.replace('_', ' ')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Department:</span>
                <span class="info-value">${pr.departmentId || 'N/A'}</span>
              </div>
              ${pr.projectId ? `
              <div class="info-item">
                <span class="info-label">Project ID:</span>
                <span class="info-value">${pr.projectId}</span>
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Required By Date:</span>
                <span class="info-value">${formatDate(pr.requiredByDate)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Budget Code:</span>
                <span class="info-value">${pr.budgetCode || 'N/A'}</span>
              </div>
              ${pr.costCenter ? `
              <div class="info-item">
                <span class="info-label">Cost Center:</span>
                <span class="info-value">${pr.costCenter}</span>
              </div>
              ` : ''}
              ${pr.boqReference ? `
              <div class="info-item">
                <span class="info-label">BOQ Reference:</span>
                <span class="info-value">${pr.boqReference}</span>
              </div>
              ` : ''}
            </div>

            <div class="info-section">
              <div class="info-title">Requestor Information</div>
              ${pr.requesterId ? `
              <div class="info-item">
                <span class="info-label">Requester ID:</span>
                <span class="info-value">${pr.requesterId}</span>
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Created By:</span>
                <span class="info-value">${pr.creatorName || pr.createdBy || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Created Date:</span>
                <span class="info-value">${formatDate(pr.createdAt)}</span>
              </div>
              ${pr.justification ? `
              <div class="info-item" style="flex-direction: column; align-items: flex-start;">
                <span class="info-label" style="margin-bottom: 5px;">Justification:</span>
                <span class="info-value" style="text-align: left; font-weight: normal;">${pr.justification}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #f97316;">Requested Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Price</th>
                </tr>
              </thead>
              <tbody>
                ${pr.items.map(item => `
                  <tr>
                    <td>${item.item.itemCode || 'N/A'}</td>
                    <td>${item.item.nameEn || 'N/A'}</td>
                    <td>${item.item.category?.nameEn || 'N/A'}</td>
                    <td>${item.quantity}${item.item.unitOfMeasure ? ' ' + item.item.unitOfMeasure : ''}</td>
                    <td>${formatCurrency(item.estimatedPrice)}</td>
                    <td>${formatCurrency((Number(item.quantity) || 0) * (Number(item.estimatedPrice) || 0))}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="5" style="text-align: right; padding-right: 20px;">Total Estimated Cost:</td>
                  <td style="font-size: 14px;">${formatCurrency(calculateTotalCost())}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>This is a computer-generated document. No signature is required.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    downloadWindow.document.write(htmlContent);
    downloadWindow.document.close();
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
