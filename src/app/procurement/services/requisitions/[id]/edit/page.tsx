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
  X,
  ChevronDown,
  Search,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { SearchableSelect } from '@/components/common/searchable-select'

interface ServiceItem {
  id: string;
  description: string;
  serviceType: string;
  quantity: number;
  unit: string;
  pricingModel: 'ONE_TIME' | 'RECURRING';
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
  paymentSchedule: 'LUMPSUM' | 'MILESTONE' | 'MONTHLY' | 'TIME_MATERIAL' | '';
  preferredVendors: string[];
  slaRequirements?: Record<string, string> | null;
  certificationRequired?: boolean;

  // Step 4: Compliance
  requiredByDate: string;
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

interface DepartmentOption {
  id: string;
  name: string;
  code?: string | null;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export default function EditServiceRequisition() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, Record<string, string>>>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [requestBasis, setRequestBasis] = useState<'DEPARTMENT' | 'PROJECT'>('DEPARTMENT');

  const [formData, setFormData] = useState<ServicePRFormData>({
    serviceCategory: '',
    serviceType: '',
    departmentId: '',
    projectId: '',
    priority: 'NORMAL',
    requestor: '',
    detailedScope: '',
    items: [],
    milestones: [],
    estimatedCost: 0,
    paymentTerms: '',
    paymentSchedule: '',
    preferredVendors: [],
    requiredByDate: '',
    justification: ''
  });

