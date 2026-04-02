'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Loader2, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';

type UomItem = {
  id: string;
  externalId: string | null;
  code: string;
  name: string;
  abbreviation: string;
  type: 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'AREA' | 'COUNT' | 'TIME';
  isActive: boolean;
  externalUpdatedAt: string | null;
  updatedAt: string;
};

export default function UomListPage() {
  const [rows, setRows] = useState<UomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [integrationMiddlewareConfigured, setIntegrationMiddlewareConfigured] = useState<boolean | null>(null);
  const [uomIntegrationEnabled, setUomIntegrationEnabled] = useState<boolean | null>(null);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });
  const initialSyncTriggeredRef = useRef(false);

  const loadFlags = useCallback(async () => {
    try {
      const response = await apiFetch('/api/system/integration-flags', { cache: 'no-store' });
      const payload = (await response.json()) as {
        data?: {
          integrationMiddlewareConfigured?: boolean;
          uomIntegrationEnabled?: boolean;
        };
      };
      setIntegrationMiddlewareConfigured(Boolean(payload?.data?.integrationMiddlewareConfigured));
      setUomIntegrationEnabled(Boolean(payload?.data?.uomIntegrationEnabled));
    } catch {
      setIntegrationMiddlewareConfigured(false);
      setUomIntegrationEnabled(false);
    }
  }, []);

  const fetchRows = useCallback(async (options?: { showLoader?: boolean }) => {
    if (uomIntegrationEnabled === null) return;
    const showLoader = options?.showLoader ?? true;

    try {
      if (showLoader) setLoading(true);
      setError(null);
      const sp = new URLSearchParams();
      if (filters.search.trim()) sp.set('search', filters.search.trim());
      if (filters.type.trim()) sp.set('type', filters.type.trim());
      if (filters.status.trim()) sp.set('status', filters.status.trim());

      const response = await apiFetch(`/api/organization/uom?${sp.toString()}`, { cache: 'no-store' });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        items?: UomItem[];
      };
      if (!response.ok || payload.success === false) {
        setError(payload.error || 'Failed to load units of measure');
        setRows([]);
        return;
      }

      setRows(Array.isArray(payload.items) ? payload.items : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load units of measure');
      setRows([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [filters.search, filters.status, filters.type, uomIntegrationEnabled]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  useEffect(() => {
    if (uomIntegrationEnabled === null) return;
    void fetchRows();
  }, [fetchRows, uomIntegrationEnabled]);

  useEffect(() => {
    if (uomIntegrationEnabled !== true) {
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
        const syncResponse = await apiFetch('/api/organization/uom/sync', { method: 'POST' });
        const syncPayload = (await syncResponse.json().catch(() => ({}))) as {
          success?: boolean;
          warning?: string;
          upstreamErrors?: string[];
          skipped?: boolean;
        };

        if (!syncResponse.ok || syncPayload.success === false) {
          console.warn('[UOM][UI] Sync warning', {
            status: syncResponse.status,
            warning: syncPayload.warning,
            upstreamErrors: syncPayload.upstreamErrors,
          });
          return;
        }

        if (!syncPayload.skipped && !cancelled) {
          await fetchRows({ showLoader: false });
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };

    void runInitialSync();

    return () => {
      cancelled = true;
    };
  }, [fetchRows, uomIntegrationEnabled]);

  const showingText = useMemo(() => {
    if (!rows.length) return 'Showing 0 units';
    return `Showing ${rows.length} units`;
  }, [rows.length]);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units Of Measurement</h1>
          <p className="mt-1 text-sm text-gray-600">
            {uomIntegrationEnabled === null
              ? 'Loading integration settings...'
              : uomIntegrationEnabled
                ? 'Synced units of measure from Inventory system'
                : 'Internal units of measure managed in Procurement'}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 sm:mt-0">
          {uomIntegrationEnabled === false ? (
            <Link
              href="/procurement/organization/uom/new"
              className="inline-flex items-center rounded-md bg-wujha-primary px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              New UOM
            </Link>
          ) : null}
          {syncing ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
          {uomIntegrationEnabled === true && integrationMiddlewareConfigured === false ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Integration middleware URL not configured
            </span>
          ) : null}
        </div>
      </div>

      <ListFiltersCard onClear={() => setFilters({ search: '', type: '', status: '' })}>
        <ListFilterField label="Search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="erp-input pl-9"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Code, name, abbreviation, external ID..."
            />
          </div>
        </ListFilterField>
        <ListFilterField label="Type">
          <select
            className="erp-input"
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value="">All types</option>
            <option value="WEIGHT">WEIGHT</option>
            <option value="VOLUME">VOLUME</option>
            <option value="LENGTH">LENGTH</option>
            <option value="AREA">AREA</option>
            <option value="COUNT">COUNT</option>
            <option value="TIME">TIME</option>
          </select>
        </ListFilterField>
        <ListFilterField label="Status">
          <select
            className="erp-input"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </ListFilterField>
      </ListFiltersCard>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Abbreviation</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">External ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Updated</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="mb-3 h-8 w-8 animate-spin text-wujha-primary" />
                    <p>Loading units of measure...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-red-600">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                  No units of measure found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.abbreviation}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.externalId || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        row.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {row.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(row.updatedAt).toLocaleDateString('en-OM')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/procurement/organization/uom/${row.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-wujha-primary hover:bg-wujha-primary/5"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {uomIntegrationEnabled === false ? (
                        <Link
                          href={`/procurement/organization/uom/${row.id}/edit`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-amber-600 hover:bg-amber-50"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-700">{showingText}</div>
      </div>
    </div>
  );
}

