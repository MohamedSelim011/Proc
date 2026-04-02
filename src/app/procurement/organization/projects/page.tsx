'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Loader2, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';

type Project = {
  id: string;
  externalId: string | null;
  projectCode: string | null;
  projectName: string;
  status: string | null;
  projectManager: string | null;
  department: string | null;
  isActive: boolean;
  totalBudget: string | number | null;
  allocatedBudget: string | number | null;
  actualSpent: string | number | null;
  externalUpdatedAt: string | null;
  updatedAt: string;
};

const toNumber = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatAmount = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('en-OM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));

export default function ProjectsListPage() {
  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [integrationMiddlewareConfigured, setIntegrationMiddlewareConfigured] = useState<boolean | null>(null);
  const [projectsIntegrationEnabled, setProjectsIntegrationEnabled] = useState<boolean | null>(null);
  const [filters, setFilters] = useState({ search: '', status: '', department: '' });
  const initialSyncTriggeredRef = useRef(false);

  const loadFlags = useCallback(async () => {
    try {
      const response = await apiFetch('/api/system/integration-flags', { cache: 'no-store' });
      const payload = (await response.json()) as {
        data?: {
          integrationMiddlewareConfigured?: boolean;
          projectsIntegrationEnabled?: boolean;
        };
      };
      setIntegrationMiddlewareConfigured(Boolean(payload?.data?.integrationMiddlewareConfigured));
      setProjectsIntegrationEnabled(Boolean(payload?.data?.projectsIntegrationEnabled));
    } catch {
      setIntegrationMiddlewareConfigured(false);
      setProjectsIntegrationEnabled(false);
    }
  }, []);

  const fetchRows = useCallback(async (options?: { showLoader?: boolean }) => {
    if (projectsIntegrationEnabled === null) return;

    const showLoader = options?.showLoader ?? true;
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const sp = new URLSearchParams();
      if (filters.search.trim()) sp.set('search', filters.search.trim());
      if (filters.status.trim()) sp.set('status', filters.status.trim());
      if (filters.department.trim()) sp.set('department', filters.department.trim());
      const response = await apiFetch(`/api/organization/projects?${sp.toString()}`, { cache: 'no-store' });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        items?: Project[];
      };
      if (!response.ok || payload.success === false) {
        setError(payload.error || 'Failed to load projects');
        setRows([]);
        return;
      }
      setRows(Array.isArray(payload.items) ? payload.items : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load projects');
      setRows([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [filters.department, filters.search, filters.status, projectsIntegrationEnabled]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  useEffect(() => {
    if (projectsIntegrationEnabled === null) return;
    void fetchRows();
  }, [fetchRows, projectsIntegrationEnabled]);

  useEffect(() => {
    if (projectsIntegrationEnabled !== true) {
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
        const syncResponse = await apiFetch('/api/organization/projects/sync', {
          method: 'POST',
        });
        const syncPayload = (await syncResponse.json().catch(() => ({}))) as {
          success?: boolean;
          warning?: string;
          upstreamErrors?: string[];
          skipped?: boolean;
        };

        if (!syncResponse.ok || syncPayload.success === false) {
          console.warn('[Projects][UI] Sync warning', {
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
  }, [fetchRows, projectsIntegrationEnabled]);

  const showingText = useMemo(() => {
    if (!rows.length) return 'Showing 0 projects';
    return `Showing ${rows.length} projects`;
  }, [rows.length]);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-600">
            {projectsIntegrationEnabled === null
              ? 'Loading integration settings...'
              : projectsIntegrationEnabled
                ? 'Synced projects from PMO system'
                : 'Internal project master data managed in Procurement'}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 sm:mt-0">
          {projectsIntegrationEnabled === false ? (
            <Link
              href="/procurement/organization/projects/new"
              className="inline-flex items-center rounded-md bg-wujha-primary px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          ) : null}
          {syncing ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
          {projectsIntegrationEnabled === true && integrationMiddlewareConfigured === false ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Integration middleware URL not configured
            </span>
          ) : null}
        </div>
      </div>

      <ListFiltersCard onClear={() => setFilters({ search: '', status: '', department: '' })}>
        <ListFilterField label="Search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="erp-input pl-9"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Project name, code, manager, external ID..."
            />
          </div>
        </ListFilterField>
        <ListFilterField label="Status">
          <input
            className="erp-input"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            placeholder="APPROVED, IN_PROGRESS..."
          />
        </ListFilterField>
        <ListFilterField label="Department">
          <input
            className="erp-input"
            value={filters.department}
            onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
            placeholder="Filter by department"
          />
        </ListFilterField>
      </ListFiltersCard>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Project</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Manager</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Budget</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Active</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">External ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">External Updated</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="mb-3 h-8 w-8 animate-spin text-wujha-primary" />
                    <p>Loading projects...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-red-600">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                  No projects found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="font-medium text-gray-900">{row.projectName}</div>
                    <div className="text-xs text-gray-500">{row.projectCode || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.projectManager || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.department || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.status || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div>Total: {formatAmount(row.totalBudget)}</div>
                    <div className="text-xs text-gray-500">
                      Alloc: {formatAmount(row.allocatedBudget)} | Spent: {formatAmount(row.actualSpent)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        row.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {row.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.externalId || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {row.externalUpdatedAt ? new Date(row.externalUpdatedAt).toLocaleString('en-OM') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/procurement/organization/projects/${row.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-wujha-primary hover:bg-wujha-primary/5"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {projectsIntegrationEnabled === false ? (
                        <Link
                          href={`/procurement/organization/projects/${row.id}/edit`}
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
