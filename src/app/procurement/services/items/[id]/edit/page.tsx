'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { ItemForm, ProcurementItemFormValues } from '../../_components/item-form';

type ProcurementItem = {
  id: string;
  externalId: string | null;
  itemCode: string;
  nameEn: string;
  nameAr: string;
  description: string | null;
  categoryId: string;
  unitOfMeasure: string;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  reorderPoint: number | null;
};

export default function EditProcurementItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<ProcurementItemFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setInitialValues(null);
          return;
        }
        const item = payload.item;
        setInitialValues({
          externalId: item.externalId || '',
          itemCode: item.itemCode,
          nameEn: item.nameEn,
          nameAr: item.nameAr || '',
          description: item.description || '',
          categoryId: item.categoryId,
          unitOfMeasure: item.unitOfMeasure,
          minStockLevel: item.minStockLevel === null ? '' : String(item.minStockLevel),
          maxStockLevel: item.maxStockLevel === null ? '' : String(item.maxStockLevel),
          reorderPoint: item.reorderPoint === null ? '' : String(item.reorderPoint),
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load item');
        setInitialValues(null);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [params.id]);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading item...</div>;
  }

  if (!initialValues) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Item not found'}
      </div>
    );
  }

  return (
    <ItemForm
      title="Edit Item"
      subtitle="Update the inventory-aligned item master record."
      submitText="Save Changes"
      initialValues={initialValues}
      loading={saving}
      error={error}
      onSubmit={async (values) => {
        try {
          setSaving(true);
          setError(null);
          const response = await apiFetch(`/api/procurement-items/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const payload = (await response.json()) as { success?: boolean; error?: string };
          if (!response.ok || payload.success === false) {
            setError(payload.error || 'Failed to update item');
            return;
          }
          router.push(`/procurement/services/items/${params.id}`);
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to update item');
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
