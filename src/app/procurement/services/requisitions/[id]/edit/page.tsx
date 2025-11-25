'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Calculator,
  FileText,
  Users,
  Calendar,
  DollarSign,
  X,
  ChevronDown,
  Search,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ServiceItem {
  id: string;
  description: string;
  serviceType: string;
  quantity: number;
  unit: string;
  estimatedRate: number;
  duration: number;
  durationUnit: string;
  specifications?: string;
  deliverables: string[];
  performanceMetrics: string[];
}

interface Milestone {
  id: string;
  description: string;
  dueDate: string;
  paymentPercentage: number;
  acceptanceCriteria: string;
}

interface ServicePRFormData {
  // Step 1: Service Details
  serviceCategory: string;
  serviceType: string;
  departmentId: string;
  projectId?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requestor: string;

  // Step 2: Scope Definition
  detailedScope: string;
  technicalSpecifications?: string;
  items: ServiceItem[];
  milestones: Milestone[];

  // Step 3: Commercial Details
  estimatedCost: number;
  paymentTerms: string;
  paymentSchedule: 'LUMPSUM' | 'MILESTONE' | 'MONTHLY' | 'TIME_MATERIAL';
  preferredVendors: string[];

  // Step 4: Compliance & Budget
  budgetCode: string;
  costCenter?: string;
  requiredByDate: string;
  insuranceRequired: boolean;
  safetyRequirements?: string;
  qualityStandards?: string;
  justification: string;
}

interface Vendor {
  id: string;
  vendorCode: string;
  nameEn: string;
  nameAr: string;
  email: string;
}

