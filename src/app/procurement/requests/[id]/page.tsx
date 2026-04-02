'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Calendar, Check, FileText, Loader2, User, X } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { useToast } from '@/components/ui/toast';
import { getUserData } from '@/lib/jwt';

type MaterialRequestRecord = {
  id: string;
  externalId: string;
  status: string;
  quantity: number | null;
  description: string | null;
  notes: string | null;
  rejectionReason: string | null;
  approvedByExternal: string | null;
  budgetExternalId: string | null;
  departmentExternalId: string | null;
  categoryExternalId: string | null;
  departmentName: string | null;
  categoryName: string | null;
  categoryPriceLimit: string | number | null;
  budgetCategoryBudgets: unknown;
  requesterName: string | null;
  requesterFirstName: string | null;
  requesterLastName: string | null;
  requesterExternalId: string | null;
  requesterEmail: string | null;
  fiscalYear: number | null;
  quarter: number | null;
  externalVersion: number | null;
  budgetTotalAmount: string | number | null;
  externalCreatedAt: string | null;
  externalUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type BudgetCategoryRow = {
  label: string;
  allocated: number | null;
  spent: number | null;
  remaining: number | null;
};

type BudgetMetadataRow = {
  label: string;
  value: string;
};

const toPlainObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toLabel = (key: string) =>
  key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value: string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-OM');
};

