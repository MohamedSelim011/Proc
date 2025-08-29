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
  status: 'DRAFT' | 'ISSUED' | 'UNDER_EVALUATION' | 'COMPLETED' | 'CANCELLED';
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

      const response = await fetch(`/api/rfq?${params}`);
      const data = await response.json();
      
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
      case 'ISSUED': return 'bg-blue-100 text-blue-800';
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
      case 'PUBLISHED': return 'ISSUED';
      case 'CLOSED': return 'UNDER_EVALUATION';
      case 'EVALUATED': return 'UNDER_EVALUATION';
      case 'AWARDED': return 'COMPLETED';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
          className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          New RFQ
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total RFQs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Issued</p>
              <p className="text-2xl font-bold text-blue-600">{stats.issued}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Under Evaluation</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.underEvaluation}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-xl font-bold text-purple-600 truncate">
                   {stats.totalValue > 0 ? `${stats.totalValue.toLocaleString()} OMR` : '0 OMR'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Responses</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.avgResponseRate.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search RFQs..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="UNDER_EVALUATION">Under Evaluation</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.itemType}
              onChange={(e) => setFilters(prev => ({ ...prev, itemType: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="STOCK">Stock Items</option>
              <option value="SERVICE">Services</option>
              <option value="NON_STOCK">Non-Stock Items</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => setFilters({ status: '', itemType: '', search: '' })}
              className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {rfq.totalEstimatedValue.toLocaleString()} {rfq.currency}
                      </div>
                      <div className="text-sm text-gray-500">
                        {rfq.responseCount} responses
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rfq.status)}`}>
                      {rfq.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      href={`/procurement/rfq/${rfq.id}`}
                      className="text-orange-600 hover:text-orange-900"
                    >
                      <Eye className="h-4 w-4 inline" />
                    </Link>
                    {rfq.status === 'DRAFT' && (
                      <Link
                        href={`/procurement/rfq/${rfq.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4 inline" />
                      </Link>
                    )}
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
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
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
