'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Truck,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import * as XLSX from 'xlsx';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';
import { apiFetch } from '@/lib/apiFetch';
import { SearchableSelect } from '@/components/common/searchable-select'

interface GoodsReceipt {
  id: string;
  grNumber: string;
  receivedDate: string;
  receivedBy: string;
  status:
    | 'DRAFT'
    | 'PENDING'
    | 'INSPECTING'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'PARTIAL'
    | 'PARTIALLY_ACCEPTED'
    | 'COMPLETED'
    | 'REJECTED';
  qualityChecked: boolean;
  qualityComments?: string;
  po?: {
    poNumber: string;
    vendor: {
      nameEn: string;
      email: string;
    };
  };
  rawPayload?: Record<string, unknown>;
  items: Array<{
    id: string;
    orderedQuantity: number;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    item: {
      itemCode: string;
      nameEn: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function GoodsReceiptsPage() {
  const { showToast } = useToast();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [integrationMiddlewareConfigured, setIntegrationMiddlewareConfigured] = useState<boolean | null>(null);
  const [goodsReceiptsIntegrationEnabled, setGoodsReceiptsIntegrationEnabled] = useState<boolean | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const initialSyncTriggeredRef = useRef(false);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    poNumber: '',
    search: ''
  });

  const loadFlags = useCallback(async () => {
    try {
      const response = await apiFetch('/api/system/integration-flags', { cache: 'no-store' });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: {
          integrationMiddlewareConfigured?: boolean;
          goodsReceiptsIntegrationEnabled?: boolean;
        };
      };
      setIntegrationMiddlewareConfigured(Boolean(payload?.data?.integrationMiddlewareConfigured));
      setGoodsReceiptsIntegrationEnabled(Boolean(payload?.data?.goodsReceiptsIntegrationEnabled));
      console.log('[Goods Receipts][UI] integration flags', {
        integrationMiddlewareConfigured: Boolean(payload?.data?.integrationMiddlewareConfigured),
        goodsReceiptsIntegrationEnabled: Boolean(payload?.data?.goodsReceiptsIntegrationEnabled),
      });
    } catch {
      setIntegrationMiddlewareConfigured(false);
      setGoodsReceiptsIntegrationEnabled(false);
      console.error('[Goods Receipts][UI] Failed to load integration flags');
    }
  }, []);

  const fetchReceipts = useCallback(async (options?: { showLoader?: boolean }) => {
    if (goodsReceiptsIntegrationEnabled === null) {
      return;
    }

    const showLoader = options?.showLoader ?? true;
    try {
      if (showLoader) {
        setLoading(true);
      }
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.poNumber && { poNumber: filters.poNumber }),
        ...(filters.search && { search: filters.search })
      });

