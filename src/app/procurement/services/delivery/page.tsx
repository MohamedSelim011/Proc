'use client';

import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  FileText,
  Phone,
  Mail,
  Building,
  Activity,
  Target,
  Timer
} from 'lucide-react';
import { ListFiltersCard, ListFilterField } from '@/components/ui/list-filters-card';

interface ServiceDelivery {
  id: string;
  contractId: string;
  contractNumber: string;
  serviceType: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
    phone: string;
  };
  deliveryStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';
  scheduledDate: string;
  actualStartDate?: string;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  deliveryLocation: string;
  projectManager: string;
  resources: {
    personnel: number;
    equipment: string[];
    materials: string[];
  };
  milestones: {
    id: string;
    name: string;
    targetDate: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
    completionDate?: string;
  }[];
  totalValue: number;
  currency: string;
  notes?: string;
}

export default function ServiceDeliveryPage() {
  const [deliveries, setDeliveries] = useState<ServiceDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchServiceDeliveries();
  }, []);

  const fetchServiceDeliveries = async () => {
    try {
      setLoading(true);
      // Fetch active contracts and create delivery tracking data
      const response = await fetch('/api/purchase-orders?itemType=SERVICE&status=APPROVED');
      const data = await response.json();
      
      if (response.ok) {
        // Transform PO data into service delivery format
        const deliveryData: ServiceDelivery[] = data.purchaseOrders?.map((po: any) => ({
          id: `delivery-${po.id}`,
          contractId: po.id,
          contractNumber: po.poNumber,
          serviceType: po.items?.[0]?.item?.nameEn || 'Service Contract',
          vendor: {
            id: po.vendor.id,
            nameEn: po.vendor.nameEn,
            email: po.vendor.email,
            phone: po.vendor.phone || '+968 2234 5678'
          },
          deliveryStatus: getDeliveryStatus(po.status, po.deliveryDate),
          scheduledDate: po.deliveryDate || po.createdAt,
          actualStartDate: po.status === 'DELIVERED' ? po.deliveryDate : undefined,
          estimatedCompletionDate: addDays(po.deliveryDate || po.createdAt, 30),
          deliveryLocation: typeof po.deliveryAddress === 'string' 
            ? po.deliveryAddress 
            : po.deliveryAddress 
              ? `${po.deliveryAddress.building}, ${po.deliveryAddress.street}, ${po.deliveryAddress.city}, ${po.deliveryAddress.governorate}, ${po.deliveryAddress.postalCode}, ${po.deliveryAddress.country}`
              : 'Muscat, Oman',
          projectManager: 'Ahmed Al-Rashid',
          resources: {
            personnel: Math.floor(Math.random() * 10) + 2,
            equipment: ['Laptops', 'Testing Equipment', 'Safety Gear'],
            materials: ['Documentation', 'Training Materials', 'Certificates']
          },
          milestones: generateMilestones(po.deliveryDate || po.createdAt),
          totalValue: po.totalAmount,
          currency: po.currency || 'OMR',
          notes: po.notes
        })) || [];
        
        setDeliveries(deliveryData);
      }
    } catch (error) {
      console.error('Error fetching service deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryStatus = (poStatus: string, deliveryDate: string): ServiceDelivery['deliveryStatus'] => {
    if (poStatus === 'DELIVERED') return 'DELIVERED';
    if (poStatus === 'CANCELLED') return 'CANCELLED';
    
    const today = new Date();
    const scheduled = new Date(deliveryDate);
    
    if (scheduled > today) return 'SCHEDULED';
    if (scheduled <= today && poStatus === 'APPROVED') return 'IN_PROGRESS';
    return 'DELAYED';
  };

  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  const generateMilestones = (startDate: string) => {
    const start = new Date(startDate);
    return [
      {
        id: 'mobilization',
        name: 'Service Mobilization',
        targetDate: new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'COMPLETED' as const
      },
      {
        id: 'setup',
        name: 'Setup & Configuration',
        targetDate: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'IN_PROGRESS' as const
      },
      {
        id: 'testing',
        name: 'Testing & Validation',
        targetDate: new Date(start.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING' as const
      },
      {
        id: 'completion',
        name: 'Service Completion',
        targetDate: new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING' as const
      }
    ];
  };

  const getStatusColor = (status: ServiceDelivery['deliveryStatus']) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'DELAYED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesStatus = selectedStatus === 'ALL' || delivery.deliveryStatus === selectedStatus;
    const matchesSearch = delivery.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.vendor.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: deliveries.length,
    scheduled: deliveries.filter(d => d.deliveryStatus === 'SCHEDULED').length,
    inProgress: deliveries.filter(d => d.deliveryStatus === 'IN_PROGRESS').length,
    delivered: deliveries.filter(d => d.deliveryStatus === 'DELIVERED').length,
    delayed: deliveries.filter(d => d.deliveryStatus === 'DELAYED').length
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
          <h1 className="text-3xl font-bold text-gray-900">Service Delivery Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor service mobilization and delivery progress</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Timer className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Delayed</p>
              <p className="text-2xl font-bold text-red-600">{stats.delayed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ListFiltersCard className="mb-6" columnsClassName="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListFilterField label="Search">
          <input
            type="text"
            placeholder="Search by contract number, vendor, or service type..."
            className="erp-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </ListFilterField>
        <ListFilterField label="Status">
          <select
            className="erp-input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DELAYED">Delayed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </ListFilterField>
      </ListFiltersCard>

      {/* Service Deliveries List */}
      <div className="space-y-6">
        {filteredDeliveries.map((delivery) => (
          <div key={delivery.id} className="bg-white rounded-lg shadow">
            {/* Delivery Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {delivery.contractNumber}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.deliveryStatus)}`}>
                      {delivery.deliveryStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{delivery.serviceType}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {delivery.vendor.nameEn}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {delivery.deliveryLocation}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {delivery.projectManager}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {delivery.totalValue.toLocaleString()} {delivery.currency}
                  </p>
                  <p className="text-sm text-gray-500">Contract Value</p>
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Timeline & Dates */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Timeline & Dates</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Scheduled Start:</span>
                      <span className="text-sm font-medium">
                        {new Date(delivery.scheduledDate).toLocaleDateString()}
                      </span>
                    </div>
                    {delivery.actualStartDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Actual Start:</span>
                        <span className="text-sm font-medium">
                          {new Date(delivery.actualStartDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Est. Completion:</span>
                      <span className="text-sm font-medium">
                        {new Date(delivery.estimatedCompletionDate!).toLocaleDateString()}
                      </span>
                    </div>
                    {delivery.actualCompletionDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Actual Completion:</span>
                        <span className="text-sm font-medium">
                          {new Date(delivery.actualCompletionDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resources */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Allocated Resources</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Personnel:</span>
                      <span className="text-sm font-medium">{delivery.resources.personnel} people</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Equipment:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {delivery.resources.equipment.map((item, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-xs rounded">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Materials:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {delivery.resources.materials.map((item, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-xs rounded">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Service Milestones</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {delivery.milestones.map((milestone) => (
                    <div key={milestone.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{milestone.name}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMilestoneStatusColor(milestone.status)}`}>
                          {milestone.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Target: {new Date(milestone.targetDate).toLocaleDateString()}
                      </p>
                      {milestone.completionDate && (
                        <p className="text-xs text-gray-500">
                          Completed: {new Date(milestone.completionDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{delivery.vendor.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{delivery.vendor.phone}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100">
                      Update Status
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDeliveries.length === 0 && (
        <div className="text-center py-12">
          <Truck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No service deliveries found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedStatus !== 'ALL' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Service deliveries will appear here once contracts are activated.'}
          </p>
        </div>
      )}
    </div>
  );
}
