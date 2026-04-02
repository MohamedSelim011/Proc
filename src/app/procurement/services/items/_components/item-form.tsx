'use client';

import { useMemo, useState } from 'react';

export type ProcurementItemFormValues = {
  externalId: string;
  itemCode: string;
  nameEn: string;
  nameAr: string;
  description: string;
  categoryId: string;
  unitOfMeasure: string;
  minStockLevel: string;
  maxStockLevel: string;
  reorderPoint: string;
};

type ItemFormProps = {
  title: string;
  subtitle: string;
  submitText: string;
  initialValues: ProcurementItemFormValues;
  loading?: boolean;
  error?: string | null;
  showExternalIdField?: boolean;
  onSubmit: (values: ProcurementItemFormValues) => Promise<void>;
};

export function ItemForm({
  title,
  subtitle,
  submitText,
  initialValues,
  loading = false,
  error = null,
  showExternalIdField = true,
  onSubmit,
}: ItemFormProps) {
  const [form, setForm] = useState<ProcurementItemFormValues>(initialValues);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.itemCode.trim() &&
        form.nameEn.trim() &&
        form.nameAr.trim() &&
        form.categoryId.trim() &&
        form.unitOfMeasure.trim(),
    );
  }, [form]);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(form);
      }}
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Core Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {showExternalIdField ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">External ID</label>
              <input
                className="erp-input"
                value={form.externalId}
                onChange={(e) => setForm((prev) => ({ ...prev, externalId: e.target.value }))}
                placeholder="Used for integration sync"
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Item Code *</label>
            <input
              className="erp-input"
              value={form.itemCode}
              onChange={(e) => setForm((prev) => ({ ...prev, itemCode: e.target.value }))}
              placeholder="ITEM-0001"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Category ID *</label>
            <input
              className="erp-input"
              value={form.categoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              placeholder="Category ID"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">English Name *</label>
            <input
              className="erp-input"
              value={form.nameEn}
              onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
              placeholder="Item name"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Arabic Name *</label>
            <input
              className="erp-input"
              value={form.nameAr}
              onChange={(e) => setForm((prev) => ({ ...prev, nameAr: e.target.value }))}
              placeholder="الاسم العربي"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Unit of Measure *</label>
            <input
              className="erp-input"
              value={form.unitOfMeasure}
              onChange={(e) => setForm((prev) => ({ ...prev, unitOfMeasure: e.target.value }))}
              placeholder="EA"
              required
            />
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
            <textarea
              className="erp-input min-h-[90px]"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Item description"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Stock Controls</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Min Stock Level</label>
            <input
              type="number"
              className="erp-input"
              value={form.minStockLevel}
              onChange={(e) => setForm((prev) => ({ ...prev, minStockLevel: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Max Stock Level</label>
            <input
              type="number"
              className="erp-input"
              value={form.maxStockLevel}
              onChange={(e) => setForm((prev) => ({ ...prev, maxStockLevel: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Reorder Point</label>
            <input
              type="number"
              className="erp-input"
              value={form.reorderPoint}
              onChange={(e) => setForm((prev) => ({ ...prev, reorderPoint: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="rounded-md bg-wujha-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Saving...' : submitText}
        </button>
      </div>
    </form>
  );
}
