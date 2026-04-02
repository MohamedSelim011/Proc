'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ClipboardList, FileText, Loader2, Package } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { useToast } from '@/components/ui/toast';
import DocumentManager from '@/components/documents/document-manager';

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

type RequisitionDocument = {
  id: string;
  documentName: string;
  fileSize: number;
  uploadedAt: string;
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
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<MaterialRequisitionDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'items' | 'documents'>('general');
  const [documents, setDocuments] = useState<RequisitionDocument[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const displayItems = useMemo(() => (row ? extractDisplayItems(row) : []), [row]);

  const fetchDocuments = async (requisitionId: string) => {
    try {
      const response = await apiFetch(`/api/purchase-requisitions/${requisitionId}/documents`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        setDocuments([]);
        return;
      }
      const data = (await response.json()) as RequisitionDocument[] | { error?: string };
      setDocuments(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error('Error fetching requisition documents:', fetchError);
      setDocuments([]);
    }
  };

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
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load material requisition details');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) void load();
  }, [params.id]);

  useEffect(() => {
    if (row?.id) {
      void fetchDocuments(row.id);
    }
  }, [row?.id]);

  const handleUploadDocument = async (file: File | null) => {
    if (!row?.id || !file) return;

    try {
      setUploadingDocument(true);
      const formData = new FormData();
      formData.append('file', file);

      const rawUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser) as { id?: string; employeeId?: string };
          const uploadedBy = parsed.id || parsed.employeeId;
          if (uploadedBy) {
            formData.append('uploadedBy', uploadedBy);
          }
        } catch {
          // Ignore bad local user payload
        }
      }

      const response = await apiFetch(`/api/purchase-requisitions/${row.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || 'Failed to upload document');
      }

      showToast('success', 'Document uploaded successfully');
      await fetchDocuments(row.id);
    } catch (uploadError) {
      console.error('Error uploading requisition document:', uploadError);
      showToast('error', uploadError instanceof Error ? uploadError.message : 'Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!row?.id) return;

    try {
      const response = await apiFetch(`/api/purchase-requisitions/${row.id}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || 'Failed to delete document');
      }

      showToast('success', 'Document deleted successfully');
      await fetchDocuments(row.id);
    } catch (deleteError) {
      console.error('Error deleting requisition document:', deleteError);
      showToast('error', deleteError instanceof Error ? deleteError.message : 'Failed to delete document');
    }
  };

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
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6">
              <nav className="-mb-px flex gap-8">
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className={`inline-flex items-center gap-2 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'general'
                      ? 'border-wujha-primary text-wujha-primary'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  General Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className={`inline-flex items-center gap-2 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'items'
                      ? 'border-wujha-primary text-wujha-primary'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  Items
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`inline-flex items-center gap-2 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'documents'
                      ? 'border-wujha-primary text-wujha-primary'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Documents
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                      <p className="mt-1 text-sm text-gray-900">{row.projectName || row.projectExternalId || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
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
              )}

              {activeTab === 'items' && (
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Package className="h-5 w-5 text-wujha-primary" />
                    Requested Items
                  </h2>
                  {displayItems.length > 0 ? (
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
                          {displayItems.map((item, index) => (
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
              )}

              {activeTab === 'documents' && (
                <DocumentManager
                  documents={documents}
                  uploading={uploadingDocument}
                  onUpload={handleUploadDocument}
                  onDelete={handleDeleteDocument}
                  getViewUrl={(documentId) => `/api/purchase-requisitions/${row.id}/documents/${documentId}/file`}
                  getDownloadUrl={(documentId) => `/api/purchase-requisitions/${row.id}/documents/${documentId}/file?download=1`}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

