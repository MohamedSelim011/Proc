'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Settings,
  DollarSign,
  Users,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { getUserRole, getUserData } from '@/lib/jwt';

interface ServiceRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  projectId?: string;
  costCenter?: string;
  requesterId: string;
  priority: string;
  status: string;
  estimatedCost: string;
  budgetCode: string;
  justification: string;
  requestedDeliveryDate?: string;
  createdAt: string;
  updatedAt: string;
  servicePR: {
    id: string;
    serviceScope: string;
    serviceCategory?: string;
    serviceType?: string;
    requestor?: string;
    technicalSpecifications?: string;
    qualityStandards?: string;
    duration: number;
    durationUnit: string;
    deliverables?: string[] | any;
    performanceMetrics?: string[] | any;
    safetyRequirements?: string;
    paymentSchedule?: string;
    paymentTerms?: string;
    retentionPercentage?: number;
    insuranceRequired?: boolean;
    certificationRequired?: boolean;
    preferredVendors?: string[] | any;
    milestones?: any;
    items: Array<{
      id: string;
      quantity: string;
      estimatedRate: string;
      unit?: string;
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
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-wujha-primary/10 text-wujha-primary',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
};

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  NORMAL: 'bg-wujha-primary/10 text-wujha-primary',
  HIGH: 'bg-yellow-100 text-yellow-800',
  URGENT: 'bg-red-100 text-red-800'
};

