'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { SearchableSelect } from '@/components/common/searchable-select'

interface InvoiceApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: string | number;
    vendor: { nameEn: string };
  };
  onApproval: (status: string, comments: string) => void;
}

export default function InvoiceApprovalModal({
  isOpen,
  onClose,
  invoice,
  onApproval
}: InvoiceApprovalModalProps) {
  const [status, setStatus] = useState('APPROVED');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset status when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('APPROVED');
      setComments('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onApproval(status, comments);
      onClose();
    } catch (error) {
      console.error('Error updating invoice status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'SUBMITTED':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'REJECTED':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'SUBMITTED':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="bg-wujha-primary/10 px-6 py-4 border-b border-wujha-primary/20">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Update Invoice Status
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-900 mb-2">Invoice Details</div>
          <div className="bg-wujha-primary/5 border border-wujha-primary/20 rounded-lg p-3">
            <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
            <div className="text-sm text-gray-700">{invoice.vendor.nameEn}</div>
            <div className="text-sm text-gray-700">
          Amount: OMR {Number(invoice.totalAmount).toLocaleString()}
            </div>
            <div className="text-sm text-gray-700">
          Current Status: 
          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
            {getStatusIcon(invoice.status)}
            <span className="ml-1">{invoice.status}</span>
          </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
          New Status
            </label>
            <SearchableSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-3 py-2 border border-wujha-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
          required
          style={{ color: '#111827' }}
            >
          <option value="APPROVED" style={{ color: '#111827' }}>Approve</option>
          <option value="REJECTED" style={{ color: '#111827' }}>Reject</option>
            </SearchableSelect>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
          Comments
            </label>
            <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-wujha-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white placeholder:text-gray-600"
          placeholder="Add any comments or notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary"
            >
          Cancel
            </button>
            <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            status === 'APPROVED'
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
          {isSubmitting ? 'Updating...' : status === 'APPROVED' ? 'Approve Invoice' : 'Reject Invoice'}
            </button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
} 