      const response = await apiFetch(`/api/goods-receipts?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();

      if (response.ok) {
        setReceipts(data.receipts || []);
        setPagination(data.pagination);
        console.log('[Goods Receipts][UI] list loaded', {
          count: Array.isArray(data.receipts) ? data.receipts.length : 0,
          total: data?.pagination?.total ?? 0,
          page: data?.pagination?.page ?? pagination.page,
          limit: data?.pagination?.limit ?? pagination.limit,
        });
      } else {
        console.error('Error fetching goods receipts:', data.error);
        showToast('error', data?.error || 'Failed to load goods receipts');
      }
    } catch (error) {
      console.error('Error fetching goods receipts:', error);
      showToast('error', 'Failed to load goods receipts');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [filters.poNumber, filters.search, filters.status, goodsReceiptsIntegrationEnabled, pagination.limit, pagination.page, showToast]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  useEffect(() => {
    if (goodsReceiptsIntegrationEnabled === null) return;
    void fetchReceipts();
  }, [fetchReceipts, goodsReceiptsIntegrationEnabled]);

  useEffect(() => {
    if (goodsReceiptsIntegrationEnabled !== true) {
      initialSyncTriggeredRef.current = false;
      setSyncing(false);
      return;
    }

    if (initialSyncTriggeredRef.current) return;
    initialSyncTriggeredRef.current = true;

    let cancelled = false;
    const runInitialSync = async () => {
      setSyncing(true);
      try {
        const syncResponse = await apiFetch('/api/goods-receipts/sync', {
          method: 'POST',
        });
        const syncPayload = (await syncResponse.json().catch(() => ({}))) as {
          success?: boolean;
          skipped?: boolean;
          warning?: string;
          upstreamErrors?: string[];
          synced?: number;
          failedRecords?: number;
          missingLocalPo?: number;
          retrievedFromIntegration?: number;
          totalLocalRows?: number;
        };

        console.log('[Goods Receipts][UI] sync response', {
          httpStatus: syncResponse.status,
          ...syncPayload,
        });

        if (!syncResponse.ok || syncPayload.success === false) {
          console.warn('[Goods Receipts][UI] Sync warning', {
            status: syncResponse.status,
            warning: syncPayload.warning,
            upstreamErrors: syncPayload.upstreamErrors,
          });
          showToast(
            'error',
            syncPayload.warning ||
              syncPayload.upstreamErrors?.[0] ||
              'Goods receipts sync failed. Please check integration middleware/inventory API.',
          );
          return;
        }

        if (syncPayload.skipped) {
          showToast(
            'error',
            syncPayload.warning ||
              syncPayload.upstreamErrors?.[0] ||
              'Goods receipts sync skipped due upstream failure.',
          );
          return;
        }

        showToast(
          'success',
          `Goods Receipts sync finished. Retrieved ${syncPayload.retrievedFromIntegration ?? 0}, synced ${syncPayload.synced ?? 0}, failed ${syncPayload.failedRecords ?? 0}.`,
        );

        if ((syncPayload.missingLocalPo ?? 0) > 0) {
          showToast(
            'warning',
            `${syncPayload.missingLocalPo} record(s) were missing local PO mapping and were linked without PO.`,
          );
        }

        if (!cancelled) {
          await fetchReceipts({ showLoader: false });
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    };

    void runInitialSync();

    return () => {
      cancelled = true;
    };
  }, [fetchReceipts, goodsReceiptsIntegrationEnabled, showToast]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PARTIALLY_ACCEPTED':
      case 'PARTIAL':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PARTIALLY_ACCEPTED':
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateReceiptStats = (receipt: GoodsReceipt) => {
    const totalOrdered = receipt.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
    const totalReceived = receipt.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
    const totalAccepted = receipt.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
    const totalRejected = receipt.items.reduce((sum, item) => sum + item.rejectedQuantity, 0);

    return {
      totalOrdered,
      totalReceived,
      totalAccepted,
      totalRejected,
      receiptPercentage: totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0,
      acceptancePercentage: totalOrdered > 0 ? (totalAccepted / totalOrdered) * 100 : 0
    };
  };

  const handleExport = async () => {
    try {
      showToast('info', 'Preparing export...');
      
      // Build query params with current filters
      const params = new URLSearchParams({
        export: 'true',
        ...(filters.status && { status: filters.status }),
        ...(filters.poNumber && { poNumber: filters.poNumber }),
        ...(filters.search && { search: filters.search })
      });

      const response = await apiFetch(`/api/goods-receipts?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        showToast('error', 'Failed to export goods receipts');
        return;
      }

