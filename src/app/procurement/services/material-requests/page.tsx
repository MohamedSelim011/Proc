'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';
import { apiFetch } from '@/lib/apiFetch';

type InventoryMaterialRequisition = {
  id: string;
  externalId: string;
  requisitionNumber?: string | null;
  status: string;
  priority?: string | null;
  projectName?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requiredDate?: string | null;
  externalUpdatedAt?: string | null;
};

type ApiResponse = {
  success: boolean;
  data: InventoryMaterialRequisition[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function MaterialRequestsPage() {
  const [rows, setRows] = useState<InventoryMaterialRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [inventoryBaseUrlConfigured, setInventoryBaseUrlConfigured] = useState<boolean | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    project: '',
  });

  const loadFlags = useCallback(async () => {
    try {
      const response = await apiFetch('/api/system/integration-flags', { cache: 'no-store' });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: { inventoryBaseUrlConfigured?: boolean };
      };
      setInventoryBaseUrlConfigured(Boolean(payload?.data?.inventoryBaseUrlConfigured));
    } catch {
      setInventoryBaseUrlConfigured(false);
    }
  }, []);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.status.trim()) params.set('status', filters.status.trim());
      if (filters.project.trim()) params.set('project', filters.project.trim());

      const response = await apiFetch(`/api/inventory/material-requisitions?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = (await response.json()) as ApiResponse | { error: string };

      if (!response.ok) {
        setError((data as { error: string }).error || 'Failed to fetch material requisitions');
        setRows([]);
        return;
      }

      const typed = data as ApiResponse;
      setRows(Array.isArray(typed.data) ? typed.data : []);

      setSyncing(true);
      void apiFetch('/api/inventory/material-requisitions/sync', { method: 'POST' })
        .then(async (syncResponse) => {
          const syncPayload = (await syncResponse.json().catch(() => ({}))) as {
            success?: boolean;
            warning?: string;
            upstreamErrors?: string[];
          };
          if (!syncResponse.ok || syncPayload.success === false) {
            console.warn('[Material Requisitions][UI] Sync warning', {
              status: syncResponse.status,
              warning: syncPayload.warning,
              upstreamErrors: syncPayload.upstreamErrors,
            });
            return;
          }
          const refetch = await apiFetch(`/api/inventory/material-requisitions?${params.toString()}`, {
            cache: 'no-store',
          });
          if (!refetch.ok) return;
          const refetchedPayload = (await refetch.json()) as ApiResponse;
          setRows(Array.isArray(refetchedPayload.data) ? refetchedPayload.data : []);
        })
        .finally(() => setSyncing(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch material requisitions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters.project, filters.search, filters.status]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const clearAll = () => {
    setFilters({ search: '', status: '', project: '' });
  };

  const statusClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('approved') || normalized.includes('fulfilled') || normalized.includes('fullfilled')) {
      return 'bg-green-100 text-green-800';
    }
    if (normalized.includes('pending') || normalized.includes('draft')) {
      return 'bg-wujha-primary/10 text-wujha-primary';
    }
    if (normalized.includes('reject') || normalized.includes('cancel')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const showingText = useMemo(() => {
    if (rows.length === 0) return 'Showing 0 results';
    return `Showing ${rows.length} material requisitions`;
  }, [rows.length]);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material Requisitions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Synced material requisitions from Inventory system
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 sm:ml-16 sm:mt-0 sm:flex-none">
          {syncing ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
          {inventoryBaseUrlConfigured === false ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Inventory base URL not configured
            </span>
          ) : null}
        </div>
      </div>

      <ListFiltersCard
        onClear={clearAll}
        className="mb-6"
        columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <ListFilterField label="Search">
          <input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="erp-input"
            placeholder="MR number, requester, project..."
          />
        </ListFilterField>
        <ListFilterField label="Status">
          <input
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="erp-input"
            placeholder="pending, approved..."
          />
        </ListFilterField>
        <ListFilterField label="Project">
          <input
            value={filters.project}
            onChange={(e) => setFilters((prev) => ({ ...prev, project: e.target.value }))}
            className="erp-input"
            placeholder="Project name..."
          />
        </ListFilterField>
      </ListFiltersCard>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">MR</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Requester</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="mb-3 h-8 w-8 animate-spin text-wujha-primary" />
                      <p>Loading material requisitions...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-red-600">{error}</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">No material requisitions found.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">{row.requisitionNumber || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{row.externalId}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{row.requesterName || row.requesterEmail || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{row.projectName || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{row.priority || 'N/A'}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {row.externalUpdatedAt ? new Date(row.externalUpdatedAt).toLocaleString('en-OM') : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <Link
                          href={`/procurement/services/material-requests/${row.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-wujha-primary hover:border-wujha-primary hover:bg-wujha-primary/5"
                          aria-label={`View ${row.requisitionNumber || row.externalId}`}
                          title={`View ${row.requisitionNumber || row.externalId}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <p className="text-sm text-gray-700">{showingText}</p>
        </div>
      </div>
    </div>
  );
}
