'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Building, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText,
  Edit,
  Trash2,
  Download,
  Settings,
  DollarSign
} from 'lucide-react';

interface ServiceRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  requesterId: string;
  priority: string;
  status: string;
  estimatedCost: string;
  budgetCode: string;
  justification: string;
  createdAt: string;
  updatedAt: string;
  servicePR: {
    id: string;
    serviceScope: string;
    technicalSpecifications?: string;
    duration: number;
    durationUnit: string;
    items: Array<{
      id: string;
      quantity: string;
      estimatedRate: string;
      duration: number;
      durationUnit: string;
      specifications?: string;
      deliverables: string[];
      performanceMetrics: string[];
      serviceItem: {
        id: string;
        serviceCode: string;
        nameEn: string;
        nameAr: string;
        unitOfMeasure: string;
        serviceCategory: {
          id: string;
          nameEn: string;
          nameAr: string;
        };
      };
    }>;
  };
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
};

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-yellow-100 text-yellow-800',
  URGENT: 'bg-red-100 text-red-800'
};

export default function ServiceRequisitionDetail() {
  const params = useParams();
  const router = useRouter();
  const [sr, setSr] = useState<ServiceRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSubmitRequisition = async () => {
    if (!sr) return;
    
    try {
      const response = await fetch(`/api/purchase-requisitions/${sr.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstApproverId: 'manager001' // Default approver ID
        }),
      });

      if (response.ok) {
        // Refresh the data to show updated status
        fetchServiceRequisition();
        alert('Requisition submitted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to submit: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting requisition:', error);
      alert('Failed to submit requisition');
    }
  };

  useEffect(() => {
    fetchServiceRequisition();
  }, [params.id]);

  // Debug logging
  useEffect(() => {
    if (sr) {
      console.log('ServiceRequisition Data:', sr);
      console.log('ServicePR Items:', sr.servicePR?.items);
      console.log('Items Length:', sr.servicePR?.items?.length);
    }
  }, [sr]);

  const fetchServiceRequisition = async () => {
    try {
      setLoading(true);
      // Use the dedicated service requisitions API
      const response = await fetch(`/api/services/requisitions/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('Fetched service requisition data:', data);
        setSr(data);
      } else {
        setError(data.error || 'Failed to fetch service requisition');
      }
    } catch (error) {
      console.error('Error fetching service requisition:', error);
      setError('Failed to fetch service requisition');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !sr) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error || 'Service requisition not found'}</p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/procurement/services/requisitions')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Service Requisitions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/procurement/services/requisitions')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Service Requisitions
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          {sr.status === 'DRAFT' && (
            <>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Service Requisition Header Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sr.prNumber}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {sr.itemType === 'SERVICE' ? 'Service Requisition' : 'Non-Stock Item Requisition'} Details
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[sr.priority as keyof typeof priorityColors]}`}>
                {sr.priority}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[sr.status as keyof typeof statusColors]}`}>
                {sr.status}
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Status */}
        <div className=" w-full px-6 py-4 bg-gray-50 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Approval Workflow</h3>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${sr.status === 'DRAFT' ? 'text-blue-600' : sr.status === 'SUBMITTED' || sr.status === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sr.status === 'DRAFT' ? 'bg-blue-100' : sr.status === 'SUBMITTED' || sr.status === 'APPROVED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-medium">1</span>
              </div>
              <span className="ml-2 text-sm font-medium">Draft</span>
            </div>
            <div className={`w-8 h-1 ${sr.status === 'SUBMITTED' || sr.status === 'APPROVED' ? 'bg-green-200' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${sr.status === 'SUBMITTED' ? 'text-blue-600' : sr.status === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sr.status === 'SUBMITTED' ? 'bg-blue-100' : sr.status === 'APPROVED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-medium">2</span>
              </div>
              <span className="ml-2 text-sm font-medium">Submitted</span>
            </div>
            <div className={`w-8 h-1 ${sr.status === 'APPROVED' ? 'bg-green-200' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${sr.status === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sr.status === 'APPROVED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-medium">3</span>
              </div>
              <span className="ml-2 text-sm font-medium">Approved</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Department
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{sr.departmentId}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Duration
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {sr.servicePR?.duration || 0} {sr.servicePR?.durationUnit || 'days'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Service Type
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {sr.itemType === 'SERVICE' ? 'Professional Services' : 'Non-Stock Items'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Budget Code
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{sr.budgetCode}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Requester
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{sr.requesterId}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Created Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(sr.createdAt)}</dd>
            </div>
          </dl>
        </div>

        {sr.justification && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Business Justification</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{sr.justification}</dd>
          </div>
        )}
      </div>

      {/* Service Items */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {sr.itemType === 'SERVICE' ? 'Service Requirements' : 'Non-Stock Items'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{sr.servicePR?.items?.length || 0} item(s) requested</p>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {sr.itemType === 'SERVICE' ? 'Service Description' : 'Item Details'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimated Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sr.servicePR?.items && sr.servicePR.items.length > 0 ? (
                sr.servicePR.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.serviceItem?.serviceCode || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.serviceItem?.nameEn || 'N/A'}
                        </div>
                        {item.specifications && (
                          <div className="text-xs text-gray-400 mt-1 max-w-md">
                            <div className="bg-gray-50 p-2 rounded text-xs">
                              <strong>Specifications:</strong><br />
                              {item.specifications}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.serviceItem?.serviceCategory?.nameEn || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity || 0} {item.serviceItem?.unitOfMeasure || 'units'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(parseFloat(item.estimatedRate || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency((parseFloat(item.quantity || 0) * parseFloat(item.estimatedRate || 0) * (item.duration || 1)))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No items found in this requisition
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  Total Estimated Cost:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatCurrency(parseFloat(sr.estimatedCost))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Service-Specific Information */}
      {sr.itemType === 'SERVICE' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Service Requirements</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Scope of Work</h4>
              <p className="text-sm text-blue-800">
                Detailed service requirements and deliverables as specified in the service items above.
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-900 mb-2">Performance Metrics</h4>
              <p className="text-sm text-green-800">
                Service quality and performance will be measured against agreed KPIs and SLAs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {sr.status === 'DRAFT' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
          <div className="flex space-x-3">
            <button
              onClick={handleSubmitRequisition}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit for Approval
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <Edit className="h-4 w-4 mr-2" />
              Edit Requisition
            </button>
          </div>
        </div>
      )}

      {sr.status === 'SUBMITTED' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push(`/procurement/services/requisitions/${sr.id}/approve`)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Review & Approve
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <AlertCircle className="h-4 w-4 mr-2" />
              Request Changes
            </button>
          </div>
        </div>
      )}

      {/* Next Steps */}
      {sr.status === 'APPROVED' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push(`/procurement/services/contracts/new?prId=${sr.id}`)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Service Contract
            </button>
            <button
              onClick={() => router.push(`/procurement/services/rfp/new?prId=${sr.id}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <User className="h-4 w-4 mr-2" />
              Issue RFP/RFQ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
