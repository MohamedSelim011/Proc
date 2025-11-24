'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  AlertCircle,
  CheckCircle,
  FileText,
  Calculator,
  Shield,
  AlertTriangle,
  XCircle,
  Package
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  subtotal: number;
  taxRate: number;
  paymentTerms: string;
  description?: string;
  status: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
  };
  po?: {
    id: string;
    poNumber: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    description?: string;
    item: {
      id: string;
      itemCode: string;
      nameEn: string;
    };
  }>;
}

interface InvoiceFormData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  paymentTerms: string;
  description?: string;
  taxRate: number;
  discountAmount: number;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    description?: string;
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

function EditInvoiceContent() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    currency: 'OMR',
    paymentTerms: 'Net 30 days',
    description: '',
    taxRate: 5,
    discountAmount: 0,
    items: [],
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  useEffect(() => {
    // Recalculate totals when items, tax rate, or discount change
    calculateTotals();
  }, [formData.items, formData.taxRate, formData.discountAmount]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const data = await response.json();
      
      if (response.ok) {
        setInvoice(data);
        
        // Initialize form data
        setFormData({
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate.split('T')[0],
          dueDate: data.dueDate.split('T')[0],
          currency: data.currency,
          paymentTerms: data.paymentTerms || 'Net 30 days',
          description: data.description || '',
          taxRate: ((data.taxAmount / (data.totalAmount - data.taxAmount + data.discountAmount)) * 100) || 5,
          discountAmount: data.discountAmount || 0,
          items: data.items.map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            description: item.description
          })),
          subtotal: data.totalAmount - data.taxAmount + data.discountAmount,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount
        });
      } else {
        setErrors({ fetch: data.error || 'Failed to fetch invoice' });
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setErrors({ fetch: 'Failed to fetch invoice' });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = subtotal * (formData.taxRate / 100);
    const totalAmount = subtotal + taxAmount - formData.discountAmount;

    setFormData(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      totalAmount
    }));
  };

  const updateItemField = (index: number, field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value };
          
          // Recalculate total price when quantity or unit price changes
          if (field === 'quantity' || field === 'unitPrice') {
            updated.totalPrice = updated.quantity * updated.unitPrice;
          }
          
          return updated;
        }
        return item;
      })
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoiceNumber) newErrors.invoiceNumber = 'Invoice number is required';
    if (!formData.invoiceDate) newErrors.invoiceDate = 'Invoice date is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const submitData = {
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        currency: formData.currency,
        paymentTerms: formData.paymentTerms,
        description: formData.description,
        totalAmount: formData.totalAmount,
        taxAmount: formData.taxAmount,
        discountAmount: formData.discountAmount,
        items: formData.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          description: item.description
        }))
      };

      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/procurement/invoices/${invoiceId}`);
      } else {
        console.error('Error updating invoice:', data.error);
        setErrors({ submit: data.error || 'Failed to update invoice' });
      }
    } catch (error) {
      console.error('Error submitting invoice:', error);
      setErrors({ submit: 'Failed to update invoice' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">Invoice not found</h2>
        <p className="mt-2 text-gray-600">The invoice you're looking for doesn't exist or you don't have permission to edit it.</p>
      </div>
    );
  }

  if (invoice.status !== 'DRAFT') {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">Cannot Edit Invoice</h2>
        <p className="mt-2 text-gray-600">Only draft invoices can be edited. This invoice has status: {invoice.status}</p>
        <button
          onClick={() => router.push(`/procurement/invoices/${invoiceId}`)}
          className="mt-4 px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover"
        >
          View Invoice
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push(`/procurement/invoices/${invoiceId}`)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
            <p className="mt-2 text-sm text-gray-600">
              Edit invoice {invoice.invoiceNumber} for {invoice.vendor.nameEn}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          {/* Invoice Details */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Invoice Details</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary ${
                    errors.invoiceNumber ? 'border-red-300' : ''
                  }`}
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                />
                {errors.invoiceNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="OMR">Omani Rial (OMR)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary ${
                    errors.invoiceDate ? 'border-red-300' : ''
                  }`}
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                />
                {errors.invoiceDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Due Date *
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary ${
                    errors.dueDate ? 'border-red-300' : ''
                  }`}
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Terms
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
              >
                <option value="Net 30 days">Net 30 days</option>
                <option value="Net 45 days">Net 45 days</option>
                <option value="Net 60 days">Net 60 days</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Advance Payment">Advance Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Invoice description or notes..."
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Invoice Line Items</h3>
            
            {errors.items && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errors.items}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity *
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price *
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item, index) => {
                    const invoiceItem = invoice.items.find(i => i.id === item.id);
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {invoiceItem?.item.itemCode}
                            </div>
                            <div className="text-sm text-gray-500">{invoiceItem?.item.nameEn}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="block w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-sm"
                            value={item.quantity}
                            onChange={(e) => updateItemField(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                              {formData.currency}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="pl-12 block w-32 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-sm"
                              value={item.unitPrice}
                              onChange={(e) => updateItemField(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Invoice Totals
              </h4>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                    value={formData.taxRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Discount Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      {formData.currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-12 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-sm font-medium">{formatCurrency(formData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax:</span>
                    <span className="text-sm font-medium">{formatCurrency(formData.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Discount:</span>
                    <span className="text-sm font-medium">-{formatCurrency(formData.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-base font-medium text-gray-900">Total:</span>
                    <span className="text-base font-bold text-gray-900">{formatCurrency(formData.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => router.push(`/procurement/invoices/${invoiceId}`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditInvoice() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    }>
      <EditInvoiceContent />
    </Suspense>
  );
}