export default function EditServiceRequisition() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');

  const [formData, setFormData] = useState<ServicePRFormData>({
    serviceCategory: '',
    serviceType: '',
    departmentId: '',
    priority: 'NORMAL',
    requestor: '',
    detailedScope: '',
    items: [],
    milestones: [],
    estimatedCost: 0,
    paymentTerms: 'NET_30',
    paymentSchedule: 'MILESTONE',
    preferredVendors: [],
    budgetCode: '',
    requiredByDate: '',
    insuranceRequired: false,
    justification: ''
  });

  const steps = [
    { id: 1, name: 'Service Details', description: 'Basic service information' },
    { id: 2, name: 'Scope Definition', description: 'Detailed requirements' },
    { id: 3, name: 'Commercial Details', description: 'Pricing and terms' },
    { id: 4, name: 'Compliance & Budget', description: 'Budget validation' },
    { id: 5, name: 'Review & Submit', description: 'Final review' }
  ];

  const serviceCategories = [
    'Subcontractors',
    'Equipment Rental',
    'Professional Services',
    'Maintenance Services',
    'IT Services',
    'Consultancy',
    'Security Services',
    'Cleaning Services',
    'Transportation',
    'Other'
  ];

  const serviceTypes: Record<string, string[]> = {
    'Subcontractors': ['Construction', 'Installation', 'Fabrication', 'Repair'],
    'Equipment Rental': ['Heavy Machinery', 'Vehicles', 'Tools', 'IT Equipment'],
    'Professional Services': ['Legal', 'Accounting', 'Engineering', 'Architecture'],
    'Maintenance Services': ['Preventive', 'Corrective', 'Emergency', 'Scheduled'],
    'IT Services': ['Software Development', 'System Integration', 'Support', 'Training'],
    'Consultancy': ['Management', 'Technical', 'Financial', 'Strategic'],
    'Security Services': ['Physical Security', 'Surveillance', 'Access Control'],
    'Cleaning Services': ['Office Cleaning', 'Industrial Cleaning', 'Specialized'],
    'Transportation': ['Personnel Transport', 'Cargo Transport', 'Logistics'],
    'Other': ['Custom Service']
  };

  // Fetch existing requisition data
  useEffect(() => {
    if (params?.id) {
      fetchRequisitionData();
    }
  }, [params?.id]);

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors();
  }, []);

  // Auto-calculate estimated cost when items change
  useEffect(() => {
    const totalCost = calculateTotalCost();
    setFormData(prev => ({ ...prev, estimatedCost: totalCost }));
  }, [formData.items]);

  const fetchRequisitionData = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/services/requisitions/${params?.id}`);
      const data = await response.json();

      console.log('Fetched requisition data:', data); // Debug log

      if (response.ok) {
        // Map the API data to form data structure
        const items = data.servicePR?.items?.map((item: any, index: number) => {
          console.log('Processing item:', item); // Debug log
          return {
            id: item.id || `item-${index}`,
            description: item.serviceItem?.nameEn || item.specifications || '',
            serviceType: item.serviceItem?.serviceCategory?.nameEn || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'Hours',
            estimatedRate: parseFloat(item.estimatedRate) || 0,
            duration: item.duration || 1,
            durationUnit: item.durationUnit || 'Days',
            specifications: item.specifications || '',
            deliverables: Array.isArray(item.deliverables) && item.deliverables.length > 0 
              ? item.deliverables.filter((d: string) => d && d.trim() !== '')
              : [''],
            performanceMetrics: Array.isArray(item.performanceMetrics) && item.performanceMetrics.length > 0 
              ? item.performanceMetrics.filter((m: string) => m && m.trim() !== '')
              : ['']
          };
        }) || [];

        // Try to get category from first item or use a default
        const firstCategory = data.servicePR?.items?.[0]?.serviceItem?.serviceCategory?.nameEn || '';
        const firstServiceType = data.servicePR?.items?.[0]?.serviceItem?.nameEn || '';

        console.log('Setting form data with category:', firstCategory, 'type:', firstServiceType); // Debug log

        setFormData({
          serviceCategory: firstCategory || 'Professional Services',
          serviceType: firstServiceType || '',
          departmentId: data.departmentId || '',
          projectId: data.projectId || '',
          priority: data.priority || 'NORMAL',
          requestor: data.requesterId || '',
          detailedScope: data.servicePR?.serviceScope || '',
          technicalSpecifications: data.servicePR?.technicalSpecifications || '',
          items: items.length > 0 ? items : [],
          milestones: [],
          estimatedCost: parseFloat(data.estimatedCost) || 0,
          paymentTerms: 'NET_30',
          paymentSchedule: data.servicePR?.paymentSchedule || 'MILESTONE',
          preferredVendors: Array.isArray(data.servicePR?.preferredVendors) 
            ? data.servicePR.preferredVendors.filter((v: string) => v)
            : [],
          budgetCode: data.budgetCode || '',
          costCenter: data.costCenter || '',
          requiredByDate: data.requestedDeliveryDate ? new Date(data.requestedDeliveryDate).toISOString().split('T')[0] : '',
          insuranceRequired: data.servicePR?.insuranceRequired || false,
          safetyRequirements: data.servicePR?.safetyRequirements || '',
          qualityStandards: data.servicePR?.qualityStandards || '',
          justification: data.justification || ''
        });
      } else {
        showToast('error', 'Failed to load service requisition');
        router.push('/procurement/services/requisitions');
      }
    } catch (error) {
      console.error('Error fetching requisition:', error);
      showToast('error', 'Failed to load service requisition');
      router.push('/procurement/services/requisitions');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const response = await fetch('/api/vendors?limit=1000');
      const data = await response.json();
      if (response.ok && data.vendors) {
        setVendors(data.vendors);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoadingVendors(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 3
    }).format(amount);
  };

  const addServiceItem = () => {
    const newItem: ServiceItem = {
      id: Date.now().toString(),
      description: '',
      serviceType: formData.serviceType,
      quantity: 1,
      unit: 'Hours',
      estimatedRate: 0,
      duration: 1,
      durationUnit: 'Days',
      deliverables: [''],
      performanceMetrics: ['']
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeServiceItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateServiceItem = (index: number, field: keyof ServiceItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      description: '',
      dueDate: '',
      paymentPercentage: 0,
      acceptanceCriteria: ''
    };
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone]
    }));
  };

  const removeMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) => 
        i === index ? { ...milestone, [field]: value } : milestone
      )
    }));
  };

  const calculateTotalCost = () => {
    return formData.items.reduce((total, item) => {
      return total + (item.quantity * item.estimatedRate);
    }, 0);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.serviceCategory) newErrors.serviceCategory = 'Service category is required';
        if (!formData.departmentId) newErrors.departmentId = 'Department is required';
        if (!formData.priority) newErrors.priority = 'Priority is required';
        break;
      case 2:
        if (!formData.detailedScope) newErrors.detailedScope = 'Detailed scope is required';
        if (formData.items.length === 0) newErrors.items = 'At least one service item is required';
        break;
      case 3:
        if (formData.estimatedCost <= 0) newErrors.estimatedCost = 'Estimated cost must be greater than 0';
        if (!formData.paymentTerms) newErrors.paymentTerms = 'Payment terms are required';
        break;
      case 4:
        if (!formData.budgetCode) newErrors.budgetCode = 'Budget code is required';
        if (!formData.requiredByDate) newErrors.requiredByDate = 'Required by date is required';
        if (!formData.justification) newErrors.justification = 'Justification is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    try {
      setLoading(true);

      // Update service requisition using PUT method
      const serviceData = {
        departmentId: formData.departmentId,
        requesterId: 'current-user-id', // In real app, get from auth
        priority: formData.priority,
        budgetCode: formData.budgetCode,
        justification: formData.justification,
        serviceScope: formData.detailedScope,
        technicalSpecifications: formData.technicalSpecifications,
        duration: formData.items.reduce((max, item) => Math.max(max, item.duration), 0),
        durationUnit: 'DAYS',
        deliverables: formData.items.flatMap(item => item.deliverables),
        performanceMetrics: formData.items.flatMap(item => item.performanceMetrics),
        slaRequirements: {
          responseTime: '4 hours',
          availability: '99.9%',
          support: '8x5 business hours'
        },
        insuranceRequired: formData.insuranceRequired,
        certificationRequired: true,
        safetyRequirements: formData.safetyRequirements,
        paymentSchedule: formData.paymentSchedule,
        retentionPercentage: 10,
        preferredVendors: formData.preferredVendors,
        items: formData.items.map(item => ({
          quantity: item.quantity,
          estimatedRate: item.estimatedRate,
          duration: item.duration,
          durationUnit: item.durationUnit,
          unit: item.unit,
          specifications: item.specifications,
          deliverables: item.deliverables,
          performanceMetrics: item.performanceMetrics
        }))
      };

      const response = await fetch(`/api/services/requisitions/${params?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });

      const result = await response.json();

      if (response.ok) {
        showToast('success', 'Service requisition updated successfully!');
        router.push(`/procurement/services/requisitions/${params?.id}`);
      } else {
        setErrors({ submit: result.error || 'Failed to update service requisition' });
        showToast('error', result.error || 'Failed to update service requisition');
      }
    } catch (error) {
      console.error('Error updating service requisition:', error);
      setErrors({ submit: 'Failed to update service requisition' });
      showToast('error', 'Failed to update service requisition');
    } finally {
      setLoading(false);
    }
  };

  const toggleVendor = (vendorId: string) => {
    setFormData(prev => ({
      ...prev,
      preferredVendors: prev.preferredVendors.includes(vendorId)
        ? prev.preferredVendors.filter(id => id !== vendorId)
        : [...prev.preferredVendors, vendorId]
    }));
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.nameEn.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
    vendor.vendorCode.toLowerCase().includes(vendorSearchTerm.toLowerCase())
  );

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-wujha-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading service requisition...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/procurement/services/requisitions/${params?.id}`)}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requisition
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Service Requisition</h1>
        <p className="mt-2 text-sm text-gray-600">
          Update the service requisition details
        </p>
        
        {/* Debug Info - Remove after testing */}
        {!loadingData && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
            <p className="font-medium text-yellow-900 mb-2">Debug Info (will be removed):</p>
            <p>Category: {formData.serviceCategory || 'NOT SET'}</p>
            <p>Type: {formData.serviceType || 'NOT SET'}</p>
            <p>Department: {formData.departmentId || 'NOT SET'}</p>
            <p>Priority: {formData.priority}</p>
            <p>Budget Code: {formData.budgetCode || 'NOT SET'}</p>
            <p>Items count: {formData.items.length}</p>
            <p>Scope: {formData.detailedScope ? 'SET' : 'NOT SET'}</p>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'border-wujha-primary bg-wujha-primary text-white' 
                    : 'border-gray-300 bg-white text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-wujha-primary' : 'bg-gray-300'
                  }`} />
                )}
              </div>
              <div className="mt-2">
                <p className={`text-xs font-medium ${
                  currentStep >= step.id ? 'text-wujha-primary' : 'text-gray-500'
                }`}>
                  {step.name}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {/* Step 1: Service Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Service Details</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Category *
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                  value={formData.serviceCategory}
                  onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value })}
                  placeholder="Enter service category"
                />
                {errors.serviceCategory && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceCategory}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Type
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  placeholder="Enter service type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  placeholder="Enter department ID"
                  readOnly
                />
                {errors.departmentId && (
                  <p className="mt-1 text-sm text-red-600">{errors.departmentId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Project ID
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                  value={formData.projectId || ''}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  placeholder="Enter project ID (optional)"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority *
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                {errors.priority && (
                  <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Requestor
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                  value={formData.requestor}
                  onChange={(e) => setFormData({ ...formData, requestor: e.target.value })}
                  placeholder="Enter requestor name"
                  readOnly
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Scope Definition */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Scope Definition</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scope of Work *
              </label>
              <textarea
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                value={formData.detailedScope}
                onChange={(e) => setFormData({ ...formData, detailedScope: e.target.value })}
                placeholder="Describe the overall scope of work, objectives, requirements, and expectations for this service..."
              />
              {errors.detailedScope && (
                <p className="mt-1 text-sm text-red-600">{errors.detailedScope}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technical Specifications
              </label>
              <textarea
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                value={formData.technicalSpecifications || ''}
                onChange={(e) => setFormData({ ...formData, technicalSpecifications: e.target.value })}
                placeholder="Enter any technical specifications or standards..."
              />
            </div>

            {/* Service Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Service Items *
                </label>
                <button
                  type="button"
                  onClick={addServiceItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>

              {errors.items && (
                <p className="mb-4 text-sm text-red-600">{errors.items}</p>
              )}

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-900">Item {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeServiceItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Specific Service Item Description *
                        </label>
                        <textarea
                          rows={2}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                          value={item.description}
                          onChange={(e) => updateServiceItem(index, 'description', e.target.value)}
                          placeholder="Describe the specific service or work to be performed for this item..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                          value={item.quantity}
                          onChange={(e) => updateServiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit *
                        </label>
                        <select
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                          value={item.unit}
                          onChange={(e) => updateServiceItem(index, 'unit', e.target.value)}
                        >
                          <option>Hours</option>
                          <option>Days</option>
                          <option>Weeks</option>
                          <option>Months</option>
                          <option>Units</option>
                          <option>Visits</option>
                          <option>Lump Sum</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estimated Rate (OMR) *
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                          value={item.estimatedRate}
                          onChange={(e) => updateServiceItem(index, 'estimatedRate', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration *
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                          value={item.duration}
                          onChange={(e) => updateServiceItem(index, 'duration', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration Unit *
                        </label>
                        <select
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                          value={item.durationUnit}
                          onChange={(e) => updateServiceItem(index, 'durationUnit', e.target.value)}
                        >
                          <option>Days</option>
                          <option>Weeks</option>
                          <option>Months</option>
                        </select>
                      </div>

                      <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Specifications
                        </label>
                        <textarea
                          rows={2}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                          value={item.specifications || ''}
                          onChange={(e) => updateServiceItem(index, 'specifications', e.target.value)}
                          placeholder="Enter any specific requirements or specifications..."
                        />
                      </div>

                      {/* Deliverables */}
                      <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Deliverables (e.g., Detailed project report, Training materials...)
                        </label>
                        {item.deliverables.map((deliverable, dIndex) => (
                          <div key={dIndex} className="flex items-center mt-1 mb-2">
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                              value={deliverable}
                              onChange={(e) => {
                                const newDeliverables = [...item.deliverables];
                                newDeliverables[dIndex] = e.target.value;
                                updateServiceItem(index, 'deliverables', newDeliverables);
                              }}
                              placeholder="e.g., Detailed project report"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newDeliverables = item.deliverables.filter((_, i) => i !== dIndex);
                                updateServiceItem(index, 'deliverables', newDeliverables);
                              }}
                              className="ml-2 p-2 text-red-600 hover:text-red-800 border border-gray-300 rounded-r-lg"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateServiceItem(index, 'deliverables', [...item.deliverables, ''])}
                          className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-wujha-primary bg-wujha-primary/10 hover:bg-wujha-primary/20"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Deliverable
                        </button>
                      </div>

                      {/* Performance Metrics */}
                      <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Performance Metrics (e.g., 99% uptime, Response time &lt; 2 hours...)
                        </label>
                        {item.performanceMetrics.map((metric, mIndex) => (
                          <div key={mIndex} className="flex items-center mt-1 mb-2">
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                              value={metric}
                              onChange={(e) => {
                                const newMetrics = [...item.performanceMetrics];
                                newMetrics[mIndex] = e.target.value;
                                updateServiceItem(index, 'performanceMetrics', newMetrics);
                              }}
                              placeholder="e.g., 99% uptime"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newMetrics = item.performanceMetrics.filter((_, i) => i !== mIndex);
                                updateServiceItem(index, 'performanceMetrics', newMetrics);
                              }}
                              className="ml-2 p-2 text-red-600 hover:text-red-800 border border-gray-300 rounded-r-lg"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateServiceItem(index, 'performanceMetrics', [...item.performanceMetrics, ''])}
                          className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-wujha-primary bg-wujha-primary/10 hover:bg-wujha-primary/20"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Metric
                        </button>
                      </div>

                      <div className="lg:col-span-3 bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Item Total:</span>
                          <span className="text-lg font-bold text-wujha-primary">
                            {formatCurrency(item.quantity * item.estimatedRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Commercial Details */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Commercial Details</h3>

            <div className="bg-wujha-primary/10 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Estimated Cost</p>
                  <p className="text-2xl font-bold text-wujha-primary">
                    {formatCurrency(formData.estimatedCost)}
                  </p>
                </div>
                <Calculator className="h-8 w-8 text-wujha-primary" />
              </div>
            </div>

            {errors.estimatedCost && (
              <p className="text-sm text-red-600">{errors.estimatedCost}</p>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms *
                </label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                >
                  <option value="NET_15">Net 15 Days</option>
                  <option value="NET_30">Net 30 Days</option>
                  <option value="NET_45">Net 45 Days</option>
                  <option value="NET_60">Net 60 Days</option>
                  <option value="ADVANCE">Advance Payment</option>
                </select>
                {errors.paymentTerms && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentTerms}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Schedule *
                </label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                  value={formData.paymentSchedule}
                  onChange={(e) => setFormData({ ...formData, paymentSchedule: e.target.value as any })}
                >
                  <option value="LUMPSUM">Lump Sum</option>
                  <option value="MILESTONE">Milestone-based</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="TIME_MATERIAL">Time & Material</option>
                </select>
              </div>
            </div>

            {/* Preferred Vendors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Vendors
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                  className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-wujha-primary focus:border-wujha-primary sm:text-sm"
                >
                  <span className="block truncate">
                    {formData.preferredVendors.length > 0 
                      ? `${formData.preferredVendors.length} vendor(s) selected`
                      : 'Select preferred vendors'}
                  </span>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </span>
                </button>

                {vendorDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    <div className="sticky top-0 z-10 bg-white px-2 py-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-wujha-primary focus:border-wujha-primary"
                          placeholder="Search vendors..."
                          value={vendorSearchTerm}
                          onChange={(e) => setVendorSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredVendors.map((vendor) => (
                        <div
                          key={vendor.id}
                          className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                          onClick={() => toggleVendor(vendor.id)}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-wujha-primary focus:ring-wujha-primary border-gray-300 rounded"
                              checked={formData.preferredVendors.includes(vendor.id)}
                              onChange={() => {}}
                            />
                            <span className="ml-3 block truncate">
                              {vendor.nameEn} ({vendor.vendorCode})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Select vendors you prefer to work with (optional)
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Compliance & Budget */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Compliance & Budget</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Code *
                </label>
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                  value={formData.budgetCode}
                  onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })}
                  placeholder="Enter budget code"
                />
                {errors.budgetCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.budgetCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Center
                </label>
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                  value={formData.costCenter || ''}
                  onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                  placeholder="Enter cost center (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required By Date *
                </label>
                <input
                  type="date"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                  value={formData.requiredByDate}
                  onChange={(e) => setFormData({ ...formData, requiredByDate: e.target.value })}
                />
                {errors.requiredByDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.requiredByDate}</p>
                )}
              </div>

              <div className="flex items-center pt-8">
                <input
                  type="checkbox"
                  id="insurance"
                  className="h-4 w-4 text-wujha-primary focus:ring-wujha-primary border-gray-300 rounded"
                  checked={formData.insuranceRequired}
                  onChange={(e) => setFormData({ ...formData, insuranceRequired: e.target.checked })}
                />
                <label htmlFor="insurance" className="ml-2 block text-sm text-gray-700">
                  Insurance Required
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Safety Requirements
              </label>
              <textarea
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                value={formData.safetyRequirements || ''}
                onChange={(e) => setFormData({ ...formData, safetyRequirements: e.target.value })}
                placeholder="Enter any safety requirements..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality Standards
              </label>
              <textarea
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                value={formData.qualityStandards || ''}
                onChange={(e) => setFormData({ ...formData, qualityStandards: e.target.value })}
                placeholder="Enter quality standards or certifications required..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Justification *
              </label>
              <textarea
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary px-3 py-2"
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                placeholder="Provide justification for this service requisition..."
              />
              {errors.justification && (
                <p className="mt-1 text-sm text-red-600">{errors.justification}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Review & Submit</h3>
            
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Service Details</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Category:</span> {formData.serviceCategory}</p>
                  <p><span className="font-medium">Type:</span> {formData.serviceType}</p>
                  <p><span className="font-medium">Priority:</span> {formData.priority}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Scope</h4>
                <p className="mt-2 text-sm text-gray-600">{formData.detailedScope}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Service Items</h4>
                <p className="mt-2 text-sm text-gray-600">{formData.items.length} item(s)</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Estimated Cost</h4>
                <p className="mt-2 text-lg font-bold text-wujha-primary">
                  {formatCurrency(formData.estimatedCost)}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Payment Details</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Terms:</span> {formData.paymentTerms}</p>
                  <p><span className="font-medium">Schedule:</span> {formData.paymentSchedule}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700">Budget Information</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Budget Code:</span> {formData.budgetCode}</p>
                  <p><span className="font-medium">Required By:</span> {formData.requiredByDate}</p>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Previous
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => router.push(`/procurement/services/requisitions/${params?.id}`)}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
              >
                Next
                <ChevronRight className="h-5 w-5 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Update Requisition
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