const formatAmount = (value: string | number | null) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return `OMR ${numericValue.toLocaleString('en-OM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const buildBudgetCategoryRows = (budgetCategoryBudgets: unknown): BudgetCategoryRow[] => {
  if (!Array.isArray(budgetCategoryBudgets)) return [];

  return budgetCategoryBudgets
    .map((entry, index) => {
      const row = toPlainObject(entry);
      if (!row) return null;

      const nestedCategory = toPlainObject(row.category);
      const label =
        asString(row.categoryName) ||
        asString(row.category_name) ||
        asString(row.name) ||
        asString(nestedCategory?.name) ||
        `Category ${index + 1}`;

      const allocated =
        asNumber(row.allocatedAmount) ??
        asNumber(row.allocated_amount) ??
        asNumber(row.total_amount) ??
        asNumber(row.amount) ??
        asNumber(row.budget);

      const spent =
        asNumber(row.spentAmount) ??
        asNumber(row.spent_amount) ??
        asNumber(row.usedAmount) ??
        asNumber(row.used_amount) ??
        asNumber(row.spent);

      const remaining =
        asNumber(row.remainingAmount) ??
        asNumber(row.remaining_amount) ??
        asNumber(row.balance) ??
        (allocated !== null && spent !== null ? allocated - spent : null);

      if (allocated === null && spent === null && remaining === null) {
        return null;
      }

      return { label, allocated, spent, remaining };
    })
    .filter((row): row is BudgetCategoryRow => Boolean(row));
};

const buildBudgetMetadataRows = (budgetCategoryBudgets: unknown): BudgetMetadataRow[] => {
  const data = toPlainObject(budgetCategoryBudgets);
  if (!data) return [];

  return Object.entries(data)
    .map(([key, value]) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return null;
      return {
        label: toLabel(key),
        value: String(value),
      };
    })
    .filter((row): row is BudgetMetadataRow => Boolean(row));
};

export default function RequestDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<MaterialRequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const approverExternalId = useMemo(() => {
    const user = typeof window !== 'undefined' ? getUserData() : null;
    if (!user) return '';
    return user.employeeId || user.id || '';
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/hr/material-requests/${params.id}`, { cache: 'no-store' });
      const payload = (await response.json()) as { success?: boolean; data?: MaterialRequestRecord; error?: string };

      if (!response.ok || !payload?.data) {
        setError(payload?.error || 'Failed to load request details');
        setData(null);
        return;
      }

      setData(payload.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const statusClass = (status?: string) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'approved') return 'bg-green-100 text-green-800';
    if (normalized === 'pending') return 'bg-wujha-primary/10 text-wujha-primary';
    if (normalized === 'rejected') return 'bg-red-100 text-red-800';
    if (normalized === 'fullfilled' || normalized === 'fulfilled') return 'bg-indigo-100 text-indigo-700';
    return 'bg-gray-100 text-gray-700';
  };

  const updateStatus = async (status: 'approved' | 'rejected', reason?: string) => {
    if (!data) return;
    if (!approverExternalId) {
      showToast('error', 'Unable to identify current user. Please sign in again.');
      return;
    }

    setActionLoading(true);
    try {
      const response = await apiFetch(`/api/hr/material-requests/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          approved_by_external: approverExternalId,
          ...(status === 'rejected' ? { rejection_reason: reason?.trim() || '' } : {}),
        }),
      });

      const payload = (await response.json()) as { success?: boolean; data?: MaterialRequestRecord; error?: string };
      if (!response.ok || !payload.success || !payload.data) {
        showToast('error', payload.error || 'Failed to update request status');
        return;
      }

      setData(payload.data);
      setRejectOpen(false);
      setRejectionReason('');
      showToast('success', `Request ${data.externalId} ${status} successfully.`);
      router.refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update request status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-wujha-primary" />
          <p className="text-sm text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/procurement/requests" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to Requests
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Request not found'}</div>
      </div>
    );
  }

  const isPending = data.status?.toLowerCase() === 'pending';
  const budgetCategoryRows = buildBudgetCategoryRows(data.budgetCategoryBudgets);
  const budgetMetadataRows = buildBudgetMetadataRows(data.budgetCategoryBudgets);

  return (
    <>
      <div className="p-6 space-y-6">
        <Link
          href="/procurement/requests"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Requests
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Material Request {data.externalId || data.id}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Internal ID: <span className="font-medium text-gray-800">{data.id}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClass(data.status)}`}>
                {data.status}
              </span>
              {isPending ? (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void updateStatus('approved')}
                    className="inline-flex items-center gap-1.5 rounded-md border border-green-200 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setRejectOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Quantity</p>
            <p className="mt-2 text-xl font-semibold text-gray-900">{data.quantity ?? 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Budget Total</p>
            <p className="mt-2 text-xl font-semibold text-gray-900">{formatAmount(data.budgetTotalAmount)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Fiscal Period</p>
            <p className="mt-2 text-xl font-semibold text-gray-900">
              {data.fiscalYear ? `${data.fiscalYear} / Q${data.quarter ?? '-'}` : 'N/A'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Last External Update</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{formatDateTime(data.externalUpdatedAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-wujha-primary" />
              Request Overview
            </h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">External Request ID:</span> <span className="text-gray-900">{data.externalId || 'N/A'}</span></p>
              <p><span className="text-gray-500">Approved By External:</span> <span className="text-gray-900">{data.approvedByExternal || 'N/A'}</span></p>
              <p><span className="text-gray-500">Rejection Reason:</span> <span className="text-gray-900">{data.rejectionReason || 'N/A'}</span></p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Description</p>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{data.description || 'No description'}</p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Notes</p>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{data.notes || 'No notes'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-wujha-primary" />
              Requester Details
            </h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">External User ID:</span> <span className="text-gray-900">{data.requesterExternalId || 'N/A'}</span></p>
              <p><span className="text-gray-500">First Name:</span> <span className="text-gray-900">{data.requesterFirstName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Last Name:</span> <span className="text-gray-900">{data.requesterLastName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Display Name:</span> <span className="text-gray-900">{data.requesterName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Email:</span> <span className="text-gray-900">{data.requesterEmail || 'N/A'}</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-wujha-primary" />
              Department & Category
            </h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Department ID:</span> <span className="text-gray-900">{data.departmentExternalId || 'N/A'}</span></p>
              <p><span className="text-gray-500">Department Name:</span> <span className="text-gray-900">{data.departmentName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Category ID:</span> <span className="text-gray-900">{data.categoryExternalId || 'N/A'}</span></p>
              <p><span className="text-gray-500">Category Name:</span> <span className="text-gray-900">{data.categoryName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Category Price Limit:</span> <span className="text-gray-900">{formatAmount(data.categoryPriceLimit)}</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-wujha-primary" />
              Budget & Fiscal
            </h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Budget ID:</span> <span className="text-gray-900">{data.budgetExternalId || 'N/A'}</span></p>
              <p><span className="text-gray-500">Fiscal Year:</span> <span className="text-gray-900">{data.fiscalYear ?? 'N/A'}</span></p>
              <p><span className="text-gray-500">Quarter:</span> <span className="text-gray-900">{data.quarter ?? 'N/A'}</span></p>
              <p><span className="text-gray-500">Budget Total Amount:</span> <span className="text-gray-900">{formatAmount(data.budgetTotalAmount)}</span></p>
              <p><span className="text-gray-500">External Version:</span> <span className="text-gray-900">{data.externalVersion ?? 'N/A'}</span></p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Budget Category Allocation</h2>

          {budgetCategoryRows.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Allocated</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Spent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {budgetCategoryRows.map((row, index) => (
                    <tr key={`${row.label}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{row.label}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.allocated === null ? 'N/A' : formatAmount(row.allocated)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.spent === null ? 'N/A' : formatAmount(row.spent)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.remaining === null ? 'N/A' : formatAmount(row.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : budgetMetadataRows.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {budgetMetadataRows.map((row) => (
                <div key={row.label} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{row.label}</p>
                  <p className="mt-1 text-sm text-gray-900">{row.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
              No budget category allocation details available for this request.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-wujha-primary" />
            Timeline
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 text-sm text-gray-700">
            <p>External Created: {formatDateTime(data.externalCreatedAt)}</p>
            <p>External Updated: {formatDateTime(data.externalUpdatedAt)}</p>
            <p>Local Created: {formatDateTime(data.createdAt)}</p>
            <p>Local Updated: {formatDateTime(data.updatedAt)}</p>
          </div>
        </div>
      </div>

      {rejectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Reject Material Request</h3>
            <p className="mt-1 text-sm text-gray-600">
              Request: <span className="font-medium">{data.externalId}</span>
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
                onClick={() => setRejectOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim() || actionLoading}
                onClick={() => void updateStatus('rejected', rejectionReason)}
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
