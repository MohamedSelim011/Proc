'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

export type UomFormValues = {
  externalId: string;
  code: string;
  name: string;
  abbreviation: string;
  type: string;
  isActive: boolean;
};

type UomFormProps = {
  title: string;
  subtitle: string;
  submitText: string;
  initialValues: UomFormValues;
  loading: boolean;
  error: string | null;
  onSubmit: (values: UomFormValues) => Promise<void>;
};

export function UomForm({
  title,
  subtitle,
  submitText,
  initialValues,
  loading,
  error,
  onSubmit,
}: UomFormProps) {
  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await onSubmit({
          externalId: String(formData.get('externalId') || '').trim(),
          code: String(formData.get('code') || '').trim().toUpperCase(),
          name: String(formData.get('name') || '').trim(),
          abbreviation: String(formData.get('abbreviation') || '').trim(),
          type: String(formData.get('type') || '').trim().toUpperCase(),
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
          href="/procurement/organization/uom"
          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Code *</span>
            <input name="code" defaultValue={initialValues.code} required className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Name *</span>
            <input name="name" defaultValue={initialValues.name} required className="erp-input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Abbreviation *</span>
            <input
              name="abbreviation"
              defaultValue={initialValues.abbreviation}
              required
              className="erp-input"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Type *</span>
            <select name="type" defaultValue={initialValues.type} required className="erp-input">
              <option value="WEIGHT">WEIGHT</option>
              <option value="VOLUME">VOLUME</option>
              <option value="LENGTH">LENGTH</option>
              <option value="AREA">AREA</option>
              <option value="COUNT">COUNT</option>
              <option value="TIME">TIME</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">External ID</span>
            <input name="externalId" defaultValue={initialValues.externalId} className="erp-input" />
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
          href="/procurement/organization/uom"
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

