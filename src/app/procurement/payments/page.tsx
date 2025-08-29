'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  FileText,
  Calendar,
  Building,
  Banknote
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  vendor: {
    id: string;
    nameEn: string;
    email: string;
    bankAccount?: string;
    bankName?: string;
    iban?: string;
  };
  po?: {
    poNumber: string;
  };
}

interface PaymentBatch {
  id: string;
  batchNumber: string;
  batchDate: string;
  status: 'DRAFT' | 'APPROVED' | 'PROCESSED' | 'COMPLETED';
  totalAmount: number;
  currency: string;
  invoiceCount: number;
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'WIRE';
  createdAt: string;
}

interface PaymentFormData {
  selectedInvoices: string[];
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'WIRE';
  paymentDate: string;
  reference: string;
  description?: string;
  bankAccount?: string;
  totalAmount: number;
}

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');

  const [activeTab, setActiveTab] = useState<'pending' | 'batches'>('pending');
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    selectedInvoices: invoiceId ? [invoiceId] : [],
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    totalAmount: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    vendorId: '',
    currency: '',
    dueDate: '',
    search: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPendingInvoices();
    fetchPaymentBatches();
  }, []);

  useEffect(() => {
    if (invoiceId) {
      setShowPaymentForm(true);
    }
  }, [invoiceId]);

  useEffect(() => {
    // Calculate total amount for selected invoices
    const selectedInvoiceData = pendingInvoices.filter(inv => 
      paymentForm.selectedInvoices.includes(inv.id)
    );
    const totalAmount = selectedInvoiceData.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    setPaymentForm(prev => ({ ...prev, totalAmount }));
  }, [paymentForm.selectedInvoices, pendingInvoices]);

  const fetchPendingInvoices = async () => {
    try {
      setLoading(true);
      // Fetch invoices with UNPAID or PARTIAL payment status
      const unpaidResponse = await fetch('/api/invoices?status=APPROVED&paymentStatus=UNPAID');
      const partialResponse = await fetch('/api/invoices?status=APPROVED&paymentStatus=PARTIAL');
      
      const [unpaidData, partialData] = await Promise.all([
        unpaidResponse.json(),
        partialResponse.json()
      ]);
      
      if (unpaidResponse.ok && partialResponse.ok) {
        const allInvoices = [
          ...(unpaidData.invoices || []),
          ...(partialData.invoices || [])
        ];
        setPendingInvoices(allInvoices);
      }
    } catch (error) {
      console.error('Error fetching pending invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentBatches = async () => {
    try {
      const response = await fetch('/api/payment-batches');
      const data = await response.json();
      if (response.ok) {
        setPaymentBatches(data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching payment batches:', error);
    }
  };

  const handleInvoiceSelection = (invoiceId: string, selected: boolean) => {
    setPaymentForm(prev => ({
      ...prev,
      selectedInvoices: selected 
        ? [...prev.selectedInvoices, invoiceId]
        : prev.selectedInvoices.filter(id => id !== invoiceId)
    }));
  };

  const handleSelectAll = (selected: boolean) => {
    setPaymentForm(prev => ({
      ...prev,
      selectedInvoices: selected ? filteredInvoices.map(inv => inv.id) : []
    }));
  };

  const validatePaymentForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (paymentForm.selectedInvoices.length === 0) {
      newErrors.invoices = 'At least one invoice must be selected';
    }
    if (!paymentForm.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }
    if (!paymentForm.reference) {
      newErrors.reference = 'Payment reference is required';
    }
    if (paymentForm.paymentMethod === 'BANK_TRANSFER' && !paymentForm.bankAccount) {
      newErrors.bankAccount = 'Bank account is required for bank transfers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProcessPayment = async () => {
    if (!validatePaymentForm()) return;

    try {
      setProcessing(true);

      const selectedInvoiceData = pendingInvoices.filter(inv => 
        paymentForm.selectedInvoices.includes(inv.id)
      );

      const paymentData = {
        invoiceIds: paymentForm.selectedInvoices,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        reference: paymentForm.reference,
        description: paymentForm.description,
        bankAccount: paymentForm.bankAccount,
        totalAmount: paymentForm.totalAmount,
        currency: selectedInvoiceData[0]?.currency || 'OMR'
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form and refresh data
        setShowPaymentForm(false);
        setPaymentForm({
          selectedInvoices: [],
          paymentMethod: 'BANK_TRANSFER',
          paymentDate: new Date().toISOString().split('T')[0],
          reference: '',
          totalAmount: 0
        });
        fetchPendingInvoices();
        fetchPaymentBatches();
        setActiveTab('batches');
      } else {
        setErrors({ submit: data.error || 'Failed to process payment' });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setErrors({ submit: 'Failed to process payment' });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'OMR') => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PROCESSED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = pendingInvoices.filter(invoice => {
    if (filters.vendorId && !invoice.vendor.id.includes(filters.vendorId)) return false;
    if (filters.currency && invoice.currency !== filters.currency) return false;
    if (filters.search && !invoice.invoiceNumber.toLowerCase().includes(filters.search.toLowerCase()) && 
        !invoice.vendor.nameEn.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const calculateSummaryStats = () => {
    const totalPending = filteredInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const overdueInvoices = filteredInvoices.filter(inv => getDaysUntilDue(inv.dueDate) < 0);
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const dueSoon = filteredInvoices.filter(inv => {
      const days = getDaysUntilDue(inv.dueDate);
      return days >= 0 && days <= 7;
    });
    const totalDueSoon = dueSoon.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    return {
      totalPending,
      totalOverdue,
      totalDueSoon,
      overdueCount: overdueInvoices.length,
      dueSoonCount: dueSoon.length
    };
  };

  const stats = calculateSummaryStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Workbench</h1>
          <p className="mt-2 text-sm text-gray-700">
            Process vendor payments and manage payment batches
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={() => setShowPaymentForm(true)}
            disabled={filteredInvoices.length === 0}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Process Payment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalPending)}</dd>
                  <dd className="text-xs text-gray-500">{filteredInvoices.length} invoices</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                  <dd className="text-lg font-medium text-red-600">{formatCurrency(stats.totalOverdue)}</dd>
                  <dd className="text-xs text-gray-500">{stats.overdueCount} invoices</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Due Soon</dt>
                  <dd className="text-lg font-medium text-yellow-600">{formatCurrency(stats.totalDueSoon)}</dd>
                  <dd className="text-xs text-gray-500">{stats.dueSoonCount} invoices</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Banknote className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Payment Batches</dt>
                  <dd className="text-lg font-medium text-gray-900">{paymentBatches.length}</dd>
                  <dd className="text-xs text-gray-500">This month</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Invoices ({filteredInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'batches'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payment Batches ({paymentBatches.length})
          </button>
        </nav>
      </div>

      {/* Pending Invoices Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Search invoices..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <div>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={filters.currency}
                  onChange={(e) => setFilters(prev => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="">All Currencies</option>
                  <option value="OMR">OMR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Vendor ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={filters.vendorId}
                  onChange={(e) => setFilters(prev => ({ ...prev, vendorId: e.target.value }))}
                />
              </div>

              <div>
                <button
                  onClick={() => {
                    setFilters({ vendorId: '', currency: '', dueDate: '', search: '' });
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Selection */}
          {paymentForm.selectedInvoices.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-900">
                    {paymentForm.selectedInvoices.length} invoice(s) selected
                  </h4>
                  <p className="text-sm text-blue-700">
                    Total amount: {formatCurrency(paymentForm.totalAmount)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowPaymentForm(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Process Payment
                  </button>
                  <button
                    onClick={() => setPaymentForm(prev => ({ ...prev, selectedInvoices: [] }))}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Invoices Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Pending Invoices ({filteredInvoices.length})
                  </h3>
                  <div className="flex items-center">
                    <input
                      id="select-all"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={paymentForm.selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                    <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
                      Select All
                    </label>
                  </div>
                </div>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Select
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank Details
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => {
                      const daysUntilDue = getDaysUntilDue(invoice.dueDate);
                      const isSelected = paymentForm.selectedInvoices.includes(invoice.id);
                      
                      return (
                        <tr key={invoice.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={isSelected}
                              onChange={(e) => handleInvoiceSelection(invoice.id, e.target.checked)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {invoice.invoiceNumber}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(invoice.invoiceDate)}
                                </div>
                                {invoice.po && (
                                  <div className="text-xs text-blue-600">
                                    PO: {invoice.po.poNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{invoice.vendor.nameEn}</div>
                            <div className="text-sm text-gray-500">{invoice.vendor.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(invoice.dueDate)}
                            </div>
                            <div className={`text-xs ${
                              daysUntilDue < 0 
                                ? 'text-red-600' 
                                : daysUntilDue <= 7 
                                  ? 'text-yellow-600' 
                                  : 'text-gray-500'
                            }`}>
                              {daysUntilDue < 0 
                                ? `${Math.abs(daysUntilDue)} days overdue`
                                : daysUntilDue === 0
                                  ? 'Due today'
                                  : `${daysUntilDue} days left`
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {invoice.vendor.bankName || 'Not provided'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {invoice.vendor.iban || invoice.vendor.bankAccount || 'No account info'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleInvoiceSelection(invoice.id, !isSelected)}
                                className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded ${
                                  isSelected 
                                    ? 'text-blue-700 bg-blue-100 hover:bg-blue-200' 
                                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                                }`}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                {isSelected ? 'Selected' : 'Select'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Batches Tab */}
      {activeTab === 'batches' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Payment Batches ({paymentBatches.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount & Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Banknote className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {batch.batchNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(batch.batchDate)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(Number(batch.totalAmount), batch.currency)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {batch.invoiceCount} invoice{batch.invoiceCount > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {batch.paymentMethod === 'BANK_TRANSFER' && <Building className="h-4 w-4 text-gray-400 mr-2" />}
                        {batch.paymentMethod === 'CHECK' && <FileText className="h-4 w-4 text-gray-400 mr-2" />}
                        {batch.paymentMethod === 'CASH' && <DollarSign className="h-4 w-4 text-gray-400 mr-2" />}
                        <span className="text-sm text-gray-900">
                          {batch.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(batch.status)}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(batch.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Process Payment
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Payment Method *
                        </label>
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={paymentForm.paymentMethod}
                          onChange={(e) => setPaymentForm(prev => ({ 
                            ...prev, 
                            paymentMethod: e.target.value as PaymentFormData['paymentMethod']
                          }))}
                        >
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CHECK">Check</option>
                          <option value="WIRE">Wire Transfer</option>
                          <option value="CASH">Cash</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Payment Date *
                        </label>
                        <input
                          type="date"
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                            errors.paymentDate ? 'border-red-300' : ''
                          }`}
                          value={paymentForm.paymentDate}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                        />
                        {errors.paymentDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.paymentDate}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Payment Reference *
                        </label>
                        <input
                          type="text"
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                            errors.reference ? 'border-red-300' : ''
                          }`}
                          value={paymentForm.reference}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                          placeholder="Payment reference number"
                        />
                        {errors.reference && (
                          <p className="mt-1 text-sm text-red-600">{errors.reference}</p>
                        )}
                      </div>

                      {paymentForm.paymentMethod === 'BANK_TRANSFER' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Bank Account *
                          </label>
                          <input
                            type="text"
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors.bankAccount ? 'border-red-300' : ''
                            }`}
                            value={paymentForm.bankAccount || ''}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                            placeholder="Bank account number"
                          />
                          {errors.bankAccount && (
                            <p className="mt-1 text-sm text-red-600">{errors.bankAccount}</p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={paymentForm.description || ''}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Payment description or notes"
                        />
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            Total Amount:
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(paymentForm.totalAmount)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {paymentForm.selectedInvoices.length} invoice(s) selected
                        </div>
                      </div>

                      {errors.submit && (
                        <div className="rounded-md bg-red-50 p-4">
                          <div className="flex">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            <div className="ml-3">
                              <p className="text-sm text-red-800">{errors.submit}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {errors.invoices && (
                        <div className="rounded-md bg-red-50 p-4">
                          <div className="flex">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            <div className="ml-3">
                              <p className="text-sm text-red-800">{errors.invoices}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleProcessPayment}
                  disabled={processing}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Process Payment'}
                </button>
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setErrors({});
                  }}
                  disabled={processing}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentsPageContent />
    </Suspense>
  );
}
