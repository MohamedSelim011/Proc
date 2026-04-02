'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { UomForm, UomFormValues } from '../../_components/uom-form';

type UomPayload = {
  id: string;
  externalId: string | null;
  code: string;
  name: string;
  abbreviation: string;
  type: string;
  isActive: boolean;
};

export default function EditUomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<UomFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUom = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/organization/uom/${params.id}`, { cache: 'no-store' });
        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
          item?: UomPayload;
        };
        if (!response.ok || payload.success === false || !payload.item) {
          setError(payload.error || 'Failed to load unit of measure');
          setInitialValues(null);
          return;
        }
        const item = payload.item;
        setInitialValues({
          externalId: item.externalId || '',
          code: item.code || '',
          name: item.name || '',
          abbreviation: item.abbreviation || '',
          type: item.type || 'COUNT',
          isActive: item.isActive,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load unit of measure');
        setInitialValues(null);
      } finally {
        setLoading(false);
      }
    };

    void loadUom();
  }, [params.id]);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading unit of measure...</div>;
  }

  if (!initialValues) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Unit of measure not found'}
      </div>
    );
  }

  return (
    <UomForm
      title="Edit Unit Of Measure"
      subtitle="Update unit of measure master data."
      submitText="Save Changes"
      initialValues={initialValues}
      loading={saving}
      error={error}
      onSubmit={async (values) => {
        try {
          setSaving(true);
          setError(null);
          const response = await apiFetch(`/api/organization/uom/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const payload = (await response.json()) as { success?: boolean; error?: string };
          if (!response.ok || payload.success === false) {
            setError(payload.error || 'Failed to update unit of measure');
            return;
          }
          router.push(`/procurement/organization/uom/${params.id}`);
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to update unit of measure');
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}

