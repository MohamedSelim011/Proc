'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

type ProjectItem = {
  id: string;
  externalId: string | null;
  companyId: string | null;
  projectCode: string | null;
  projectName: string;
  description: string | null;
  status: string | null;
  isActive: boolean;
  projectManager: string | null;
  department: string | null;
  startDate: string | null;
  endDate: string | null;
  totalBudget: string | number | null;
  allocatedBudget: string | number | null;
  actualSpent: string | number | null;
  externalSystemId: string | null;
  externalUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const formatAmount = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('en-OM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString('en-OM') : '-');

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ProjectItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [projectsIntegrationEnabled, setProjectsIntegrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await apiFetch('/api/system/integration-flags', { cache: 'no-store' });
        const payload = (await response.json()) as {
          data?: { projectsIntegrationEnabled?: boolean };
        };
        setProjectsIntegrationEnabled(Boolean(payload?.data?.projectsIntegrationEnabled));
      } catch {
        setProjectsIntegrationEnabled(false);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/organization/projects/${params.id}`, { cache: 'no-store' });
        const payload = (await response.json()) as { success?: boolean; error?: string; item?: ProjectItem };
        if (!response.ok || payload.success === false || !payload.item) {
          setError(payload.error || 'Failed to load project');
          setItem(null);
          return;
        }
        setError(null);
        setItem(payload.item);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load project');
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [params.id]);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading project...</div>;
  }

  if (error || !item) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Project not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project</div>
          <h1 className="text-2xl font-bold text-gray-900">{item.projectName}</h1>
          <p className="mt-1 text-sm text-gray-600">{item.projectCode || 'No project code'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/procurement/organization/projects"
            className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          {projectsIntegrationEnabled === false ? (
            <>
              <Link
                href={`/procurement/organization/projects/${item.id}/edit`}
                className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-amber-700"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (!confirm('Delete this project?')) return;
                  try {
                    setDeleting(true);
                    const response = await apiFetch(`/api/organization/projects/${item.id}`, { method: 'DELETE' });
                    if (!response.ok) {
                      const payload = (await response.json().catch(() => ({}))) as { error?: string };
                      alert(payload.error || 'Failed to delete project');
                      return;
                    }
                    router.push('/procurement/organization/projects');
                    router.refresh();
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">General</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">External ID</dt>
              <dd className="text-gray-900">{item.externalId || '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Company ID</dt>
              <dd className="text-gray-900">{item.companyId || '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">External System ID</dt>
              <dd className="text-gray-900">{item.externalSystemId || '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Status</dt>
              <dd className="text-gray-900">{item.status || '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Active</dt>
              <dd className="text-gray-900">{item.isActive ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Ownership</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Project Manager</dt>
              <dd className="text-gray-900">{item.projectManager || '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Department</dt>
              <dd className="text-gray-900">{item.department || '-'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Start Date</dt>
              <dd className="text-gray-900">{formatDateTime(item.startDate)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">End Date</dt>
              <dd className="text-gray-900">{formatDateTime(item.endDate)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Budget</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="rounded-md border border-gray-100 p-3">
            <dt className="text-xs uppercase text-gray-500">Total Budget</dt>
            <dd className="mt-1 text-base font-semibold text-gray-900">{formatAmount(item.totalBudget)} OMR</dd>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <dt className="text-xs uppercase text-gray-500">Allocated Budget</dt>
            <dd className="mt-1 text-base font-semibold text-gray-900">{formatAmount(item.allocatedBudget)} OMR</dd>
          </div>
          <div className="rounded-md border border-gray-100 p-3">
            <dt className="text-xs uppercase text-gray-500">Actual Spent</dt>
            <dd className="mt-1 text-base font-semibold text-gray-900">{formatAmount(item.actualSpent)} OMR</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Description</h2>
        <div className="mt-3 text-sm text-gray-700">{item.description || '-'}</div>
        <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
          External Updated: {formatDateTime(item.externalUpdatedAt)} • Created: {formatDateTime(item.createdAt)} • Updated:{' '}
          {formatDateTime(item.updatedAt)}
        </div>
      </div>
    </div>
  );
}


