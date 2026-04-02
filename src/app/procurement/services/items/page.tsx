'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Loader2, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';

type ProcurementItem = {
  id: string;
  externalId: string | null;
  itemCode: string;
  nameEn: string;
  nameAr: string | null;
  categoryId: string;
  unitOfMeasure: string;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  reorderPoint: number | null;
  updatedAt: string;
};

export default function ProcurementItemsPage() {
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [integrationMiddlewareConfigured, setIntegrationMiddlewareConfigured] =
    useState<boolean | null>(null);
  const [itemsIntegrationEnabled, setItemsIntegrationEnabled] = useState<boolean | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
  });
  const initialSyncTriggeredRef = useRef(false);

  const loadFlags = useCallback(async () => {
    try {
      const response = await apiFetch('/api/system/integration-flags', { cache: 'no-store' });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: {
          integrationMiddlewareConfigured?: boolean;
          itemsIntegrationEnabled?: boolean;
        };
      };
      setIntegrationMiddlewareConfigured(Boolean(payload?.data?.integrationMiddlewareConfigured));
      setItemsIntegrationEnabled(Boolean(payload?.data?.itemsIntegrationEnabled));
    } catch {
      setIntegrationMiddlewareConfigured(false);
      setItemsIntegrationEnabled(false);
    }
  }, []);

  const fetchRows = useCallback(async (options?: { showLoader?: boolean }) => {
    if (itemsIntegrationEnabled === null) {
      return;
    }

    const showLoader = options?.showLoader ?? true;
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);
      const sp = new URLSearchParams();
      if (filters.search.trim()) sp.set('search', filters.search.trim());
      if (filters.categoryId.trim()) sp.set('categoryId', filters.categoryId.trim());

      const response = await apiFetch(`/api/procurement-items?${sp.toString()}`, { cache: 'no-store' });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        items?: ProcurementItem[];
      };

      if (!response.ok || payload.success === false) {
        setError(payload.error || 'Failed to load items');
        setItems([]);
        return;
      }
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load items');
      setItems([]);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [filters.categoryId, filters.search, itemsIntegrationEnabled]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  useEffect(() => {
    if (itemsIntegrationEnabled === null) return;
    void fetchRows();
  }, [fetchRows, itemsIntegrationEnabled]);

  useEffect(() => {
    if (itemsIntegrationEnabled !== true) {
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
        const syncResponse = await apiFetch('/api/procurement-items/sync', {
          method: 'POST',
        });
        const syncPayload = (await syncResponse.json().catch(() => ({}))) as {
          success?: boolean;
          warning?: string;
          upstreamErrors?: string[];
          skipped?: boolean;
        };

        if (!syncResponse.ok || syncPayload.success === false) {
          console.warn('[Items][UI] Sync warning', {
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
        if (!cancelled) {
          setSyncing(false);
        }
      }
    };

    void runInitialSync();

    return () => {
      cancelled = true;
    };
  }, [fetchRows, itemsIntegrationEnabled]);

  const showingText = useMemo(() => {
    if (!items.length) return 'Showing 0 items';
    return `Showing ${items.length} items`;
  }, [items.length]);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items</h1>
          <p className="mt-1 text-sm text-gray-600">
            {itemsIntegrationEnabled === null
              ? 'Loading integration settings...'
              : itemsIntegrationEnabled
                ? 'Synced item master from Inventory system'
                : 'Internal item master managed in Procurement'}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 sm:mt-0">
          {itemsIntegrationEnabled === false ? (
            <Link
              href="/procurement/services/items/new"
              className="inline-flex items-center rounded-md bg-wujha-primary px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Item
            </Link>
          ) : null}
          {syncing ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
          {itemsIntegrationEnabled === true && integrationMiddlewareConfigured === false ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Integration middleware URL not configured
            </span>
          ) : null}
        </div>
      </div>

      <ListFiltersCard onClear={() => setFilters({ search: '', categoryId: '' })}>
        <ListFilterField label="Search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="erp-input pl-9"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Code, name, Arabic name, external ID..."
            />
          </div>
        </ListFilterField>
        <ListFilterField label="Category ID">
          <input
            className="erp-input"
            value={filters.categoryId}
            onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
            placeholder="Category id..."
          />
        </ListFilterField>
      </ListFiltersCard>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">External ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">UOM</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Reorder</th>
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
                    <p>Loading items...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-red-600">
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                  No items found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.itemCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div>{item.nameEn}</div>
                    {item.nameAr ? <div className="text-xs text-gray-500">{item.nameAr}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.externalId || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.categoryId}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.unitOfMeasure}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.reorderPoint ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(item.updatedAt).toLocaleDateString('en-OM')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/procurement/services/items/${item.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-wujha-primary hover:bg-wujha-primary/5"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {itemsIntegrationEnabled === false ? (
                        <Link
                          href={`/procurement/services/items/${item.id}/edit`}
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