      // Prepare data for Excel
      const exportData = data.receipts.map((gr: GoodsReceipt) => {
        const stats = calculateReceiptStats(gr);
        return {
          'GR Number': gr.grNumber,
          'Received Date': formatDate(gr.receivedDate),
          'Received By': gr.receivedBy,
          'PO Number': gr.po?.poNumber || 'WITHOUT PO',
          'Vendor Name': gr.po?.vendor?.nameEn || gr.rawPayload?.supplier?.name || 'N/A',
          'Vendor Email': gr.po?.vendor?.email || 'N/A',
          'Status': gr.status,
          'Quality Checked': gr.qualityChecked ? 'Yes' : 'No',
          'Quality Comments': gr.qualityComments || 'N/A',
          'Total Ordered': stats.totalOrdered,
          'Total Received': stats.totalReceived,
          'Total Accepted': stats.totalAccepted,
          'Total Rejected': stats.totalRejected,
          'Receipt Percentage': `${stats.receiptPercentage.toFixed(2)}%`,
          'Acceptance Percentage': `${stats.acceptancePercentage.toFixed(2)}%`,
          'Number of Items': gr.items?.length || 0,
          'Created At': formatDate(gr.createdAt),
          'Updated At': formatDate(gr.updatedAt)
        };
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Goods Receipts');

      // Set column widths
      const colWidths = [
        { wch: 15 }, // GR Number
        { wch: 18 }, // Received Date
        { wch: 15 }, // Received By
        { wch: 15 }, // PO Number
        { wch: 20 }, // Vendor Name
        { wch: 25 }, // Vendor Email
        { wch: 12 }, // Status
        { wch: 15 }, // Quality Checked
        { wch: 30 }, // Quality Comments
        { wch: 15 }, // Total Ordered
        { wch: 15 }, // Total Received
        { wch: 15 }, // Total Accepted
        { wch: 15 }, // Total Rejected
        { wch: 18 }, // Receipt Percentage
        { wch: 20 }, // Acceptance Percentage
        { wch: 15 }, // Number of Items
        { wch: 18 }, // Created At
        { wch: 18 }  // Updated At
      ];
      ws['!cols'] = colWidths;

      // Generate filename with timestamp
      const filename = `Goods_Receipts_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      showToast('success', `Exported ${data.total} goods receipts successfully`);
    } catch (error) {
      console.error('Error exporting goods receipts:', error);
      showToast('error', 'Failed to export goods receipts');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Receipts</h1>
          <p className="mt-2 text-sm text-gray-700">
            {goodsReceiptsIntegrationEnabled === null
              ? 'Loading integration settings...'
              : goodsReceiptsIntegrationEnabled
              ? 'Synced goods receipts from Inventory system'
              : 'Internal goods receipts managed in Procurement'}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 sm:ml-16 sm:mt-0 sm:flex-none">
          {goodsReceiptsIntegrationEnabled === false ? (
            <Link
              href="/procurement/receipts/new"
              className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Goods Receipt
            </Link>
          ) : null}
          {syncing ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
          {goodsReceiptsIntegrationEnabled === true && integrationMiddlewareConfigured === false ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Integration middleware URL not configured
            </span>
          ) : null}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Receipts</dt>
                  <dd className="text-lg font-medium text-gray-900">{pagination.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {receipts.filter(r => r.status === 'PENDING').length}
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
                <Truck className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Partial</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {
                      receipts.filter(
                        (r) => r.status === 'PARTIALLY_ACCEPTED' || r.status === 'PARTIAL',
                      ).length
                    }
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
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {receipts.filter(r => r.status === 'COMPLETED').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ListFiltersCard
        onClear={() => setFilters({ search: '', status: '', poNumber: '' })}
        className="mb-6"
        columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <ListFilterField label="Search">
          <input
            type="text"
            placeholder="Search by GR number..."
            className="erp-input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </ListFilterField>
        <ListFilterField label="Status">
          <SearchableSelect
            className="erp-input"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_ACCEPTED">Partial</option>
            <option value="PARTIAL">Partial (Legacy)</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </SearchableSelect>
        </ListFilterField>
        <ListFilterField label="PO Number">
          <input
            type="text"
            placeholder="PO Number"
            className="erp-input"
            value={filters.poNumber}
            onChange={(e) => handleFilterChange('poNumber', e.target.value)}
          />
        </ListFilterField>
      </ListFiltersCard>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Goods Receipts ({pagination.total})
            </h3>
            <button 
              onClick={handleExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GRN Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Check
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receipts.map((gr) => {
                  const stats = calculateReceiptStats(gr);
                  return (
                    <tr key={gr.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(gr.status)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {gr.grNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(gr.receivedDate)}
                            </div>
                            <div className="text-xs text-gray-400">
                              By: {gr.receivedBy}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {gr.po?.poNumber || 'WITHOUT PO'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {gr.items.length} item{gr.items.length > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {gr.po?.vendor?.nameEn || gr.rawPayload?.supplier?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{gr.po?.vendor?.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Received: {stats.totalReceived}/{stats.totalOrdered}
                        </div>
                        <div className="text-sm text-gray-500">
                          Accepted: {stats.totalAccepted}
                        </div>
                        {stats.totalRejected > 0 && (
                          <div className="text-sm text-red-600">
                            Rejected: {stats.totalRejected}
                          </div>
                        )}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-wujha-primary h-2 rounded-full" 
                            style={{ width: `${Math.min(stats.receiptPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(gr.status)}`}>
                          {gr.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {gr.qualityChecked ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                          )}
                          <span className="text-sm text-gray-900">
                            {gr.qualityChecked ? 'Checked' : 'Pending'}
                          </span>
                        </div>
                        {gr.qualityComments && (
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-32">
                            {gr.qualityComments}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/procurement/receipts/${gr.id}`}
                            className="text-wujha-primary hover:text-wujha-primary-hover"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {(gr.status === 'PENDING' ||
                            gr.status === 'PARTIALLY_ACCEPTED' ||
                            gr.status === 'PARTIAL') &&
                          goodsReceiptsIntegrationEnabled === false && (
                            <Link
                              href={`/procurement/receipts/${gr.id}/edit`}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-wujha-primary/10 border-wujha-primary text-wujha-primary'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
