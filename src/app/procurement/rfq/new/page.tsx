'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Building, 
  Users,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

interface PurchaseRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  estimatedCost: number;
  status: string;
  justification?: string;
  hasRFQ?: boolean;
  rfqNumber?: string;
  items: {
    id: string;
    item: {
      nameEn: string;
      specifications?: string;
    };
    quantity: number;
    estimatedPrice: number;
  }[];
}

interface Vendor {
  id: string;
  nameEn: string;
  categories: {
    category: {
      nameEn: string;
    };
  }[];
}

interface RFQFormData {
  prId: string;
  title: string;
  description: string;
  closingDate: string;
  status: 'DRAFT' | 'PUBLISHED';
  selectedVendors: Vendor[];
  evaluationCriteria: {
    technical: number;
    commercial: number;
    delivery: number;
    experience: number;
  };
  termsAndConditions: string;
}

export default function NewRFQPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
  
  const [formData, setFormData] = useState<RFQFormData>({
    prId: '',
    title: '',
    description: '',
    closingDate: '',
    status: 'DRAFT',
    selectedVendors: [],
    evaluationCriteria: {
      technical: 40,
      commercial: 30,
      delivery: 20,
      experience: 10
    },
    termsAndConditions: ''
  });

  useEffect(() => {
    fetchPurchaseRequisitions();
    fetchVendors();
  }, []);

  const fetchPurchaseRequisitions = async () => {
    try {
      const response = await fetch('/api/purchase-requisitions?status=APPROVED&includeRFQ=true');
      if (response.ok) {
        const data = await response.json();
        setPrs(data.requisitions || []);
      }
    } catch (error) {
      console.error('Error fetching PRs:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors?status=ACTIVE');
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handlePRSelect = (prId: string) => {
    const pr = prs.find(p => p.id === prId);
    setSelectedPR(pr || null);
    setFormData(prev => ({
      ...prev,
      prId,
      title: pr ? `${pr.prNumber} - RFQ` : '',
      description: pr ? `Request for quotation for ${pr.prNumber} (${pr.itemType} items)` : ''
    }));
  };

  const handleVendorToggle = (vendor: Vendor) => {
    setFormData(prev => ({
      ...prev,
      selectedVendors: prev.selectedVendors.find(v => v.id === vendor.id)
        ? prev.selectedVendors.filter(v => v.id !== vendor.id)
        : [...prev.selectedVendors, vendor]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (dataLoading) {
      showToast('warning', 'Please wait for data to load');
      return;
    }
    
    if (!formData.prId || !formData.title || !formData.closingDate) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    if (formData.selectedVendors.length === 0) {
      showToast('error', 'Please select at least one vendor');
      return;
    }

    try {
      setLoading(true);

      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const createdBy = userData.employeeId || userData.id || '';

      const rfqData = {
        prId: formData.prId,
        title: formData.title,
        description: formData.description,
        closingDate: formData.closingDate,
        status: formData.status,
        evaluationCriteria: JSON.stringify(formData.evaluationCriteria),
        termsAndConditions: formData.termsAndConditions,
        vendorIds: formData.selectedVendors.map(v => v.id),
        createdBy: createdBy
      };

      const response = await fetch('/api/rfq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rfqData),
      });

      if (response.ok) {
        const result = await response.json();
        showToast('success', 'RFQ created successfully');
        router.push(`/procurement/rfq/${result.id}`);
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to create RFQ');
      }
    } catch (error) {
      console.error('Error creating RFQ:', error);
      showToast('error', 'Failed to create RFQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/procurement/rfq"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New RFQ</h1>
          <p className="text-gray-600 mt-1">Create a new Request for Quotation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Loading Indicator */}
        {dataLoading && (
          <div className="bg-wujha-info/10 border border-wujha-info/20 rounded-lg p-4">
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-wujha-info mr-2" />
              <span className="text-sm text-wujha-info">Loading purchase requisitions and vendors...</span>
            </div>
          </div>
        )}

        {/* Purchase Requisition Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <FileText className="h-5 w-5 inline mr-2" />
            Select Purchase Requisition
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Requisition *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                value={formData.prId}
                onChange={(e) => handlePRSelect(e.target.value)}
                required
              >
                <option value="">Select a PR</option>
                {prs.map((pr) => (
                  <option 
                    key={pr.id} 
                    value={pr.id}
                    disabled={pr.hasRFQ}
                    style={pr.hasRFQ ? { color: '#999', fontStyle: 'italic' } : {}}
                  >
                    {pr.prNumber} - {pr.itemType} Items
                    {pr.hasRFQ ? ` (RFQ Already Created: ${pr.rfqNumber})` : ''}
                  </option>
                ))}
                {/* Debug info */}
                {prs.length === 0 && (
                  <option disabled>No PRs available</option>
                )}
              </select>
            </div>
            
            {selectedPR && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">PR Details</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Number:</strong> {selectedPR.prNumber}</p>
                  <p><strong>Type:</strong> {selectedPR.itemType}</p>
                  <p><strong>Estimated Cost:</strong> {selectedPR.estimatedCost.toLocaleString()} OMR</p>
                  <p><strong>Items:</strong> {selectedPR.items.length}</p>
                  {selectedPR.justification && (
                    <p><strong>Justification:</strong> {selectedPR.justification}</p>
                  )}
                  <div className="mt-2">
                    <p className="font-medium text-gray-700">Item Details:</p>
                    {selectedPR.items.map((item, index) => (
                      <div key={item.id} className="ml-2 text-xs text-gray-600">
                        • {item.item.nameEn} - Qty: {item.quantity} @ {item.estimatedPrice} OMR
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RFQ Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <FileText className="h-5 w-5 inline mr-2" />
            RFQ Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Date *
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                value={formData.closingDate}
                onChange={(e) => setFormData(prev => ({ ...prev, closingDate: e.target.value }))}
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Vendor Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <Users className="h-5 w-5 inline mr-2" />
            Select Vendors
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  formData.selectedVendors.find(v => v.id === vendor.id)
                    ? 'border-wujha-primary bg-wujha-primary/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleVendorToggle(vendor)}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.selectedVendors.find(v => v.id === vendor.id) !== undefined}
                    onChange={() => {}}
                    className="h-4 w-4 text-wujha-primary focus:ring-wujha-primary border-gray-300 rounded"
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{vendor.nameEn}</h3>
                    <p className="text-sm text-gray-500">
                      {vendor.categories.map(c => c.category.nameEn).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {formData.selectedVendors.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No vendors selected</p>
          )}
        </div>

        {/* Evaluation Criteria */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <FileText className="h-5 w-5 inline mr-2" />
            Evaluation Criteria (Total: 100%)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(formData.evaluationCriteria).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {key} (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                  value={value}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    setFormData(prev => ({
                      ...prev,
                      evaluationCriteria: {
                        ...prev.evaluationCriteria,
                        [key]: newValue
                      }
                    }));
                  }}
                />
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Total: {Object.values(formData.evaluationCriteria).reduce((sum, val) => sum + val, 0)}%
            </p>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <FileText className="h-5 w-5 inline mr-2" />
            Terms and Conditions
          </h2>
          
          <textarea
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
            placeholder="Enter terms and conditions for the RFQ..."
            value={formData.termsAndConditions}
            onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/procurement/rfq"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          
          <button
            type="submit"
            disabled={loading || dataLoading}
            className="px-6 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Create RFQ</span>
          </button>
        </div>
      </form>
    </div>
  );
} 