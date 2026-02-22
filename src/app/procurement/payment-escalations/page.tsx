'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Eye, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';

type PaymentEscalation = {
  id: string;
  externalId: string;
  title: string | null;
  status: string;
  priority: string | null;
  reason: string | null;
  amount: string | number | null;
  currency: string | null;
  requestedBy: string | null;
  dueDate: string | null;
  externalUpdatedAt: string | null;
  updatedAt: string;
};

export default function PaymentEscalationsPage() {
  const [rows, setRows] = useState<PaymentEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ search: '', status: '' });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filters.search.trim()) params.set('search', filters.search.trim());
        if (filters.status) params.set('status', filters.status);

        const response = await apiFetch(`/api/payment-escalations?${params.toString()}`, { cache: 'no-store' });
        const payload = (await response.json()) as { success?: boolean; data?: PaymentEscalation[]; error?: string };

        if (!response.ok) {
          setError(payload.error || 'Failed to load payment escalations');
          setRows([]);
          return;
        }

        setRows(Array.isArray(payload.data) ? payload.data : []);

        // Background sync from external API into DB
        void apiFetch('/api/payment-escalations/sync', { method: 'POST' })
          .then(async (syncResponse) => {
            if (!syncResponse.ok) return;
            const refetch = await apiFetch(`/api/payment-escalations?${params.toString()}`, { cache: 'no-store' });
            if (!refetch.ok) return;
            const refetched = (await refetch.json()) as { data?: PaymentEscalation[] };
            setRows(Array.isArray(refetched.data) ? refetched.data : []);
          })
          .catch(() => {
            // keep current list if sync fails
          });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment escalations');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [filters.search, filters.status]);

  const filteredRows = useMemo(() => rows, [rows]);

  const statusClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('resolved') || normalized.includes('closed')) return 'bg-green-100 text-green-800';
    if (normalized.includes('pending') || normalized.includes('open')) return 'bg-wujha-primary/10 text-wujha-primary';
    if (normalized.includes('rejected') || normalized.includes('failed')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-700';
  };

  const priorityClass = (priority?: string | null) => {
    const normalized = (priority || '').toLowerCase();
    if (normalized === 'critical' || normalized === 'urgent') return 'bg-red-100 text-red-800';
    if (normalized === 'high') return 'bg-orange-100 text-orange-800';
    if (normalized === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Escalations</h1>
          <p className="mt-2 text-sm text-gray-700">Fetched from internal DB with background sync to external source</p>
        </div>
      </div>

      <ListFiltersCard onClear={() => setFilters({ search: '', status: '' })} columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListFilterField label="Search">
          <input
            className="erp-input"
            placeholder="External ID, title, requester..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </ListFilterField>
        <ListFilterField label="Status">
          <select
            className="erp-input"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </ListFilterField>
      </ListFiltersCard>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Escalation</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="mb-3 h-8 w-8 animate-spin text-wujha-primary" />
                      Loading payment escalations...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-red-600">{error}</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">No payment escalations found.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{row.externalId}</div>
                      <div className="text-xs text-gray-500">{row.title || 'Untitled escalation'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.requestedBy || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priorityClass(row.priority)}`}>
                        {row.priority || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {row.amount ? `${row.amount} ${row.currency || ''}`.trim() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/procurement/payment-escalations/${row.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-wujha-primary hover:border-wujha-primary hover:bg-wujha-primary/5"
                          aria-label="View escalation"
                          title="View"
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
        <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-700">
          Showing {filteredRows.length} escalations
        </div>
      </div>
    </div>
  );
}
