'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { ProjectForm, ProjectFormValues } from '../../_components/project-form';

type ProjectPayload = {
  id: string;
  externalId: string | null;
  companyId: string | null;
  projectCode: string | null;
  projectName: string;
  status: string | null;
  description: string | null;
  projectManager: string | null;
  department: string | null;
  startDate: string | null;
  endDate: string | null;
  totalBudget: string | number | null;
  allocatedBudget: string | number | null;
  actualSpent: string | number | null;
  externalSystemId: string | null;
  isActive: boolean;
};

const toInputDate = (value: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<ProjectFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/organization/projects/${params.id}`, { cache: 'no-store' });
        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
          item?: ProjectPayload;
        };
        if (!response.ok || payload.success === false || !payload.item) {
          setError(payload.error || 'Failed to load project');
          setInitialValues(null);
          return;
        }
        const item = payload.item;
        setInitialValues({
          externalId: item.externalId || '',
          companyId: item.companyId || '',
          projectCode: item.projectCode || '',
          projectName: item.projectName,
          status: item.status || '',
          description: item.description || '',
          projectManager: item.projectManager || '',
          department: item.department || '',
          startDate: toInputDate(item.startDate),
          endDate: toInputDate(item.endDate),
          totalBudget: item.totalBudget != null ? String(item.totalBudget) : '0',
          allocatedBudget: item.allocatedBudget != null ? String(item.allocatedBudget) : '0',
          actualSpent: item.actualSpent != null ? String(item.actualSpent) : '0',
          externalSystemId: item.externalSystemId || '',
          isActive: item.isActive,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load project');
        setInitialValues(null);
      } finally {
        setLoading(false);
      }
    };

    void loadProject();
  }, [params.id]);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading project...</div>;
  }

  if (!initialValues) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Project not found'}
      </div>
    );
  }

  return (
    <ProjectForm
      title="Edit Project"
      subtitle="Update project master data."
      submitText="Save Changes"
      initialValues={initialValues}
      loading={saving}
      error={error}
      onSubmit={async (values) => {
        try {
          setSaving(true);
          setError(null);
          const response = await apiFetch(`/api/organization/projects/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const payload = (await response.json()) as { success?: boolean; error?: string };
          if (!response.ok || payload.success === false) {
            setError(payload.error || 'Failed to update project');
            return;
          }
          router.push(`/procurement/organization/projects/${params.id}`);
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Failed to update project');
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
