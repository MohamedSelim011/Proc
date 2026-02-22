'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, FileText, Loader2, X } from 'lucide-react';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';
import { useToast } from '@/components/ui/toast';

type MaterialRequest = {
  _id: string;
  quantity: number;
  description?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  budget_id?: {
    _id: string;
    department_id?: {
      _id: string;
      name?: string;
    };
    fiscal_year?: number;
    quarter?: number;
    total_amount?: number;
  };
  category?: {
    _id: string;
    name?: string;
    price_limit?: number;
  };
  requested_by?: {
    _id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
};

type ApiResponse = {
  success: boolean;
  data: MaterialRequest[];
};

export default function RequestsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    department: '',
  });

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/hr/material-requests', { cache: 'no-store' });
        const payload = (await response.json()) as ApiResponse | { error: string };

        if (!response.ok) {
          setError((payload as { error: string }).error || 'Failed to load requests');
          setRows([]);
          return;
        }

        const typed = payload as ApiResponse;
        setRows(Array.isArray(typed.data) ? typed.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requests');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchRequests();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const requesterName = `${row.requested_by?.first_name || ''} ${row.requested_by?.last_name || ''}`.trim();
      const departmentName = row.budget_id?.department_id?.name || '';
      const categoryName = row.category?.name || '';
      const status = row.status || '';

      const searchMatch =
        !filters.search.trim() ||
        row._id.toLowerCase().includes(filters.search.toLowerCase()) ||
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

  const handlePendingAction = (action: 'approve' | 'reject', recordId: string) => {
    showToast('info', `${action.toUpperCase()} API for request ${recordId} will be connected next.`);
  };

  return (
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
                  const requesterName = `${row.requested_by?.first_name || ''} ${row.requested_by?.last_name || ''}`.trim() || row.requested_by?.email || 'N/A';
                  return (
                    <tr key={row._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{row._id}</div>
                        <div className="text-xs text-gray-500">{new Date(row.created_at).toLocaleDateString('en-OM')}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{requesterName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.budget_id?.department_id?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.category?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePendingAction('approve', row._id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-green-200 text-green-700 hover:bg-green-50"
                                aria-label="Approve request"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePendingAction('reject', row._id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50"
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
  );
}
