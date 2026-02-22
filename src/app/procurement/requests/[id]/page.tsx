'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Calendar, Check, FileText, User, X } from 'lucide-react';
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
  rawPayload: unknown;
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
    return <div className="p-6 text-sm text-gray-600">Loading request details...</div>;
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

  return (
    <>
      <div className="p-6 space-y-6">
        <Link href="/procurement/requests" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to Requests
        </Link>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Material Request {data.externalId}</h1>
              <p className="mt-1 text-sm text-gray-600">Internal ID: {data.id}</p>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><User className="h-5 w-5 text-wujha-primary" /> Requester</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">External ID:</span> <span className="text-gray-900">{data.requesterExternalId || 'N/A'}</span></p>
              <p><span className="text-gray-500">First Name:</span> <span className="text-gray-900">{data.requesterFirstName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Last Name:</span> <span className="text-gray-900">{data.requesterLastName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Display Name:</span> <span className="text-gray-900">{data.requesterName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Email:</span> <span className="text-gray-900">{data.requesterEmail || 'N/A'}</span></p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Building2 className="h-5 w-5 text-wujha-primary" /> Budget & Category</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Budget ID:</span> <span className="text-gray-900">{data.budgetExternalId || 'N/A'}</span></p>
              <p><span className="text-gray-500">Department ID:</span> <span className="text-gray-900">{data.departmentExternalId || 'N/A'}</span></p>
              <p><span className="text-gray-500">Department Name:</span> <span className="text-gray-900">{data.departmentName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Category ID:</span> <span className="text-gray-900">{data.categoryExternalId || 'N/A'}</span></p>
              <p><span className="text-gray-500">Category Name:</span> <span className="text-gray-900">{data.categoryName || 'N/A'}</span></p>
              <p><span className="text-gray-500">Category Price Limit:</span> <span className="text-gray-900">{data.categoryPriceLimit ?? 'N/A'}</span></p>
              <p><span className="text-gray-500">Fiscal Year:</span> <span className="text-gray-900">{data.fiscalYear ?? 'N/A'}</span></p>
              <p><span className="text-gray-500">Quarter:</span> <span className="text-gray-900">{data.quarter ?? 'N/A'}</span></p>
              <p><span className="text-gray-500">Budget Total Amount:</span> <span className="text-gray-900">{data.budgetTotalAmount ?? 'N/A'}</span></p>
              <p><span className="text-gray-500">External Version:</span> <span className="text-gray-900">{data.externalVersion ?? 'N/A'}</span></p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5 text-wujha-primary" /> Request Content</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm text-gray-700">
            <p><span className="text-gray-500">Quantity:</span> {data.quantity ?? 'N/A'}</p>
            <p><span className="text-gray-500">Approved By External:</span> {data.approvedByExternal || 'N/A'}</p>
            <p><span className="text-gray-500">Rejection Reason:</span> {data.rejectionReason || 'N/A'}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Description</p>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{data.description || 'No description'}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Notes</p>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{data.notes || 'No notes'}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Budget Category Budgets</p>
            <pre className="mt-2 overflow-x-auto text-xs text-gray-700">{JSON.stringify(data.budgetCategoryBudgets, null, 2)}</pre>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Calendar className="h-5 w-5 text-wujha-primary" /> Timeline</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 text-sm text-gray-700">
            <p>External Created: {data.externalCreatedAt ? new Date(data.externalCreatedAt).toLocaleString() : 'N/A'}</p>
            <p>External Updated: {data.externalUpdatedAt ? new Date(data.externalUpdatedAt).toLocaleString() : 'N/A'}</p>
            <p>Local Created: {new Date(data.createdAt).toLocaleString()}</p>
            <p>Local Updated: {new Date(data.updatedAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Raw Payload</h2>
          <pre className="mt-3 overflow-x-auto rounded-md bg-gray-50 p-4 text-xs text-gray-700">{JSON.stringify(data.rawPayload, null, 2)}</pre>
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
