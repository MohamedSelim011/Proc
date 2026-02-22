'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

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
  approver: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  externalCreatedAt: string | null;
  externalUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rawPayload: unknown;
};

export default function PaymentEscalationDetailPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<PaymentEscalation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetch(`/api/payment-escalations/${params.id}`, { cache: 'no-store' });
        const payload = (await response.json()) as { success?: boolean; data?: PaymentEscalation; error?: string };

        if (!response.ok || !payload.data) {
          setError(payload.error || 'Failed to load escalation details');
          return;
        }

        setRow(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load escalation details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      void load();
    }
  }, [params.id]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">Loading escalation details...</div>;
  }

  if (error || !row) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/procurement/payment-escalations" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to Payment Escalations
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Escalation not found'}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link href="/procurement/payment-escalations" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to Payment Escalations
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">{row.title || `Escalation ${row.externalId}`}</h1>
        <p className="mt-1 text-sm text-gray-600">External ID: {row.externalId}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Escalation Details</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p>Status: {row.status}</p>
            <p>Priority: {row.priority || 'N/A'}</p>
            <p>Requested By: {row.requestedBy || 'N/A'}</p>
            <p>Approver: {row.approver || 'N/A'}</p>
            <p>Amount: {row.amount ? `${row.amount} ${row.currency || ''}`.trim() : 'N/A'}</p>
            <p>Due Date: {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'}</p>
            <p>Resolved At: {row.resolvedAt ? new Date(row.resolvedAt).toLocaleString() : 'N/A'}</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Calendar className="h-5 w-5 text-wujha-primary" /> Sync Timeline</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p>External Created: {row.externalCreatedAt ? new Date(row.externalCreatedAt).toLocaleString() : 'N/A'}</p>
            <p>External Updated: {row.externalUpdatedAt ? new Date(row.externalUpdatedAt).toLocaleString() : 'N/A'}</p>
            <p>Local Created: {new Date(row.createdAt).toLocaleString()}</p>
            <p>Local Updated: {new Date(row.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5 text-wujha-primary" /> Reason</h2>
        <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{row.reason || 'No reason provided'}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-wujha-primary" /> Raw Payload</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-gray-50 p-4 text-xs text-gray-700">{JSON.stringify(row.rawPayload, null, 2)}</pre>
      </div>
    </div>
  );
}