  const steps = [
    { id: 1, name: 'Service Details', description: 'Basic service information' },
    { id: 2, name: 'Scope Definition', description: 'Detailed requirements' },
    { id: 3, name: 'Commercial Details', description: 'Pricing and terms' },
    { id: 4, name: 'Compliance', description: 'Compliance and timeline' },
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

  const billingUnitOptions = [
    { value: 'Job', label: 'Job (fixed scope)' },
    { value: 'Visit', label: 'Visit / Callout' },
    { value: 'Unit', label: 'Unit' },
    { value: 'Lot', label: 'Lot (lump sum)' },
  ];

  const normalizeDurationUnitForUi = (value: unknown): string => {
    const raw = String(value || '').trim().toUpperCase();
    if (raw === 'DAYS') return 'Days';
    if (raw === 'WEEKS') return 'Weeks';
    if (raw === 'MONTHS') return 'Months';
    return '';
  };

  const getPeriodUnitLabel = (durationUnit: string) => {
    const normalized = (durationUnit || 'Days').trim().toLowerCase();
    if (normalized === 'days') return 'day';
    if (normalized === 'weeks') return 'week';
    if (normalized === 'months') return 'month';
    return normalized;
  };

  const getItemTotal = (item: ServiceItem) => {
    const periodMultiplier = item.pricingModel === 'RECURRING' ? Math.max(item.duration, 1) : 1;
    return item.quantity * item.estimatedRate * periodMultiplier;
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
    fetchDepartments();
    fetchProjects();
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

      if (response.ok) {
        // Map the API data to form data structure
        const items = data.servicePR?.items?.map((item: any, index: number) => {
          const duration = Number(item.duration ?? 1);
          const estimatedRate = Number(item.estimatedRate ?? 0);
          const quantity = Number(item.quantity ?? 0);
          const normalizedDurationUnit = normalizeDurationUnitForUi(item.durationUnit);

          return {
            id: item.id || `item-${index}`,
            description: item.specifications || item.serviceItem?.nameEn || '',
            serviceType: item.serviceItem?.serviceCategory?.nameEn || '',
            quantity,
            unit: item.unit || '',
            pricingModel: duration > 1 ? 'RECURRING' : 'ONE_TIME',
            estimatedRate,
            duration,
            durationUnit: normalizedDurationUnit || 'Days',
            specifications: item.specifications || '',
            deliverables: Array.isArray(item.deliverables) && item.deliverables.length > 0 
              ? item.deliverables.filter((d: string) => d && d.trim() !== '')
              : [''],
            performanceMetrics: Array.isArray(item.performanceMetrics) && item.performanceMetrics.length > 0 
              ? item.performanceMetrics.filter((m: string) => m && m.trim() !== '')
              : ['']
          };
        }) || [];

        // Prefer canonical values stored on servicePR, then fallback to first item metadata.
        const firstCategory = data.servicePR?.serviceCategory || data.servicePR?.items?.[0]?.serviceItem?.serviceCategory?.nameEn || '';
        const firstServiceType = data.servicePR?.serviceType || data.servicePR?.items?.[0]?.serviceItem?.nameEn || '';
        const basisFromApi =
          String(data.requestBasis || '').toUpperCase() === 'PROJECT' ||
          (typeof data.projectId === 'string' && data.projectId.trim())
            ? 'PROJECT'
            : 'DEPARTMENT';
        setRequestBasis(basisFromApi);

        setFormData({
          serviceCategory: firstCategory || '',
          serviceType: firstServiceType || '',
          departmentId: data.departmentId || '',
          projectId: data.projectId || '',
          priority: data.priority || 'NORMAL',
          requestor: data.servicePR?.requestor || data.requestor || '',
          detailedScope: data.servicePR?.serviceScope || '',
          technicalSpecifications: data.servicePR?.technicalSpecifications || '',
          items: items.length > 0 ? items : [],
          milestones: [],
          estimatedCost: parseFloat(data.estimatedCost) || 0,
          paymentTerms: data.servicePR?.paymentTerms || '',
          paymentSchedule: data.servicePR?.paymentSchedule || '',
          preferredVendors: Array.isArray(data.servicePR?.preferredVendors) 
            ? data.servicePR.preferredVendors.filter((v: string) => v)
            : [],
          slaRequirements:
            data.servicePR?.slaRequirements && typeof data.servicePR.slaRequirements === 'object'
              ? data.servicePR.slaRequirements
              : null,
          certificationRequired:
            typeof data.servicePR?.certificationRequired === 'boolean'
              ? data.servicePR.certificationRequired
              : false,
          requiredByDate: (data.requiredByDate || data.requestedDeliveryDate)
            ? new Date(data.requiredByDate || data.requestedDeliveryDate).toISOString().split('T')[0]
            : '',
          safetyRequirements: data.servicePR?.safetyRequirements || '',
          qualityStandards: data.servicePR?.qualityStandards || '',
          justification: data.justification || ''
        });
      } else {
        showToast('error', 'Failed to load service requisition');
        router.push('/procurement/services/dashboard');
      }
    } catch (error) {
      console.error('Error fetching requisition:', error);
      showToast('error', 'Failed to load service requisition');
      router.push('/procurement/services/dashboard');
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

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await fetch('/api/organization/departments?limit=1000');
      const data = await response.json();
      if (response.ok) {
        const rows = Array.isArray(data?.items) ? data.items : [];
        const mapped = rows
          .map((row: Record<string, unknown>) => ({
            id: String(row.id ?? ''),
            name: String(row.name ?? ''),
            code: row.code == null ? null : String(row.code),
          }))
          .filter((row: DepartmentOption) => Boolean(row.id) && Boolean(row.name));
        setDepartments(mapped);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch('/api/organization/projects?limit=1000');
      const data = await response.json();
      if (response.ok) {
        const rows = Array.isArray(data?.items) ? data.items : [];
        const mapped = rows
          .map((row: Record<string, unknown>) => ({
            id: String(row.id ?? ''),
            code: String(row.projectCode ?? row.code ?? ''),
            name: String(row.projectName ?? row.name ?? ''),
          }))
          .filter((row: ProjectOption) => Boolean(row.id));
        setProjects(mapped);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
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
      unit: 'Job',
      pricingModel: 'ONE_TIME',
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

    if (field === 'description') {
      setItemErrors(prev => {
        const next = { ...prev };
        if (next[index]?.description) {
          delete next[index].description;
          if (Object.keys(next[index]).length === 0) {
            delete next[index];
          }
        }
        return next;
      });
    }
  };

  const handleItemBlur = (index: number, value: string) => {
    const trimmedValue = value?.trim() || '';
    if (!trimmedValue) {
      setItemErrors(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          description: 'Service item description is required',
        },
      }));
      if (value && !trimmedValue) {
        updateServiceItem(index, 'description', '');
      }
    }
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
    return formData.items.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.serviceCategory) newErrors.serviceCategory = 'Service category is required';
        if (requestBasis === 'DEPARTMENT') {
          if (!formData.departmentId || !formData.departmentId.trim()) newErrors.departmentId = 'Department is required';
        } else {
          if (!formData.projectId || !formData.projectId.trim()) newErrors.projectId = 'Project is required';
        }
        if (!formData.priority) newErrors.priority = 'Priority is required';
        if (!formData.requestor || !formData.requestor.trim()) newErrors.requestor = 'Requestor is required';
        break;
      case 2:
        if (!formData.detailedScope || !formData.detailedScope.trim()) newErrors.detailedScope = 'Detailed scope is required';
        if (formData.items.length === 0) {
          newErrors.items = 'At least one service item is required';
        } else {
          const nextItemErrors: Record<number, Record<string, string>> = {};
          formData.items.forEach((item, index) => {
            if (!item.description || !item.description.trim()) {
              nextItemErrors[index] = {
                description: 'Service item description is required',
              };
            }
          });
          setItemErrors(nextItemErrors);
          if (Object.keys(nextItemErrors).length > 0) {
            newErrors.items = 'Please fill in all required service item fields';
          }
        }
        break;
      case 3:
        if (formData.estimatedCost <= 0) newErrors.estimatedCost = 'Estimated cost must be greater than 0';
        if (!formData.paymentTerms) newErrors.paymentTerms = 'Payment terms are required';
        break;
      case 4:
        // Validate Required By Date
        if (!formData.requiredByDate) {
          newErrors.requiredByDate = 'Required by date is required';
        } else {
          const selectedDate = new Date(formData.requiredByDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (isNaN(selectedDate.getTime())) {
            newErrors.requiredByDate = 'Invalid date format';
          } else {
            if (selectedDate.getFullYear() < 1900) {
              newErrors.requiredByDate = 'Date cannot be before year 1900';
            } else if (selectedDate < today) {
              newErrors.requiredByDate = 'Required date must be today or in the future';
            } else {
              const maxDate = new Date();
              maxDate.setFullYear(maxDate.getFullYear() + 10);
              if (selectedDate > maxDate) {
                newErrors.requiredByDate = 'Date cannot be more than 10 years in the future';
              }
            }
          }
        }
        
        if (!formData.justification || !formData.justification.trim()) newErrors.justification = 'Justification is required';
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
      const selectedDepartmentId = requestBasis === 'DEPARTMENT' ? (formData.departmentId || '').trim() : '';
      const selectedProjectId = requestBasis === 'PROJECT' ? (formData.projectId || '').trim() : '';

      // Update service requisition using PUT method
      const serviceData = {
        requestBasis,
        departmentId: selectedDepartmentId || null,
        projectId: selectedProjectId || null,
        requestor: formData.requestor,
        priority: formData.priority,
        justification: formData.justification,
        requestedDeliveryDate: formData.requiredByDate,
        serviceScope: formData.detailedScope,
        technicalSpecifications: formData.technicalSpecifications,
        duration: formData.items.reduce((max, item) => Math.max(max, item.duration), 0),
        durationUnit: (() => {
          const recurring = formData.items.find((item) => item.pricingModel === 'RECURRING');
          const source = recurring?.durationUnit || formData.items[0]?.durationUnit || '';
          return source ? source.toUpperCase() : undefined;
        })(),
        deliverables: formData.items.flatMap(item => item.deliverables.filter((entry) => entry && entry.trim())),
        performanceMetrics: formData.items.flatMap(item => item.performanceMetrics.filter((entry) => entry && entry.trim())),
        slaRequirements: formData.slaRequirements || null,
        certificationRequired: Boolean(formData.certificationRequired),
        safetyRequirements: formData.safetyRequirements,
        paymentTerms: formData.paymentTerms,
        paymentSchedule: formData.paymentSchedule,
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  placeholder="Enter service type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Request Basis *
                </label>
                <SearchableSelect
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={requestBasis}
                  onChange={(e) => {
                    const basis = e.target.value as 'DEPARTMENT' | 'PROJECT';
                    setRequestBasis(basis);
                    setFormData(prev => ({
                      ...prev,
                      departmentId: basis === 'DEPARTMENT' ? prev.departmentId : '',
                      projectId: basis === 'PROJECT' ? prev.projectId : '',
                    }));
                    setErrors(prev => {
                      const next = { ...prev };
                      delete next.departmentId;
                      delete next.projectId;
                      return next;
                    });
                  }}
                >
                  <option value="DEPARTMENT">Department Based</option>
                  <option value="PROJECT">Project Based</option>
                </SearchableSelect>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {requestBasis === 'DEPARTMENT' ? 'Department *' : 'Project *'}
                </label>
                <SearchableSelect
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={requestBasis === 'DEPARTMENT' ? formData.departmentId : (formData.projectId || '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (requestBasis === 'DEPARTMENT') {
                      setFormData(prev => ({ ...prev, departmentId: value, projectId: '' }));
                      if (errors.departmentId) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.departmentId;
                          return next;
                        });
                      }
                    } else {
                      setFormData(prev => ({ ...prev, projectId: value, departmentId: '' }));
                      if (errors.projectId) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.projectId;
                          return next;
                        });
                      }
                    }
                  }}
                >
                  {requestBasis === 'DEPARTMENT' ? (
                    <>
                      <option value="">{loadingDepartments ? 'Loading departments...' : 'Select department'}</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}{dept.code ? ` (${dept.code})` : ''}
                        </option>
                      ))}
                    </>
                  ) : (
                    <>
                      <option value="">{loadingProjects ? 'Loading projects...' : 'Select project'}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code ? `${project.code} - ` : ''}{project.name}
                        </option>
                      ))}
                    </>
                  )}
                </SearchableSelect>
                {requestBasis === 'DEPARTMENT' && errors.departmentId && (
                  <p className="mt-1 text-sm text-red-600">{errors.departmentId}</p>
                )}
                {requestBasis === 'PROJECT' && errors.projectId && (
                  <p className="mt-1 text-sm text-red-600">{errors.projectId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority *
                </label>
                <SearchableSelect
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </SearchableSelect>
                {errors.priority && (
                  <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Requestor *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.requestor}
                  onChange={(e) => setFormData({ ...formData, requestor: e.target.value })}
                  placeholder="Enter requestor name"
                />
                {errors.requestor && (
                  <p className="mt-1 text-sm text-red-600">{errors.requestor}</p>
                )}
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
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white ${
                  errors.detailedScope ? 'border-red-300 ring-red-100' : ''
                }`}
                value={formData.detailedScope}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setFormData({ ...formData, detailedScope: inputValue });
                  // Clear error when user types
                  if (errors.detailedScope) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.detailedScope;
                      return newErrors;
                    });
                  }
                }}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                value={formData.technicalSpecifications || ''}
                onChange={(e) => setFormData({ ...formData, technicalSpecifications: e.target.value })}
                placeholder="Enter any technical specifications or standards..."
              />
            </div>

            {/* Service Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Service Items</h4>
                <button
                  type="button"
                  onClick={addServiceItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Item
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-medium text-gray-900">Service Item {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeServiceItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="lg:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Service Item Description *
                      </label>
                      <textarea
                        rows={2}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary text-gray-900 bg-white ${
                          itemErrors[index]?.description 
                            ? 'border-red-300 focus:border-red-500' 
                            : 'border-gray-300 focus:border-wujha-primary'
                        }`}
                        value={item.description}
                        onChange={(e) => updateServiceItem(index, 'description', e.target.value)}
                        onBlur={(e) => handleItemBlur(index, e.target.value)}
                        placeholder="Describe this specific service item..."
                      />
                      {itemErrors[index]?.description && (
                        <p className="mt-1 text-sm text-red-600">{itemErrors[index].description}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity / Scope *
                      </label>
                      <div className="flex rounded-lg shadow-sm">
                        <input
                          type="number"
                          min="1"
                          className="block w-full rounded-l-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                          value={item.quantity}
                          onChange={(e) => updateServiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                        <SearchableSelect
                          className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                          value={item.unit}
                          onChange={(e) => updateServiceItem(index, 'unit', e.target.value)}
                        >
                          <option value="">Select unit</option>
                          {billingUnitOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </SearchableSelect>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Pricing Model *
                      </label>
                      <SearchableSelect
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                        value={item.pricingModel}
                        onChange={(e) => {
                          const pricingModel = e.target.value as 'ONE_TIME' | 'RECURRING';
                          updateServiceItem(index, 'pricingModel', pricingModel);
                          if (pricingModel === 'ONE_TIME') {
                            updateServiceItem(index, 'duration', 1);
                            updateServiceItem(index, 'durationUnit', 'Days');
                          }
                        }}
                      >
                        <option value="ONE_TIME">One-time</option>
                        <option value="RECURRING">Recurring</option>
                      </SearchableSelect>
                    </div>

                    {item.pricingModel === 'RECURRING' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Billing Period *
                        </label>
                        <div className="flex rounded-lg shadow-sm">
                          <input
                            type="number"
                            min="1"
                            className="block w-full rounded-l-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                            value={item.duration}
                            onChange={(e) => updateServiceItem(index, 'duration', parseInt(e.target.value) || 1)}
                          />
                          <SearchableSelect
                            className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                            value={item.durationUnit}
                            onChange={(e) => updateServiceItem(index, 'durationUnit', e.target.value)}
                          >
                            <option value="Days">Days</option>
                            <option value="Weeks">Weeks</option>
                            <option value="Months">Months</option>
                          </SearchableSelect>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Service Period
                        </label>
                        <div className="h-[42px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 flex items-center">
                          Not required for this pricing basis
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {item.pricingModel === 'RECURRING'
                          ? `Rate (OMR per ${item.unit || 'unit'} per ${getPeriodUnitLabel(item.durationUnit)}) *`
                          : `Rate (OMR per ${item.unit || 'unit'}) *`}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">OMR</span>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          className="pl-12 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                          value={item.estimatedRate}
                          onChange={(e) => updateServiceItem(index, 'estimatedRate', parseFloat(e.target.value) || 0)}
                          placeholder="0.000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deliverables
                    </label>
                    <div className="space-y-2">
                      {item.deliverables.map((deliverable, delIndex) => (
                        <div key={delIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                            value={deliverable}
                            onChange={(e) => {
                              const next = [...item.deliverables];
                              next[delIndex] = e.target.value;
                              updateServiceItem(index, 'deliverables', next);
                            }}
                            placeholder="Add deliverable"
                          />
                          <button
                            type="button"
                            onClick={() => updateServiceItem(index, 'deliverables', item.deliverables.filter((_, i) => i !== delIndex))}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateServiceItem(index, 'deliverables', [...item.deliverables, ''])}
                        className="text-sm text-wujha-primary hover:text-wujha-primary-hover flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Deliverable
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Performance Metrics / Technical Specifications
                    </label>
                    <div className="space-y-2">
                      {item.performanceMetrics.map((metric, metIndex) => (
                        <div key={metIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                            value={metric}
                            onChange={(e) => {
                              const next = [...item.performanceMetrics];
                              next[metIndex] = e.target.value;
                              updateServiceItem(index, 'performanceMetrics', next);
                            }}
                            placeholder="Add performance metric"
                          />
                          <button
                            type="button"
                            onClick={() => updateServiceItem(index, 'performanceMetrics', item.performanceMetrics.filter((_, i) => i !== metIndex))}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateServiceItem(index, 'performanceMetrics', [...item.performanceMetrics, ''])}
                        className="text-sm text-wujha-primary hover:text-wujha-primary-hover flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Performance Metric
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-3 mt-4 flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-500">
                      Item Total: {formatCurrency(getItemTotal(item))}
                    </span>
                    <span className="text-xs text-gray-400">
                      {item.pricingModel === 'RECURRING'
                        ? 'Formula: Quantity x Billing Period x Rate'
                        : 'Formula: Quantity x Rate'}
                    </span>
                  </div>
                </div>
              ))}

              {errors.items && (
                <p className="mt-1 text-sm text-red-600">{errors.items}</p>
              )}

              {formData.items.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No service items</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a service item.</p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={addServiceItem}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service Item
                    </button>
                  </div>
                </div>
              )}
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
                <SearchableSelect
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                >
                  <option value="">Select payment terms</option>
                  <option value="NET_15">Net 15 Days</option>
                  <option value="NET_30">Net 30 Days</option>
                  <option value="NET_45">Net 45 Days</option>
                  <option value="NET_60">Net 60 Days</option>
                  <option value="ADVANCE">Advance Payment</option>
                </SearchableSelect>
                {errors.paymentTerms && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentTerms}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Schedule *
                </label>
                <SearchableSelect
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.paymentSchedule}
                  onChange={(e) => setFormData({ ...formData, paymentSchedule: e.target.value as any })}
                >
                  <option value="">Select payment schedule</option>
                  <option value="LUMPSUM">Lump Sum</option>
                  <option value="MILESTONE">Milestone-based</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="TIME_MATERIAL">Time & Material</option>
                </SearchableSelect>
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
                  className="relative w-full bg-white border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary sm:text-sm"
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
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
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

        {/* Step 4: Compliance */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Compliance</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required By Date *
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white ${
                    errors.requiredByDate ? 'border-red-300 ring-red-100' : ''
                  }`}
                  value={formData.requiredByDate}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setFormData({ ...formData, requiredByDate: inputValue });
                    
                    // Validate in real-time
                    if (inputValue) {
                      const selectedDate = new Date(inputValue);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      if (isNaN(selectedDate.getTime())) {
                        setErrors(prev => ({ ...prev, requiredByDate: 'Invalid date format' }));
                      } else if (selectedDate.getFullYear() < 1900) {
                        setErrors(prev => ({ ...prev, requiredByDate: 'Date cannot be before year 1900' }));
                      } else if (selectedDate < today) {
                        setErrors(prev => ({ ...prev, requiredByDate: 'Required date must be today or in the future' }));
                      } else {
                        const maxDate = new Date();
                        maxDate.setFullYear(maxDate.getFullYear() + 10);
                        if (selectedDate > maxDate) {
                          setErrors(prev => ({ ...prev, requiredByDate: 'Date cannot be more than 10 years in the future' }));
                        } else {
                          // Clear error if date is valid
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.requiredByDate;
                            return newErrors;
                          });
                        }
                      }
                    } else {
                      // Clear error if field is empty (will be caught by required validation)
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.requiredByDate;
                        return newErrors;
                      });
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  max={(() => {
                    const maxDate = new Date();
                    maxDate.setFullYear(maxDate.getFullYear() + 10);
                    return maxDate.toISOString().split('T')[0];
                  })()}
                />
                {errors.requiredByDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.requiredByDate}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Safety Requirements
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
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
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white ${
                  errors.justification ? 'border-red-300 ring-red-100' : ''
                }`}
                value={formData.justification}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setFormData({ ...formData, justification: inputValue });
                  // Clear error when user types
                  if (errors.justification) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.justification;
                      return newErrors;
                    });
                  }
                }}
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
                <h4 className="text-sm font-medium text-gray-700">Timeline</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
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

