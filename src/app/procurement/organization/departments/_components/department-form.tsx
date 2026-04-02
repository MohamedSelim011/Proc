'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

export type DepartmentFormValues = {
  externalId: string;
  name: string;
  code: string;
  type: string;
  costCenterCode: string;
  parentExternalId: string;
  description: string;
  isActive: boolean;
};

type DepartmentFormProps = {
  title: string;
  subtitle: string;
  submitText: string;
  initialValues: DepartmentFormValues;
  loading: boolean;
  error: string | null;
  onSubmit: (values: DepartmentFormValues) => Promise<void>;
};

export function DepartmentForm({
  title,
  subtitle,
  submitText,
  initialValues,
  loading,
  error,
  onSubmit,
}: DepartmentFormProps) {
  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await onSubmit({
          externalId: String(formData.get('externalId') || '').trim(),
          name: String(formData.get('name') || '').trim(),
          code: String(formData.get('code') || '').trim(),
          type: String(formData.get('type') || '').trim(),
          costCenterCode: String(formData.get('costCenterCode') || '').trim(),
          parentExternalId: String(formData.get('parentExternalId') || '').trim(),
          description: String(formData.get('description') || '').trim(),
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
          href="/procurement/organization/departments"
          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Department Name *</span>
            <input name="name" defaultValue={initialValues.name} required className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Code</span>
            <input name="code" defaultValue={initialValues.code} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">External ID</span>
            <input name="externalId" defaultValue={initialValues.externalId} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Type</span>
            <input name="type" defaultValue={initialValues.type} className="erp-input" placeholder="department" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Cost Center Code</span>
            <input name="costCenterCode" defaultValue={initialValues.costCenterCode} className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Parent External ID</span>
            <input name="parentExternalId" defaultValue={initialValues.parentExternalId} className="erp-input" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea
              name="description"
              defaultValue={initialValues.description}
              className="erp-input min-h-[96px]"
            />
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="isActive" defaultChecked={initialValues.isActive} />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex justify-end gap-2">
        <Link
          href="/procurement/organization/departments"
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
