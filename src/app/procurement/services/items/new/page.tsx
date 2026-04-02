'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { ItemForm, ProcurementItemFormValues } from '../_components/item-form';

export default function NewProcurementItemPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues: ProcurementItemFormValues = {
    externalId: '',
    itemCode: '',
    nameEn: '',
    nameAr: '',
    description: '',
    categoryId: '',
    unitOfMeasure: '',
    minStockLevel: '',
    maxStockLevel: '',
    reorderPoint: '',
  };

  return (
    <ItemForm
      title="Create Item"
      subtitle="Create a procurement item using the inventory-aligned item schema."
      submitText="Create Item"
      initialValues={initialValues}
      showExternalIdField={false}
      loading={saving}
      error={error}
      onSubmit={async (values) => {
        try {
          setSaving(true);
          setError(null);
          const response = await apiFetch('/api/procurement-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const payload = (await response.json()) as { success?: boolean; error?: string; item?: { id: string } };
          if (!response.ok || payload.success === false || !payload.item?.id) {
            setError(payload.error || 'Failed to create item');
            return;
          }
          router.push(`/procurement/services/items/${payload.item.id}`);
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to create item');
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
