'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Calendar,
  FileText,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Award,
  Eye,
  UserCheck,
  X
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ServiceRFP {
  id: string;
  rfpNumber: string;
  title: string;
  description: string;
  status: string;
  issueDate: string;
  closingDate: string;
  evaluationCriteria: string;
  termsAndConditions: string;
  createdBy: string;
  pr?: {
    id: string;
    prNumber: string;
    estimatedCost: string;
    servicePR?: {
      serviceScope: string;
      duration: number;
      durationUnit: string;
      items: Array<{
        id: string;
        serviceItem: {
          nameEn: string;
          serviceCategory: {
            nameEn: string;
          };
        };
      }>;
    };
  };
  invitedVendors?: Array<{
    id: string;
    invitedAt: string;
    vendor: {
      id: string;
      nameEn: string;
      email: string;
      mobile: string;
    };
  }>;
  responses?: Array<{
    id: string;
    status: string;
    submittedAt: string | null;
    totalAmount: string | null;
    validUntil: string | null;
    technicalScore: number | null;
    commercialScore: number | null;
    deliveryScore: number | null;
    experienceScore: number | null;
    overallScore: string | null;
    priceBreakdown: string | null;
    technicalDetails: string | null;
    deliveryTerms: string | null;
    notes: string | null;
    proposalFileUrl: string | null;
    tokenUsed: boolean;
    vendor: {
      id: string;
      nameEn: string;
      email: string;
    };
  }>;
  approvals?: Array<{
    id: string;
    status: string;
    approverId: string;
    comments: string | null;
    approvedAt: string | null;
    level: number;
  }>;
}

