'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

type ProcurementItem = {
  id: string;
  externalId: string | null;
  itemCode: string;
  nameEn: string;
  nameAr: string | null;
  description: string | null;
  categoryId: string;
  unitOfMeasure: string;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  reorderPoint: number | null;
  createdAt: string;
  updatedAt: string;
};

export default function ProcurementItemDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ProcurementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [itemsIntegrationEnabled, setItemsIntegrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await apiFetch('/api/system/integration-flags', { cache: 'no-store' });
        const payload = (await response.json()) as {
          data?: { itemsIntegrationEnabled?: boolean };
        };
        setItemsIntegrationEnabled(Boolean(payload?.data?.itemsIntegrationEnabled));
      } catch {
        setItemsIntegrationEnabled(false);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/procurement-items/${params.id}`, { cache: 'no-store' });
        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
          item?: ProcurementItem;
        };
        if (!response.ok || payload.success === false || !payload.item) {
          setError(payload.error || 'Failed to load item');
          setItem(null);
          return;
        }
        setError(null);
        setItem(payload.item);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load item');
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [params.id]);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading item...</div>;
  }

  if (error || !item) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Item not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Item</div>
          <h1 className="text-2xl font-bold text-gray-900">{item.nameEn}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {item.itemCode}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/procurement/services/items"
            className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          {itemsIntegrationEnabled === false ? (
            <>
              <Link
                href={`/procurement/services/items/${item.id}/edit`}
                className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-amber-700"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (!confirm('Delete this item?')) return;
                  try {
                    setDeleting(true);
                    const response = await apiFetch(`/api/procurement-items/${item.id}`, { method: 'DELETE' });
                    if (!response.ok) {
                      const payload = (await response.json().catch(() => ({}))) as { error?: string };
                      alert(payload.error || 'Failed to delete item');
                      return;
                    }
                    router.push('/procurement/services/items');
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Core</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">External ID</dt>
              <dd className="text-gray-900">{item.externalId || '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Category ID</dt>
              <dd className="text-gray-900">{item.categoryId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Arabic Name</dt>
              <dd className="text-gray-900">{item.nameAr || '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Unit of Measure</dt>
              <dd className="text-gray-900">{item.unitOfMeasure}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Stock Control</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Minimum Stock</dt>
              <dd className="text-gray-900">{item.minStockLevel ?? '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Maximum Stock</dt>
              <dd className="text-gray-900">{item.maxStockLevel ?? '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Reorder Point</dt>
              <dd className="text-gray-900">{item.reorderPoint ?? '-'}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Description</h2>
        <div className="mt-3 text-sm text-gray-700">{item.description || '-'}</div>
        <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
          Created: {new Date(item.createdAt).toLocaleString('en-OM')} • Updated:{' '}
          {new Date(item.updatedAt).toLocaleString('en-OM')}
        </div>
      </div>
    </div>
  );
}
