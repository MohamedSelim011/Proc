'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Eye, FileText, Loader2, X } from 'lucide-react';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/apiFetch';
import { getUserData } from '@/lib/jwt';

type MaterialRequest = {
  id: string;
  externalId: string;
  quantity: number | null;
  description?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  departmentName?: string | null;
  categoryName?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
};

type ApiResponse = {
  success: boolean;
  data: MaterialRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function RequestsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; row: MaterialRequest | null }>({ open: false, row: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    department: '',
  });

  const approverExternalId = useMemo(() => {
    const user = typeof window !== 'undefined' ? getUserData() : null;
    if (!user) return '';
    return user.employeeId || user.id || '';
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.status) params.set('status', filters.status);
      if (filters.department.trim()) params.set('department', filters.department.trim());

      const response = await apiFetch(`/api/hr/material-requests?${params.toString()}`, { cache: 'no-store' });
      const payload = (await response.json()) as ApiResponse | { error: string };

      if (!response.ok) {
        setError((payload as { error: string }).error || 'Failed to load requests');
        setRows([]);
        return;
      }

      const typed = payload as ApiResponse;
      setRows(Array.isArray(typed.data) ? typed.data : []);

      // Background sync from external API into DB, then refresh list.
      void apiFetch('/api/hr/material-requests/sync', { method: 'POST' })
        .then(async (syncResponse) => {
          if (!syncResponse.ok) return;
          const refetch = await apiFetch(`/api/hr/material-requests?${params.toString()}`, { cache: 'no-store' });
          if (!refetch.ok) return;
          const refetchedPayload = (await refetch.json()) as ApiResponse;
          setRows(Array.isArray(refetchedPayload.data) ? refetchedPayload.data : []);
        })
        .catch(() => {
          // keep current list if sync fails
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.department, filters.search, filters.status]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const requesterName = row.requesterName || row.requesterEmail || '';
      const departmentName = row.departmentName || '';
      const categoryName = row.categoryName || '';
      const status = row.status || '';

      const searchMatch =
        !filters.search.trim() ||
        row.externalId.toLowerCase().includes(filters.search.toLowerCase()) ||
        requesterName.toLowerCase().includes(filters.search.toLowerCase()) ||
        categoryName.toLowerCase().includes(filters.search.toLowerCase());

      const statusMatch = !filters.status || status.toLowerCase() === filters.status.toLowerCase();
      const departmentMatch =
        !filters.department.trim() || departmentName.toLowerCase().includes(filters.department.toLowerCase());

      return searchMatch && statusMatch && departmentMatch;
    });
  }, [filters, rows]);

  const clearAll = () => {
    setFilters({ search: '', status: '', department: '' });
  };

  const statusClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'approved') return 'bg-green-100 text-green-800';
    if (normalized === 'pending') return 'bg-wujha-primary/10 text-wujha-primary';
    if (normalized === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-700';
  };

  const submitStatusUpdate = async (row: MaterialRequest, status: 'approved' | 'rejected', reason?: string) => {
    const normalizedApprover = approverExternalId?.trim();
    if (!normalizedApprover) {
      showToast('error', 'Unable to identify current user. Please sign in again.');
      return;
    }

    setActionLoadingId(row.id);
    try {
      const response = await apiFetch(`/api/hr/material-requests/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          approved_by_external: normalizedApprover,
          ...(status === 'rejected' ? { rejection_reason: reason?.trim() || '' } : {}),
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string; data?: MaterialRequest };
      if (!response.ok || !payload.success || !payload.data) {
        showToast('error', payload.error || 'Failed to update request status');
        return;
      }

      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...payload.data } : item)));
      showToast('success', `Request ${row.externalId} ${status} successfully.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update request status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (row: MaterialRequest) => {
    setRejectionReason('');
    setRejectModal({ open: true, row });
  };

  const closeRejectModal = () => {
    setRejectModal({ open: false, row: null });
    setRejectionReason('');
  };

  return (
    <>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
            <p className="mt-2 text-sm text-gray-700">Material requests synced from HR system</p>
          </div>
        </div>

        <ListFiltersCard
          onClear={clearAll}
          className="mb-6"
          columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <ListFilterField label="Search">
            <input
              className="erp-input"
              placeholder="ID, requester, category..."
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
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </ListFilterField>
          <ListFilterField label="Department">
            <input
              className="erp-input"
              placeholder="Department name..."
              value={filters.department}
              onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
            />
          </ListFilterField>
        </ListFiltersCard>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Request</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Requester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="mb-3 h-8 w-8 animate-spin text-wujha-primary" />
                        Loading requests...
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-red-600">{error}</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600">No requests found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isPending = (row.status || '').toLowerCase() === 'pending';
                    const requesterName = row.requesterName || row.requesterEmail || 'N/A';
                    const isBusy = actionLoadingId === row.id;
                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{row.externalId}</div>
                          <div className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleDateString('en-OM')}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{requesterName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.departmentName || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.categoryName || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.quantity ?? '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/procurement/requests/${row.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-wujha-primary hover:border-wujha-primary hover:bg-wujha-primary/5"
                              aria-label="View request"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void submitStatusUpdate(row, 'approved')}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50"
                                  aria-label="Approve request"
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => openRejectModal(row)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  aria-label="Reject request"
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">No actions</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-700">
            Showing {filteredRows.length} of {rows.length} requests
          </div>
        </div>
      </div>

      {rejectModal.open && rejectModal.row ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Reject Material Request</h3>
            <p className="mt-1 text-sm text-gray-600">
              Request: <span className="font-medium">{rejectModal.row.externalId}</span>
            </p>
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full min-h-[110px] resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-wujha-primary focus:outline-none focus:ring-2 focus:ring-wujha-primary"
                placeholder="Enter rejection reason"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim() || actionLoadingId === rejectModal.row.id}
                onClick={async () => {
                  if (!rejectModal.row) return;
                  await submitStatusUpdate(rejectModal.row, 'rejected', rejectionReason);
                  closeRejectModal();
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