export default function ServiceRequisitionDetail() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [sr, setSr] = useState<ServiceRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [preferredVendors, setPreferredVendors] = useState<Array<{ id: string; nameEn: string; vendorCode: string }>>([]);
  const [hasRFP, setHasRFP] = useState(false);
  const [rfpId, setRfpId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

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

  const handleExportPDF = () => {
    // Create a new window with the requisition details formatted for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Service Requisition ${sr?.prNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { margin-bottom: 30px; }
            .section { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Service Requisition: ${sr?.prNumber}</h1>
            <p><strong>Status:</strong> ${sr?.status}</p>
            <p><strong>Priority:</strong> ${sr?.priority}</p>
            <p><strong>Created:</strong> ${sr ? formatDate(sr.createdAt) : ''}</p>
          </div>
          <div class="section">
            <h2>Details</h2>
            <p><strong>Department:</strong> ${sr?.departmentId}</p>
            <p><strong>Budget Code:</strong> ${sr?.budgetCode}</p>
            <p><strong>Requester:</strong> ${sr?.requesterId}</p>
            <p><strong>Duration:</strong> ${sr?.servicePR?.duration || 0} ${sr?.servicePR?.durationUnit || 'days'}</p>
          </div>
          ${sr?.justification ? `<div class="section"><h2>Business Justification</h2><p>${sr.justification}</p></div>` : ''}
          ${sr?.servicePR?.serviceScope ? `<div class="section"><h2>Scope of Work</h2><p>${sr.servicePR.serviceScope}</p></div>` : ''}
          <div class="section">
            <h2>Service Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Service Description</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Estimated Rate</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${sr?.servicePR?.items?.map(item => `
                  <tr>
                    <td>${item.serviceItem?.nameEn || 'N/A'}</td>
                    <td>${item.serviceItem?.serviceCategory?.nameEn || 'N/A'}</td>
                    <td>${item.quantity || 0} ${item.serviceItem?.unitOfMeasure || 'units'}</td>
                    <td>${formatCurrency(parseFloat(item.estimatedRate || 0))}</td>
                    <td>${formatCurrency((parseFloat(item.quantity || 0) * parseFloat(item.estimatedRate || 0) * (item.duration || 1)))}</td>
                  </tr>
                `).join('') || '<tr><td colspan="5">No items</td></tr>'}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4"><strong>Total Estimated Cost:</strong></td>
                  <td><strong>${sr ? formatCurrency(parseFloat(sr.estimatedCost)) : 'OMR 0.000'}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleEdit = () => {
    router.push(`/procurement/services/requisitions/${sr?.id}/edit`);
  };

  const fetchPreferredVendors = async (vendorIds: string[]) => {
    try {
      const vendorPromises = vendorIds.map(async (id) => {
        try {
          const res = await fetch(`/api/vendors/${id}`);
          if (res.ok) {
            const vendor = await res.json();
            return { id: vendor.id, nameEn: vendor.nameEn, vendorCode: vendor.vendorCode };
          }
          return null;
        } catch (err) {
          console.error(`Error fetching vendor ${id}:`, err);
          return null;
        }
      });
      const vendors = await Promise.all(vendorPromises);
      setPreferredVendors(vendors.filter(v => v !== null) as Array<{ id: string; nameEn: string; vendorCode: string }>);
    } catch (error) {
      console.error('Error fetching preferred vendors:', error);
    }
  };

  const handleSubmitRequisition = async () => {
    if (!sr) return;
    
    try {
      const response = await fetch(`/api/purchase-requisitions/${sr.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstApproverId: 'manager001' // Default approver ID
        }),
      });

      if (response.ok) {
        // Refresh the data to show updated status
        showToast('success', 'Requisition submitted successfully!');
        fetchServiceRequisition();
      } else {
        const errorData = await response.json();
        showToast('error', `Failed to submit: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting requisition:', error);
      showToast('error', 'Failed to submit requisition');
    }
  };

  const handleApproveRequisition = async () => {
    if (!sr) return;
    
    if (!confirm('Are you sure you want to approve this service requisition?')) {
      return;
    }

    try {
      setApproving(true);
      
      const response = await fetch(`/api/services/requisitions/${sr.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          approvedBy: 'current-user-id', // In real app, get from auth
          approvedAt: new Date().toISOString(),
          comments: 'Approved'
        }),
      });

      if (response.ok) {
        showToast('success', 'Service requisition approved successfully!');
        // Refresh the data to show updated status
        fetchServiceRequisition();
      } else {
        const errorData = await response.json();
        showToast('error', `Failed to approve: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error approving requisition:', error);
      showToast('error', 'Failed to approve service requisition');
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    fetchServiceRequisition();
    checkRFPExists();
  }, [params.id]);

  const checkRFPExists = async () => {
    try {
      // Check if an RFP exists for this service requisition
      const response = await fetch(`/api/services/rfp?prId=${params.id}`);
      const data = await response.json();
      
      if (response.ok && data.rfps && data.rfps.length > 0) {
        // Found an RFP for this SR
        setHasRFP(true);
        setRfpId(data.rfps[0].id);
      }
    } catch (error) {
      console.error('Error checking RFP:', error);
    }
  };

  // Get user role for permission checks - similar to PO detail page
  useEffect(() => {
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
      
      console.log('Service Requisition Detail - Role Detection:', {
        jwtRole,
        localRole,
        tokenRole,
        finalRole: role,
        jwtUser,
        localUser,
        finalUser: user,
        tokenExists: !!token
      });
      
      setUserRole(role ? role.toUpperCase() : null);
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
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // Debug logging
  useEffect(() => {
    if (sr) {
      console.log('ServiceRequisition Data:', sr);
      console.log('ServicePR Items:', sr.servicePR?.items);
      console.log('Items Length:', sr.servicePR?.items?.length);
    }
  }, [sr]);

  // Debug button visibility
  useEffect(() => {
    if (sr && userRole) {
      const statusMatch = sr.status === 'SUBMITTED' || sr.status === 'PENDING_APPROVAL';
      const roleMatch = userRole.toUpperCase() === 'SUPER_ADMIN' || 
                       userRole.toUpperCase() === 'ADMIN' || 
                       userRole.toUpperCase() === 'PROCUREMENT_MANAGER' || 
                       userRole.toUpperCase() === 'APPROVER' || 
                       userRole.toUpperCase() === 'DEPARTMENT_MANAGER';
      
      console.log('Approve Button Visibility Check:', {
        status: sr.status,
        statusMatch,
        userRole,
        roleMatch,
        shouldShow: statusMatch && roleMatch
      });
    }
  }, [sr, userRole]);

  const fetchServiceRequisition = async () => {
    try {
      setLoading(true);
      // Use the dedicated service requisitions API
      const response = await fetch(`/api/services/requisitions/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('Fetched service requisition data:', data);
        setSr(data);
        
        // Fetch preferred vendors if they exist
        if (data.servicePR?.preferredVendors && Array.isArray(data.servicePR.preferredVendors) && data.servicePR.preferredVendors.length > 0) {
          fetchPreferredVendors(data.servicePR.preferredVendors);
        }
      } else {
        setError(data.error || 'Failed to fetch service requisition');
      }
    } catch (error) {
      console.error('Error fetching service requisition:', error);
      setError('Failed to fetch service requisition');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  if (error || !sr) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error || 'Service requisition not found'}</p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/procurement/services/requisitions')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Service Requisitions
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
            onClick={() => router.push('/procurement/services/requisitions')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Service Requisitions
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExportPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          {sr.status === 'DRAFT' && (
            <>
              <button 
                onClick={handleEdit}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Service Requisition Header Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sr.prNumber}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {sr.itemType === 'SERVICE' ? 'Service Requisition' : 'Non-Stock Item Requisition'} Details
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[sr.priority as keyof typeof priorityColors]}`}>
                {sr.priority}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[sr.status as keyof typeof statusColors]}`}>
                {sr.status}
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Status */}
        <div className=" w-full px-6 py-4 bg-gray-50 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Approval Workflow</h3>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${sr.status === 'DRAFT' ? 'text-wujha-primary' : sr.status === 'SUBMITTED' || sr.status === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sr.status === 'DRAFT' ? 'bg-wujha-primary/10' : sr.status === 'SUBMITTED' || sr.status === 'APPROVED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-medium">1</span>
              </div>
              <span className="ml-2 text-sm font-medium">Draft</span>
            </div>
            <div className={`w-8 h-1 ${sr.status === 'SUBMITTED' || sr.status === 'APPROVED' ? 'bg-green-200' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${sr.status === 'SUBMITTED' ? 'text-wujha-primary' : sr.status === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sr.status === 'SUBMITTED' ? 'bg-wujha-primary/10' : sr.status === 'APPROVED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-medium">2</span>
              </div>
              <span className="ml-2 text-sm font-medium">Submitted</span>
            </div>
            <div className={`w-8 h-1 ${sr.status === 'APPROVED' ? 'bg-green-200' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${sr.status === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sr.status === 'APPROVED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-medium">3</span>
              </div>
              <span className="ml-2 text-sm font-medium">Approved</span>
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
              <dd className="mt-1 text-sm text-gray-900">{sr.departmentId}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Duration
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {sr.servicePR?.duration || 0} {sr.servicePR?.durationUnit || 'days'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Service Category
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {sr.servicePR?.serviceCategory || 'N/A'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Service Type
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {sr.servicePR?.serviceType || 'N/A'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Budget Code
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{sr.budgetCode}</dd>
            </div>

            {sr.costCenter && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Cost Center
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{sr.costCenter}</dd>
              </div>
            )}

            {sr.projectId && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Project ID
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{sr.projectId}</dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Requester ID
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{sr.requesterId}</dd>
            </div>

            {sr.servicePR?.requestor && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Requestor Name
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{sr.servicePR.requestor}</dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Created Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(sr.createdAt)}</dd>
            </div>
          </dl>
        </div>

        {sr.justification && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Business Justification</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{sr.justification}</dd>
          </div>
        )}

        {/* Technical Specifications */}
        {sr.servicePR?.technicalSpecifications && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Technical Specifications</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{sr.servicePR.technicalSpecifications}</dd>
          </div>
        )}

        {/* Quality Standards */}
        {sr.servicePR?.qualityStandards && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Quality Standards</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{sr.servicePR.qualityStandards}</dd>
          </div>
        )}

        {/* Safety Requirements */}
        {sr.servicePR?.safetyRequirements && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Safety Requirements</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{sr.servicePR.safetyRequirements}</dd>
          </div>
        )}

        {/* Payment Information */}
        <div className="px-6 py-4 border-t border-gray-200">
          <dt className="text-sm font-medium text-gray-500 mb-2">Payment Information</dt>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
            <div>
              <span className="text-xs text-gray-500">Payment Schedule:</span>
              <p className="text-sm text-gray-900">{sr.servicePR?.paymentSchedule || 'N/A'}</p>
            </div>
            {sr.servicePR?.paymentTerms && (
              <div>
                <span className="text-xs text-gray-500">Payment Terms:</span>
                <p className="text-sm text-gray-900">{sr.servicePR.paymentTerms}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500">Retention:</span>
              <p className="text-sm text-gray-900">{sr.servicePR?.retentionPercentage || 0}%</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Insurance Required:</span>
              <p className="text-sm text-gray-900">{sr.servicePR?.insuranceRequired ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Preferred Vendors */}
        {sr.servicePR?.preferredVendors && Array.isArray(sr.servicePR.preferredVendors) && sr.servicePR.preferredVendors.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Preferred Vendors
            </dt>
            <dd className="flex flex-wrap gap-2 mt-2">
              {preferredVendors.length > 0 ? (
                preferredVendors.map((vendor) => (
                  <span
                    key={vendor.id}
                    className="inline-flex items-center px-3 py-1 bg-wujha-primary/10 text-wujha-primary text-sm rounded-full border border-wujha-primary/30"
                  >
                    {vendor.nameEn} ({vendor.vendorCode})
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">Loading vendor information...</span>
              )}
            </dd>
          </div>
        )}
      </div>

      {/* Service Items */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {sr.itemType === 'SERVICE' ? 'Service Requirements' : 'Non-Stock Items'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{sr.servicePR?.items?.length || 0} item(s) requested</p>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {sr.itemType === 'SERVICE' ? 'Service Description' : 'Item Details'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimated Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sr.servicePR?.items && sr.servicePR.items.length > 0 ? (
                sr.servicePR.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.serviceItem?.serviceCode || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.serviceItem?.nameEn || 'N/A'}
                        </div>
                        {item.specifications && (
                          <div className="text-xs text-gray-400 mt-1 max-w-md">
                            <div className="bg-gray-50 p-2 rounded text-xs">
                              <strong>Specifications:</strong><br />
                              {item.specifications}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.serviceItem?.serviceCategory?.nameEn || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity || 0} {item.serviceItem?.unitOfMeasure || 'units'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(parseFloat(item.estimatedRate || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency((parseFloat(item.quantity || 0) * parseFloat(item.estimatedRate || 0) * (item.duration || 1)))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No items found in this requisition
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  Total Estimated Cost:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatCurrency(parseFloat(sr.estimatedCost))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Service-Specific Information */}
      {sr.itemType === 'SERVICE' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Service Requirements</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-wujha-primary/10 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-wujha-primary mb-2">Scope of Work</h4>
              {sr.servicePR?.serviceScope ? (
                <p className="text-sm text-wujha-primary/80 whitespace-pre-wrap">
                  {sr.servicePR.serviceScope}
                </p>
              ) : (
                <p className="text-sm text-wujha-primary/80 italic">
                  No scope of work specified
                </p>
              )}
              {sr.servicePR?.deliverables && sr.servicePR.deliverables.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-wujha-primary mb-1">Deliverables:</h5>
                  <ul className="text-xs text-wujha-primary/80 list-disc list-inside space-y-1">
                    {Array.isArray(sr.servicePR.deliverables) ? (
                      sr.servicePR.deliverables.map((deliverable: string, index: number) => (
                        <li key={index}>{deliverable}</li>
                      ))
                    ) : (
                      <li>{String(sr.servicePR.deliverables)}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-900 mb-2">Performance Metrics</h4>
              {sr.servicePR?.performanceMetrics && sr.servicePR.performanceMetrics.length > 0 ? (
                <ul className="text-sm text-green-800 list-disc list-inside space-y-1">
                  {Array.isArray(sr.servicePR.performanceMetrics) ? (
                    sr.servicePR.performanceMetrics.map((metric: string, index: number) => (
                      <li key={index}>{metric}</li>
                    ))
                  ) : (
                    <li>{String(sr.servicePR.performanceMetrics)}</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-green-800 italic">
                  No performance metrics specified
                </p>
              )}
              {sr.servicePR?.technicalSpecifications && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-green-900 mb-1">Technical Specifications:</h5>
                  <p className="text-xs text-green-800 whitespace-pre-wrap">
                    {sr.servicePR.technicalSpecifications}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {sr.status === 'DRAFT' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
          <div className="flex space-x-3">
            <button
              onClick={handleSubmitRequisition}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit for Approval
            </button>
            <button 
              onClick={handleEdit}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Requisition
            </button>
          </div>
        </div>
      )}

      {(sr.status === 'SUBMITTED' || sr.status === 'PENDING_APPROVAL') && userRole && (userRole.toUpperCase() === 'SUPER_ADMIN' || userRole.toUpperCase() === 'ADMIN' || userRole.toUpperCase() === 'PROCUREMENT_MANAGER' || userRole.toUpperCase() === 'APPROVER' || userRole.toUpperCase() === 'DEPARTMENT_MANAGER') && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
          <div className="flex space-x-3">
            <button
              onClick={handleApproveRequisition}
              disabled={approving}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </button>
            {/* <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <AlertCircle className="h-4 w-4 mr-2" />
              Request Changes
            </button> */}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {sr.status === 'APPROVED' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push(`/procurement/services/contracts/new?prId=${sr.id}`)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Service Contract
            </button>
            {/* <button
              onClick={() => router.push(`/procurement/services/rfp/new?prId=${sr.id}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <User className="h-4 w-4 mr-2" />
              Issue RFP
            </button> */}
          </div>
        </div>
      )}
    </div>
  );
}
