'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  DollarSign,
  FileText,
  Calendar,
  User,
  Building,
  AlertCircle,
  FileDown,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface ServiceReceipt {
  id: string;
  srnNumber: string;
  contractId: string;
  milestoneId?: string;
  receiptDate: string;
  serviceDescription: string;
  deliverables: any;
  qualityRating: number;
  completionPercentage: number;
  acceptanceStatus: string;
  attachments: string[];
  createdAt: string;
  contract: {
    contractNumber: string;
    totalValue: string;
    vendor: {
      id: string;
      nameEn: string;
    };
  };
  milestone?: {
    name: string;
    amount: string;
  };
}

export default function ServiceReceiptDetail() {
  const router = useRouter();
  const params = useParams();
  const receiptId = params.id as string;
  
  const [receipt, setReceipt] = useState<ServiceReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  useEffect(() => {
    if (receiptId) {
      fetchReceipt();
    }
  }, [receiptId]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/service-receipts/${receiptId}`);
      if (response.ok) {
        const data = await response.json();
        setReceipt(data);
      } else {
        setError('Failed to fetch service receipt');
      }
    } catch (error) {
      setError('Error fetching service receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!receipt) return;
    
    try {
      setCreatingInvoice(true);
      
      // Create invoice from service receipt
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNumber: `INV-${receipt.srnNumber}`,
          vendorId: receipt.contract.vendor.id,
          serviceReceiptId: receipt.id,
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
          totalAmount: receipt.milestone?.amount || receipt.contract.totalValue,
          currency: 'OMR',
          status: 'DRAFT',
          description: `Invoice for ${receipt.serviceDescription}`,
          paymentTerms: 'Net 30 days',
          items: [{
            description: receipt.serviceDescription,
            quantity: 1,
            unitPrice: parseFloat(receipt.milestone?.amount || receipt.contract.totalValue),
            totalPrice: parseFloat(receipt.milestone?.amount || receipt.contract.totalValue)
          }]
        }),
      });

      if (response.ok) {
        const invoice = await response.json();
        // Redirect to invoice detail page
        router.push(`/procurement/invoices/${invoice.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Failed to create invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'ACCEPTED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'CONDITIONAL': 'bg-wujha-primary/10 text-wujha-primary'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getQualityColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading service receipt...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Error</h1>
            <p className="mt-2 text-gray-600">{error || 'Service receipt not found'}</p>
            <Link href="/procurement/services/contracts" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/procurement/services/contracts/${receipt.contractId}`} className="inline-flex items-center text-sm text-wujha-primary hover:text-wujha-primary-hover mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Contract
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Service Receipt</h1>
              <p className="mt-2 text-gray-600">
                Receipt Number: {receipt.srnNumber}
              </p>
            </div>
            <div className="flex space-x-3">
              {receipt.acceptanceStatus === 'ACCEPTED' && (
                <button
                  onClick={handleCreateInvoice}
                  disabled={creatingInvoice}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingInvoice ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Invoice
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Receipt Details */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header Section */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{receipt.srnNumber}</h2>
                <p className="text-sm text-gray-600">Service Receipt</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(receipt.acceptanceStatus)}`}>
                  {receipt.acceptanceStatus}
                </span>
                <span className="text-sm text-gray-500">
                  Created: {new Date(receipt.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 space-y-6">
            {/* Contract & Milestone Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-wujha-primary/10 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-wujha-primary mb-2">Contract Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-wujha-primary/80">Contract:</span>
                    <span className="font-medium">{receipt.contract.contractNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wujha-primary/80">Vendor:</span>
                    <span className="font-medium">{receipt.contract.vendor.nameEn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wujha-primary/80">Total Value:</span>
                    <span className="font-medium">OMR {parseFloat(receipt.contract.totalValue).toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {receipt.milestone && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-900 mb-2">Milestone Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Milestone:</span>
                      <span className="font-medium">{receipt.milestone.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Amount:</span>
                      <span className="font-medium">OMR {parseFloat(receipt.milestone.amount).toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Service Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {receipt.serviceDescription}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deliverables</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {typeof receipt.deliverables === 'string' ? receipt.deliverables : JSON.stringify(receipt.deliverables)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Date</label>
                    <p className="text-sm text-gray-900">
                      {new Date(receipt.receiptDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quality Rating</label>
                    <p className={`text-sm font-medium ${getQualityColor(receipt.qualityRating)}`}>
                      {receipt.qualityRating}/10
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Completion</label>
                    <p className="text-sm text-gray-900">
                      {receipt.completionPercentage}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments */}
            {receipt.attachments && receipt.attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Attachments</h3>
                <div className="space-y-2">
                  {receipt.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-wujha-primary">
                      <FileDown className="h-4 w-4" />
                      <span>{attachment}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        {receipt.acceptanceStatus === 'ACCEPTED' && (
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
            <div className="flex space-x-3">
              <button
                onClick={handleCreateInvoice}
                disabled={creatingInvoice}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingInvoice ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </button>
              <p className="text-sm text-gray-600 flex items-center">
                Create an invoice to process payment for this service receipt
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 