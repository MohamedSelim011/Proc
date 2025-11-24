'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle,
  AlertTriangle,
  Building,
  Eye,
  Edit,
  Send,
  Award,
  Star,
  TrendingUp,
  DollarSign,
  Loader2,
  X,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { getUserRole, getUserData } from '@/lib/jwt';

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  description: string;
  createdBy?: string;
  pr: {
    id: string;
    prNumber: string;
    itemType: string;
    estimatedCost: number;
    items: {
      id: string;
      item: {
        nameEn: string;
        specifications?: string;
      };
      quantity: number;
      estimatedPrice: number;
    }[];
  };
  issueDate: string;
  closingDate: string;
  status: string;
  evaluationCriteria?: string;
  termsAndConditions?: string;
  approvals?: {
    id: string;
    level: number;
    status: string;
    approverId: string;
    comments?: string;
    approvedAt?: string;
  }[];
  invitedVendors?: {
    id: string;
    vendorId: string;
    vendor: {
      id: string;
      nameEn: string;
      vendorCode: string;
      email: string;
      mobile: string;
    };
    invitedAt: string;
  }[];
  responses: {
    id: string;
    vendor: {
      id: string;
      nameEn: string;
      categories: {
        category: {
          nameEn: string;
        };
      }[];
    };
    submittedAt: string;
    totalAmount?: number;
    validUntil?: string;
    status: string;
    technicalScore?: number;
    commercialScore?: number;
    deliveryScore?: number;
    experienceScore?: number;
    overallScore?: number;
    proposalFileUrl?: string;
    tokenUsed?: boolean;
    priceBreakdown?: string;
    technicalDetails?: string;
    deliveryTerms?: string;
    notes?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export default function RFQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [sendingInvitations, setSendingInvitations] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userEmployeeId, setUserEmployeeId] = useState<string>('');
  const [selectedResponse, setSelectedResponse] = useState<RFQ['responses'][0] | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [scoringData, setScoringData] = useState<{ [responseId: string]: { [criterion: string]: number | null } }>({});

  useEffect(() => {
    // Get user data from JWT token or localStorage
    const role = getUserRole() || '';
    const user = getUserData() || {};
    
    setUserRole(role);
    setUserId(user.id || '');
    setUserEmployeeId(user.employeeId || '');
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchRFQ(params.id as string);
    }
  }, [params.id]);

  const fetchRFQ = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rfq/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRfq(data.rfq);
      } else {
        console.error('Failed to fetch RFQ');
      }
    } catch (error) {
      console.error('Error fetching RFQ:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setEvaluating(true);
      const response = await fetch(`/api/rfq/${params.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showToast('success', `RFQ status updated to ${newStatus}`);
        fetchRFQ(params.id as string);
      } else {
        const errorData = await response.json();
        console.error('Failed to update status:', errorData.error);
        showToast('error', `Failed to update status: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('error', 'Failed to update status');
    } finally {
      setEvaluating(false);
    }
  };

  const handleSelectWinner = async (responseId: string) => {
    if (!confirm('Are you sure you want to select this vendor as the winner?')) {
      return;
    }

    try {
      setEvaluating(true);
      const userData = getUserData();
      
      const response = await fetch(`/api/rfq/${params.id}/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedResponseId: responseId,
          awardedBy: userData?.employeeId || userData?.id || 'SYSTEM',
          comments: 'Selected through evaluation process',
          createPO: false // We'll ask user if they want to create PO
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast('success', 'Winner selected successfully!');
        
        // Ask if user wants to create a PO
        if (confirm('Would you like to create a Purchase Order for this vendor?')) {
          // Redirect to PO creation with vendor and RFQ data
          window.location.href = `/procurement/purchase-orders/new?rfqId=${params.id}&vendorId=${data.awardSummary.awardedTo.vendor.id}`;
        } else {
          fetchRFQ(params.id as string); // Refresh RFQ data
        }
      } else {
        const errorData = await response.json();
        showToast('error', errorData.error || 'Failed to select winner');
      }
    } catch (error) {
      console.error('Error selecting winner:', error);
      showToast('error', 'An error occurred while selecting winner');
    } finally {
      setEvaluating(false);
    }
  };

  const handleOpenScoring = () => {
    if (!rfq) return;
    
    // Parse evaluation criteria
    const criteria = rfq.evaluationCriteria ? JSON.parse(rfq.evaluationCriteria) : { technical: 40, commercial: 30, delivery: 20, experience: 10 };
    const criteriaKeys = Object.keys(criteria);
    
    // Filter to only submitted responses (tokenUsed && proposalFileUrl)
    const submittedResponses = rfq.responses.filter(r => r.tokenUsed && r.proposalFileUrl);
    
    // Initialize scoring data with existing scores or null
    const initialScores: { [key: string]: { [criterion: string]: number | null } } = {};
    submittedResponses.forEach(response => {
      initialScores[response.id] = {};
      criteriaKeys.forEach(key => {
        // Map existing scores: technical -> technicalScore, commercial -> commercialScore, etc.
        if (key === 'technical') {
          initialScores[response.id][key] = response.technicalScore ?? null;
        } else if (key === 'commercial') {
          initialScores[response.id][key] = response.commercialScore ?? null;
        } else if (key === 'delivery') {
          initialScores[response.id][key] = (response as any).deliveryScore ?? null;
        } else if (key === 'experience') {
          initialScores[response.id][key] = (response as any).experienceScore ?? null;
        } else {
          initialScores[response.id][key] = null;
        }
      });
    });
    setScoringData(initialScores);
    setShowScoringModal(true);
  };

  const handleSubmitScores = async () => {
    if (!rfq) return;

    try {
      setEvaluating(true);
      
      // Parse evaluation criteria
      const criteria = rfq.evaluationCriteria ? JSON.parse(rfq.evaluationCriteria) : { technical: 40, commercial: 30, delivery: 20, experience: 10 };
      const criteriaKeys = Object.keys(criteria);
      
      // Filter to only submitted responses
      const submittedResponses = rfq.responses.filter(r => r.tokenUsed && r.proposalFileUrl);
      
      // Validate all submitted responses have scores for all criteria
      const unscored = submittedResponses.filter(r => {
        const scores = scoringData[r.id];
        if (!scores) return true;
        return criteriaKeys.some(key => 
          scores[key] === undefined || scores[key] === null
        );
      });

      if (unscored.length > 0) {
        showToast('error', 'Please provide scores for all criteria for all submitted responses (0-100)');
        return;
      }

      // Prepare evaluations array
      // Map criteria scores to individual fields
      const evaluations = submittedResponses.map(response => {
        const scores = scoringData[response.id];
        
        return {
          responseId: response.id,
          technicalScore: scores.technical ?? null,
          commercialScore: scores.commercial ?? null,
          deliveryScore: scores.delivery ?? null,
          experienceScore: scores.experience ?? null
        };
      });

      // Submit scores
      const userData = getUserData();
      const evaluatedBy = userData?.employeeId || userData?.id || 'SYSTEM';

      const response = await fetch(`/api/rfq/${params.id}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluations,
          evaluatedBy
        }),
      });

      if (response.ok) {
        showToast('success', 'Responses scored successfully');
        setShowScoringModal(false);
        // Now update status to EVALUATED
        await handleStatusChange('EVALUATED');
      } else {
        const errorData = await response.json();
        showToast('error', errorData.error || 'Failed to score responses');
      }
    } catch (error) {
      console.error('Error scoring responses:', error);
      showToast('error', 'Failed to score responses');
    } finally {
      setEvaluating(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!rfq) return;
    
    try {
      setSubmittingForApproval(true);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const submittedBy = userData.employeeId || userData.id || rfq.createdBy || 'SYSTEM';
      
      const response = await fetch(`/api/rfq/${rfq.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submittedBy: submittedBy,
        }),
      });

      if (response.ok) {
        showToast('success', 'RFQ submitted for approval successfully');
        await fetchRFQ(rfq.id);
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

  const handleSendInvitations = async () => {
    if (!rfq) return;
    
    // Use the vendors already linked to the RFQ
    const vendorIds: string[] = (rfq.invitedVendors || []).map((iv: any) => iv.vendorId || iv.vendor?.id).filter((id: string) => id);
    
    if (vendorIds.length === 0) {
      showToast('error', 'No vendors have been selected for this RFQ. Please edit the RFQ to add vendors before sending invitations.');
      return;
    }
    
    try {
      setSendingInvitations(true);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const sentBy = userData.employeeId || userData.id || 'SYSTEM';
      
      const response = await fetch(`/api/rfq/${rfq.id}/send-invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorIds: vendorIds,
          sentBy: sentBy,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', `Invitations sent successfully to ${data.success} vendors`);
        if (data.failed > 0) {
          showToast('error', `Failed to send to ${data.failed} vendors`);
        }
        await fetchRFQ(rfq.id);
      } else {
        showToast('error', data.error || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      showToast('error', 'Failed to send invitations');
    } finally {
      setSendingInvitations(false);
    }
  };

  // Check permissions
  const canApprove = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole?.toUpperCase());
  const canSubmit = ['BUYER', 'REQUESTOR', 'PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole?.toUpperCase());
  const isCreator = rfq?.createdBy === userId || rfq?.createdBy === userEmployeeId;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING_APPROVAL': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PUBLISHED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'CLOSED': return 'bg-yellow-100 text-yellow-800';
      case 'EVALUATED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'AWARDED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'REVIEWED': return 'bg-blue-100 text-blue-800';
      case 'SHORTLISTED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'SELECTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
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

  if (!rfq) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">RFQ not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The RFQ you're looking for doesn't exist or has been removed.
        </p>
        <div className="mt-6">
          <Link
            href="/procurement/rfq"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
          >
            Back to RFQs
          </Link>
        </div>
      </div>
    );
  }

  const evaluationCriteria = rfq.evaluationCriteria ? JSON.parse(rfq.evaluationCriteria) : null;
  const totalResponses = rfq.responses.length;
  const averageBid = totalResponses > 0 
    ? rfq.responses.reduce((sum, r) => sum + Number(r.totalAmount), 0) / totalResponses 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/procurement/rfq"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{rfq.rfqNumber}</h1>
            <p className="text-gray-600 mt-1">{rfq.title}</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          {/* Edit button - only for DRAFT status (not approved or pending approval) */}
          {rfq.status === 'DRAFT' && (
            <Link
              href={`/procurement/rfq/${rfq.id}/edit`}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:ring-offset-2"
            >
              <Edit className="h-4 w-4 mr-2" />
              <span>Edit</span>
            </Link>
          )}
          
          {/* Request Approval button - for DRAFT status */}
          {rfq.status === 'DRAFT' && (canSubmit || isCreator) && (
            <button
              onClick={handleRequestApproval}
              disabled={submittingForApproval}
              className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingForApproval ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  <span>Request Approval</span>
                </>
              )}
            </button>
          )}

          {/* Review & Approve button - for PENDING_APPROVAL status */}
          {(rfq.status === 'PENDING_APPROVAL' || rfq.status === 'SUBMITTED') && canApprove && (
            <button
              onClick={() => router.push(`/procurement/rfq/${rfq.id}/approve`)}
              className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              <span>Review & Approve</span>
            </button>
          )}
          
          {/* Publish button - only when APPROVED */}
          {rfq.status === 'APPROVED' && (
            <button
              onClick={handleSendInvitations}
              disabled={sendingInvitations}
              className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingInvitations ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  <span>Publish & Send Invitations</span>
                </>
              )}
            </button>
          )}
          
          {rfq.status === 'PUBLISHED' && (
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={evaluating}
              className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock className="h-4 w-4 mr-2" />
              <span>Close</span>
            </button>
          )}

          {rfq.status === 'CLOSED' && rfq.responses.length > 0 && (
            <button
              onClick={handleOpenScoring}
              disabled={evaluating}
              className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Star className="h-4 w-4 mr-2" />
              <span>Evaluate</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center space-x-4">
        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(rfq.status)}`}>
          {rfq.status.replace('_', ' ')}
        </span>
        <span className="text-sm text-gray-500">
          Created: {new Date(rfq.createdAt).toLocaleDateString()}
        </span>
        <span className="text-sm text-gray-500">
          Closing: {new Date(rfq.closingDate).toLocaleDateString()}
        </span>
      </div>

      {/* Status Update Info */}
      {rfq.status === 'DRAFT' && new Date(rfq.closingDate) < new Date() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                RFQ cannot be published
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>The closing date ({new Date(rfq.closingDate).toLocaleDateString()}) is in the past. 
                You need to update the closing date to a future date before publishing this RFQ.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-wujha-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-wujha-primary" />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Total Responses</p>
              <p className="text-2xl font-bold text-gray-900 truncate">{totalResponses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-wujha-primary/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-wujha-primary" />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">PR Value</p>
              <p className="text-2xl font-bold text-gray-900 truncate" title={`${rfq.pr.estimatedCost.toLocaleString()} OMR`}>
                {rfq.pr.estimatedCost.toLocaleString()} OMR
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-wujha-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-wujha-primary" />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">Avg Bid</p>
              <p className="text-2xl font-bold text-gray-900 truncate" title={`${averageBid.toLocaleString()} OMR`}>
                {averageBid.toLocaleString()} OMR
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-wujha-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-wujha-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Closing Date</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(rfq.closingDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RFQ Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <FileText className="h-5 w-5 inline mr-2" />
              RFQ Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{rfq.description || 'No description provided'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(rfq.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Closing Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(rfq.closingDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Requisition Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <Building className="h-5 w-5 inline mr-2" />
              Purchase Requisition Details
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PR Number</label>
                  <p className="mt-1 text-sm text-gray-900">{rfq.pr.prNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Type</label>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-wujha-primary/10 text-wujha-primary">
                    {rfq.pr.itemType}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Cost</label>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {rfq.pr.estimatedCost.toLocaleString()} OMR
                </p>
              </div>
            </div>
          </div>

          {/* Invited Vendors & Submission Status */}
          {rfq.invitedVendors && rfq.invitedVendors.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-wujha-primary" />
                  Invited Vendors & Submission Status
                </span>
                <span className="text-sm font-normal text-gray-500">
                  {rfq.invitedVendors.filter(iv => {
                    const resp = rfq.responses.find(r => r.vendor.id === iv.vendor.id);
                    return !!(resp && resp.tokenUsed && resp.proposalFileUrl);
                  }).length} of {rfq.invitedVendors.length} submitted
                </span>
              </h2>
              
              <div className="space-y-3">
                {rfq.invitedVendors.map((invitedVendor) => {
                  const response = rfq.responses.find(r => r.vendor.id === invitedVendor.vendor.id);
                  // A vendor has actually submitted if they have a response with tokenUsed=true and proposalFileUrl
                  const hasSubmitted = !!(response && response.tokenUsed && response.proposalFileUrl);
                  
                  return (
                    <div
                      key={invitedVendor.id}
                      className={`border rounded-lg p-4 transition-all ${
                        hasSubmitted
                          ? 'border-green-200 bg-green-50/50'
                          : 'border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {/* Status Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {hasSubmitted ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-amber-500" />
                            )}
                          </div>
                          
                          {/* Vendor Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">{invitedVendor.vendor.nameEn}</h3>
                              {hasSubmitted && (
                                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Submitted
                                </span>
                              )}
                              {!hasSubmitted && (
                                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                  Pending
                                </span>
                              )}
                            </div>
                            <div className="mt-1 space-y-1">
                              <p className="text-xs text-gray-500">
                                Code: <span className="font-medium">{invitedVendor.vendor.vendorCode}</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                Email: <span className="font-medium">{invitedVendor.vendor.email}</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                Invited: {new Date(invitedVendor.invitedAt).toLocaleDateString()}
                              </p>
                            </div>
                            
                            {/* Submission Details */}
                            {hasSubmitted && response && (
                              <div className="mt-3 pt-3 border-t border-green-200">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Amount:</span>
                                    <span className="ml-2 font-semibold text-gray-900">
                                      {response.totalAmount?.toLocaleString() || 'N/A'} OMR
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Submitted:</span>
                                    <span className="ml-2 font-medium text-gray-900">
                                      {new Date(response.submittedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {response.validUntil && (
                                    <div>
                                      <span className="text-gray-600">Valid Until:</span>
                                      <span className="ml-2 font-medium text-gray-900">
                                        {new Date(response.validUntil).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getResponseStatusColor(response.status)}`}>
                                      {response.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="mt-3 flex items-center space-x-3">
                                  {response.proposalFileUrl && (
                                    <a
                                      href={response.proposalFileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                      className="inline-flex items-center text-sm text-wujha-primary hover:text-wujha-primary-hover font-medium"
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      Download PDF
                                    </a>
                                  )}
                                  <button
                                    onClick={() => {
                                      setSelectedResponse(response);
                                      setShowDetailsModal(true);
                                    }}
                                    className="inline-flex items-center text-sm text-wujha-primary hover:text-wujha-primary-hover font-medium"
                                  >
                                    <Info className="h-4 w-4 mr-1" />
                                    View Details
                                  </button>
                                </div>
                                
                                {/* Scores */}
                                {(response.technicalScore || response.commercialScore || response.deliveryScore || response.experienceScore || response.overallScore) && (
                                  <div className="mt-2 pt-2 border-t border-green-200">
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                      {response.technicalScore && (
                                        <div>
                                          <span className="text-gray-600">Technical:</span>
                                          <span className="ml-1 font-medium text-gray-900">
                                            {response.technicalScore}/100
                                          </span>
                                        </div>
                                      )}
                                      {response.commercialScore && (
                                        <div>
                                          <span className="text-gray-600">Commercial:</span>
                                          <span className="ml-1 font-medium text-gray-900">
                                            {response.commercialScore}/100
                                          </span>
                                        </div>
                                      )}
                                      {response.deliveryScore && (
                                        <div>
                                          <span className="text-gray-600">Delivery:</span>
                                          <span className="ml-1 font-medium text-gray-900">
                                            {response.deliveryScore}/100
                                          </span>
                                        </div>
                                      )}
                                      {response.experienceScore && (
                                        <div>
                                          <span className="text-gray-600">Experience:</span>
                                          <span className="ml-1 font-medium text-gray-900">
                                            {response.experienceScore}/100
                                          </span>
                                        </div>
                                      )}
                                      {response.overallScore && (
                                        <div className="font-semibold">
                                          <span className="text-gray-700">Overall:</span>
                                          <span className="ml-1 text-wujha-primary">
                                            {response.overallScore}/100
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Pending Message */}
                            {!hasSubmitted && (
                              <div className="mt-3 pt-3 border-t border-amber-200">
                                <p className="text-sm text-amber-700">
                                  <Clock className="h-4 w-4 inline mr-1" />
                                  Awaiting proposal submission
                                </p>
                                {new Date(rfq.closingDate) < new Date() && (
                                  <p className="text-xs text-red-600 mt-1">
                                    ⚠️ Submission deadline has passed
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Summary Stats */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{rfq.invitedVendors.length}</p>
                    <p className="text-xs text-gray-500">Total Invited</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {rfq.invitedVendors.filter(iv => {
                        const resp = rfq.responses.find(r => r.vendor.id === iv.vendor.id);
                        return !!(resp && resp.tokenUsed && resp.proposalFileUrl);
                      }).length}
                    </p>
                    <p className="text-xs text-gray-500">Submitted</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">
                      {rfq.invitedVendors.filter(iv => {
                        const resp = rfq.responses.find(r => r.vendor.id === iv.vendor.id);
                        return !(resp && resp.tokenUsed && resp.proposalFileUrl);
                      }).length}
                    </p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Responses */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <Users className="h-5 w-5 inline mr-2" />
              Vendor Responses ({totalResponses})
            </h2>
            
            {totalResponses === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No responses yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Vendor responses will appear here once they submit their quotes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rfq.responses.map((response) => (
                  <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{response.vendor.nameEn}</h3>
                        <p className="text-sm text-gray-500">
                          Submitted: {new Date(response.submittedAt).toLocaleDateString()}
                        </p>
                        {response.validUntil && (
                          <p className="text-sm text-gray-500">
                            Valid until: {new Date(response.validUntil).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {response.totalAmount ? response.totalAmount.toLocaleString() : 'N/A'} OMR
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResponseStatusColor(response.status)}`}>
                          {response.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {(response.technicalScore || response.commercialScore || response.deliveryScore || response.experienceScore || response.overallScore) && (() => {
                      const criteria = rfq.evaluationCriteria ? JSON.parse(rfq.evaluationCriteria) : { technical: 40, commercial: 30, delivery: 20, experience: 10 };
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            {response.technicalScore !== null && response.technicalScore !== undefined && (
                              <div>
                                <span className="text-gray-500">Technical ({criteria.technical || 40}%):</span>
                                <span className="ml-2 font-medium">{response.technicalScore}/100</span>
                              </div>
                            )}
                            {response.commercialScore !== null && response.commercialScore !== undefined && (
                              <div>
                                <span className="text-gray-500">Commercial ({criteria.commercial || 30}%):</span>
                                <span className="ml-2 font-medium">{response.commercialScore}/100</span>
                              </div>
                            )}
                            {response.deliveryScore !== null && response.deliveryScore !== undefined && (
                              <div>
                                <span className="text-gray-500">Delivery ({criteria.delivery || 20}%):</span>
                                <span className="ml-2 font-medium">{response.deliveryScore}/100</span>
                              </div>
                            )}
                            {response.experienceScore !== null && response.experienceScore !== undefined && (
                              <div>
                                <span className="text-gray-500">Experience ({criteria.experience || 10}%):</span>
                                <span className="ml-2 font-medium">{response.experienceScore}/100</span>
                              </div>
                            )}
                            {response.overallScore && (
                              <div className="col-span-3 font-semibold border-t pt-2 mt-2">
                                <span className="text-gray-700">Overall Weighted Score:</span>
                                <span className="ml-2 text-wujha-primary text-lg">{response.overallScore}/100</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Select Winner Button */}
                          {rfq.status === 'EVALUATED' && (response.overallScore !== null && response.overallScore !== undefined) && (
                            userRole === 'ADMIN' || 
                            userRole === 'SUPER_ADMIN' || 
                            userRole === 'PROCUREMENT_MANAGER' || 
                            userRole === 'DEPARTMENT_MANAGER' || 
                            userRole === 'FINANCE_MANAGER'
                          ) && (
                            <div className="mt-3">
                              <button
                                onClick={() => handleSelectWinner(response.id)}
                                disabled={evaluating}
                                className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Award className="h-4 w-4 mr-2" />
                                <span>Select as Winner</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Evaluation Criteria */}
          {evaluationCriteria && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <Star className="h-5 w-5 inline mr-2" />
                Evaluation Criteria
              </h3>
              
              <div className="space-y-3">
                {Object.entries(evaluationCriteria).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {key}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {String(value)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          {rfq.termsAndConditions && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <FileText className="h-5 w-5 inline mr-2" />
                Terms & Conditions
              </h3>
              
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {rfq.termsAndConditions}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            
            <div className="space-y-3">
              {rfq.status === 'CLOSED' && rfq.responses.length > 0 && (
                <button
                  onClick={handleOpenScoring}
                  disabled={evaluating}
                  className="w-full inline-flex items-center justify-center rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Star className="h-4 w-4 mr-2" />
                  <span>Evaluate Responses</span>
                </button>
              )}
              
              {rfq.status === 'EVALUATED' && (
                <button
                  onClick={() => handleStatusChange('AWARDED')}
                  disabled={evaluating}
                  className="w-full inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Award className="h-4 w-4 mr-2" />
                  <span>Award Contract</span>
                </button>
              )}
              
              {/* <Link
                href={`/procurement/rfq/${rfq.id}/responses`}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>View All Responses</span>
              </Link> */}
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Details Modal */}
      {showDetailsModal && selectedResponse && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Proposal Details</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedResponse.vendor.nameEn} - {rfq?.rfqNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedResponse(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Total Amount</label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {selectedResponse.totalAmount ? `${Number(selectedResponse.totalAmount).toLocaleString()} OMR` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getResponseStatusColor(selectedResponse.status)}`}>
                      {selectedResponse.status.replace('_', ' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Submitted Date</label>
                  <p className="text-gray-900 mt-1">
                    {selectedResponse.submittedAt ? new Date(selectedResponse.submittedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                {selectedResponse.validUntil && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Valid Until</label>
                    <p className="text-gray-900 mt-1">
                      {new Date(selectedResponse.validUntil).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              {selectedResponse.priceBreakdown && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Price Breakdown</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedResponse.priceBreakdown}</p>
                  </div>
                </div>
              )}

              {/* Technical Details */}
              {selectedResponse.technicalDetails && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Technical Details</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedResponse.technicalDetails}</p>
                  </div>
                </div>
              )}

              {/* Delivery Terms */}
              {selectedResponse.deliveryTerms && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Delivery Terms</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedResponse.deliveryTerms}</p>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {selectedResponse.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Additional Notes</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedResponse.notes}</p>
                  </div>
                </div>
              )}

              {/* Proposal File */}
              {selectedResponse.proposalFileUrl && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Proposal Document</label>
                  <a
                    href={selectedResponse.proposalFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center text-wujha-primary hover:text-wujha-primary-hover font-medium"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Download Proposal PDF
                  </a>
                </div>
              )}

              {/* Evaluation Scores */}
              {(selectedResponse.technicalScore || selectedResponse.commercialScore || selectedResponse.deliveryScore || selectedResponse.experienceScore || selectedResponse.overallScore) && (() => {
                const criteria = rfq?.evaluationCriteria ? JSON.parse(rfq.evaluationCriteria) : { technical: 40, commercial: 30, delivery: 20, experience: 10 };
                return (
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Evaluation Scores</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedResponse.technicalScore !== null && selectedResponse.technicalScore !== undefined && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Technical ({criteria.technical || 40}% weight)</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {selectedResponse.technicalScore}/100
                          </p>
                        </div>
                      )}
                      {selectedResponse.commercialScore !== null && selectedResponse.commercialScore !== undefined && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Commercial ({criteria.commercial || 30}% weight)</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {selectedResponse.commercialScore}/100
                          </p>
                        </div>
                      )}
                      {selectedResponse.deliveryScore !== null && selectedResponse.deliveryScore !== undefined && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Delivery ({criteria.delivery || 20}% weight)</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {selectedResponse.deliveryScore}/100
                          </p>
                        </div>
                      )}
                      {selectedResponse.experienceScore !== null && selectedResponse.experienceScore !== undefined && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Experience ({criteria.experience || 10}% weight)</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {selectedResponse.experienceScore}/100
                          </p>
                        </div>
                      )}
                    </div>
                    {selectedResponse.overallScore && (
                      <div className="mt-4 bg-wujha-primary/10 border border-wujha-primary/30 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700">Overall Weighted Score</p>
                        <p className="text-3xl font-bold text-wujha-primary mt-1">
                          {selectedResponse.overallScore}/100
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Calculated as: (Technical × {criteria.technical}% + Commercial × {criteria.commercial}% + Delivery × {criteria.delivery}% + Experience × {criteria.experience}%) / 100
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedResponse(null);
                }}
                className="px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Modal */}
      {showScoringModal && rfq && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Score Responses</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Score each submitted response based on the evaluation criteria
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowScoringModal(false);
                    setScoringData({});
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Evaluation Criteria Display */}
              {rfq.evaluationCriteria && (() => {
                const criteria = JSON.parse(rfq.evaluationCriteria);
                return (
                  <div className="mt-4 p-3 bg-wujha-primary/10 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Evaluation Criteria Weights:</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {Object.entries(criteria).map(([key, value]) => (
                        <span key={key} className="text-gray-600">
                          <span className="font-semibold capitalize">{key}:</span> {String(value)}%
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {(() => {
                // Filter to only submitted responses
                const submittedResponses = rfq.responses.filter(r => r.tokenUsed && r.proposalFileUrl);
                const criteria = rfq.evaluationCriteria ? JSON.parse(rfq.evaluationCriteria) : { technical: 40, commercial: 30, delivery: 20, experience: 10 };
                const criteriaKeys = Object.keys(criteria);
                
                if (submittedResponses.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No responses have been submitted yet.</p>
                    </div>
                  );
                }
                
                return submittedResponses.map((response) => (
                  <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{response.vendor.nameEn}</h4>
                        <p className="text-sm text-gray-600">
                          Amount: {response.totalAmount ? `${Number(response.totalAmount).toLocaleString()} OMR` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`grid gap-4 ${criteriaKeys.length === 1 ? 'grid-cols-1' : criteriaKeys.length === 2 ? 'grid-cols-2' : criteriaKeys.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                      {criteriaKeys.map((criterion) => {
                        const weight = criteria[criterion];
                        return (
                          <div key={criterion}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <span className="capitalize">{criterion}</span> ({weight}% weight)
                              <span className="block text-xs text-gray-500 mt-1 font-normal">
                                Score: 0-100 (percentage performance)
                              </span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={scoringData[response.id]?.[criterion] ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : parseInt(e.target.value) || null;
                                // Validate that value is between 0 and 100
                                const validatedValue = value !== null ? Math.min(100, Math.max(0, value)) : null;
                                setScoringData(prev => {
                                  const existing = prev[response.id] || {};
                                  // Initialize all criteria fields if not present
                                  const initialized: { [key: string]: number | null } = {};
                                  criteriaKeys.forEach(key => {
                                    if (key === 'technical') {
                                      initialized[key] = existing[key] ?? response.technicalScore ?? null;
                                    } else if (key === 'commercial') {
                                      initialized[key] = existing[key] ?? response.commercialScore ?? null;
                                    } else if (key === 'delivery') {
                                      initialized[key] = existing[key] ?? (response as any).deliveryScore ?? null;
                                    } else if (key === 'experience') {
                                      initialized[key] = existing[key] ?? (response as any).experienceScore ?? null;
                                    } else {
                                      initialized[key] = existing[key] ?? null;
                                    }
                                  });
                                  return {
                                    ...prev,
                                    [response.id]: {
                                      ...initialized,
                                      [criterion]: validatedValue
                                    }
                                  };
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                              placeholder="0-100"
                            />
                            {scoringData[response.id]?.[criterion] !== null && scoringData[response.id]?.[criterion] !== undefined && (
                              <p className="text-xs text-gray-500 mt-1">
                                {scoringData[response.id][criterion]}/100 ({scoringData[response.id][criterion]}% performance)
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowScoringModal(false);
                  setScoringData({});
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitScores}
                disabled={evaluating}
                className="px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {evaluating ? 'Submitting...' : 'Submit Scores & Complete Evaluation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 