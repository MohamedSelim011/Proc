'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus,
  FileText,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Eye,
  Search
} from 'lucide-react';

interface ServiceRFP {
  id: string;
  rfqNumber: string;
  title: string;
  status: string;
  issueDate: string;
  closingDate: string;
  pr?: {
    prNumber: string;
  };
  invitedVendors?: Array<any>;
  responses?: Array<any>;
}

export default function ServiceRFPListPage() {
  const router = useRouter();
  const [rfps, setRfps] = useState<ServiceRFP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchRFPs();
  }, []);

  const fetchRFPs = async () => {
    try {
      // Fetch all Service RFPs
      const response = await fetch('/api/services/rfp');
      const data = await response.json();
      
      if (response.ok) {
        setRfps(data.rfps);
      }
    } catch (error) {
      console.error('Error fetching RFPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PUBLISHED': return 'bg-wujha-primary/10 text-wujha-primary';
      case 'CLOSED': return 'bg-red-100 text-red-800';
      case 'EVALUATED': return 'bg-green-100 text-green-800';
      case 'AWARDED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRFPs = rfps.filter(rfp => {
    const matchesSearch = rfp.rfqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rfp.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || rfp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service RFPs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage service Requests for Proposals
          </p>
        </div>
        <button
          onClick={() => router.push('/procurement/services/requisitions')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Service Requisition
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search RFPs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
              <option value="EVALUATED">Evaluated</option>
              <option value="AWARDED">Awarded</option>
            </select>
          </div>
        </div>
      </div>

      {/* RFP List */}
      {filteredRFPs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Service RFPs</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a service requisition and issuing an RFP.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/procurement/services/requisitions')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <Plus className="h-4 w-4 mr-2" />
              Go to Service Requisitions
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {filteredRFPs.map((rfp) => (
              <li key={rfp.id} className="hover:bg-gray-50">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-wujha-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {rfp.rfqNumber}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{rfp.title}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        {rfp.pr && (
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            <span>SR: {rfp.pr.prNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Issue: {new Date(rfp.issueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Closes: {new Date(rfp.closingDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{rfp.invitedVendors?.length || 0} Vendors</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span>{rfp.responses?.filter(r => r.status === 'SUBMITTED').length || 0} Responses</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-6 flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rfp.status)}`}>
                        {rfp.status}
                      </span>
                      <button
                        onClick={() => router.push(`/procurement/services/rfp/${rfp.id}`)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

