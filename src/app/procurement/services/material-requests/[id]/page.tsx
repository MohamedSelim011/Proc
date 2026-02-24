'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ClipboardList, Loader2, Package } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

type MaterialRequisitionDetail = {
  id: string;
  externalId: string;
  requisitionNumber?: string | null;
  status: string;
  priority?: string | null;
  projectExternalId?: string | null;
  projectName?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  departmentExternalId?: string | null;
  departmentName?: string | null;
  requiredDate?: string | null;
  purpose?: string | null;
  justification?: string | null;
  externalCreatedAt?: string | null;
  externalUpdatedAt?: string | null;
  rawPayload: unknown;
};

type DisplayItem = {
  name: string;
  code: string;
  quantity: string;
  unit: string;
};

const toReadableText = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const statusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('approved') || normalized.includes('fulfilled') || normalized.includes('fullfilled')) {
    return 'bg-green-100 text-green-800';
  }
  if (normalized.includes('pending') || normalized.includes('draft')) {
    return 'bg-wujha-primary/10 text-wujha-primary';
  }
  if (normalized.includes('reject') || normalized.includes('cancel')) {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-700';
};

const extractDisplayItems = (row: MaterialRequisitionDetail): DisplayItem[] => {
  const payload = row.rawPayload;
  if (!payload || typeof payload !== 'object') return [];

  const payloadObj = payload as Record<string, unknown>;
  const rawItems = Array.isArray(payloadObj.items) ? payloadObj.items : [];

  const mapped = rawItems
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, unknown>;

      const name =
        (typeof item.itemName === 'string' && item.itemName.trim()) ||
        (typeof item.name === 'string' && item.name.trim()) ||
        (typeof item.materialName === 'string' && item.materialName.trim()) ||
        (typeof item.description === 'string' && item.description.trim()) ||
        'Material Item';

      const code =
        (typeof item.itemCode === 'string' && item.itemCode.trim()) ||
        (typeof item.code === 'string' && item.code.trim()) ||
        (typeof item.inventoryItemId === 'string' && item.inventoryItemId.trim()) ||
        (typeof item.itemId === 'string' && item.itemId.trim()) ||
        '-';

      const quantityValue = item.quantity ?? item.requestedQuantity ?? item.qty ?? null;
      const quantity = quantityValue == null ? '-' : String(quantityValue);

      const unit =
        (typeof item.unit === 'string' && item.unit.trim()) ||
        (typeof item.uom === 'string' && item.uom.trim()) ||
        (typeof item.unitOfMeasure === 'string' && item.unitOfMeasure.trim()) ||
        'Unit';

      return { name, code, quantity, unit };
    })
    .filter((item): item is DisplayItem => Boolean(item));

  if (mapped.length > 0) return mapped;

  const fallbackQuantity =
    payloadObj.quantity == null || payloadObj.quantity === ''
      ? '-'
      : String(payloadObj.quantity);
  const fallbackName =
    (typeof payloadObj.description === 'string' && payloadObj.description.trim()) ||
    (typeof payloadObj.purpose === 'string' && payloadObj.purpose.trim()) ||
    null;

  if (!fallbackName && fallbackQuantity === '-') return [];

  return [
    {
      name: fallbackName || 'Material Item',
      code: '-',
      quantity: fallbackQuantity,
      unit: 'Unit',
    },
  ];
};

export default function MaterialRequestDetailsPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<MaterialRequisitionDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/inventory/material-requisitions/${params.id}`, { cache: 'no-store' });
        const payload = (await response.json()) as { success?: boolean; data?: MaterialRequisitionDetail; error?: string };
        if (!response.ok || !payload?.data) {
          setError(payload?.error || 'Failed to load material requisition details');
          return;
        }
        setRow(payload.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load material requisition details');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) void load();
  }, [params.id]);

  return (
    <div className="p-6 space-y-6">
      <Link
        href="/procurement/services/material-requests"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Material Requisitions
      </Link>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-wujha-primary" />
          <p className="text-sm text-gray-600">Loading details...</p>
        </div>
      ) : error || !row ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Material requisition not found'}
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              {row.requisitionNumber || 'Material Requisition'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">External ID: {row.externalId}</p>
            <div className="mt-4">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>
                {toReadableText(row.status)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Priority</p>
                <p className="mt-1 text-sm text-gray-900">{row.priority ? toReadableText(row.priority) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Required Date</p>
                <p className="mt-1 text-sm text-gray-900">
                  {row.requiredDate ? new Date(row.requiredDate).toLocaleDateString('en-OM') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Created At</p>
                <p className="mt-1 text-sm text-gray-900">
                  {row.externalCreatedAt ? new Date(row.externalCreatedAt).toLocaleString('en-OM') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Requester</p>
                <p className="mt-1 text-sm text-gray-900">{row.requesterName || row.requesterEmail || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Department</p>
                <p className="mt-1 text-sm text-gray-900">{row.departmentName || row.departmentExternalId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Project</p>
                <p className="mt-1 text-sm text-gray-900">
                  {row.projectName || row.projectExternalId || 'N/A'}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Purpose</p>
                <p className="mt-1 text-sm text-gray-900">{row.purpose || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Justification</p>
                <p className="mt-1 text-sm text-gray-900">{row.justification || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Package className="h-5 w-5 text-wujha-primary" />
              Requested Items
            </h2>
            {extractDisplayItems(row).length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {extractDisplayItems(row).map((item, index) => (
                      <tr key={`${item.code}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center">
                <ClipboardList className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">No item details are available for this requisition.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
