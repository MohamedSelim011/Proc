'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Star,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  FileText,
  User,
  FolderOpen
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import DocumentManager from '@/components/documents/document-manager';

interface PerformanceReport {
  id: string;
  contractId: string;
  evaluationPeriod: string;
  startDate: string;
  endDate: string;
  qualityScore: number | string | { toString(): string };
  timelinessScore: number | string | { toString(): string };
  complianceScore: number | string | { toString(): string };
  overallScore: number | string | { toString(): string };
  kpiMetrics: Record<string, number>;
  slaCompliance: Record<string, number>;
  penalties?: number | string | { toString(): string } | null;
  bonuses?: number | string | { toString(): string } | null;
  evaluatedBy: string;
  evaluatedAt: string;
  comments?: string;
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
  contract: {
    contractNumber: string;
    vendor: {
      nameEn: string;
      vendorCode: string;
    };
    totalValue: number | string | { toString(): string };
    currency: string;
    startDate: string;
    endDate: string;
    status: string;
  };
}

export default function PerformanceReportDetail() {
  const params = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview');
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/service-performance/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setReport(data);
      } else {
        setError(data.error || 'Performance report not found');
      }
    } catch (err) {
      setError('Failed to load performance report');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const handleDocumentUpload = async (file: File | null) => {
    if (!report || !file) return;

    try {
      setUploadingDocument(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', 'SYSTEM');

      const response = await fetch(`/api/service-performance/${report.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const uploadError = await response.json();
        throw new Error(uploadError.error || 'Failed to upload document');
      }

      showToast('success', 'Document uploaded successfully');
      await fetchReport();
    } catch (uploadError) {
      console.error('Error uploading document:', uploadError);
      showToast('error', uploadError instanceof Error ? uploadError.message : 'Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!report) return;
    try {
      const response = await fetch(`/api/service-performance/${report.id}/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const deleteError = await response.json();
        throw new Error(deleteError.error || 'Failed to delete document');
      }
      showToast('success', 'Document deleted successfully');
      await fetchReport();
    } catch (deleteError) {
      console.error('Error deleting document:', deleteError);
      showToast('error', deleteError instanceof Error ? deleteError.message : 'Failed to delete document');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-wujha-primary';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-800">{error || 'Performance report not found'}</p>
          </div>
        </div>
        <Link
          href="/procurement/services/performance"
          className="mt-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Performance Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/procurement/services/performance"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Performance Reports
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Performance Report Details</h1>
        <p className="mt-1 text-sm text-gray-500">
          Contract: {report.contract.contractNumber} - {report.contract.vendor.nameEn}
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-wujha-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'documents'
                ? 'bg-wujha-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Documents
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <>
      {/* Contract Information */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-gray-400" />
          Contract Information
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Contract Number</p>
            <p className="text-sm text-gray-900">{report.contract.contractNumber}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Vendor</p>
            <p className="text-sm text-gray-900">{report.contract.vendor.nameEn}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Contract Value</p>
            <p className="text-sm text-gray-900">
              {new Intl.NumberFormat('en-OM', {
                style: 'currency',
                currency: report.contract.currency || 'OMR',
                minimumFractionDigits: 3
              }).format(parseFloat(report.contract.totalValue?.toString() || '0'))}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className="text-sm text-gray-900">{report.contract.status}</p>
          </div>
        </div>
      </div>

      {/* Evaluation Period */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-gray-400" />
          Evaluation Period
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Period Type</p>
            <p className="text-sm text-gray-900">{report.evaluationPeriod}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Start Date</p>
            <p className="text-sm text-gray-900">{formatDate(report.startDate)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">End Date</p>
            <p className="text-sm text-gray-900">{formatDate(report.endDate)}</p>
          </div>
        </div>
      </div>

      {/* Performance Scores */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Star className="h-5 w-5 mr-2 text-gray-400" />
          Performance Scores
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900">Quality Score (40%)</p>
            <p className={`text-3xl font-bold mt-2 ${getScoreColor(parseFloat(report.qualityScore.toString()))}`}>
              {parseFloat(report.qualityScore.toString()).toFixed(1)}%
            </p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-900">Timeliness Score (30%)</p>
            <p className={`text-3xl font-bold mt-2 ${getScoreColor(parseFloat(report.timelinessScore.toString()))}`}>
              {parseFloat(report.timelinessScore.toString()).toFixed(1)}%
            </p>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-900">Compliance Score (30%)</p>
            <p className={`text-3xl font-bold mt-2 ${getScoreColor(parseFloat(report.complianceScore.toString()))}`}>
              {parseFloat(report.complianceScore.toString()).toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="mt-6 bg-wujha-primary/10 border-2 border-wujha-primary/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Performance Score</p>
              <p className="text-xs text-gray-500 mt-1">Weighted average of all scores</p>
            </div>
            <div className={`text-4xl font-bold ${getScoreColor(parseFloat(report.overallScore.toString()))}`}>
              {parseFloat(report.overallScore.toString()).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      {report.kpiMetrics && Object.keys(report.kpiMetrics).length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-gray-400" />
            KPI Metrics
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {report.kpiMetrics.deliveryAccuracy && (
              <div>
                <p className="text-sm font-medium text-gray-500">Delivery Accuracy</p>
                <p className="text-sm text-gray-900">{report.kpiMetrics.deliveryAccuracy}%</p>
              </div>
            )}
            {report.kpiMetrics.responseTime && (
              <div>
                <p className="text-sm font-medium text-gray-500">Response Time</p>
                <p className="text-sm text-gray-900">{report.kpiMetrics.responseTime}%</p>
              </div>
            )}
            {report.kpiMetrics.customerSatisfaction && (
              <div>
                <p className="text-sm font-medium text-gray-500">Customer Satisfaction</p>
                <p className="text-sm text-gray-900">{report.kpiMetrics.customerSatisfaction}%</p>
              </div>
            )}
            {report.kpiMetrics.defectRate && (
              <div>
                <p className="text-sm font-medium text-gray-500">Defect Rate (Inverse)</p>
                <p className="text-sm text-gray-900">{report.kpiMetrics.defectRate}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SLA Compliance */}
      {report.slaCompliance && Object.keys(report.slaCompliance).length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-gray-400" />
            SLA Compliance
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {report.slaCompliance.availability && (
              <div>
                <p className="text-sm font-medium text-gray-500">Availability</p>
                <p className="text-sm text-gray-900">{report.slaCompliance.availability}%</p>
              </div>
            )}
            {report.slaCompliance.responseTime && (
              <div>
                <p className="text-sm font-medium text-gray-500">Response Time Compliance</p>
                <p className="text-sm text-gray-900">{report.slaCompliance.responseTime}%</p>
              </div>
            )}
            {report.slaCompliance.resolutionTime && (
              <div>
                <p className="text-sm font-medium text-gray-500">Resolution Time Compliance</p>
                <p className="text-sm text-gray-900">{report.slaCompliance.resolutionTime}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Adjustments */}
      {(parseFloat(report.penalties?.toString() || '0') > 0 || parseFloat(report.bonuses?.toString() || '0') > 0) && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
            Financial Adjustments
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {parseFloat(report.penalties?.toString() || '0') > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500">Penalties</p>
                <p className="text-sm text-red-600 font-semibold">
                  {new Intl.NumberFormat('en-OM', {
                    style: 'currency',
                    currency: 'OMR',
                    minimumFractionDigits: 3
                  }).format(parseFloat(report.penalties?.toString() || '0'))}
                </p>
              </div>
            )}
            {parseFloat(report.bonuses?.toString() || '0') > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500">Bonuses</p>
                <p className="text-sm text-green-600 font-semibold">
                  {new Intl.NumberFormat('en-OM', {
                    style: 'currency',
                    currency: 'OMR',
                    minimumFractionDigits: 3
                  }).format(parseFloat(report.bonuses?.toString() || '0'))}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      {report.comments && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Comments</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.comments}</p>
        </div>
      )}

      {/* Evaluation Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-gray-400" />
          Evaluation Information
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Evaluated By</p>
            <p className="text-sm text-gray-900">{report.evaluatedBy}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Evaluated At</p>
            <p className="text-sm text-gray-900">{formatDate(report.evaluatedAt)}</p>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white shadow rounded-lg p-6">
          <DocumentManager
            documents={report.documents || []}
            uploading={uploadingDocument}
            onUpload={handleDocumentUpload}
            onDelete={handleDeleteDocument}
            getViewUrl={(documentId) => `/api/service-performance/${report.id}/documents/${documentId}/file`}
            getDownloadUrl={(documentId) => `/api/service-performance/${report.id}/documents/${documentId}/file?download=1`}
          />
        </div>
      )}
    </div>
  );
}

