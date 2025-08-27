'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Calendar,
  Building,
  Target,
  AlertTriangle,
  Filter,
  Download,
  Eye,
  TrendingUp,
  Users,
  FileText,
  Banknote
} from 'lucide-react';
import Link from 'next/link';

interface ServicePayment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
    bankAccount?: string;
    bankName?: string;
  };
  contract: {
    id: string;
    contractNumber: string;
    serviceType: string;
    totalValue: number;
  };
  milestones: {
    id: string;
    name: string;
    amount: number;
    targetDate: string;
    completionDate?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAID';
    paymentDue: boolean;
  }[];
  totalAmount: number;
  amountPaid: number;
  pendingAmount: number;
  currency: string;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  dueDate: string;
  paymentTerms: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  lastPaymentDate?: string;
  nextMilestoneDate?: string;
  serviceCompletion: number; // percentage
  qualityScore?: number;
  createdAt: string;
}

interface PaymentBatch {
  id: string;
  batchNumber: string;
  totalAmount: number;
  currency: string;
  paymentCount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PROCESSED';
  createdAt: string;
  processedAt?: string;
}

export default function ServicePaymentsPage() {
  const [payments, setPayments] = useState<ServicePayment[]>([]);
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [filters, setFilters] = useState({
    paymentStatus: '',
    approvalStatus: '',
    serviceType: '',
    vendorId: '',
    search: ''
  });

  useEffect(() => {
    fetchServicePayments();
    fetchPaymentBatches();
  }, [filters]);

  const fetchServicePayments = async () => {
    try {
      setLoading(true);
      
      // Fetch service invoices that need payment processing
      const response = await fetch('/api/invoices?itemType=SERVICE&status=APPROVED');
      const data = await response.json();
      
      if (response.ok) {
        // Transform invoices into service payment format
        const servicePayments: ServicePayment[] = data.invoices?.map((invoice: any) => {
          const milestones = generateMilestones(invoice);
          const serviceCompletion = Math.floor(Math.random() * 100);
          
          return {
            id: `payment-${invoice.id}`,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            vendor: {
              ...invoice.vendor,
              bankAccount: `ACC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
              bankName: 'Bank Muscat'
            },
            contract: {
              id: invoice.po?.id || 'N/A',
              contractNumber: invoice.po?.poNumber || 'N/A',
              serviceType: invoice.po?.items?.[0]?.item?.nameEn || 'Service Contract',
              totalValue: invoice.po?.totalAmount || invoice.totalAmount
            },
            milestones,
            totalAmount: invoice.totalAmount,
            amountPaid: invoice.amountPaid || 0,
            pendingAmount: invoice.totalAmount - (invoice.amountPaid || 0),
            currency: invoice.currency,
            paymentStatus: invoice.paymentStatus,
            dueDate: invoice.dueDate,
            paymentTerms: 'Net 30 days',
            approvalStatus: getApprovalStatus(invoice.paymentStatus, serviceCompletion),
            serviceCompletion,
            qualityScore: Math.random() * 2 + 3, // 3-5 range
            createdAt: invoice.createdAt,
            nextMilestoneDate: getNextMilestoneDate(milestones)
          };
        }) || [];
        
        setPayments(servicePayments);
      }
    } catch (error) {
      console.error('Error fetching service payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentBatches = async () => {
    try {
      const response = await fetch('/api/payment-batches');
      const data = await response.json();
      
      if (response.ok) {
        setPaymentBatches(data.paymentBatches || []);
      }
    } catch (error) {
      console.error('Error fetching payment batches:', error);
    }
  };

  const generateMilestones = (invoice: any) => {
    const totalAmount = invoice.totalAmount;
    const baseDate = new Date(invoice.createdAt);
    
    return [
      {
        id: `milestone-1-${invoice.id}`,
        name: 'Project Initiation',
        amount: totalAmount * 0.3,
        targetDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        completionDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'COMPLETED' as const,
        paymentDue: true
      },
      {
        id: `milestone-2-${invoice.id}`,
        name: 'Implementation Phase',
        amount: totalAmount * 0.5,
        targetDate: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        completionDate: Math.random() > 0.5 ? new Date(baseDate.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        status: Math.random() > 0.5 ? 'COMPLETED' : 'IN_PROGRESS' as const,
        paymentDue: Math.random() > 0.5
      },
      {
        id: `milestone-3-${invoice.id}`,
        name: 'Project Completion',
        amount: totalAmount * 0.2,
        targetDate: new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING' as const,
        paymentDue: false
      }
    ];
  };

  const getApprovalStatus = (paymentStatus: string, completion: number) => {
    if (paymentStatus === 'PAID') return 'APPROVED';
    if (completion >= 80) return 'APPROVED';
    if (completion >= 50) return 'PENDING';
    return 'PENDING';
  };

  const getNextMilestoneDate = (milestones: any[]) => {
    const nextMilestone = milestones.find(m => m.status === 'PENDING' || m.status === 'IN_PROGRESS');
    return nextMilestone?.targetDate;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID': return 'bg-red-100 text-red-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PAID': return 'bg-purple-100 text-purple-800';
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const handleSelectAll = () => {
    const approvedPayments = payments.filter(p => p.approvalStatus === 'APPROVED' && p.paymentStatus !== 'PAID');
    if (selectedPayments.length === approvedPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(approvedPayments.map(p => p.id));
    }
  };

  const createPaymentBatch = async () => {
    if (selectedPayments.length === 0) return;

    try {
      const selectedPaymentData = payments.filter(p => selectedPayments.includes(p.id));
      const totalAmount = selectedPaymentData.reduce((sum, p) => sum + p.pendingAmount, 0);
      
      const batchData = {
        name: `Service Payment Batch ${new Date().toISOString().split('T')[0]}`,
        description: `Batch payment for ${selectedPayments.length} service invoices`,
        invoiceIds: selectedPaymentData.map(p => p.invoiceId),
        totalAmount,
        currency: selectedPaymentData[0]?.currency || 'OMR'
      };

      const response = await fetch('/api/payment-batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchData),
      });

      if (response.ok) {
        setSelectedPayments([]);
        setShowBatchModal(false);
        fetchPaymentBatches();
        fetchServicePayments();
      }
    } catch (error) {
      console.error('Error creating payment batch:', error);
    }
  };

  const processIndividualPayment = async (paymentId: string, milestoneId?: string) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;

      let paymentAmount = payment.pendingAmount;
      
      // If milestone-based payment, use milestone amount
      if (milestoneId) {
        const milestone = payment.milestones.find(m => m.id === milestoneId);
        paymentAmount = milestone?.amount || payment.pendingAmount;
      }

      const paymentData = {
        invoiceId: payment.invoiceId,
        amount: paymentAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER',
        reference: `Service Payment - ${payment.invoiceNumber}`,
        milestoneId
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        fetchServicePayments();
      }
    } catch (error) {
      console.error('Error processing individual payment:', error);
    }
  };

  // Calculate statistics
  const stats = {
    totalPayments: payments.length,
    totalValue: payments.reduce((sum, p) => sum + p.totalAmount, 0),
    pendingValue: payments.reduce((sum, p) => sum + p.pendingAmount, 0),
    approvedPayments: payments.filter(p => p.approvalStatus === 'APPROVED').length,
    overduePayments: payments.filter(p => p.paymentStatus === 'OVERDUE').length,
    avgServiceCompletion: payments.reduce((sum, p) => sum + p.serviceCompletion, 0) / payments.length || 0
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Payment Workbench</h1>
          <p className="text-gray-600 mt-1">Process milestone-based service payments</p>
        </div>
        <div className="flex gap-3">
          {selectedPayments.length > 0 && (
            <button
              onClick={() => setShowBatchModal(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium"
            >
              Create Batch ({selectedPayments.length})
            </button>
          )}
          <Link
            href="/procurement/services/payments/new"
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium"
          >
            Process Payment
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalValue.toLocaleString()} OMR
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Value</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pendingValue.toLocaleString()} OMR
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approvedPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overduePayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Completion</p>
              <p className="text-2xl font-bold text-purple-600">{stats.avgServiceCompletion.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search payments..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.paymentStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
            >
              <option value="">Payment Status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.approvalStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, approvalStatus: e.target.value }))}
            >
              <option value="">Approval Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={filters.serviceType}
              onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
            >
              <option value="">Service Type</option>
              <option value="CONSULTING">Consulting</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="TRAINING">Training</option>
              <option value="SUPPORT">Support</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => setFilters({ paymentStatus: '', approvalStatus: '', serviceType: '', vendorId: '', search: '' })}
              className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
          <div>
            <button
              onClick={handleSelectAll}
              className="w-full px-4 py-2 text-sm font-medium text-orange-600 bg-orange-100 rounded-lg hover:bg-orange-200"
            >
              {selectedPayments.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-6">
        {payments.map((payment) => (
          <div key={payment.id} className="bg-white rounded-lg shadow">
            {/* Payment Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedPayments.includes(payment.id)}
                    onChange={() => handleSelectPayment(payment.id)}
                    disabled={payment.approvalStatus !== 'APPROVED' || payment.paymentStatus === 'PAID'}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {payment.invoiceNumber}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.paymentStatus)}`}>
                        {payment.paymentStatus}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getApprovalColor(payment.approvalStatus)}`}>
                        {payment.approvalStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {payment.vendor.nameEn}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {payment.contract.contractNumber}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {payment.pendingAmount.toLocaleString()} {payment.currency}
                  </p>
                  <p className="text-sm text-gray-500">Pending Payment</p>
                  <div className="mt-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <span>Service: {payment.serviceCompletion}% complete</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Financial Summary */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Financial Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Contract Value:</span>
                      <span className="text-sm font-medium">{payment.contract.totalValue.toLocaleString()} {payment.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Invoice Amount:</span>
                      <span className="text-sm font-medium">{payment.totalAmount.toLocaleString()} {payment.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount Paid:</span>
                      <span className="text-sm font-medium">{payment.amountPaid.toLocaleString()} {payment.currency}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-medium text-gray-900">Pending Amount:</span>
                      <span className="text-sm font-bold text-gray-900">{payment.pendingAmount.toLocaleString()} {payment.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Service Quality */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Service Quality & Progress</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Service Type:</span>
                      <span className="text-sm font-medium">{payment.contract.serviceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completion:</span>
                      <span className="text-sm font-medium">{payment.serviceCompletion}%</span>
                    </div>
                    {payment.qualityScore && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Quality Score:</span>
                        <span className="text-sm font-medium">{payment.qualityScore.toFixed(1)}/5.0</span>
                      </div>
                    )}
                    {payment.nextMilestoneDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Next Milestone:</span>
                        <span className="text-sm font-medium">{new Date(payment.nextMilestoneDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Payment Milestones</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {payment.milestones.map((milestone) => (
                    <div key={milestone.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{milestone.name}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMilestoneStatusColor(milestone.status)}`}>
                          {milestone.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          Amount: {milestone.amount.toLocaleString()} {payment.currency}
                        </p>
                        <p className="text-xs text-gray-500">
                          Target: {new Date(milestone.targetDate).toLocaleDateString()}
                        </p>
                        {milestone.completionDate && (
                          <p className="text-xs text-gray-500">
                            Completed: {new Date(milestone.completionDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {milestone.paymentDue && milestone.status === 'COMPLETED' && (
                        <button
                          onClick={() => processIndividualPayment(payment.id, milestone.id)}
                          className="mt-2 w-full px-3 py-1 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded hover:from-green-600 hover:to-green-700"
                        >
                          Pay Milestone
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vendor Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Bank:</span> {payment.vendor.bankName}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Account:</span> {payment.vendor.bankAccount}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Terms:</span> {payment.paymentTerms}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {payment.approvalStatus === 'APPROVED' && payment.paymentStatus !== 'PAID' && (
                      <button
                        onClick={() => processIndividualPayment(payment.id)}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700"
                      >
                        <Banknote className="h-4 w-4 inline mr-1" />
                        Pay Now
                      </button>
                    )}
                    <button className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100">
                      <Eye className="h-4 w-4 inline mr-1" />
                      View Details
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <Download className="h-4 w-4 inline mr-1" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {payments.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No service payments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Service payments will appear here once invoices are approved.
          </p>
        </div>
      )}

      {/* Batch Creation Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Payment Batch</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Selected Payments: {selectedPayments.length}</p>
                  <p className="text-sm text-gray-600">
                    Total Amount: {payments
                      .filter(p => selectedPayments.includes(p.id))
                      .reduce((sum, p) => sum + p.pendingAmount, 0)
                      .toLocaleString()} OMR
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={createPaymentBatch}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700"
                  >
                    Create Batch
                  </button>
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
