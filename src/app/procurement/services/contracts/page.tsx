'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  FileText,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  User
} from 'lucide-react';
import Link from 'next/link';

interface ServiceContract {
  id: string;
  contractNumber: string;
  contractType: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
  };
  serviceType: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  status: string;
  autoRenewal: boolean;
  createdAt: string;
  daysUntilExpiry: number;
}

interface Filters {
  search: string;
  status: string;
  contractType: string;
  vendor: string;
  expiringOnly: boolean;
}

export default function ServiceContracts() {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    contractType: '',
    vendor: '',
    expiringOnly: false
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 3
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    fetchContracts();
  }, [currentPage, filters]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      // Add filters
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.contractType) params.append('contractType', filters.contractType);
      if (filters.vendor) params.append('vendor', filters.vendor);

      const response = await fetch(`/api/service-contracts?${params}`);
      const data = await response.json();

      if (response.ok) {
        const contractsWithMetrics = (data.contracts || []).map((contract: any) => {
          const startDate = new Date(contract.startDate);
          const endDate = new Date(contract.endDate);
          
          const today = new Date();
          const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: contract.id,
            contractNumber: contract.contractNumber,
            contractType: contract.contractType,
            vendor: contract.vendor,
            serviceType: contract.contractType,
            contractValue: parseFloat(contract.totalValue),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            status: contract.status,
            autoRenewal: false, // Default for now
            createdAt: contract.createdAt,
            daysUntilExpiry
          };
        });

        // Apply expiring filter
        const filteredContracts = filters.expiringOnly 
          ? contractsWithMetrics.filter((contract: ServiceContract) => 
              contract.daysUntilExpiry <= 90 && contract.daysUntilExpiry > 0
            )
          : contractsWithMetrics;

        setContracts(filteredContracts);
        setTotal(data.pagination?.total || filteredContracts.length);
        setTotalPages(data.pagination?.totalPages || Math.ceil(filteredContracts.length / 10));
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'ACTIVE': 'bg-green-100 text-green-800',
      'EXPIRING': 'bg-yellow-100 text-yellow-800',
      'EXPIRED': 'bg-red-100 text-red-800',
      'COMPLETED': 'bg-blue-100 text-blue-800',
      'TERMINATED': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getExpiryStatus = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return { status: 'EXPIRED', color: 'text-red-600', icon: AlertTriangle };
    if (daysUntilExpiry <= 30) return { status: 'EXPIRING', color: 'text-red-600', icon: AlertTriangle };
    if (daysUntilExpiry <= 90) return { status: 'EXPIRING SOON', color: 'text-yellow-600', icon: Clock };
    return { status: 'ACTIVE', color: 'text-green-600', icon: CheckCircle };
  };

  const getContractTypeIcon = (type: string) => {
    switch (type) {
      case 'Service Agreement':
        return <FileText className="h-4 w-4" />;
      case 'Master Agreement':
        return <Building className="h-4 w-4" />;
      case 'Work Order':
        return <User className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Contracts</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage service agreements, master contracts, and work orders
          </p>
        </div>
        <Link
          href="/procurement/services/contracts/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Link>
      </div>

      {/* Contract Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Contracts
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {contracts.filter(c => c.status === 'ACTIVE').length}
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
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Expiring (90 days)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {contracts.filter(c => c.daysUntilExpiry <= 90 && c.daysUntilExpiry > 0).length}
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
                <DollarSign className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(contracts.reduce((sum, c) => sum + c.contractValue, 0))}
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
                <FileText className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Auto-Renewal
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {contracts.filter(c => c.autoRenewal).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search contracts..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING">Expiring</option>
              <option value="EXPIRED">Expired</option>
              <option value="COMPLETED">Completed</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Type
            </label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              value={filters.contractType}
              onChange={(e) => handleFilterChange('contractType', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Service Agreement">Service Agreement</option>
              <option value="Master Agreement">Master Agreement</option>
              <option value="Work Order">Work Order</option>
              <option value="Rental Agreement">Rental Agreement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
            <input
              type="text"
              placeholder="Vendor name"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              value={filters.vendor}
              onChange={(e) => handleFilterChange('vendor', e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={filters.expiringOnly}
                onChange={(e) => handleFilterChange('expiringOnly', e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-700">Expiring Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * 10, total)}</span> of{' '}
            <span className="font-medium">{total}</span> service contracts
          </p>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {Object.values(filters).filter(Boolean).length} filters active
            </span>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contract
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : contracts.length > 0 ? (
              contracts.map((contract) => {
                const expiryInfo = getExpiryStatus(contract.daysUntilExpiry);
                const ExpiryIcon = expiryInfo.icon;
                
                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-100 rounded">
                          {getContractTypeIcon(contract.contractType)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {contract.contractNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {contract.contractType}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {contract.vendor?.nameEn || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contract.vendor?.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contract.serviceType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(contract.contractValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                      </div>
                      <div className={`text-sm flex items-center ${expiryInfo.color}`}>
                        <ExpiryIcon className="h-3 w-3 mr-1" />
                        {contract.daysUntilExpiry < 0 
                          ? `Expired ${Math.abs(contract.daysUntilExpiry)} days ago`
                          : `${contract.daysUntilExpiry} days remaining`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                          {contract.status}
                        </span>
                        {contract.autoRenewal && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Auto-Renewal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/procurement/services/contracts/${contract.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {contract.status === 'DRAFT' && (
                          <Link
                            href={`/procurement/services/contracts/${contract.id}/edit`}
                            className="text-green-600 hover:text-green-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        )}
                        {contract.daysUntilExpiry <= 90 && contract.daysUntilExpiry > 0 && (
                          <Link
                            href={`/procurement/services/contracts/${contract.id}/renew`}
                            className="text-purple-600 hover:text-purple-900"
                            title="Renew Contract"
                          >
                            <Calendar className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No service contracts found. 
                  <Link 
                    href="/procurement/services/contracts/new"
                    className="text-blue-600 hover:text-blue-500 ml-1"
                  >
                    Create your first contract
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
