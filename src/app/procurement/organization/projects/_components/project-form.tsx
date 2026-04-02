'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

export type ProjectFormValues = {
  externalId: string;
  companyId: string;
  projectCode: string;
  projectName: string;
  status: string;
  description: string;
  projectManager: string;
  department: string;
  startDate: string;
  endDate: string;
  totalBudget: string;
  allocatedBudget: string;
  actualSpent: string;
  externalSystemId: string;
  isActive: boolean;
};

type ProjectFormProps = {
  title: string;
  subtitle: string;
  submitText: string;
  initialValues: ProjectFormValues;
  loading: boolean;
  error: string | null;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
};

export function ProjectForm({
  title,
  subtitle,
  submitText,
  initialValues,
  loading,
  error,
  onSubmit,
}: ProjectFormProps) {
  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await onSubmit({
          externalId: String(formData.get('externalId') || '').trim(),
          companyId: String(formData.get('companyId') || '').trim(),
          projectCode: String(formData.get('projectCode') || '').trim(),
          projectName: String(formData.get('projectName') || '').trim(),
          status: String(formData.get('status') || '').trim(),
          description: String(formData.get('description') || '').trim(),
          projectManager: String(formData.get('projectManager') || '').trim(),
          department: String(formData.get('department') || '').trim(),
          startDate: String(formData.get('startDate') || '').trim(),
          endDate: String(formData.get('endDate') || '').trim(),
          totalBudget: String(formData.get('totalBudget') || '').trim(),
          allocatedBudget: String(formData.get('allocatedBudget') || '').trim(),
          actualSpent: String(formData.get('actualSpent') || '').trim(),
          externalSystemId: String(formData.get('externalSystemId') || '').trim(),
          isActive: formData.get('isActive') === 'on',
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        </div>
        <Link
          href="/procurement/organization/projects"
          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Project Name *</span>
            <input name="projectName" defaultValue={initialValues.projectName} required className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Project Code</span>
            <input name="projectCode" defaultValue={initialValues.projectCode} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">External ID</span>
            <input name="externalId" defaultValue={initialValues.externalId} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Company ID</span>
            <input name="companyId" defaultValue={initialValues.companyId} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">External System ID</span>
            <input name="externalSystemId" defaultValue={initialValues.externalSystemId} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <input name="status" defaultValue={initialValues.status} className="erp-input" placeholder="APPROVED" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Department</span>
            <input name="department" defaultValue={initialValues.department} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Project Manager</span>
            <input name="projectManager" defaultValue={initialValues.projectManager} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Start Date</span>
            <input type="date" name="startDate" defaultValue={initialValues.startDate} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">End Date</span>
            <input type="date" name="endDate" defaultValue={initialValues.endDate} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Total Budget</span>
            <input name="totalBudget" defaultValue={initialValues.totalBudget} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Allocated Budget</span>
            <input name="allocatedBudget" defaultValue={initialValues.allocatedBudget} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Actual Spent</span>
            <input name="actualSpent" defaultValue={initialValues.actualSpent} className="erp-input" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea
              name="description"
              defaultValue={initialValues.description}
              className="erp-input min-h-[96px]"
            />
          </label>
          <label className="inline-flex items-center gap-2 md:col-span-2">
            <input type="checkbox" name="isActive" defaultChecked={initialValues.isActive} />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex justify-end gap-2">
        <Link
          href="/procurement/organization/projects"
          className="inline-flex items-center rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitText}
        </button>
      </div>
    </form>
  );
}
