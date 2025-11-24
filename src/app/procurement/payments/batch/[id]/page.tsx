'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  FileText, 
  CreditCard,
  Building,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Printer,
  Mail,
  Eye,
  Banknote,
  Users
} from 'lucide-react';

interface BatchDetails {
  id: string;
  batchNumber: string;
  batchDate: string;
  status: 'DRAFT' | 'APPROVED' | 'PROCESSED' | 'COMPLETED';
  totalAmount: number;
  currency: string;
  invoiceCount: number;
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'WIRE';
  reference?: string;
  description?: string;
  bankAccount?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  invoices: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    currency: string;
    paymentStatus: string;
    vendor: {
      id: string;
      nameEn: string;
      email: string;
    };
    po?: {
      id: string;
      poNumber: string;
    };
  }[];
  auditTrail: {
    id: string;
    action: string;
    timestamp: string;
    user: string;
    details?: string;
  }[];
}

export default function BatchDetailsPage() {
  const params = useParams();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'invoices' | 'audit'>('details');

  useEffect(() => {
    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId]);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);
      
      // For now, we'll simulate batch details based on paid invoices
      const response = await fetch('/api/payment-batches');
      const data = await response.json();
      
      if (response.ok && data.batches.length > 0) {
        const mockBatch = data.batches[0];
        
        // Simulate detailed batch information
        const batchDetails: BatchDetails = {
          id: batchId,
          batchNumber: mockBatch.batchNumber,
          batchDate: mockBatch.batchDate,
          status: mockBatch.status,
          totalAmount: mockBatch.totalAmount,
          currency: mockBatch.currency,
          invoiceCount: mockBatch.invoiceCount,
          paymentMethod: mockBatch.paymentMethod,
          reference: `REF-${mockBatch.batchNumber}`,
          description: `Payment batch for ${mockBatch.invoiceCount} invoices`,
          bankAccount: 'ACC-123456789',
          createdAt: mockBatch.createdAt,
          processedAt: mockBatch.batchDate,
          processedBy: 'system@wujha.com',
          approvedBy: 'finance@wujha.com',
          approvedAt: mockBatch.createdAt,
          invoices: mockBatch.invoices || [],
          auditTrail: [
            {
              id: '1',
              action: 'Batch Created',
              timestamp: mockBatch.createdAt,
              user: 'system@wujha.com',
              details: 'Payment batch created automatically'
            },
            {
              id: '2',
              action: 'Batch Approved',
              timestamp: mockBatch.createdAt,
              user: 'finance@wujha.com',
              details: 'Payment batch approved for processing'
            },
            {
              id: '3',
              action: 'Batch Processed',
              timestamp: mockBatch.batchDate,
              user: 'system@wujha.com',
              details: 'Payment batch successfully processed'
            }
          ]
        };
        
        setBatch(batchDetails);
      } else {
        setError('Batch not found');
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
      setError('Failed to load batch details');
    } finally {
      setLoading(false);
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PROCESSED':
        return 'bg-wujha-primary/10 text-wujha-primary';
      case 'APPROVED':
        return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER':
        return <Building className="h-5 w-5" />;
      case 'CHECK':
        return <FileText className="h-5 w-5" />;
      case 'CASH':
        return <DollarSign className="h-5 w-5" />;
      case 'WIRE':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Batch Not Found</h3>
          <p className="mt-1 text-sm text-gray-500">{error || 'The requested payment batch could not be found.'}</p>
          <div className="mt-6">
            <Link
              href="/procurement/payments"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/procurement/payments"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Payments
              </Link>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Payment Batch Details</h1>
            <p className="mt-1 text-sm text-gray-500">
              Batch: {batch.batchNumber} • Created {formatDateShort(batch.createdAt)}
            </p>
          </div>
        </div>

        {/* Batch Summary Card */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Banknote className="h-8 w-8 text-wujha-primary" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {batch.batchNumber}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {batch.paymentMethod.replace('_', ' ')}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(batch.totalAmount, batch.currency)}
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(batch.status)}`}>
                  {batch.status}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Batch Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateShort(batch.batchDate)}</dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Number of Invoices</dt>
                <dd className="mt-1 text-sm text-gray-900">{batch.invoiceCount}</dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                  {getPaymentMethodIcon(batch.paymentMethod)}
                  <span className="ml-2">{batch.paymentMethod.replace('_', ' ')}</span>
                </dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Processed By</dt>
                <dd className="mt-1 text-sm text-gray-900">{batch.processedBy || 'System'}</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-wujha-primary text-wujha-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Batch Details
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invoices'
                    ? 'border-wujha-primary text-wujha-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Invoices ({batch.invoiceCount})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'audit'
                    ? 'border-wujha-primary text-wujha-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Audit Trail
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Batch Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Batch Information */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Batch Information</h4>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Batch Number</dt>
                        <dd className="mt-1 text-sm text-gray-900">{batch.batchNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Reference</dt>
                        <dd className="mt-1 text-sm text-gray-900">{batch.reference || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                        <dd className="mt-1 text-sm text-gray-900 flex items-center">
                          {getPaymentMethodIcon(batch.paymentMethod)}
                          <span className="ml-2">{batch.paymentMethod.replace('_', ' ')}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Bank Account</dt>
                        <dd className="mt-1 text-sm text-gray-900">{batch.bankAccount || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">
                          {formatCurrency(batch.totalAmount, batch.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Invoice Count</dt>
                        <dd className="mt-1 text-sm text-gray-900">{batch.invoiceCount}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(batch.status)}`}>
                            {batch.status}
                          </span>
                        </dd>
                      </div>
                      {batch.description && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Description</dt>
                          <dd className="mt-1 text-sm text-gray-900">{batch.description}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Processing Information */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Processing Information</h4>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created At</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatDate(batch.createdAt)}</dd>
                      </div>
                      {batch.approvedAt && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Approved At</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatDate(batch.approvedAt)}</dd>
                        </div>
                      )}
                      {batch.approvedBy && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                          <dd className="mt-1 text-sm text-gray-900">{batch.approvedBy}</dd>
                        </div>
                      )}
                      {batch.processedAt && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Processed At</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatDate(batch.processedAt)}</dd>
                        </div>
                      )}
                      {batch.processedBy && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Processed By</dt>
                          <dd className="mt-1 text-sm text-gray-900">{batch.processedBy}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Processing Timeline</h4>
                  <div className="flow-root">
                    <ul className="-mb-8">
                      <li>
                        <div className="relative pb-8">
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-wujha-primary flex items-center justify-center ring-8 ring-white">
                                <Banknote className="h-4 w-4 text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">Batch created</p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {formatDate(batch.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                      {batch.approvedAt && (
                        <li>
                          <div className="relative pb-8">
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center ring-8 ring-white">
                                  <CheckCircle className="h-4 w-4 text-white" />
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500">Batch approved</p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  {formatDate(batch.approvedAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      )}
                      {batch.processedAt && (
                        <li>
                          <div className="relative pb-8">
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                                  <CheckCircle className="h-4 w-4 text-white" />
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500">Batch processed successfully</p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  {formatDate(batch.processedAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Batch Invoices</h4>
                {batch.invoices.length > 0 ? (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice
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
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {batch.invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {invoice.invoiceNumber}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {formatDateShort(invoice.invoiceDate)}
                                  </div>
                                  {invoice.po && (
                                    <div className="text-xs text-wujha-primary">
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
                                {formatCurrency(invoice.totalAmount, invoice.currency)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDateShort(invoice.dueDate)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {invoice.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="text-wujha-primary hover:text-wujha-primary-hover inline-flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      This batch doesn't contain any invoices.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Audit Trail Tab */}
            {activeTab === 'audit' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Audit Trail</h4>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {batch.auditTrail.map((audit, index) => (
                      <li key={audit.id}>
                        <div className="relative pb-8">
                          {index !== batch.auditTrail.length - 1 && (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                                <Clock className="h-4 w-4 text-white" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900">{audit.action}</p>
                                {audit.details && (
                                  <p className="text-sm text-gray-500">{audit.details}</p>
                                )}
                                <p className="text-xs text-gray-400">by {audit.user}</p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {formatDate(audit.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
