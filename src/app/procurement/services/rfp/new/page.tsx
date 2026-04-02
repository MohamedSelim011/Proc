'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { SearchableSelect } from '@/components/common/searchable-select';

interface ServiceRequisitionOption {
  id: string;
  prNumber: string;
  estimatedCost?: number | string;
  departmentId?: string;
  itemType?: string;
  servicePR?: {
    paymentTerms?: string | null;
    duration?: number | string;
    durationUnit?: string | null;
    items?: Array<{
      quantity?: number | string;
      estimatedRate?: number | string;
      duration?: number | string;
    }>;
  };
  items?: Array<{
    quantity?: number | string;
    estimatedPrice?: number | string;
  }>;
  serviceRFP?: {
    id: string;
    rfpNumber: string;
    status: string;
  } | null;
}

interface VendorOption {
  id: string;
  nameEn: string;
  email?: string;
  status?: string;
}

interface Criterion {
  name: string;
  weight: number;
}

const buildDefaultDeadline = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default function NewServiceRFPPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requisitions, setRequisitions] = useState<ServiceRequisitionOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    prId: '',
    title: '',
    description: '',
    submissionDeadline: buildDefaultDeadline(),
    serviceLevelAgreements: '',
    paymentTerms: '',
    contractDurationValue: '',
    contractDurationUnit: 'DAYS',
    confidentialityClause: '',
  });

  const [criteria, setCriteria] = useState<Criterion[]>([
    { name: 'Technical Capability', weight: 40 },
    { name: 'Commercial Value', weight: 40 },
    { name: 'Delivery & Timeline', weight: 20 },
  ]);

  const toNumber = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getRequisitionTotalValue = (requisition: ServiceRequisitionOption) => {
    const serviceTotal = (requisition.servicePR?.items || []).reduce((sum, item) => {
      const quantity = toNumber(item.quantity);
      const estimatedRate = toNumber(item.estimatedRate);
      const duration = Math.max(toNumber(item.duration) || 1, 1);
      return sum + quantity * estimatedRate * duration;
    }, 0);

    const materialTotal = (requisition.items || []).reduce((sum, item) => {
      return sum + toNumber(item.quantity) * toNumber(item.estimatedPrice);
    }, 0);

    const computed = serviceTotal + materialTotal;
    if (computed > 0) return computed;
    return toNumber(requisition.estimatedCost);
  };

  const normalizeDurationUnit = (value: unknown) => {
    const normalized = String(value || '').trim().toUpperCase();
    const allowed = new Set(['HOURS', 'DAYS', 'WEEKS', 'MONTHS', 'YEARS']);
    return allowed.has(normalized) ? normalized : 'DAYS';
  };

  const totalWeight = useMemo(
    () => criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0),
    [criteria]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [reqRes, vendorRes] = await Promise.all([
          fetch('/api/services/requisitions?status=APPROVED&limit=300'),
          fetch('/api/vendors?limit=1000'),
        ]);

        const [reqData, vendorData] = await Promise.all([reqRes.json(), vendorRes.json()]);

        if (reqRes.ok) {
          const all = (reqData.serviceRequisitions || []) as ServiceRequisitionOption[];
          setRequisitions(all.filter((r) => !r.serviceRFP));
        }

        if (vendorRes.ok) {
          const allVendors = (vendorData.vendors || []) as VendorOption[];
          setVendors(allVendors.filter((v) => !v.status || v.status === 'ACTIVE'));
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
        showToast('error', 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [showToast]);

  const handleCriterionChange = (index: number, field: keyof Criterion, value: string) => {
    setCriteria((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === 'weight' ? Number(value || 0) : value,
            }
          : item
      )
    );
  };

  const addCriterion = () => {
    setCriteria((prev) => [...prev, { name: '', weight: 0 }]);
  };

  const removeCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleVendor = (vendorId: string) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.prId) nextErrors.prId = 'Service requisition is required';
    if (!form.title.trim()) nextErrors.title = 'RFP title is required';
    if (!form.submissionDeadline) {
      nextErrors.submissionDeadline = 'Submission deadline is required';
    } else if (new Date(form.submissionDeadline) <= new Date()) {
      nextErrors.submissionDeadline = 'Submission deadline must be in the future';
    }

    const validCriteria = criteria.filter((c) => c.name.trim() && Number(c.weight) > 0);
    if (validCriteria.length === 0) {
      nextErrors.criteria = 'Add at least one evaluation criterion';
    } else if (totalWeight !== 100) {
      nextErrors.criteria = 'Evaluation criteria total weight must equal 100%';
    }

    if (selectedVendors.length === 0) {
      nextErrors.invitedVendors = 'Select at least one vendor';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const validCriteria = criteria
        .filter((c) => c.name.trim() && Number(c.weight) > 0)
        .map((c) => ({ name: c.name.trim(), weight: Number(c.weight) }));

      const termsAndConditions = {
        serviceLevelAgreements: form.serviceLevelAgreements.trim() || undefined,
        paymentTerms: form.paymentTerms.trim() || undefined,
        contractDuration:
          Number(form.contractDurationValue) > 0
            ? `${Number(form.contractDurationValue)} ${form.contractDurationUnit}`
            : undefined,
        confidentialityClause: form.confidentialityClause.trim() || undefined,
      };

      const payload = {
        prId: form.prId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        submissionDeadline: new Date(form.submissionDeadline).toISOString(),
        evaluationCriteria: validCriteria,
        termsAndConditions,
        invitedVendors: selectedVendors,
        createdBy:
          (typeof window !== 'undefined' && localStorage.getItem('userId')) ||
          (typeof window !== 'undefined' && localStorage.getItem('email')) ||
          'SYSTEM',
      };

      const response = await fetch('/api/services/rfp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        showToast('error', data.error || 'Failed to create Service RFP');
        return;
      }

      showToast('success', 'Service RFP created successfully');
      router.push(`/procurement/services/rfp/${data.id}`);
    } catch (error) {
      console.error('Failed to create Service RFP:', error);
      showToast('error', 'Failed to create Service RFP');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-wujha-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/procurement/services/rfp')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Service RFPs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">New Service RFP</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and configure a new service Request for Proposal
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Requisition *</label>
            <SearchableSelect
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
              value={form.prId}
              onChange={(e) => {
                const prId = e.target.value;
                const selected = requisitions.find((r) => r.id === prId);
                const selectedPaymentTerms = (selected?.servicePR?.paymentTerms || '').trim();
                const selectedDurationValue = toNumber(selected?.servicePR?.duration);
                const selectedDurationUnit = normalizeDurationUnit(selected?.servicePR?.durationUnit);
                setForm((prev) => ({
                  ...prev,
                  prId,
                  paymentTerms: selectedPaymentTerms,
                  contractDurationValue:
                    selected && selectedDurationValue > 0 ? String(selectedDurationValue) : '',
                  contractDurationUnit: selectedDurationUnit,
                  title:
                    prev.title.trim() && !prev.title.startsWith('RFP for ')
                      ? prev.title
                      : selected?.prNumber
                      ? `RFP for ${selected.prNumber}`
                      : prev.title,
                }));
              }}
            >
              <option value="">Select approved service requisition</option>
              {requisitions.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.prNumber} (OMR {getRequisitionTotalValue(req).toFixed(3)})
                </option>
              ))}
            </SearchableSelect>
            {errors.prId && <p className="mt-1 text-sm text-red-600">{errors.prId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline *</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
              value={form.submissionDeadline}
              onChange={(e) => setForm((prev) => ({ ...prev, submissionDeadline: e.target.value }))}
            />
            {errors.submissionDeadline && (
              <p className="mt-1 text-sm text-red-600">{errors.submissionDeadline}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">RFP Title *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Enter RFP title"
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the scope and expectations for vendors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Evaluation Criteria *</label>
            <button
              type="button"
              onClick={addCriterion}
              className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-xs text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </button>
          </div>
          <div className="space-y-2">
            {criteria.map((criterion, index) => (
              <div key={index} className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  className="col-span-8 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={criterion.name}
                  onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                  placeholder="Criterion name"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={criterion.weight}
                  onChange={(e) => handleCriterionChange(index, 'weight', e.target.value)}
                  placeholder="%"
                />
                <button
                  type="button"
                  onClick={() => removeCriterion(index)}
                  className="col-span-1 inline-flex items-center justify-center rounded-lg border border-gray-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <p className={`mt-2 text-xs ${totalWeight === 100 ? 'text-green-600' : 'text-amber-600'}`}>
            Total weight: {totalWeight}% (must equal 100%)
          </p>
          {errors.criteria && <p className="mt-1 text-sm text-red-600">{errors.criteria}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Invite Vendors *</label>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
            {vendors.length === 0 ? (
              <p className="text-sm text-gray-500">No active vendors found</p>
            ) : (
              vendors.map((vendor) => (
                <label key={vendor.id} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-wujha-primary focus:ring-wujha-primary border-gray-300 rounded"
                    checked={selectedVendors.includes(vendor.id)}
                    onChange={() => toggleVendor(vendor.id)}
                  />
                  <span className="text-sm text-gray-800">
                    {vendor.nameEn}
                    <span className="text-gray-500"> ({vendor.email || 'No email'})</span>
                  </span>
                </label>
              ))
            )}
          </div>
          {errors.invitedVendors && (
            <p className="mt-1 text-sm text-red-600">{errors.invitedVendors}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Level Agreements</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
              value={form.serviceLevelAgreements}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, serviceLevelAgreements: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 cursor-not-allowed"
              value={form.paymentTerms}
              readOnly
              disabled
              placeholder="Payment terms will be loaded from the selected service request"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Duration</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                value={form.contractDurationValue}
                onChange={(e) => setForm((prev) => ({ ...prev, contractDurationValue: e.target.value }))}
                placeholder="e.g. 12"
              />
              <SearchableSelect
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                value={form.contractDurationUnit}
                onChange={(e) => setForm((prev) => ({ ...prev, contractDurationUnit: e.target.value }))}
              >
                <option value="HOURS">Hours</option>
                <option value="DAYS">Days</option>
                <option value="WEEKS">Weeks</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </SearchableSelect>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confidentiality Clause</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
              value={form.confidentialityClause}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, confidentialityClause: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/procurement/services/rfp')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Service RFP
          </button>
        </div>
      </div>
    </div>
  );
}
