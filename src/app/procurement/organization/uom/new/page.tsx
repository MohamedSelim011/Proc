'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { UomForm, UomFormValues } from '../_components/uom-form';

export default function NewUomPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues: UomFormValues = {
    externalId: '',
    code: '',
    name: '',
    abbreviation: '',
    type: 'COUNT',
    isActive: true,
  };

  return (
    <UomForm
      title="Create Unit Of Measure"
      subtitle="Create a new UOM in Procurement master data."
      submitText="Create UOM"
      initialValues={initialValues}
      loading={saving}
      error={error}
      onSubmit={async (values) => {
        try {
          setSaving(true);
          setError(null);
          const response = await apiFetch('/api/organization/uom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const payload = (await response.json()) as {
            success?: boolean;
            error?: string;
            item?: { id: string };
          };
          if (!response.ok || payload.success === false || !payload.item?.id) {
            setError(payload.error || 'Failed to create unit of measure');
            return;
          }
          router.push(`/procurement/organization/uom/${payload.item.id}`);
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to create unit of measure');
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}

