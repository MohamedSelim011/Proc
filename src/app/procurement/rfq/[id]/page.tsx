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
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  description: string;
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
    totalAmount: number;
    validUntil: string;
    status: string;
    technicalScore?: number;
    commercialScore?: number;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PUBLISHED': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-yellow-100 text-yellow-800';
      case 'EVALUATED': return 'bg-purple-100 text-purple-800';
      case 'AWARDED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'SHORTLISTED': return 'bg-purple-100 text-purple-800';
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
          {rfq.status === 'DRAFT' && (
            <Link
              href={`/procurement/rfq/${rfq.id}/edit`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Link>
          )}
          
          {rfq.status === 'DRAFT' && (
            <button
              onClick={() => handleStatusChange('PUBLISHED')}
              disabled={evaluating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Publish</span>
            </button>
          )}
          
          {rfq.status === 'PUBLISHED' && (
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={evaluating}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>Close</span>
            </button>
          )}

          {rfq.status === 'CLOSED' && rfq.responses.length > 0 && (
            <button
              onClick={() => handleStatusChange('EVALUATED')}
              disabled={evaluating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Star className="h-4 w-4" />
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Responses</p>
              <p className="text-2xl font-bold text-gray-900">{totalResponses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">PR Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {rfq.pr.estimatedCost.toLocaleString()} OMR
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Bid</p>
              <p className="text-2xl font-bold text-gray-900">
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
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
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
                        <p className="text-sm text-gray-500">
                          Valid until: {new Date(response.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {response.totalAmount.toLocaleString()} OMR
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResponseStatusColor(response.status)}`}>
                          {response.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {(response.technicalScore || response.commercialScore) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {response.technicalScore && (
                            <div>
                              <span className="text-gray-500">Technical Score:</span>
                              <span className="ml-2 font-medium">{response.technicalScore}/100</span>
                            </div>
                          )}
                          {response.commercialScore && (
                            <div>
                              <span className="text-gray-500">Commercial Score:</span>
                              <span className="ml-2 font-medium">{response.commercialScore}/100</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
              {rfq.status === 'CLOSED' && (
                <button
                  onClick={() => handleStatusChange('EVALUATED')}
                  disabled={evaluating}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Star className="h-4 w-4" />
                  <span>Evaluate Responses</span>
                </button>
              )}
              
              {rfq.status === 'EVALUATED' && (
                <button
                  onClick={() => handleStatusChange('AWARDED')}
                  disabled={evaluating}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Award className="h-4 w-4" />
                  <span>Award Contract</span>
                </button>
              )}
              
              <Link
                href={`/procurement/rfq/${rfq.id}/responses`}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>View All Responses</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 