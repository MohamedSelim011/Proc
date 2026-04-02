'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { DepartmentForm, DepartmentFormValues } from '../../_components/department-form';

type Department = {
  id: string;
  externalId: string | null;
  name: string;
  code: string | null;
  type: string | null;
  costCenterCode: string | null;
  parentExternalId: string | null;
  description: string | null;
  isActive: boolean;
};

export default function EditDepartmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<DepartmentFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/organization/departments/${params.id}`, { cache: 'no-store' });
        const payload = (await response.json()) as { success?: boolean; error?: string; item?: Department };
        if (!response.ok || payload.success === false || !payload.item) {
          setError(payload.error || 'Failed to load department');
          setInitialValues(null);
          return;
        }

        const item = payload.item;
        setInitialValues({
          externalId: item.externalId || '',
          name: item.name,
          code: item.code || '',
          type: item.type || '',
          costCenterCode: item.costCenterCode || '',
          parentExternalId: item.parentExternalId || '',
          description: item.description || '',
          isActive: item.isActive,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load department');
        setInitialValues(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [params.id]);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading department...</div>;
  }

  if (!initialValues) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Department not found'}
      </div>
    );
  }

  return (
    <DepartmentForm
      title="Edit Department"
      subtitle="Update department master data."
      submitText="Save Changes"
      initialValues={initialValues}
      loading={saving}
      error={error}
      onSubmit={async (values) => {
        try {
          setSaving(true);
          setError(null);
          const response = await apiFetch(`/api/organization/departments/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const payload = (await response.json()) as { success?: boolean; error?: string };
          if (!response.ok || payload.success === false) {
            setError(payload.error || 'Failed to update department');
            return;
          }
          router.push(`/procurement/organization/departments/${params.id}`);
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to update department');
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
