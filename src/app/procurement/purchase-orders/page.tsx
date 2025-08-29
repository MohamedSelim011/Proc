'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  AlertTriangle,
  Package
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  deliveryDate: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'ACKNOWLEDGED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  currency: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
    performanceScore?: number;
  };
  pr?: {
    prNumber: string;
    requesterId: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    item: {
      itemCode: string;
      nameEn: string;
    };
  }>;
  _count: {
    goodsReceipts: number;
    invoices: number;
    amendments: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    vendorId: '',
    search: ''
  });

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, pagination.limit, filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.vendorId && { vendorId: filters.vendorId })
      });

      const response = await fetch(`/api/purchase-orders?${params}`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders || []);
        setPagination(data.pagination);
      } else {
        console.error('Error fetching purchase orders:', data.error);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'APPROVED':
      case 'SENT':
      case 'ACKNOWLEDGED':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'PARTIAL':
        return <Truck className="h-4 w-4 text-yellow-500" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'SENT':
        return 'bg-purple-100 text-purple-800';
      case 'ACKNOWLEDGED':
        return 'bg-indigo-100 text-indigo-800';
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryStatus = (order: PurchaseOrder) => {
    const deliveryDate = new Date(order.deliveryDate);
    const today = new Date();
    const daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (order.status === 'COMPLETED') {
      return { text: 'Delivered', color: 'text-green-600' };
    } else if (daysUntilDelivery < 0) {
      return { text: `${Math.abs(daysUntilDelivery)} days overdue`, color: 'text-red-600' };
    } else if (daysUntilDelivery === 0) {
      return { text: 'Due today', color: 'text-yellow-600' };
    } else if (daysUntilDelivery <= 7) {
      return { text: `${daysUntilDelivery} days left`, color: 'text-yellow-600' };
    } else {
      return { text: `${daysUntilDelivery} days left`, color: 'text-gray-600' };
    }
  };

  const handleQuickApprove = async (poId: string) => {
    if (confirm('Are you sure you want to approve this purchase order?')) {
      try {
        const response = await fetch(`/api/purchase-orders/${poId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'APPROVED',
            updatedBy: 'current-user',
            comments: 'Quick approved from list view'
          }),
        });

        if (response.ok) {
          // Refresh the orders list
          fetchOrders();
        } else {
          const error = await response.json();
          alert(`Failed to approve PO: ${error.error}`);
        }
      } catch (error) {
        console.error('Error approving PO:', error);
        alert('Failed to approve purchase order');
      }
    }
  };

  const handleQuickReject = async (poId: string) => {
    if (confirm('Are you sure you want to reject this purchase order?')) {
      try {
        const response = await fetch(`/api/purchase-orders/${poId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'CANCELLED',
            updatedBy: 'current-user',
            comments: 'Quick rejected from list view'
          }),
        });

        if (response.ok) {
          // Refresh the orders list
          fetchOrders();
        } else {
          const error = await response.json();
          alert(`Failed to reject PO: ${error.error}`);
        }
      } catch (error) {
        console.error('Error rejecting PO:', error);
        alert('Failed to reject purchase order');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track purchase orders from creation to delivery
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/procurement/purchase-orders/new"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Order
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total POs</dt>
                  <dd className="text-lg font-medium text-gray-900">{pagination.total}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {orders.filter(o => ['APPROVED', 'SENT', 'ACKNOWLEDGED'].includes(o.status)).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Truck className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Transit</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {orders.filter(o => o.status === 'PARTIAL').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {orders.filter(o => o.status === 'COMPLETED').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Approval</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {orders.filter(o => o.status === 'DRAFT').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {orders.filter(o => o.status === 'DRAFT').length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-orange-800">
                  Pending Approvals
                </h3>
                <p className="text-sm text-orange-700">
                  You have {orders.filter(o => o.status === 'DRAFT').length} purchase order(s) waiting for approval
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterChange('status', 'DRAFT')}
                className="inline-flex items-center px-3 py-2 border border-orange-300 shadow-sm text-sm leading-4 font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                View All Draft POs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="PO number, vendor..."
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="PARTIAL">Partial Delivery</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
            <input
              type="text"
              placeholder="Vendor ID"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.vendorId}
              onChange={(e) => handleFilterChange('vendorId', e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchOrders}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Purchase Orders ({pagination.total})
            </h3>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
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
                    PO Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount & Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((po) => {
                  const deliveryStatus = getDeliveryStatus(po);
                  return (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(po.status)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {po.poNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(po.orderDate)}
                            </div>
                            {po.pr && (
                              <div className="text-xs text-blue-600">
                                From {po.pr.prNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{po.vendor.nameEn}</div>
                        <div className="text-sm text-gray-500">{po.vendor.email}</div>
                        {po.vendor.performanceScore && (
                          <div className="text-xs text-gray-400">
                            Rating: {po.vendor.performanceScore.toFixed(1)}/5
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(Number(po.totalAmount), po.currency)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {po.items.length} item{po.items.length > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(po.deliveryDate)}
                        </div>
                        <div className={`text-xs ${deliveryStatus.color}`}>
                          {deliveryStatus.text}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {po._count.goodsReceipts > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {po._count.goodsReceipts} GR{po._count.goodsReceipts > 1 ? 's' : ''}
                            </span>
                          )}
                          {po._count.invoices > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {po._count.invoices} Invoice{po._count.invoices > 1 ? 's' : ''}
                            </span>
                          )}
                          {po._count.amendments > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {po._count.amendments} Amendment{po._count.amendments > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/procurement/purchase-orders/${po.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {po.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleQuickApprove(po.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Quick Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleQuickReject(po.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Quick Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {(po.status === 'DRAFT' || po.status === 'APPROVED') && (
                            <Link
                              href={`/procurement/purchase-orders/${po.id}/edit`}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          )}
                          {po.status === 'ACKNOWLEDGED' && po._count.goodsReceipts === 0 && (
                            <Link
                              href={`/procurement/receipts/new?poId=${po.id}`}
                              className="text-green-600 hover:text-green-900"
                              title="Create Goods Receipt"
                            >
                              <Package className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
