'use client';

import { useState, useEffect, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { getUserData } from '@/lib/jwt';
import DocumentManager from '@/components/documents/document-manager';
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
  Download,
  DollarSign,
  Shield,
  Award,
  SendHorizontal,
  CheckCheck,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ServiceContract {
  id: string;
  contractNumber: string;
  prId: string;
  vendorId: string;
  contractType: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  serviceAmount?: number;
  currency: string;
  paymentTerms: string;
  slaTerms?: string | object;
  penaltyClause?: string;
  performanceBond?: number;
  retentionAmount?: number;
  insuranceRequirements?: string | object;
  status: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
  versionNumber?: number;
  vendor: {
    id: string;
    vendorCode: string;
    nameEn: string;
    nameAr: string;
    email: string;
    mobile: string;
  };
  pr: {
    id: string;
    prNumber: string;
    requesterId: string;
    departmentId: string;
    estimatedCost: string;
    justification: string;
    servicePR: {
      serviceScope: string;
      technicalSpecifications?: string;
      duration: number;
      durationUnit: string;
      items: Array<{
        id: string;
        quantity: string;
        estimatedRate: string;
        duration: number;
        durationUnit: string;
        specifications?: string;
        deliverables: string[];
        performanceMetrics: string[];
        serviceItem: {
          id: string;
          serviceCode: string;
          nameEn: string;
          nameAr: string;
          unitOfMeasure: string;
          serviceCategory: {
            id: string;
            nameEn: string;
            nameAr: string;
          };
        };
      }>;
    };
    items?: Array<{
      id: string;
      quantity: number;
      estimatedPrice: string;
      item: {
        id: string;
        itemCode: string;
        nameEn: string;
        unitOfMeasure: string;
      };
    }>;
  };
  approval?: {
    id: string;
    status: string;
    level: number;
    approvalHistory: Array<{
      id: string;
      level: number;
      action: string;
      approverId: string;
      approverName: string;
      comments?: string;
      timestamp: string;
    }>;
  };
  vendorResponses?: Array<{
    id: string;
    versionNumber: number;
    status: string;
    responseType?: string;
    comments?: string;
    respondedAt?: string;
    respondedBy?: string;
    expiresAt: string;
    createdAt: string;
  }>;
  versions?: Array<{
    id: string;
    versionNumber: number;
    contractNumber: string;
    contractType: string;
    startDate: string;
    endDate: string;
    totalValue: string;
    serviceAmount?: string | null;
    currency: string;
    paymentTerms: string;
    slaTerms?: string | object | null;
    penaltyClause?: string | null;
    insuranceRequirements?: string | object | null;
    status: string;
    changeReason?: string;
    changeDescription?: string | null;
    createdBy: string;
    createdByName?: string | null;
    createdAt: string;
  }>;
  documents?: Array<{
    id: string;
    documentType?: string | null;
    documentName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    uploadedBy?: string | null;
    uploadedAt: string;
  }>;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  SIGNED: 'bg-purple-100 text-purple-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-wujha-primary/10 text-wujha-primary',
  TERMINATED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-orange-100 text-orange-800'
};

const contractTypeColors = {
  SERVICE_AGREEMENT: 'bg-wujha-primary/10 text-wujha-primary',
  CONSULTING_CONTRACT: 'bg-purple-100 text-purple-800',
  MAINTENANCE_CONTRACT: 'bg-green-100 text-green-800',
  SUPPORT_CONTRACT: 'bg-orange-100 text-orange-800'
};

export default function ServiceContractDetail() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [contract, setContract] = useState<ServiceContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activating, setActivating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'request-edit' | null>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'service-details' | 'approvals' | 'vendor-responses' | 'versions' | 'documents'>('general');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

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

  const getMaterialAmount = () => {
    if (!contract?.pr?.items || contract.pr.items.length === 0) return 0;
    return contract.pr.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.estimatedPrice || 0);
    }, 0);
  };

  const formatJsonField = (value: string | object | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      // Format object as key-value pairs with proper formatting
      return Object.entries(value)
        .map(([key, val]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          const formattedValue = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
          return `${formattedKey}: ${formattedValue}`;
        })
        .join('\n');
    }
    return String(value);
  };

  useEffect(() => {
    if (params.id) {
      fetchContract();
    }
  }, [params.id]);

  // Auto-refresh contract data every 30 seconds when in PENDING_APPROVAL status
  useEffect(() => {
    if (contract?.status === 'PENDING_APPROVAL') {
      const interval = setInterval(() => {
        fetchContract();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [contract?.status]);

  useEffect(() => {
    // Check if current user can approve
    const user = getUserData();
    setCurrentUser(user);
    
    if (user && contract && contract.status === 'PENDING_APPROVAL' && contract.approval) {
      checkApprovalPermission(user);
    }
  }, [contract]);

  const checkApprovalPermission = async (user: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !contract?.approval) return;

      // approval.level represents the level currently waiting for approval
      const levelWaitingForApproval = contract.approval.level;
      const userRole = user.role;

      // Check if user's role matches the required role for the current level
      // Level 1: HEAD_OF_PROCUREMENT, Level 2: BILLING_ENGINEER
      const canUserApproveThisLevel = 
        (levelWaitingForApproval === 1 && userRole === 'HEAD_OF_PROCUREMENT') ||
        (levelWaitingForApproval === 2 && userRole === 'BILLING_ENGINEER' || userRole === 'SUPER_ADMIN' || userRole === 'ADMIN');

      // Check if this level has already been approved (shouldn't happen, but double-check)
      const levelAlreadyApproved = contract.approval.approvalHistory?.some(
        h => h.level === levelWaitingForApproval && h.action === 'APPROVED'
      );

      const finalCanApprove = canUserApproveThisLevel && !levelAlreadyApproved;

      setCanApprove(finalCanApprove);
    } catch (error) {
      console.error('Error checking approval permission:', error);
      setCanApprove(false);
    }
  };

  const fetchContract = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/service-contracts/${params.id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setContract(data);
      } else {
        setError('Failed to fetch service contract');
      }
    } catch (error) {
      setError('Error fetching service contract');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      // Get authenticated user from localStorage
      const user = getUserData();
      if (!user || !user.id) {
        showToast('error', 'You must be logged in to submit for approval');
        setError('Authentication required');
        setSubmitting(false);
        return;
      }

      // Get token for authentication
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('error', 'Authentication token not found');
        setError('Authentication required');
        setSubmitting(false);
        return;
      }

      const response = await fetch(`/api/service-contracts/${params.id}/submit-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name || user.email || 'Unknown User'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', data.message || 'Contract submitted for approval successfully!');
        setSuccess(data.message || 'Contract submitted for approval successfully!');
        // Refresh the contract data to show updated status
        setTimeout(() => {
          fetchContract();
        }, 1000);
      } else {
        showToast('error', data.error || 'Failed to submit contract for approval');
        setError(data.error || 'Failed to submit contract for approval');
      }
    } catch (error) {
      console.error('Error submitting contract for approval:', error);
      showToast('error', 'Failed to submit contract for approval');
      setError('Failed to submit contract for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateContract = async () => {
    try {
      setActivating(true);
      setError('');
      setSuccess('');

      // Get authenticated user
      const user = getUserData();
      const token = localStorage.getItem('token');
      
      if (!user || !user.id || !token) {
        showToast('error', 'You must be logged in to activate contract');
        setError('Authentication required');
        setActivating(false);
        return;
      }

      const response = await fetch(`/api/service-contracts/${params.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          activatedBy: user.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Contract activated successfully!');
        // Refresh the contract data to show updated status
        setTimeout(() => {
          fetchContract();
        }, 1000);
      } else {
        setError(data.error || 'Failed to activate contract');
      }
    } catch (error) {
      console.error('Error activating contract:', error);
      setError('Failed to activate contract');
    } finally {
      setActivating(false);
    }
  };

  const handleApprovalAction = async (action: 'approve' | 'reject' | 'request-edit') => {
    if (action === 'reject' && !approvalComments.trim()) {
      showToast('error', 'Comments are required when rejecting a contract');
      return;
    }

    if (action === 'request-edit' && !approvalComments.trim()) {
      showToast('error', 'Please provide feedback for the requested edits');
      return;
    }

    try {
      setProcessingApproval(true);
      setError('');
      setSuccess('');

      const user = getUserData();
      const token = localStorage.getItem('token');

      if (!user || !token) {
        showToast('error', 'Authentication required');
        return;
      }

      let endpoint = '';
      let method = 'POST';
      let body: any = { comments: approvalComments };

      if (action === 'approve') {
        endpoint = `/api/service-contracts/${params.id}/approve`;
      } else if (action === 'reject') {
        endpoint = `/api/service-contracts/${params.id}/reject`;
      } else if (action === 'request-edit') {
        endpoint = `/api/service-contracts/${params.id}/request-edit`;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', data.message || `Contract ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned for edits'} successfully!`);
        setSuccess(data.message);
        setApprovalAction(null);
        setApprovalComments('');
        
        // Refresh contract
        setTimeout(() => {
          fetchContract();
        }, 1000);
      } else {
        showToast('error', data.error || `Failed to ${action} contract`);
        setError(data.error);
      }
    } catch (error) {
      console.error(`Error ${action} contract:`, error);
      showToast('error', `Failed to ${action} contract`);
      setError(`Failed to ${action} contract`);
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleExportPDF = async () => {
    if (!contract) return;

    try {
      showToast('info', 'Generating PDF...');
      
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Use the API endpoint to download the file (with cache busting)
      const response = await fetch(`/api/service-contracts/${contract.id}/download?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast('error', errorData.error || 'Failed to download Service Contract');
        return;
      }

      // Check if response is PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        showToast('error', 'Server returned non-PDF content');
        return;
      }

      // Get the blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Service_Contract_${contract.contractNumber}.pdf`;
      link.style.display = 'none';
      link.setAttribute('download', `Service_Contract_${contract.contractNumber}.pdf`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
        showToast('success', 'PDF downloaded successfully');
      }, 100);
    } catch (error) {
      console.error('Error downloading service contract:', error);
      showToast('error', 'Failed to download Service Contract');
    }
  };

  const handleDocumentUpload = async (file: File | null) => {
    if (!contract || !file) return;

    try {
      setUploadingDocument(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', currentUser?.email || currentUser?.id || 'SYSTEM');

      const response = await fetch(`/api/service-contracts/${contract.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      showToast('success', 'Document uploaded successfully');
      await fetchContract();
    } catch (error) {
      console.error('Error uploading document:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!contract) return;
    try {
      const response = await fetch(`/api/service-contracts/${contract.id}/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete document');
      }
      showToast('success', 'Document deleted successfully');
      await fetchContract();
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to delete document');
    }
  };

  // Legacy function kept for reference but not used
  const generateHTMLContent = () => {
    if (!contract) return '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Service Contract - ${contract.contractNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #1f2937;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #FF5722;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #FF5722;
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header .subtitle {
            color: #6b7280;
            font-size: 14px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title {
            background: #FFF3E0;
            padding: 12px 15px;
            font-size: 18px;
            font-weight: 600;
            color: #E64A19;
            border-left: 4px solid #FF5722;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-item {
            padding: 12px;
            background: #f9fafb;
            border-radius: 6px;
          }
          .info-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 14px;
            color: #111827;
            font-weight: 500;
          }
          .info-value.large {
            font-size: 20px;
            color: #FF5722;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #d1d5db;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-active { background: #d1fae5; color: #065f46; }
          .status-draft { background: #FFF3E0; color: #E64A19; }
          .terms-box {
            background: #FFF3E0;
            border-left: 4px solid #FF5722;
            padding: 15px;
            margin-top: 15px;
            border-radius: 4px;
          }
          .terms-box h4 {
            color: #E64A19;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .terms-box p {
            color: #BF360C;
            font-size: 13px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SERVICE CONTRACT</h1>
          <h2>${contract.contractNumber}</h2>
          <p class="subtitle">Service Agreement - ${contract.contractType.replace('_', ' ')}</p>
          <div style="margin-top: 15px;">
            <span class="status-badge status-${contract.status.toLowerCase()}">${contract.status}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Contract Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Contract Number</div>
              <div class="info-value">${contract.contractNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Purchase Requisition</div>
              <div class="info-value">${contract.pr.prNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Vendor</div>
              <div class="info-value">${contract.vendor.nameEn}</div>
              <div style="font-size: 12px; color: #6b7280;">${contract.vendor.vendorCode}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Contract Period</div>
              <div class="info-value">${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Payment Terms</div>
              <div class="info-value">${contract.paymentTerms}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Total Contract Value</div>
              <div class="info-value large">${formatCurrency(contract.totalValue)} ${contract.currency}</div>
            </div>
          </div>
        </div>

        ${contract.pr.servicePR ? `
        <div class="section">
          <div class="section-title">Service Requirements</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Service Scope</div>
              <div class="info-value">${contract.pr.servicePR.serviceScope}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Duration</div>
              <div class="info-value">${contract.pr.servicePR.duration} ${contract.pr.servicePR.durationUnit}</div>
            </div>
          </div>
          ${contract.pr.servicePR.technicalSpecifications ? `
            <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 6px;">
              <div class="info-label">Technical Specifications</div>
              <div class="info-value">${contract.pr.servicePR.technicalSpecifications}</div>
            </div>
          ` : ''}
        </div>
        ` : ''}

        ${contract.pr.servicePR?.items && contract.pr.servicePR.items.length > 0 ? `
        <div class="section">
          <div class="section-title">Service Items</div>
          <table>
            <thead>
              <tr>
                <th>Service Code</th>
                <th>Description</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${contract.pr.servicePR.items.map(item => `
                <tr>
                  <td>${item.serviceItem.serviceCode}</td>
                  <td>${item.serviceItem.nameEn}</td>
                  <td>${item.serviceItem.serviceCategory.nameEn}</td>
                  <td>${item.quantity} ${item.serviceItem.unitOfMeasure}</td>
                  <td>${formatCurrency(parseFloat(item.estimatedRate))}</td>
                  <td>${item.duration} ${item.durationUnit}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${contract.performanceBond || contract.retentionAmount ? `
        <div class="section">
          <div class="section-title">Financial Guarantees</div>
          <div class="info-grid">
            ${contract.performanceBond ? `
              <div class="info-item">
                <div class="info-label">Performance Bond</div>
                <div class="info-value">${formatCurrency(contract.performanceBond)} ${contract.currency}</div>
              </div>
            ` : ''}
            ${contract.retentionAmount ? `
              <div class="info-item">
                <div class="info-label">Retention Amount</div>
                <div class="info-value">${formatCurrency(contract.retentionAmount)} ${contract.currency}</div>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        ${contract.slaTerms || contract.penaltyClause || contract.insuranceRequirements ? `
        <div class="section">
          <div class="section-title">Contract Terms & Conditions</div>
          ${contract.slaTerms ? `
            <div class="terms-box" style="background: #FFF3E0; border-color: #FF5722;">
              <h4 style="color: #E64A19;">SLA Terms</h4>
              <p style="color: #BF360C;">${typeof contract.slaTerms === 'string' ? contract.slaTerms : JSON.stringify(contract.slaTerms, null, 2)}</p>
            </div>
          ` : ''}
          ${contract.penaltyClause ? `
            <div class="terms-box" style="background: #FFEBEE; border-color: #F44336;">
              <h4 style="color: #C62828;">Penalty Clause</h4>
              <p style="color: #B71C1C;">${contract.penaltyClause}</p>
            </div>
          ` : ''}
          ${contract.insuranceRequirements ? `
            <div class="terms-box" style="background: #FFF3E0; border-color: #FF5722;">
              <h4 style="color: #E64A19;">Insurance Requirements</h4>
              <p style="color: #BF360C;">${typeof contract.insuranceRequirements === 'string' ? contract.insuranceRequirements : JSON.stringify(contract.insuranceRequirements, null, 2)}</p>
            </div>
          ` : ''}
        </div>
        ` : ''}

        ${contract.pr.justification ? `
        <div class="section">
          <div class="section-title">Business Justification</div>
          <div style="padding: 15px; background: #f9fafb; border-radius: 6px;">
            <p style="font-size: 13px; color: #374151;">${contract.pr.justification}</p>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>WUJHA HR Procurement System</strong></p>
          <p>Generated on ${new Date().toLocaleString('en-OM', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p style="margin-top: 10px; font-size: 11px;">This is a system-generated document</p>
        </div>

        <div class="no-print" style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
          <button
            onclick="window.print()"
            style="background: #FF5722; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
          >
            Print / Save as PDF
          </button>
          <button
            onclick="window.close()"
            style="background: #6b7280; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin-left: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
          >
            Close
          </button>
        </div>
      </body>
      </html>
    `;
    return htmlContent;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error || 'Service contract not found'}</p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/procurement/services/contracts')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Service Contracts
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
            onClick={() => router.push('/procurement/services/contracts')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Service Contracts
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            title="Export contract as PDF"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          {contract.status === 'DRAFT' && (
            <button 
              onClick={() => router.push(`/procurement/services/contracts/${contract.id}/edit`)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Service Contract Header Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{contract.contractNumber}</h1>
              <p className="mt-1 text-sm text-gray-500">Service Contract Details</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contractTypeColors[contract.contractType as keyof typeof contractTypeColors] || 'bg-gray-100 text-gray-800'}`}>
                {contract.contractType.replace('_', ' ')}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[contract.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                {contract.status}
              </span>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-x-8 px-6">
            {[
              { id: 'general', name: 'General Info', icon: Building },
              { id: 'service-details', name: 'Service Details', icon: Shield },
              { id: 'approvals', name: 'Approvals', icon: CheckCheck },
              { id: 'vendor-responses', name: 'Vendor Responses', icon: User },
              { id: 'versions', name: 'Versions', icon: Clock },
              { id: 'documents', name: 'Documents', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

        {activeTab === 'general' && (
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Vendor
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div>{contract.vendor.nameEn}</div>
                <div className="text-gray-500">{contract.vendor.vendorCode}</div>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Purchase Requisition
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{contract.pr.prNumber}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Contract Period
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Total Value
              </dt>
              <dd className="mt-1 text-lg font-bold text-gray-900">
                {formatCurrency(contract.totalValue)} {contract.currency}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Service Amount</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatCurrency(contract.serviceAmount ?? contract.totalValue)} {contract.currency}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Material Amount</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatCurrency(getMaterialAmount())} {contract.currency}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Payment Terms
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{contract.paymentTerms}</dd>
            </div>

            {contract.performanceBond && contract.performanceBond > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Performance Bond
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatCurrency(contract.performanceBond)} {contract.currency}
                </dd>
              </div>
            )}

            {contract.retentionAmount && contract.retentionAmount > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  Retention Amount
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatCurrency(contract.retentionAmount)} {contract.currency}
                </dd>
              </div>
            )}
          </dl>
        </div>
        )}

        {/* Service Requirements */}
        {activeTab === 'service-details' && contract.pr.servicePR && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Service Requirements</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Service Scope</dt>
                <dd className="mt-1 text-sm text-gray-900">{contract.pr.servicePR.serviceScope}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.pr.servicePR.duration} {contract.pr.servicePR.durationUnit}
                </dd>
              </div>
            </div>

            {contract.pr.servicePR.technicalSpecifications && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500">Technical Specifications</dt>
                <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {contract.pr.servicePR.technicalSpecifications}
                </dd>
              </div>
            )}
          </div>
        )}

        {/* Service Items */}
        {activeTab === 'service-details' && contract.pr.servicePR?.items && contract.pr.servicePR.items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Service Items</h3>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contract.pr.servicePR.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.serviceItem.serviceCode}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.serviceItem.nameEn}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.serviceItem.serviceCategory.nameEn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity} {item.serviceItem.unitOfMeasure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(parseFloat(item.estimatedRate))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.duration} {item.durationUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Material Items (for mixed requisitions) */}
        {activeTab === 'service-details' && contract.pr.items && contract.pr.items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Material Items</h3>
            <div className="overflow-hidden">
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
                      Line Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contract.pr.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.item.itemCode}</div>
                        <div className="text-sm text-gray-500">{item.item.nameEn}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity} {item.item.unitOfMeasure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(Number(item.estimatedPrice || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(Number(item.quantity || 0) * Number(item.estimatedPrice || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contract Terms */}
        {activeTab === 'general' && (contract.slaTerms || contract.penaltyClause || contract.insuranceRequirements) && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Terms</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {contract.slaTerms && (
                <div className="bg-wujha-primary/10 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-wujha-primary mb-2">SLA Terms</h4>
                  <pre className="text-sm text-wujha-primary/80 whitespace-pre-wrap font-sans">
                    {formatJsonField(contract.slaTerms)}
                  </pre>
                </div>
              )}
              
              {contract.penaltyClause && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-red-900 mb-2">Penalty Clause</h4>
                  <p className="text-sm text-red-800">{contract.penaltyClause}</p>
                </div>
              )}

              {contract.insuranceRequirements && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Insurance Requirements</h4>
                  <pre className="text-sm text-green-800 whitespace-pre-wrap font-sans">
                    {formatJsonField(contract.insuranceRequirements)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Business Justification */}
        {activeTab === 'general' && contract.pr.justification && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Business Justification</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
              {contract.pr.justification}
            </dd>
          </div>
        )}

        {/* Contract Version Info */}
        {activeTab === 'versions' && contract.versionNumber && contract.versionNumber > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Contract Version</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">Version {contract.versionNumber}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approval History */}
      {activeTab === 'approvals' && contract.approval && contract.approval.approvalHistory && contract.approval.approvalHistory.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Approval History</h3>
          <div className="space-y-4">
            {contract.approval.approvalHistory.map((history, index) => (
              <div key={history.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {history.action === 'APPROVED' ? (
                    <CheckCheck className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      Level {history.level} - {history.action}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(history.timestamp).toLocaleString('en-OM')}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    By: <span className="font-medium">{history.approverName}</span>
                  </p>
                  {history.comments && (
                    <p className="mt-2 text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                      {history.comments}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Responses */}
      {activeTab === 'vendor-responses' && contract.vendorResponses && contract.vendorResponses.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Responses</h3>
          <div className="space-y-4">
            {contract.vendorResponses.map((response) => (
              <div key={response.id} className={`p-4 rounded-lg border-2 ${
                response.status === 'ACCEPTED' 
                  ? 'bg-green-50 border-green-200' 
                  : response.status === 'REJECTED'
                  ? 'bg-red-50 border-red-200'
                  : response.status === 'PENDING'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      response.status === 'ACCEPTED' 
                        ? 'bg-green-100 text-green-800' 
                        : response.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : response.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {response.status}
                    </span>
                    <span className="text-sm text-gray-600">Version {response.versionNumber}</span>
                  </div>
                  {response.respondedAt && (
                    <span className="text-sm text-gray-500">
                      {new Date(response.respondedAt).toLocaleString('en-OM')}
                    </span>
                  )}
                </div>
                {response.respondedBy && (
                  <p className="text-sm text-gray-700 mb-1">
                    Responded by: <span className="font-medium">{response.respondedBy}</span>
                  </p>
                )}
                {response.comments && (
                  <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Vendor Comments:</p>
                    <p className="text-sm text-gray-600">{response.comments}</p>
                  </div>
                )}
                {response.status === 'PENDING' && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      Expires: {new Date(response.expiresAt).toLocaleString('en-OM')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {activeTab === 'approvals' && success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {activeTab === 'approvals' && contract.status === 'DRAFT' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900">Contract Approval Workflow</h4>
                  <p className="mt-1 text-sm text-blue-700">
                    Submit this contract for approval. It will go through the following approval sequence:
                  </p>
                  <ol className="mt-2 ml-4 text-sm text-blue-700 list-decimal">
                    <li>Head of Procurement</li>
                    <li>Billing Engineer</li>
                  </ol>
                  <p className="mt-2 text-sm text-blue-700">
                    After approval, the contract will be sent to the vendor for acceptance.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={handleSubmitForApproval}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <SendHorizontal className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </>
                )}
              </button>
              
              <button 
                onClick={() => router.push(`/procurement/services/contracts/${contract.id}/edit`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Contract
              </button>

              {/* Only show "Activate Directly" button to HEAD_OF_PROCUREMENT and SYSTEM_ADMIN */}
              {currentUser && (currentUser.role === 'HEAD_OF_PROCUREMENT' || currentUser.role === 'SYSTEM_ADMIN') && (
                <>
                  <div className="text-gray-400 flex items-center px-2">
                    <span className="text-sm">or</span>
                  </div>

                  <button 
                    onClick={handleActivateContract}
                    disabled={activating}
                    className="inline-flex items-center px-4 py-2 border border-yellow-300 shadow-sm text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Skip approval and activate directly (not recommended)"
                  >
                    {activating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-700 mr-2"></div>
                        Activating...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Activate Directly (Skip Approval)
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Only show the warning note if user can see the activate button */}
            {currentUser && (currentUser.role === 'HEAD_OF_PROCUREMENT' || currentUser.role === 'SYSTEM_ADMIN') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700">
                  <strong>Note:</strong> Direct activation bypasses the approval workflow and vendor negotiation. 
                  This should only be used for testing or emergency situations.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Approval Status with Progress */}
      {activeTab === 'approvals' && contract.status === 'PENDING_APPROVAL' && contract.approval && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Progress</h3>
          
          {/* Approval Progress Visual */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Approval Level {contract.approval.level} of 2</span>
              <span className="text-sm text-gray-500">
                {contract.approval.status === 'PENDING' ? 'Awaiting Approval' : contract.approval.status}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(contract.approval.level / 2) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Approval Levels */}
          <div className="space-y-3">
            {/* Level 1 - Head of Procurement */}
            <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 ${
              contract.approval.approvalHistory?.some(h => h.level === 1 && h.action === 'APPROVED')
                ? 'bg-green-50 border-green-200'
                : contract.approval.level === 1
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex-shrink-0 mt-0.5">
                {contract.approval.approvalHistory?.some(h => h.level === 1 && h.action === 'APPROVED') ? (
                  <CheckCheck className="h-5 w-5 text-green-600" />
                ) : contract.approval.level === 1 ? (
                  <Clock className="h-5 w-5 text-yellow-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Level 1: Head of Procurement</p>
                  {contract.approval.approvalHistory?.some(h => h.level === 1 && h.action === 'APPROVED') && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Approved
                    </span>
                  )}
                  {contract.approval.level === 1 && !contract.approval.approvalHistory?.some(h => h.level === 1 && h.action === 'APPROVED') && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                </div>
                {contract.approval.approvalHistory?.find(h => h.level === 1 && h.action === 'APPROVED') && (
                  <p className="mt-1 text-xs text-gray-600">
                    Approved by {contract.approval.approvalHistory.find(h => h.level === 1)?.approverName} on{' '}
                    {new Date(contract.approval.approvalHistory.find(h => h.level === 1)?.timestamp || '').toLocaleString('en-OM')}
                  </p>
                )}
              </div>
            </div>

            {/* Level 2 - Billing Engineer */}
            <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 ${
              contract.approval.approvalHistory?.some(h => h.level === 2 && h.action === 'APPROVED')
                ? 'bg-green-50 border-green-200'
                : contract.approval.level === 2
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex-shrink-0 mt-0.5">
                {contract.approval.approvalHistory?.some(h => h.level === 2 && h.action === 'APPROVED') ? (
                  <CheckCheck className="h-5 w-5 text-green-600" />
                ) : contract.approval.level === 2 ? (
                  <Clock className="h-5 w-5 text-yellow-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Level 2: Billing Engineer</p>
                  {contract.approval.approvalHistory?.some(h => h.level === 2 && h.action === 'APPROVED') && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Approved
                    </span>
                  )}
                  {contract.approval.level === 2 && !contract.approval.approvalHistory?.some(h => h.level === 2 && h.action === 'APPROVED') && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                </div>
                {contract.approval.approvalHistory?.find(h => h.level === 2 && h.action === 'APPROVED') && (
                  <p className="mt-1 text-xs text-gray-600">
                    Approved by {contract.approval.approvalHistory.find(h => h.level === 2)?.approverName} on{' '}
                    {new Date(contract.approval.approvalHistory.find(h => h.level === 2)?.timestamp || '').toLocaleString('en-OM')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Once all approval levels are complete, the contract will automatically be sent to the vendor for acceptance.
            </p>
          </div>

          {/* Approval Action Buttons (Only show if user can approve) */}
          {canApprove && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Take Action</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setApprovalAction('approve')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Approve
                </button>

                <button
                  onClick={() => setApprovalAction('request-edit')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Request Edit
                </button>

                <button
                  onClick={() => setApprovalAction('reject')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vendor-responses' && (!contract.vendorResponses || contract.vendorResponses.length === 0) && (
        <div className="bg-white shadow rounded-lg p-10 text-center">
          <User className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">No vendor responses available yet.</p>
        </div>
      )}

      {activeTab === 'versions' && contract.versions && contract.versions.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Version History</h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contract.versions.map((version) => {
                  const isExpanded = expandedVersionId === version.id;
                  return (
                    <Fragment key={version.id}>
                      <tr
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <span className="inline-flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-wujha-primary" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            )}
                            <span>v{version.versionNumber}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{version.changeReason || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{version.createdByName || version.createdBy}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(version.createdAt).toLocaleString('en-OM')}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/60">
                          <td colSpan={4} className="px-6 py-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Contract Number</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">{version.contractNumber}</p>
                              </div>
                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Contract Type</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">{version.contractType.replaceAll('_', ' ')}</p>
                              </div>
                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">{version.status}</p>
                              </div>
                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Period</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">
                                  {formatDate(version.startDate)} - {formatDate(version.endDate)}
                                </p>
                              </div>
                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Value</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(Number(version.totalValue))} {version.currency}</p>
                              </div>
                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Service Amount</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">
                                  {formatCurrency(Number(version.serviceAmount ?? version.totalValue))} {version.currency}
                                </p>
                              </div>
                              <div className="rounded-lg border border-gray-200 bg-white p-4 md:col-span-2 xl:col-span-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment Terms</p>
                                <p className="mt-1 text-sm text-gray-900">{version.paymentTerms}</p>
                              </div>
                              {version.changeDescription && (
                                <div className="rounded-lg border border-gray-200 bg-white p-4 md:col-span-2 xl:col-span-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Change Description</p>
                                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{version.changeDescription}</p>
                                </div>
                              )}
                              {version.slaTerms && (
                                <div className="rounded-lg border border-gray-200 bg-white p-4 md:col-span-2 xl:col-span-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">SLA Terms</p>
                                  <pre className="mt-1 text-sm text-gray-900 whitespace-pre-wrap font-sans">
                                    {formatJsonField(version.slaTerms)}
                                  </pre>
                                </div>
                              )}
                              {version.penaltyClause && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 md:col-span-2 xl:col-span-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-red-700">Penalty Clause</p>
                                  <p className="mt-1 text-sm text-red-900 whitespace-pre-wrap">{version.penaltyClause}</p>
                                </div>
                              )}
                              {version.insuranceRequirements && (
                                <div className="rounded-lg border border-green-200 bg-green-50 p-4 md:col-span-2 xl:col-span-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-green-700">Insurance Requirements</p>
                                  <pre className="mt-1 text-sm text-green-900 whitespace-pre-wrap font-sans">
                                    {formatJsonField(version.insuranceRequirements)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'versions' && (!contract.versions || contract.versions.length === 0) && (
        <div className="bg-white shadow rounded-lg p-10 text-center">
          <Clock className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">No version history records found.</p>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white shadow rounded-lg p-6">
          <DocumentManager
            documents={contract.documents || []}
            uploading={uploadingDocument}
            onUpload={handleDocumentUpload}
            onDelete={handleDeleteDocument}
            getViewUrl={(documentId) => `/api/service-contracts/${contract.id}/documents/${documentId}/file`}
            getDownloadUrl={(documentId) => `/api/service-contracts/${contract.id}/documents/${documentId}/file?download=1`}
          />
        </div>
      )}

      {/* Approval Action Modal */}
      {approvalAction && (
        <div 
        className="fixed inset-0 backdrop-blur-md transition-opacity z-50 flex items-center justify-center p-4"          
        onClick={() => {
            setApprovalAction(null);
            setApprovalComments('');
          }}
        >
          <div 
            className="relative bg-white rounded-lg shadow-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {approvalAction === 'approve' && 'Approve Contract'}
                {approvalAction === 'reject' && 'Reject Contract'}
                {approvalAction === 'request-edit' && 'Request Edit'}
              </h3>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  {approvalAction === 'approve' && 'Are you sure you want to approve this contract? It will move to the next approval level.'}
                  {approvalAction === 'reject' && 'Are you sure you want to reject this contract? It will be returned to DRAFT status.'}
                  {approvalAction === 'request-edit' && 'The contract will be returned to the creator for edits. Please provide specific feedback on what needs to be changed.'}
                </p>

                <label htmlFor="approval-comments" className="block text-sm font-medium text-gray-700 mb-2">
                  {approvalAction === 'approve' ? 'Comments (Optional)' : 'Comments (Required)'}
                </label>
                <textarea
                  id="approval-comments"
                  rows={4}
                  className="block w-full p-4 rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary sm:text-sm"
                  placeholder={
                    approvalAction === 'approve' 
                      ? 'Add any comments or notes...'
                      : approvalAction === 'reject'
                      ? 'Explain why you are rejecting this contract...'
                      : 'Specify what changes are needed...'
                  }
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  required={approvalAction !== 'approve'}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setApprovalAction(null);
                  setApprovalComments('');
                }}
                disabled={processingApproval}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprovalAction(approvalAction)}
                disabled={processingApproval}
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  approvalAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : approvalAction === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                }`}
              >
                {processingApproval ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {approvalAction === 'approve' && 'Confirm Approval'}
                    {approvalAction === 'reject' && 'Confirm Rejection'}
                    {approvalAction === 'request-edit' && 'Send for Edit'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approved Status - Ready for Vendor */}
      {activeTab === 'approvals' && contract.status === 'APPROVED' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Completed</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCheck className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-green-900">All Approvals Completed</h4>
                <p className="mt-1 text-sm text-green-700">
                  This contract has been approved by all required parties and has been sent to the vendor for acceptance.
                  Waiting for vendor response.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signed Status */}
      {activeTab === 'approvals' && contract.status === 'SIGNED' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Status</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <CheckCheck className="h-5 w-5 text-green-600 mr-3" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-900">Contract Signed by Vendor</h4>
                <p className="mt-1 text-sm text-green-700">
                  The vendor has accepted this contract. You can now activate it to start execution.
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleActivateContract}
            disabled={activating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Activating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate Contract
              </>
            )}
          </button>
        </div>
      )}

      {/* Next Steps */}
      {activeTab === 'general' && contract.status === 'ACTIVE' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push(`/procurement/services/milestones/new?contractId=${contract.id}`)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <Clock className="h-4 w-4 mr-2" />
              Create Milestones
            </button>
            <button
              onClick={() => router.push(`/procurement/services/receipts/new?contractId=${contract.id}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
} 

