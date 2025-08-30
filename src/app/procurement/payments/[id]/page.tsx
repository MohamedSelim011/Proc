'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  FileText, 
  CreditCard,
  Building,
  Calendar,
  DollarSign,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Printer,
  Mail,
  Eye,
  ExternalLink
} from 'lucide-react';

interface PaymentDetails {
  id: string;
  reference: string;
  batchNumber?: string;
  paymentDate: string;
  totalAmount: number;
  currency: string;
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'WIRE';
  status: 'PROCESSED' | 'COMPLETED' | 'PENDING' | 'FAILED';
  description?: string;
  bankAccount?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  invoices: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    currency: string;
    vendor: {
      id: string;
      nameEn: string;
      email: string;
      phone?: string;
      bankAccount?: string;
      bankName?: string;
      iban?: string;
    };
    po?: {
      id: string;
      poNumber: string;
    };
  }[];
  vendor?: {
    id: string;
    nameEn: string;
    email: string;
    phone?: string;
    address?: string;
    bankAccount?: string;
    bankName?: string;
    iban?: string;
  };
  auditTrail: {
    id: string;
    action: string;
    timestamp: string;
    user: string;
    details?: string;
  }[];
}

export default function PaymentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'invoices' | 'audit'>('details');

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch payment details from the payment batch API
      const response = await fetch(`/api/payment-batches/${paymentId}`);
      const data = await response.json();
      
      if (response.ok) {
        // Transform batch data to payment format
        const paymentData: PaymentDetails = {
          id: data.id,
          reference: data.reference || data.batchNumber,
          batchNumber: data.batchNumber,
          paymentDate: data.batchDate,
          totalAmount: data.totalAmount,
          currency: data.currency,
          paymentMethod: data.paymentMethod,
          status: data.status === 'COMPLETED' ? 'COMPLETED' : 
                  data.status === 'PROCESSED' ? 'PROCESSED' : 
                  data.status === 'APPROVED' ? 'PENDING' : 'PENDING',
          description: data.description || `Payment batch ${data.batchNumber}`,
          bankAccount: data.bankAccount || 'ACC-123456789',
          createdAt: data.createdAt,
          processedAt: data.processedAt || data.batchDate,
          processedBy: data.processedBy || 'system@wujha.com',
          invoices: data.invoices || [],
          vendor: data.invoices?.[0]?.vendor,
          auditTrail: [
            {
              id: '1',
              action: 'Payment Created',
              timestamp: data.createdAt,
              user: 'system@wujha.com',
              details: 'Payment batch created'
            },
            {
              id: '2',
              action: 'Payment Processed',
              timestamp: data.processedAt || data.batchDate,
              user: 'system@wujha.com',
              details: `Payment processed via ${data.paymentMethod}`
            }
          ]
        };
        
        setPayment(paymentData);
      } else {
        setError(data.error || 'Payment not found');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      setError('Failed to load payment details');
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
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
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

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Implement PDF export functionality
    console.log('Export payment details');
  };

  const handleSendEmail = () => {
    // Implement email functionality
    console.log('Send payment confirmation email');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Payment Not Found</h3>
          <p className="mt-1 text-sm text-gray-500">{error || 'The requested payment could not be found.'}</p>
          <div className="mt-6">
            <Link
              href="/procurement/payments"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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
      <div className="w-full px-4 sm:px-6 lg:px-8">
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
              <button
                onClick={handleSendEmail}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Payment Details</h1>
            <p className="mt-1 text-sm text-gray-500">
              Payment: {payment.reference} • Created {formatDateShort(payment.createdAt)}
            </p>
          </div>
        </div>

        {/* Payment Summary Card */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {getPaymentMethodIcon(payment.paymentMethod)}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {payment.paymentMethod.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {payment.batchNumber && `Payment: ${payment.batchNumber}`}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(payment.totalAmount, payment.currency)}
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                  {payment.status}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Payment Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateShort(payment.paymentDate)}</dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Number of Invoices</dt>
                <dd className="mt-1 text-sm text-gray-900">{payment.invoices.length}</dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Processed By</dt>
                <dd className="mt-1 text-sm text-gray-900">{payment.processedBy || 'System'}</dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500">Payment Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{payment.batchNumber || 'N/A'}</dd>
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
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Payment Details
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invoices'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Invoices ({payment.invoices.length})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'audit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Audit Trail
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Payment Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Payment Information */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h4>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Reference Number</dt>
                        <dd className="mt-1 text-sm text-gray-900">{payment.reference}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                        <dd className="mt-1 text-sm text-gray-900 flex items-center">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          <span className="ml-2">{payment.paymentMethod.replace('_', ' ')}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Bank Account</dt>
                        <dd className="mt-1 text-sm text-gray-900">{payment.bankAccount || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">
                          {formatCurrency(payment.totalAmount, payment.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </dd>
                      </div>
                      {payment.description && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Description</dt>
                          <dd className="mt-1 text-sm text-gray-900">{payment.description}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Vendor Information */}
                  {payment.vendor && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h4>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Vendor Name</dt>
                          <dd className="mt-1 text-sm text-gray-900">{payment.vendor.nameEn}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900">{payment.vendor.email}</dd>
                        </div>
                        {payment.vendor.phone && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Phone</dt>
                            <dd className="mt-1 text-sm text-gray-900">{payment.vendor.phone}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
                          <dd className="mt-1 text-sm text-gray-900">{payment.vendor.bankName || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Bank Account</dt>
                          <dd className="mt-1 text-sm text-gray-900">{payment.vendor.bankAccount || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">IBAN</dt>
                          <dd className="mt-1 text-sm text-gray-900">{payment.vendor.iban || 'N/A'}</dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  {/* Payment Timeline */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Timeline</h4>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatDate(payment.createdAt)}</dd>
                      </div>
                      {payment.processedAt && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Processed</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatDate(payment.processedAt)}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Payment Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatDate(payment.paymentDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Currency</dt>
                        <dd className="mt-1 text-sm text-gray-900">{payment.currency}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Payment Number</dt>
                        <dd className="mt-1 text-sm text-gray-900">{payment.batchNumber || 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>


              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Related Invoices</h4>
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
                          Invoice Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PO Reference
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payment.invoices.map((invoice) => (
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
                              {formatCurrency(invoice.totalAmount, invoice.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDateShort(invoice.invoiceDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDateShort(invoice.dueDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {invoice.po ? invoice.po.poNumber : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
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
              </div>
            )}

            {/* Audit Trail Tab */}
            {activeTab === 'audit' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Audit Trail</h4>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payment.auditTrail.map((audit) => (
                        <tr key={audit.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Clock className="h-5 w-5 text-gray-400 mr-3" />
                              <div className="text-sm font-medium text-gray-900">
                                {audit.action}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {audit.details || 'No additional details'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{audit.user}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(audit.timestamp)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
