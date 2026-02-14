'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, User, FileText, CheckCircle, XCircle, Download } from 'lucide-react';

interface Version {
  id: string;
  versionNumber: number;
  contractNumber: string;
  vendorId: string;
  contractType: string;
  startDate: string;
  endDate: string;
  totalValue: string;
  currency: string;
  paymentTerms: string;
  slaTerms?: string | object;
  penaltyClause?: string;
  performanceBond?: string;
  retentionAmount?: string;
  insuranceRequirements?: string | object;
  status: string;
  changeReason?: string;
  changeDescription?: string;
  createdBy: string;
  createdByName: string;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

interface VersionHistoryItem {
  version: Version;
  changesSummary: string[];
  isFirstVersion: boolean;
  isLatestVersion: boolean;
}

interface VersionHistoryResponse {
  success: boolean;
  history: VersionHistoryItem[];
  stats: {
    totalVersions: number;
    currentVersion: number;
    approvedVersions: number;
    rejectedVersions: number;
    pendingVersions: number;
    firstCreatedAt: string;
    lastCreatedAt: string;
  };
}

export default function ContractVersionsPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const [historyItems, setHistoryItems] = useState<VersionHistoryItem[]>([]);
  const [stats, setStats] = useState<VersionHistoryResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [downloadingVersions, setDownloadingVersions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchVersions();
  }, [contractId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/service-contracts/${contractId}/versions`, {
        headers,
      });

      if (response.ok) {
        const data: VersionHistoryResponse = await response.json();
        setHistoryItems(data.history || []);
        setStats(data.stats || null);
        if (data.history && data.history.length > 0) {
          setContractNumber(data.history[0].version.contractNumber);
        }
      } else {
        setError('Failed to load version history');
      }
    } catch (err) {
      console.error('Error fetching versions:', err);
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: currency || 'OMR',
      minimumFractionDigits: 3
    }).format(parseFloat(amount));
  };

  const handleDownloadVersion = async (versionId: string, versionNumber: number) => {
    try {
      setDownloadingVersions(prev => new Set(prev).add(versionId));

      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/service-contracts/${contractId}/versions/${versionId}/download?t=${Date.now()}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Failed to download version');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Service_Contract_${contractNumber}_v${versionNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading version:', err);
      alert('Failed to download version PDF');
    } finally {
      setDownloadingVersions(prev => {
        const newSet = new Set(prev);
        newSet.delete(versionId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      CURRENT: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Current' },
    };

    const style = statusStyles[status] || statusStyles.DRAFT;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading version history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contract
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Version History</h1>
              {contractNumber && (
                <p className="mt-1 text-sm text-gray-500">Contract: {contractNumber}</p>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {stats ? stats.totalVersions : historyItems.length} version{(stats ? stats.totalVersions : historyItems.length) !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && stats.totalVersions > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Version Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.totalVersions}</p>
                <p className="text-xs text-gray-500">Total Versions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.currentVersion}</p>
                <p className="text-xs text-gray-500">Current Version</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.approvedVersions}</p>
                <p className="text-xs text-gray-500">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingVersions}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.rejectedVersions}</p>
                <p className="text-xs text-gray-500">Rejected</p>
              </div>
            </div>
          </div>
        )}

        {/* Versions Timeline */}
        {historyItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No version history available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyItems.map((item, index) => {
              const version = item.version;
              return (
              <div
                key={version.id}
                className={`bg-white rounded-lg shadow-sm border-2 ${
                  item.isLatestVersion ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                {/* Version Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-gray-900">
                        Version {version.versionNumber}
                      </span>
                      {item.isLatestVersion && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Current
                        </span>
                      )}
                      {version.approvalStatus && getStatusBadge(version.approvalStatus)}
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleDownloadVersion(version.id, version.versionNumber)}
                        disabled={downloadingVersions.has(version.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download this version as PDF"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {downloadingVersions.has(version.id) ? 'Downloading...' : 'Download PDF'}
                      </button>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(version.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Version Details */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Total Value</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(version.totalValue, version.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Contract Period</p>
                      <p className="text-sm text-gray-900">
                        {new Date(version.startDate).toLocaleDateString('en-OM')} - {new Date(version.endDate).toLocaleDateString('en-OM')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Payment Terms</p>
                      <p className="text-sm text-gray-900">{version.paymentTerms}</p>
                    </div>
                  </div>

                  {/* Change Information */}
                  {(version.changeReason || version.changeDescription || item.changesSummary.length > 0) && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded p-4 mb-4">
                      {version.changeReason && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-yellow-800 mb-1">Change Reason</p>
                          <p className="text-sm text-yellow-900">{version.changeReason}</p>
                        </div>
                      )}
                      {version.changeDescription && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-yellow-800 mb-1">Change Description</p>
                          <p className="text-sm text-yellow-900">{version.changeDescription}</p>
                        </div>
                      )}
                      {item.changesSummary.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-yellow-800 mb-1">Changes Made</p>
                          <ul className="text-sm text-yellow-900 list-disc list-inside">
                            {item.changesSummary.map((change, idx) => (
                              <li key={idx}>{change}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Created By */}
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    <span>Created by <strong>{version.createdByName}</strong></span>
                  </div>

                  {/* Approval Status */}
                  {version.approvedBy && version.approvedAt && (
                    <div className="flex items-center text-sm text-green-600 mt-2">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span>Approved on {formatDate(version.approvedAt)}</span>
                    </div>
                  )}

                  {/* Contract Type and Terms */}
                  {(version.contractType || version.slaTerms || version.penaltyClause) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center justify-between">
                          <span>View Full Details</span>
                          <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-4 space-y-3">
                          {version.contractType && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">Contract Type</p>
                              <p className="text-sm text-gray-900">{version.contractType}</p>
                            </div>
                          )}
                          
                          {version.slaTerms && (
                            <div className="bg-orange-50 border-l-4 border-orange-500 rounded p-3">
                              <p className="text-xs font-medium text-orange-900 mb-1">SLA Terms</p>
                              <p className="text-sm text-orange-800 whitespace-pre-line">
                                {typeof version.slaTerms === 'string' 
                                  ? version.slaTerms 
                                  : JSON.stringify(version.slaTerms, null, 2)}
                              </p>
                            </div>
                          )}
                          
                          {version.penaltyClause && (
                            <div className="bg-red-50 border-l-4 border-red-500 rounded p-3">
                              <p className="text-xs font-medium text-red-900 mb-1">Penalty Clause</p>
                              <p className="text-sm text-red-800">{version.penaltyClause}</p>
                            </div>
                          )}
                          
                          {version.insuranceRequirements && (
                            <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-3">
                              <p className="text-xs font-medium text-blue-900 mb-1">Insurance Requirements</p>
                              <p className="text-sm text-blue-800 whitespace-pre-line">
                                {typeof version.insuranceRequirements === 'string' 
                                  ? version.insuranceRequirements 
                                  : JSON.stringify(version.insuranceRequirements, null, 2)}
                              </p>
                            </div>
                          )}
                          
                          {(version.performanceBond || version.retentionAmount) && (
                            <div className="grid grid-cols-2 gap-3">
                              {version.performanceBond && (
                                <div>
                                  <p className="text-xs text-gray-500 font-medium mb-1">Performance Bond</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {formatCurrency(version.performanceBond, version.currency)}
                                  </p>
                                </div>
                              )}
                              {version.retentionAmount && (
                                <div>
                                  <p className="text-xs text-gray-500 font-medium mb-1">Retention Amount</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {formatCurrency(version.retentionAmount, version.currency)}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                {/* Version Comparison Indicator */}
                {/* {index < historyItems.length - 1 && (
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <button
                      onClick={() => {
                        // Future: show diff between versions
                        alert('Version comparison feature coming soon');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Compare with Version {historyItems[index + 1].version.versionNumber} →
                    </button>
                  </div>
                )} */}
              </div>
            );
            })}
          </div>
        )}

        {/* Timeline Indicator */}
       {/*  {historyItems.length > 1 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Version Timeline</h3>
            <div className="flex items-center space-x-2">
              {historyItems.slice().reverse().map((item, idx) => (
                <div key={item.version.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      item.isLatestVersion
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {item.version.versionNumber}
                  </div>
                  {idx < historyItems.length - 1 && (
                    <div className="w-12 h-0.5 bg-gray-300"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* Back Button at Bottom */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contract
          </button>
        </div>
      </div>
    </div>
  );
}
