'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Hash, Loader2, Pencil, Ruler, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

type UomItem = {
  id: string;
  externalId: string | null;
  code: string;
  name: string;
  abbreviation: string;
  type: string;
  isActive: boolean;
  externalUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const formatDateTime = (value: string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-OM');
};

export default function UomDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<UomItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uomIntegrationEnabled, setUomIntegrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await apiFetch('/api/system/integration-flags', { cache: 'no-store' });
        const payload = (await response.json()) as { data?: { uomIntegrationEnabled?: boolean } };
        setUomIntegrationEnabled(Boolean(payload?.data?.uomIntegrationEnabled));
      } catch {
        setUomIntegrationEnabled(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/organization/uom/${params.id}`, { cache: 'no-store' });
        const payload = (await response.json()) as { success?: boolean; error?: string; item?: UomItem };
        if (!response.ok || payload.success === false || !payload.item) {
          setError(payload.error || 'Failed to load unit of measure');
          setItem(null);
          return;
        }
        setError(null);
        setItem(payload.item);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load unit of measure');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [params.id]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-wujha-primary" />
        <p className="text-sm text-gray-600">Loading unit of measure...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Unit of measure not found'}
      </div>
    );
  }

  const statusBadgeClass = item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">UOM Details</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{item.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Code: <span className="font-medium text-gray-800">{item.code}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/procurement/organization/uom"
              className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
            {uomIntegrationEnabled === false ? (
              <>
                <Link
                  href={`/procurement/organization/uom/${item.id}/edit`}
                  className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-amber-700"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    if (!confirm('Delete this unit of measure?')) return;
                    try {
                      setDeleting(true);
                      const response = await apiFetch(`/api/organization/uom/${item.id}`, { method: 'DELETE' });
                      if (!response.ok) {
                        const payload = (await response.json().catch(() => ({}))) as { error?: string };
                        alert(payload.error || 'Failed to delete unit of measure');
                        return;
                      }
                      router.push('/procurement/organization/uom');
                      router.refresh();
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</p>
          <p className="mt-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass}`}>
              {item.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Type</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{item.type}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Abbreviation</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{item.abbreviation}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Integration Mode</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {uomIntegrationEnabled ? 'EXTERNAL SYNC ENABLED' : 'INTERNAL MANAGEMENT'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Ruler className="h-4 w-4 text-wujha-primary" />
            Unit Information
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Code</dt>
              <dd className="text-gray-900">{item.code}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Name</dt>
              <dd className="text-gray-900">{item.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Abbreviation</dt>
              <dd className="text-gray-900">{item.abbreviation}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Type</dt>
              <dd className="text-gray-900">{item.type}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Hash className="h-4 w-4 text-wujha-primary" />
            Identifiers
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Internal ID</dt>
              <dd className="max-w-[60%] break-all text-right text-gray-900">{item.id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">External ID</dt>
              <dd className="max-w-[60%] break-all text-right text-gray-900">{item.externalId || 'N/A'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Calendar className="h-4 w-4 text-wujha-primary" />
          Timeline
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-3">
          <p>
            <span className="text-gray-500">External Updated At:</span> {formatDateTime(item.externalUpdatedAt)}
          </p>
          <p>
            <span className="text-gray-500">Created At:</span> {formatDateTime(item.createdAt)}
          </p>
          <p>
            <span className="text-gray-500">Updated At:</span> {formatDateTime(item.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

