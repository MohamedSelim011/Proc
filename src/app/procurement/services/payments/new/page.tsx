'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, CreditCard, Calendar, Building, FileText, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: {
    id: string;
    nameEn: string;
  };
  totalAmount: number;
  pendingAmount: number;
  currency: string;
  dueDate: string;
  status: string;
  paymentStatus: string;
}

export default function NewServicePaymentPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    bankAccount: '',
  });

  useEffect(() => {
    fetchApprovedInvoices();
  }, []);

  const fetchApprovedInvoices = async () => {
    try {
      const response = await fetch('/api/invoices?itemType=SERVICE&status=APPROVED');
      const data = await response.json();

      if (response.ok) {
        // Map all approved service invoices (matching the Service Payment Workbench behavior)
        const invoiceList: Invoice[] = data.invoices?.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          vendor: inv.vendor,
          totalAmount: inv.totalAmount,
          pendingAmount: inv.totalAmount - (inv.amountPaid || 0),
          currency: inv.currency,
          dueDate: inv.dueDate,
          status: inv.status,
          paymentStatus: inv.paymentStatus || 'UNPAID'
        })) || [];
        setInvoices(invoiceList);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (selectedInvoices.length === 0) {
      newErrors.invoices = 'Please select at least one invoice';
    }
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }
    if (!formData.reference.trim()) {
      newErrors.reference = 'Payment reference is required';
    }
    if (!formData.bankAccount.trim()) {
      newErrors.bankAccount = 'Bank account is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotal = () => {
    return invoices
      .filter(inv => selectedInvoices.includes(inv.id))
      .reduce((sum, inv) => sum + (Number(inv.pendingAmount) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);

      const totalAmount = calculateTotal();
      const currency = invoices.find(inv => selectedInvoices.includes(inv.id))?.currency || 'OMR';

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceIds: selectedInvoices,
          paymentMethod: formData.paymentMethod,
          paymentDate: formData.paymentDate,
          reference: formData.reference,
          description: formData.description,
          bankAccount: formData.bankAccount,
          totalAmount,
          currency
        })
      });

      if (response.ok) {
        showToast('success', 'Payment processed successfully!');
        router.push('/procurement/services/payments');
      } else {
        const errorData = await response.json();
        showToast('error', errorData.error || 'Failed to process payment. Please try again.');
      }
    } catch (error) {
      showToast('error', 'An error occurred while processing the payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/procurement/services/payments"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Process Service Payment</h1>
          <p className="text-gray-600 mt-1">Select invoices and enter payment details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Invoices</h2>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              {selectedInvoices.length === invoices.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {errors.invoices && (
            <p className="mb-4 text-sm text-red-600">{errors.invoices}</p>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {invoices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No approved unpaid invoices found</p>
            ) : (
              invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedInvoices.includes(invoice.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectInvoice(invoice.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectInvoice(invoice.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
                          <span className="text-sm text-gray-500">
                            <Building className="h-3 w-3 inline mr-1" />
                            {invoice.vendor.nameEn}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Due: {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {(Number(invoice.pendingAmount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} {invoice.currency}
                      </p>
                      <p className="text-sm text-gray-500">Pending Amount</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedInvoices.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Selected: {selectedInvoices.length} invoice(s)
                </span>
                <span className="text-lg font-bold text-gray-900">
                  Total: {(calculateTotal() || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} OMR
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="ONLINE">Online Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              />
              {errors.paymentDate && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Reference <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="e.g., TXN-2024-12345"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              />
              {errors.reference && (
                <p className="mt-1 text-sm text-red-600">{errors.reference}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Account <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleChange}
                placeholder="e.g., ACC-123456789"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              />
              {errors.bankAccount && (
                <p className="mt-1 text-sm text-red-600">{errors.bankAccount}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              placeholder="Enter payment description or notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link
            href="/procurement/services/payments"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || selectedInvoices.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Process Payment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
