'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { DepartmentForm, DepartmentFormValues } from '../_components/department-form';

export default function NewDepartmentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues: DepartmentFormValues = {
    externalId: '',
    name: '',
    code: '',
    type: 'department',
    costCenterCode: '',
    parentExternalId: '',
    description: '',
    isActive: true,
  };

  return (
    <DepartmentForm
      title="Create Department"
      subtitle="Create a new department in the Procurement organization master."
      submitText="Create Department"
      initialValues={initialValues}
      loading={saving}
      error={error}
      onSubmit={async (values) => {
        try {
          setSaving(true);
          setError(null);
          const response = await apiFetch('/api/organization/departments', {
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
            setError(payload.error || 'Failed to create department');
            return;
          }
          router.push(`/procurement/organization/departments/${payload.item.id}`);
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to create department');
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
