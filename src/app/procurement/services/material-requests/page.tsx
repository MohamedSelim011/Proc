'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';

type MaterialRequest = {
  id: string;
  prNumber: string;
  requestDate: string;
  requesterId?: string | null;
  departmentId: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'CANCELLED';
  estimatedCost: string;
  budgetCode: string;
  items: Array<{ id: string }>;
};

type ApiResponse = {
  requisitions: MaterialRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const STATUS_OPTIONS = ['DRAFT', 'PENDING_APPROVAL', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED'];

export default function MaterialRequestsPage() {
  const [rows, setRows] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    departmentId: '',
  });

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.status) params.set('status', filters.status);
      if (filters.departmentId.trim()) params.set('departmentId', filters.departmentId.trim());

      const response = await fetch(`/api/purchase-requisitions?${params.toString()}`);
      const data = (await response.json()) as ApiResponse | { error: string };

      if (!response.ok) {
        setError((data as { error: string }).error || 'Failed to fetch material requests');
        setRows([]);
        return;
      }

      const typed = data as ApiResponse;
      setRows(typed.requisitions || []);
      setTotal(typed.pagination?.total || 0);
      setTotalPages(typed.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch material requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters, limit, page]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const clearAll = () => {
    setFilters({ search: '', status: '', departmentId: '' });
    setPage(1);
  };

  const statusClass = (status: MaterialRequest['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'SUBMITTED':
      case 'PENDING_APPROVAL':
        return 'bg-wujha-primary/10 text-wujha-primary';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'CONVERTED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const priorityClass = (priority: MaterialRequest['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const showingText = useMemo(() => {
    if (total === 0) return 'Showing 0 results';
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);
    return `Showing ${from}-${to} of ${total}`;
  }, [page, limit, total]);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Material Requisitions</h1>
          <p className="mt-2 text-sm text-gray-700">Manage and track material requisitions only</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/procurement/requisitions/new"
            className="inline-flex items-center justify-center rounded-md bg-wujha-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-wujha-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wujha-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Material Requisition
          </Link>
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
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setPage(1);
            }}
            className="erp-input"
            placeholder="PR number, requester, budget..."
          />
        </ListFilterField>
        <ListFilterField label="Status">
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, status: e.target.value }));
              setPage(1);
            }}
            className="erp-input"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </ListFilterField>
        <ListFilterField label="Department">
          <input
            value={filters.departmentId}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, departmentId: e.target.value }));
              setPage(1);
            }}
            className="erp-input"
            placeholder="Department ID"
          />
        </ListFilterField>
      </ListFiltersCard>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">PR</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Requester</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
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
                    <p className="text-sm text-gray-600">No material requests found.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{row.prNumber}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{row.requesterId || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{row.departmentId}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityClass(row.priority)}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">{Number(row.estimatedCost).toFixed(3)} OMR</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <Link
                          href={`/procurement/requisitions/${row.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-wujha-primary hover:border-wujha-primary hover:bg-wujha-primary/5"
                          aria-label={`View ${row.prNumber}`}
                          title={`View ${row.prNumber}`}
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
          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-wujha-primary focus:outline-none focus:ring-2 focus:ring-wujha-primary"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">{page} / {Math.max(totalPages, 1)}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
