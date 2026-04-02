'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Loader2, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';
import { SearchableSelect } from '@/components/common/searchable-select'

type Department = {
  id: string;
  externalId: string | null;
  name: string;
  code: string | null;
  type: string | null;
  costCenterCode: string | null;
  isActive: boolean;
  updatedAt: string;
};

export default function DepartmentsListPage() {
  const [rows, setRows] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [integrationMiddlewareConfigured, setIntegrationMiddlewareConfigured] = useState<boolean | null>(null);
  const [departmentsIntegrationEnabled, setDepartmentsIntegrationEnabled] = useState<boolean | null>(null);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const initialSyncTriggeredRef = useRef(false);

  const loadFlags = useCallback(async () => {
    try {
      const response = await apiFetch('/api/system/integration-flags', { cache: 'no-store' });
      const payload = (await response.json()) as {
        data?: {
          integrationMiddlewareConfigured?: boolean;
          departmentsIntegrationEnabled?: boolean;
        };
      };
      setIntegrationMiddlewareConfigured(Boolean(payload?.data?.integrationMiddlewareConfigured));
      setDepartmentsIntegrationEnabled(Boolean(payload?.data?.departmentsIntegrationEnabled));
    } catch {
      setIntegrationMiddlewareConfigured(false);
      setDepartmentsIntegrationEnabled(false);
    }
  }, []);

  const fetchRows = useCallback(async (options?: { showLoader?: boolean }) => {
    if (departmentsIntegrationEnabled === null) return;

    const showLoader = options?.showLoader ?? true;
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const sp = new URLSearchParams();
      if (filters.search.trim()) sp.set('search', filters.search.trim());
      if (filters.status) sp.set('status', filters.status);
      const response = await apiFetch(`/api/organization/departments?${sp.toString()}`, { cache: 'no-store' });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        items?: Department[];
      };
      if (!response.ok || payload.success === false) {
        setError(payload.error || 'Failed to load departments');
        setRows([]);
        return;
      }
      setRows(Array.isArray(payload.items) ? payload.items : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load departments');
      setRows([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [filters.search, filters.status, departmentsIntegrationEnabled]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  useEffect(() => {
    if (departmentsIntegrationEnabled === null) return;
    void fetchRows();
  }, [fetchRows, departmentsIntegrationEnabled]);

  useEffect(() => {
    if (departmentsIntegrationEnabled !== true) {
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
        const syncResponse = await apiFetch('/api/organization/departments/sync', {
          method: 'POST',
        });
        const syncPayload = (await syncResponse.json().catch(() => ({}))) as {
          success?: boolean;
          warning?: string;
          upstreamErrors?: string[];
          skipped?: boolean;
        };

        if (!syncResponse.ok || syncPayload.success === false) {
          console.warn('[Departments][UI] Sync warning', {
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
  }, [fetchRows, departmentsIntegrationEnabled]);

  const showingText = useMemo(() => {
    if (!rows.length) return 'Showing 0 departments';
    return `Showing ${rows.length} departments`;
  }, [rows.length]);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="mt-1 text-sm text-gray-600">
            {departmentsIntegrationEnabled === null
              ? 'Loading integration settings...'
              : departmentsIntegrationEnabled
                ? 'Synced departments from HR system'
                : 'Internal department master data managed in Procurement'}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 sm:mt-0">
          {departmentsIntegrationEnabled === false ? (
            <Link
              href="/procurement/organization/departments/new"
              className="inline-flex items-center rounded-md bg-wujha-primary px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Department
            </Link>
          ) : null}
          {syncing ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
          {departmentsIntegrationEnabled === true && integrationMiddlewareConfigured === false ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Integration middleware URL not configured
            </span>
          ) : null}
          </div>
      </div>

      <ListFiltersCard onClear={() => setFilters({ search: '', status: '' })}>
        <ListFilterField label="Search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="erp-input pl-9"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Department name, code, external ID..."
            />
          </div>
        </ListFilterField>
        <ListFilterField label="Status">
          <SearchableSelect
            className="erp-input"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SearchableSelect>
        </ListFilterField>
      </ListFiltersCard>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Cost Center</th>
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
                    <p>Loading departments...</p>
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
                  No departments found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.code || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.type || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.costCenterCode || '-'}</td>
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
                        href={`/procurement/organization/departments/${row.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-wujha-primary hover:bg-wujha-primary/5"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {departmentsIntegrationEnabled === false ? (
                        <Link
                          href={`/procurement/organization/departments/${row.id}/edit`}
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
