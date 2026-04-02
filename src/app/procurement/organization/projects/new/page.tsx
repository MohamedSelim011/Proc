'use client';

import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { ProjectForm, ProjectFormValues } from '../_components/project-form';
import { useState } from 'react';

export default function CreateProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues: ProjectFormValues = {
    externalId: '',
    companyId: '',
    projectCode: '',
    projectName: '',
    status: 'ACTIVE',
    description: '',
    projectManager: '',
    department: '',
    startDate: '',
    endDate: '',
    totalBudget: '0',
    allocatedBudget: '0',
    actualSpent: '0',
    externalSystemId: '',
    isActive: true,
  };

  return (
    <ProjectForm
      title="Create Project"
      subtitle="Create a project master record for procurement workflows."
      submitText="Create Project"
      initialValues={initialValues}
      loading={saving}
      error={error}
      onSubmit={async (values) => {
        try {
          setSaving(true);
          setError(null);
          const response = await apiFetch('/api/organization/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const payload = (await response.json()) as { success?: boolean; error?: string; item?: { id: string } };
          if (!response.ok || payload.success === false || !payload.item?.id) {
            setError(payload.error || 'Failed to create project');
            return;
          }
          router.push(`/procurement/organization/projects/${payload.item.id}`);
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to create project');
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
