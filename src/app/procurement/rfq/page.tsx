'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Building,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Send
} from 'lucide-react';
import Link from 'next/link';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  description: string;
  purchaseRequisition: {
    id: string;
    prNumber: string;
    itemType: string;
  };
  issueDate: string;
  submissionDeadline: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'UNDER_EVALUATION' | 'COMPLETED' | 'CANCELLED';
  totalEstimatedValue: number;
  currency: string;
  responseCount: number;
  evaluationCriteria: {
    technical: number;
    commercial: number;
    delivery: number;
    experience: number;
  };
  responses: {
    id: string;
    vendor: {
      id: string;
      nameEn: string;
    };
    status: 'PENDING' | 'SUBMITTED' | 'EVALUATED' | 'SELECTED' | 'REJECTED';
    submittedAt?: string;
    totalQuotedPrice?: number;
    technicalScore?: number;
    commercialScore?: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export default function RFQPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    itemType: '',
    search: ''
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.itemType, filters.search]);

  // Fetch RFQs when page or filters change
  useEffect(() => {
    fetchRFQs();
  }, [currentPage, filters]);

  const fetchRFQs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/rfq?${params.toString()}`);
      const data = await response.json();
      
      console.log('RFQ Fetch Response:', {
        status: response.status,
        filters,
        params: params.toString(),
        rfqCount: data.rfqs?.length || 0,
        total: data.pagination?.total || 0
      });
      
      if (response.ok) {
          // Transform RFQ data to match the expected interface
          const transformedRFQs: RFQ[] = data.rfqs?.map((rfq: any) => ({
            id: rfq.id,
            rfqNumber: rfq.rfqNumber,
            title: rfq.title,
            description: rfq.description,
            purchaseRequisition: {
              id: rfq.pr?.id || 'N/A',
              prNumber: rfq.pr?.prNumber || 'N/A',
              itemType: rfq.pr?.itemType || 'STOCK'
            },
            issueDate: rfq.issueDate,
            submissionDeadline: rfq.closingDate, // Map closingDate to submissionDeadline
            status: mapRFQStatus(rfq.status), // Map database status to frontend status
            totalEstimatedValue: (() => {
              const rawValue = rfq.pr?.estimatedCost || '0';
              const parsedValue = parseFloat(rawValue) || 0;
              return parsedValue;
            })(), // Convert string to number safely
            currency: 'OMR',
            responseCount: rfq.responses?.length || 0,
            evaluationCriteria: rfq.evaluationCriteria ? JSON.parse(rfq.evaluationCriteria) : {
              technical: 40,
              commercial: 30,
              delivery: 20,
              experience: 10
            },
            responses: rfq.responses?.map((response: any) => ({
              id: response.id,
              vendor: {
                id: response.vendor?.id || 'vendor-1',
                nameEn: response.vendor?.nameEn || 'Sample Vendor'
              },
              status: mapRFQResponseStatus(response.status), // Map response status
              submittedAt: response.submittedAt,
              totalQuotedPrice: response.totalAmount || 0, // Map totalAmount to totalQuotedPrice
              technicalScore: response.technicalScore || 0,
              commercialScore: response.commercialScore || 0
            })) || [],
            createdAt: rfq.createdAt,
            updatedAt: rfq.updatedAt
          })) || [];
        
        setRfqs(transformedRFQs);
        setTotalPages(Math.ceil((data.total || 0) / 10));
      }
    } catch (error) {
      console.error('Error fetching RFQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'ISSUED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'UNDER_EVALUATION': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'EVALUATED': return 'bg-yellow-100 text-yellow-800';
      case 'SELECTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper functions to map database statuses to frontend statuses
  const mapRFQStatus = (dbStatus: string): string => {
    switch (dbStatus) {
      case 'DRAFT': return 'DRAFT';
      case 'PENDING_APPROVAL': return 'PENDING_APPROVAL';
      case 'APPROVED': return 'APPROVED';
      case 'REJECTED': return 'REJECTED';
      case 'PUBLISHED': return 'ISSUED';
      case 'SENT': return 'ISSUED';
      case 'ISSUED': return 'ISSUED';
      case 'CLOSED': return 'UNDER_EVALUATION';
      case 'EVALUATED': return 'UNDER_EVALUATION';
      case 'UNDER_EVALUATION': return 'UNDER_EVALUATION';
      case 'AWARDED': return 'COMPLETED';
      case 'COMPLETED': return 'COMPLETED';
      case 'CANCELLED': return 'CANCELLED';
      default: return 'DRAFT';
    }
  };

  const mapRFQResponseStatus = (dbStatus: string): string => {
    switch (dbStatus) {
      case 'SUBMITTED': return 'SUBMITTED';
      case 'UNDER_REVIEW': return 'EVALUATED';
      case 'SHORTLISTED': return 'EVALUATED';
      case 'SELECTED': return 'SELECTED';
      case 'REJECTED': return 'REJECTED';
      default: return 'PENDING';
    }
  };

  // Calculate statistics
  const stats = {
    total: rfqs.length,
    issued: rfqs.filter(rfq => rfq.status === 'ISSUED').length,
    underEvaluation: rfqs.filter(rfq => rfq.status === 'UNDER_EVALUATION').length,
    completed: rfqs.filter(rfq => rfq.status === 'COMPLETED').length,
    totalValue: rfqs.reduce((sum, rfq) => {
      const value = rfq.totalEstimatedValue || 0;
      return sum + value;
    }, 0),
    avgResponseRate: rfqs.length > 0 ? 
      rfqs.reduce((sum, rfq) => sum + (rfq.responseCount || 0), 0) / rfqs.length : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request for Quotation (RFQ)</h1>
          <p className="text-gray-600 mt-1">Manage RFQ processes and vendor responses</p>
        </div>
        <Link
          href="/procurement/rfq/new"
          className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          New RFQ
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="p-2 bg-wujha-primary/10 rounded-lg flex-shrink-0">
              <FileText className="h-6 w-6 text-wujha-primary" />
            </div>
            <div className="ml-4 min-w-0 flex-1 flex flex-col">
              <p className="text-sm font-medium text-gray-600 leading-tight h-10 flex items-start">Total RFQs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="p-2 bg-wujha-primary/10 rounded-lg flex-shrink-0">
              <Send className="h-6 w-6 text-wujha-primary" />
            </div>
            <div className="ml-4 min-w-0 flex-1 flex flex-col">
              <p className="text-sm font-medium text-gray-600 leading-tight h-10 flex items-start">Issued</p>
              <p className="text-2xl font-bold text-wujha-primary">{stats.issued}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="p-2 bg-wujha-primary/10 rounded-lg flex-shrink-0">
              <Clock className="h-6 w-6 text-wujha-primary" />
            </div>
            <div className="ml-4 min-w-0 flex-1 flex flex-col">
              <p className="text-sm font-medium text-gray-600 leading-tight h-10 flex items-start">Under Evaluation</p>
              <p className="text-2xl font-bold text-wujha-primary">{stats.underEvaluation}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4 min-w-0 flex-1 flex flex-col">
              <p className="text-sm font-medium text-gray-600 leading-tight h-10 flex items-start">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="p-2 bg-wujha-primary/10 rounded-lg flex-shrink-0">
              <Calendar className="h-6 w-6 text-wujha-primary" />
            </div>
            <div className="ml-4 min-w-0 flex-1 flex flex-col">
              <p className="text-sm font-medium text-gray-600 leading-tight h-10 flex items-start">Total Value</p>
              <p className="text-sm font-bold text-wujha-primary leading-tight break-words" title={stats.totalValue > 0 ? `${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} OMR` : '0.00 OMR'}>
                {stats.totalValue > 0 ? `${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} OMR` : '0.00 OMR'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="p-2 bg-wujha-primary/10 rounded-lg flex-shrink-0">
              <Users className="h-6 w-6 text-wujha-primary" />
            </div>
            <div className="ml-4 min-w-0 flex-1 flex flex-col">
              <p className="text-sm font-medium text-gray-600 leading-tight h-10 flex items-start">Avg Responses</p>
              <p className="text-2xl font-bold text-wujha-primary">{stats.avgResponseRate.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ListFiltersCard
        onClear={() => setFilters({ status: '', itemType: '', search: '' })}
        className="mb-6"
        columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <ListFilterField label="Search">
          <input
            type="text"
            placeholder="Search by RFQ number..."
            className="erp-input"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </ListFilterField>
        <ListFilterField label="Status">
          <select
            className="erp-input"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ISSUED">Issued</option>
            <option value="UNDER_EVALUATION">Under Evaluation</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </ListFilterField>
        <ListFilterField label="Item Type">
          <select
            className="erp-input"
            value={filters.itemType}
            onChange={(e) => setFilters(prev => ({ ...prev, itemType: e.target.value }))}
          >
            <option value="">All</option>
            <option value="STOCK">Stock Items</option>
            <option value="SERVICE">Services</option>
            <option value="NON_STOCK">Non-Stock Items</option>
          </select>
        </ListFilterField>
      </ListFiltersCard>

      {/* RFQ List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RFQ Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PR Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timeline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value & Responses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rfqs.map((rfq) => (
                <tr key={rfq.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {rfq.rfqNumber}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {rfq.title}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {rfq.purchaseRequisition.prNumber}
                      </div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {rfq.purchaseRequisition.itemType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        Issued: {new Date(rfq.issueDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Deadline: {new Date(rfq.submissionDeadline).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate" title={`${rfq.totalEstimatedValue.toLocaleString()} ${rfq.currency}`}>
                        {rfq.totalEstimatedValue.toLocaleString()} {rfq.currency}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {rfq.responseCount} response{rfq.responseCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rfq.status)}`}>
                      {rfq.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/procurement/rfq/${rfq.id}`}
                        className="text-wujha-primary hover:text-wujha-primary-hover"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {rfq.status === 'DRAFT' && (
                        <Link
                          href={`/procurement/rfq/${rfq.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {rfqs.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No RFQs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new RFQ from an approved purchase requisition.
          </p>
          <div className="mt-6">
            <Link
              href="/procurement/rfq/new"
              className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New RFQ
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