export default function ServiceRFPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [rfp, setRfp] = useState<ServiceRFP | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [scoringData, setScoringData] = useState<any>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showWinnerConfirmModal, setShowWinnerConfirmModal] = useState(false);
  const [pendingWinnerSelection, setPendingWinnerSelection] = useState<{responseId: string; vendorId: string} | null>(null);
  const [selectingWinner, setSelectingWinner] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchRFPDetails();
    }
    
    // Get user role
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('role');
      setUserRole(role);
    }
  }, [params?.id]);

  const fetchRFPDetails = async () => {
    try {
      const response = await fetch(`/api/services/rfp/${params?.id}`);
      // Token expiration is handled globally by fetchInterceptor
      const data = await response.json();
      
      if (response.ok) {
        setRfp(data);
      } else {
        console.error('Error fetching RFP:', data.error);
        showToast('error', 'Failed to load RFP details');
      }
    } catch (error) {
      console.error('Error fetching RFP:', error);
      showToast('error', 'Failed to load RFP details');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestApproval = async () => {
    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // Check if token is expired
      if (token && typeof window !== 'undefined') {
        const { isTokenExpired } = await import('@/lib/jwt');
        if (isTokenExpired(token)) {
          showToast('error', 'Your session has expired. Please sign in again.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return;
        }
      }
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/services/rfp/${rfp?.id}/request-approval`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        showToast('success', 'Approval requested successfully');
        fetchRFPDetails();
      } else {
        const data = await response.json();
        // Check if error is about expired token
        if (data.error && data.error.includes('session has expired')) {
          showToast('error', data.error);
          setTimeout(() => {
            window.location.href = '/signin';
          }, 2000);
        } else {
          showToast('error', data.error || 'Failed to request approval');
        }
      }
    } catch (error) {
      showToast('error', 'Failed to request approval');
    }
  };

  const handleApprove = async () => {
    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // Check if token is expired
      if (token && typeof window !== 'undefined') {
        const { isTokenExpired } = await import('@/lib/jwt');
        if (isTokenExpired(token)) {
          showToast('error', 'Your session has expired. Please sign in again.');
          // Redirect to sign in page after a short delay
          setTimeout(() => {
            window.location.href = '/signin';
          }, 2000);
          return;
        }
      }
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/services/rfp/${rfp?.id}/approve`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        showToast('success', 'RFP approved successfully');
        fetchRFPDetails();
      } else {
        const data = await response.json();
        // Check if error is about expired token
        if (data.error && data.error.includes('session has expired')) {
          showToast('error', data.error);
          setTimeout(() => {
            window.location.href = '/signin';
          }, 2000);
        } else {
          showToast('error', data.error || 'Failed to approve RFP');
        }
      }
    } catch (error) {
      showToast('error', 'Failed to approve RFP');
    }
  };

  const handleSendInvitations = async () => {
    if (!rfp) return;

    // Check if there are vendors to invite
    if (!rfp.invitedVendors || rfp.invitedVendors.length === 0) {
      showToast('error', 'No vendors have been invited to this RFP. Please add vendors first.');
      return;
    }

    // Check if vendors have email addresses
    const vendorsWithoutEmail = rfp.invitedVendors.filter(
      (inv) => !inv.vendor?.email
    );
    if (vendorsWithoutEmail.length > 0) {
      showToast('error', `${vendorsWithoutEmail.length} vendor(s) do not have email addresses. Please update vendor information.`);
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/services/rfp/${rfp.id}/send-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentBy: userRole || 'SYSTEM' }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.success > 0 && result.failed === 0) {
          // All emails sent successfully
          showToast('success', `Invitations sent successfully to ${result.success} vendor(s)!`);
        } else if (result.success > 0 && result.failed > 0) {
          // Partial success - show both success and error toasts
          showToast('success', `Successfully sent invitations to ${result.success} vendor(s)!`);
          showToast('error', `${result.failed} email(s) failed to send. Check console for details.`);
          console.error('Some emails failed to send:', result.errors || []);
        } else {
          // All emails failed
          showToast('error', `Failed to send invitations. ${result.failed || 0} email(s) failed.`);
          if (result.errors && result.errors.length > 0) {
            console.error('Email sending errors:', result.errors);
          } else {
            console.error('No error details available. Check email configuration (SMTP settings).');
          }
        }
        fetchRFPDetails();
      } else {
        showToast('error', result.error || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      showToast('error', 'Failed to send invitations. Please check your email configuration.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenScoring = (response: any) => {
    // Prevent opening scoring modal for already reviewed proposals
    if (response.status === 'REVIEWED' || response.status === 'SELECTED') {
      showToast('error', 'This proposal has already been evaluated and cannot be evaluated again');
      return;
    }
    
    setSelectedResponse(response);
    
    const criteria = rfp?.evaluationCriteria ? JSON.parse(rfp.evaluationCriteria) : [];
    const initialScores: any = {};
    
    criteria.forEach((c: any) => {
      const key = c.name.toLowerCase().replace(/\s+/g, '');
      initialScores[key] = response[`${key}Score`] || 0;
    });
    
    setScoringData(initialScores);
    setShowScoringModal(true);
  };

  const handleSubmitScores = async () => {
    try {
      const response = await fetch(`/api/services/rfp/${rfp?.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: selectedResponse.id,
          scores: scoringData
        })
      });

      if (response.ok) {
        showToast('success', 'Scores submitted successfully');
        setShowScoringModal(false);
        fetchRFPDetails();
      } else {
        const data = await response.json();
        showToast('error', data.error || 'Failed to submit scores');
      }
    } catch (error) {
      showToast('error', 'Failed to submit scores');
    }
  };

  const handleSelectWinner = async (responseId: string, vendorId: string) => {
    setPendingWinnerSelection({ responseId, vendorId });
    setShowWinnerConfirmModal(true);
  };

  const confirmSelectWinner = async () => {
    if (!pendingWinnerSelection) return;
    
    setSelectingWinner(true);
    const { responseId, vendorId } = pendingWinnerSelection;

    try {
      const response = await fetch(`/api/services/rfp/${rfp?.id}/select-winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId, vendorId })
      });

      if (response.ok) {
        showToast('success', 'Winner selected successfully! RFP has been awarded.');
        setShowWinnerConfirmModal(false);
        setPendingWinnerSelection(null);
        fetchRFPDetails();
        
        // Show success message with option to create PO
        showToast('info', 'You can now create a Purchase Order from the Purchase Orders page.');
      } else {
        const data = await response.json();
        showToast('error', data.error || 'Failed to select winner');
      }
    } catch (error) {
      showToast('error', 'Failed to select winner');
    } finally {
      setSelectingWinner(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PUBLISHED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-red-100 text-red-800';
      case 'EVALUATED': return 'bg-purple-100 text-purple-800';
      case 'AWARDED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SUBMITTED': return 'bg-green-100 text-green-800';
      case 'REVIEWED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'SELECTED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const hasManagerRole = () => {
    const role = userRole?.toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || 
           role === 'PROCUREMENT_MANAGER' || role === 'DEPARTMENT_MANAGER';
  };

  const hasAdminRole = () => {
    const role = userRole?.toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  if (!rfp) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Service RFP not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested Service RFP could not be found.</p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/procurement/services/rfp')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to RFP List
          </button>
        </div>
      </div>
    );
  }

  const evaluationCriteria = rfp.evaluationCriteria ? JSON.parse(rfp.evaluationCriteria) : [];
  const termsAndConditions = rfp.termsAndConditions ? JSON.parse(rfp.termsAndConditions) : {};
  const submittedResponses = rfp.responses?.filter(r => r.tokenUsed && r.proposalFileUrl) || [];
  const canApprove = hasAdminRole() && rfp.status === 'PENDING_APPROVAL';
  const canRequestApproval = rfp.status === 'DRAFT';
  const canSendInvitations = (rfp.status === 'APPROVED' || rfp.status === 'PUBLISHED' || rfp.status === 'SENT') && 
                              (!rfp.invitedVendors || rfp.invitedVendors.length === 0 || 
                               !rfp.responses?.some(r => r.tokenUsed));
  const canEvaluate = (rfp.status === 'PUBLISHED' || rfp.status === 'SENT') && submittedResponses.length > 0;
  const canSelectWinner = (rfp.status === 'SENT' || rfp.status === 'PUBLISHED' || rfp.status === 'EVALUATED') && 
                          hasManagerRole() && 
                          submittedResponses.some(r => r.status === 'REVIEWED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/procurement/services/rfp')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
        </div>
        <div className="flex items-center space-x-3">
          {canRequestApproval && (
            <button
              onClick={handleRequestApproval}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Request Approval
            </button>
          )}
          {canApprove && (
            <button
              onClick={handleApprove}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </button>
          )}
          {canSendInvitations && (
            <button
              onClick={handleSendInvitations}
              disabled={sending}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-50"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitations
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Title Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-wujha-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{rfp.title}</h1>
                <p className="text-sm text-gray-500 mt-1">RFP Number: {rfp.rfpNumber}</p>
              </div>
            </div>
            {rfp.description && (
              <p className="mt-4 text-gray-600">{rfp.description}</p>
            )}
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(rfp.status)}`}>
            {rfp.status}
          </span>
        </div>
      </div>

      {/* Key Information */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Issue Date</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {new Date(rfp.issueDate).toLocaleDateString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Closing Date</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {new Date(rfp.closingDate).toLocaleDateString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Invited Vendors</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {rfp.invitedVendors?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Submissions</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {submittedResponses.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Requisition Link */}
      {rfp.pr && (
        <div className="bg-wujha-primary/10 border border-wujha-primary/30 rounded-lg p-6">
          <h3 className="text-lg font-medium text-wujha-primary mb-4">Linked Service Requisition</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-wujha-primary/80">PR Number</dt>
              <dd className="mt-1 text-sm text-wujha-primary">
                <button
                  onClick={() => router.push(`/procurement/services/requisitions/${rfp.pr?.id}`)}
                  className="hover:underline"
                >
                  {rfp.pr.prNumber}
                </button>
              </dd>
            </div>
            {rfp.pr.servicePR && (
              <>
                <div>
                  <dt className="text-sm font-medium text-wujha-primary/80">Duration</dt>
                  <dd className="mt-1 text-sm text-wujha-primary">
                    {rfp.pr.servicePR.duration} {rfp.pr.servicePR.durationUnit}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-wujha-primary/80">Estimated Value</dt>
                  <dd className="mt-1 text-sm text-wujha-primary">
                    {rfp.pr.estimatedCost ? `${parseFloat(rfp.pr.estimatedCost).toLocaleString()} OMR` : 'N/A'}
                  </dd>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Evaluation Criteria */}
      {evaluationCriteria.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Evaluation Criteria</h3>
          <div className="space-y-3">
            {evaluationCriteria.map((criteria: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{criteria.name}</h4>
                    {criteria.description && (
                      <p className="text-sm text-gray-500 mt-1">{criteria.description}</p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-wujha-primary">{criteria.weight}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invited Vendors */}
      {rfp.invitedVendors && rfp.invitedVendors.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invited Vendors</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rfp.invitedVendors.map((invitation) => (
              <div key={invitation.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{invitation.vendor.nameEn}</h4>
                    <p className="text-sm text-gray-500 mt-1">{invitation.vendor.email}</p>
                    {invitation.vendor.mobile && (
                      <p className="text-sm text-gray-500">{invitation.vendor.mobile}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Invited: {new Date(invitation.invitedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Users className="h-5 w-5 text-wujha-primary flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Responses */}
      {submittedResponses.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Proposals</h3>
          <div className="space-y-4">
            {submittedResponses.map((response) => (
              <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{response.vendor.nameEn}</h4>
                    <p className="text-sm text-gray-500 mt-1">{response.vendor.email}</p>
                    {response.totalAmount && (
                      <p className="text-lg font-bold text-wujha-primary mt-2">
                        {parseFloat(response.totalAmount).toLocaleString()} OMR
                      </p>
                    )}
                    {response.overallScore !== null && (
                      <p className="text-sm text-gray-600 mt-1">
                        Overall Score: {parseFloat(response.overallScore).toFixed(2)}/100
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResponseStatusColor(response.status)}`}>
                      {response.status}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedResponse(response);
                          setShowDetailsModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </button>
                      {canEvaluate && response.status !== 'REVIEWED' && response.status !== 'SELECTED' && (
                        <button
                          onClick={() => handleOpenScoring(response)}
                          className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
                        >
                          Evaluate
                        </button>
                      )}
                      {canSelectWinner && response.status === 'REVIEWED' && (
                        <button
                          onClick={() => handleSelectWinner(response.id, response.vendor.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          <Award className="h-3 w-3 mr-1" />
                          Select Winner
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scoring Modal */}
      {showScoringModal && selectedResponse && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Score Proposal - {selectedResponse.vendor.nameEn}
                </h3>
                <button
                  onClick={() => setShowScoringModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {evaluationCriteria.map((criteria: any) => {
                  const key = criteria.name.toLowerCase().replace(/\s+/g, '');
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700">
                        {criteria.name} ({criteria.weight}%) - Score out of 100
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={scoringData[key] || ''}
                        onChange={(e) => setScoringData({
                          ...scoringData,
                          [key]: parseInt(e.target.value) || 0
                        })}
                        placeholder="Enter score (0-100)"
                        className="mt-1 block w-full rounded-md border-wujha-primary text-gray-900 bg-white placeholder:text-gray-600 shadow-sm focus:border-wujha-primary focus:ring-2 focus:ring-wujha-primary"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowScoringModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitScores}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-wujha-primary hover:bg-wujha-primary-hover"
                >
                  Submit Scores
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedResponse && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Proposal Details - {selectedResponse.vendor.nameEn}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {selectedResponse.totalAmount && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Total Amount</h4>
                    <p className="text-lg font-bold text-wujha-primary">
                      {parseFloat(selectedResponse.totalAmount).toLocaleString()} OMR
                    </p>
                  </div>
                )}
                {selectedResponse.priceBreakdown && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Price Breakdown</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedResponse.priceBreakdown}</p>
                  </div>
                )}
                {selectedResponse.technicalDetails && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Technical Details</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedResponse.technicalDetails}</p>
                  </div>
                )}
                {selectedResponse.deliveryTerms && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Delivery Terms</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedResponse.deliveryTerms}</p>
                  </div>
                )}
                {selectedResponse.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Additional Notes</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedResponse.notes}</p>
                  </div>
                )}
                {selectedResponse.proposalFileUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Proposal Document</h4>
                    <a
                      href={selectedResponse.proposalFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-wujha-primary hover:underline"
                    >
                      Download Proposal
                    </a>
                  </div>
                )}
                {(selectedResponse.overallScore !== null || 
                  selectedResponse.technicalScore !== null || 
                  selectedResponse.commercialScore !== null || 
                  selectedResponse.deliveryScore !== null || 
                  selectedResponse.experienceScore !== null) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Scores</h4>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {evaluationCriteria.map((criteria: any) => {
                        const key = criteria.name.toLowerCase().replace(/\s+/g, '').replace(/&/g, '');
                        
                        // Map criteria names to database field names (same as evaluate endpoint)
                        const fieldMapping: Record<string, string> = {
                          'technicalcompliance': 'technicalScore',
                          'technical': 'technicalScore',
                          'commercialproposal': 'commercialScore',
                          'commercial': 'commercialScore',
                          'experience&references': 'experienceScore',
                          'experiencereferences': 'experienceScore',
                          'experience': 'experienceScore',
                          'resourceavailability': 'deliveryScore',
                          'delivery': 'deliveryScore',
                          'resource': 'deliveryScore'
                        };
                        
                        const dbField = fieldMapping[key] || `${key}Score`;
                        const score = selectedResponse[dbField];
                        
                        return score !== null && score !== undefined ? (
                          <div key={key}>
                            <p className="text-xs text-gray-500">{criteria.name} ({criteria.weight}%)</p>
                            <p className="text-sm font-medium text-gray-900">{score}/100</p>
                          </div>
                        ) : null;
                      })}
                      {selectedResponse.overallScore !== null && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Overall Score</p>
                          <p className="text-lg font-bold text-wujha-primary">
                            {parseFloat(selectedResponse.overallScore).toFixed(2)}/100
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Winner Confirmation Modal */}
      {showWinnerConfirmModal && pendingWinnerSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Award className="h-6 w-6 text-wujha-primary mr-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  Select Winner
                </h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to select this vendor as the winner? This action will mark the RFP as awarded.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowWinnerConfirmModal(false);
                    setPendingWinnerSelection(null);
                  }}
                  disabled={selectingWinner}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSelectWinner}
                  disabled={selectingWinner}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectingWinner ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Selecting...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      Confirm Selection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
