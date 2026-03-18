'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Search
} from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';

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

interface MaterialItem {
  itemId: string;
  quantity: number;
  estimatedPrice: number;
  specifications?: string;
  requiredDate?: string;
}

interface InventoryItem {
  id: string;
  itemCode: string;
  nameEn: string;
  unitOfMeasure: string;
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
  materialItems: MaterialItem[];

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

interface DepartmentOption {
  id: string;
  name: string;
  code?: string | null;
}

function NewServiceRequisitionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMixedMode = (searchParams.get('mode') || '').toLowerCase() === 'mixed';
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, Record<string, string>>>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
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
    materialItems: [],
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

  const serviceTypes = {
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
    { value: 'Hour', label: 'Hour' },
    { value: 'Day', label: 'Day' },
    { value: 'Week', label: 'Week' },
    { value: 'Month', label: 'Month' },
    { value: 'Unit', label: 'Unit' },
    { value: 'Lot', label: 'Lot (lump sum)' },
  ];

  const durationBasedUnits = new Set(['hour', 'hours', 'day', 'days', 'week', 'weeks', 'month', 'months']);

  const isDurationBasedUnit = (unit: string) => durationBasedUnits.has((unit || '').trim().toLowerCase());

  const getItemTotal = (item: ServiceItem) => {
    const durationMultiplier = isDurationBasedUnit(item.unit) ? item.duration : 1;
    return item.quantity * item.estimatedRate * durationMultiplier;
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

    // Clear error for this field when user starts typing
    if (field === 'description') {
      setItemErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors[index]) {
          delete newErrors[index].description;
          if (Object.keys(newErrors[index]).length === 0) {
            delete newErrors[index];
          }
        }
        return newErrors;
      });
    }
  };

  const handleItemBlur = (index: number, field: keyof ServiceItem, value: any) => {
    if (field === 'description') {
      const trimmedValue = value?.trim() || '';
      if (!trimmedValue) {
        setItemErrors(prev => ({
          ...prev,
          [index]: {
            ...prev[index],
            description: 'Service item description is required'
          }
        }));
        // Clear the field if it's only whitespace
        if (value && !trimmedValue) {
          setFormData(prev => ({
            ...prev,
            items: prev.items.map((item, i) => 
              i === index ? { ...item, description: '' } : item
            )
          }));
        }
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

  const addMaterialItem = () => {
    setFormData((prev) => ({
      ...prev,
      materialItems: [
        ...prev.materialItems,
        {
          itemId: '',
          quantity: 1,
          estimatedPrice: 0,
          specifications: '',
          requiredDate: '',
        },
      ],
    }));
  };

  const removeMaterialItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materialItems: prev.materialItems.filter((_, i) => i !== index),
    }));
  };

  const updateMaterialItem = (index: number, field: keyof MaterialItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      materialItems: prev.materialItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const calculateTotalCost = () => {
    return formData.items.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  const calculateMaterialCost = () => {
    return formData.materialItems.reduce(
      (sum, item) => sum + (Number(item.quantity || 0) * Number(item.estimatedPrice || 0)),
      0
    );
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.serviceCategory) newErrors.serviceCategory = 'Service category is required';
        if (!formData.serviceType) newErrors.serviceType = 'Service type is required';
        if (!formData.departmentId || !formData.departmentId.trim()) newErrors.departmentId = 'Department is required';
        if (!formData.requestor || !formData.requestor.trim()) newErrors.requestor = 'Requestor is required';
        break;
      case 2:
        if (!formData.detailedScope || !formData.detailedScope.trim()) newErrors.detailedScope = 'Detailed scope is required';
        if (formData.items.length === 0) {
          newErrors.items = 'At least one service item is required';
        } else {
          // Validate each service item description
          const itemValidationErrors: Record<number, Record<string, string>> = {};
          formData.items.forEach((item, index) => {
            if (!item.description || !item.description.trim()) {
              itemValidationErrors[index] = {
                description: 'Service item description is required'
              };
            }
          });
          if (Object.keys(itemValidationErrors).length > 0) {
            setItemErrors(itemValidationErrors);
            newErrors.items = 'Please fill in all required service item fields';
          } else {
            setItemErrors({});
          }
        }
        if (isMixedMode) {
          if (formData.materialItems.length === 0) {
            newErrors.materialItems = 'Mixed requisitions require at least one material line';
          } else {
            const hasInvalidMaterial = formData.materialItems.some(
              (item) =>
                !item.itemId ||
                Number(item.quantity || 0) <= 0 ||
                Number(item.estimatedPrice || 0) <= 0
            );
            if (hasInvalidMaterial) {
              newErrors.materialItems = 'Please complete all material lines (item, quantity, unit price)';
            }
          }
        }
        break;
      case 3:
        if (formData.estimatedCost <= 0) newErrors.estimatedCost = 'Estimated cost must be greater than 0';
        if (!formData.paymentTerms) newErrors.paymentTerms = 'Payment terms are required';
        break;
      case 4:
        if (!formData.budgetCode || !formData.budgetCode.trim()) newErrors.budgetCode = 'Budget code is required';
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
      // Clear item errors when moving to next step if validation passes
      if (currentStep === 2) {
        setItemErrors({});
      }
      if (currentStep === 3) {
        // Auto-calculate estimated cost from items
        const totalCost = calculateTotalCost();
        setFormData(prev => ({ ...prev, estimatedCost: totalCost }));
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    // Validate all steps before submission
    if (!validateStep(2) || !validateStep(4)) return;

    try {
      setLoading(true);

      // Create proper service requisition using service-specific API
      const serviceData = {
        departmentId: formData.departmentId,
        projectId: formData.projectId,
        requesterId: 'current-user-id', // In real app, get from auth
        priority: formData.priority,
        budgetCode: formData.budgetCode,
        costCenter: formData.costCenter,
        justification: formData.justification,
        requestedDeliveryDate: formData.requiredByDate,
        serviceScope: formData.detailedScope,
        serviceCategory: formData.serviceCategory,
        serviceType: formData.serviceType,
        requestor: formData.requestor,
        technicalSpecifications: formData.technicalSpecifications,
        qualityStandards: formData.qualityStandards,
        duration: formData.items.reduce((max, item) => Math.max(max, item.duration), 0),
        durationUnit: 'DAYS',
        deliverables: formData.items.flatMap(item => item.deliverables.filter(d => d && d.trim())),
        performanceMetrics: formData.items.flatMap(item => item.performanceMetrics.filter(m => m && m.trim())),
        slaRequirements: {
          responseTime: '4 hours',
          availability: '99.9%',
          support: '8x5 business hours'
        },
        insuranceRequired: formData.insuranceRequired,
        certificationRequired: true,
        safetyRequirements: formData.safetyRequirements,
        paymentSchedule: formData.paymentSchedule,
        paymentTerms: formData.paymentTerms,
        retentionPercentage: 10,
        preferredVendors: formData.preferredVendors,
        milestones: formData.milestones,
        isMixed: isMixedMode,
        materialItems: formData.materialItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          estimatedPrice: item.estimatedPrice,
          specifications: item.specifications,
          requiredDate: item.requiredDate || null,
        })),
        items: formData.items.map(item => ({
          quantity: item.quantity,
          estimatedRate: item.estimatedRate,
          duration: item.duration,
          durationUnit: item.durationUnit,
          unit: item.unit,
          specifications: item.specifications,
          deliverables: item.deliverables.filter(d => d && d.trim()),
          performanceMetrics: item.performanceMetrics.filter(m => m && m.trim())
        }))
      };

      const response = await fetch('/api/services/requisitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });

      const result = await response.json();

      if (response.ok) {
        router.push(`/procurement/services/requisitions/${result.id}`);
      } else {
        setErrors({ submit: result.error || 'Failed to create service requisition' });
      }
    } catch (error) {
      console.error('Error creating service requisition:', error);
      setErrors({ submit: 'Failed to create service requisition' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors();
    fetchDepartments();
    if (isMixedMode) {
      fetchInventoryItems();
    }
  }, []);

  // Auto-calculate estimated cost when items change
  useEffect(() => {
    const totalCost = calculateTotalCost() + (isMixedMode ? calculateMaterialCost() : 0);
    setFormData(prev => ({ ...prev, estimatedCost: totalCost }));
  }, [formData.items, formData.materialItems, isMixedMode]);

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
      const response = await apiFetch('/api/hr/departments');
      const data = await response.json();
      if (response.ok) {
        setDepartments(Array.isArray(data?.data) ? data.data : []);
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

  const fetchInventoryItems = async () => {
    try {
      setLoadingItems(true);
      const response = await fetch('/api/items');
      const data = await response.json();
      if (response.ok) {
        setInventoryItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  return (
    <div className="max-w-8xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isMixedMode ? 'Create Service + Materials Requisition' : 'Create Service Requisition'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isMixedMode
            ? 'Create one requisition with both service scope and material lines'
            : 'Follow the steps below to create a new service requisition'}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress" className="bg-gray-50 rounded-lg p-6">
          <ol className="flex items-center justify-between w-full">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className="relative flex-1 pt-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx < steps.length  && (
                    <div className={`h-0.5 w-full ${step.id < currentStep ? 'bg-wujha-primary' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="relative flex flex-col items-center">
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    step.id < currentStep 
                      ? 'bg-wujha-primary border-wujha-primary scale-110' 
                      : step.id === currentStep 
                        ? 'border-wujha-primary bg-white shadow-lg' 
                        : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}>
                    {step.id < currentStep ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <span className={`text-sm font-medium ${
                        step.id === currentStep ? 'text-wujha-primary' : 'text-gray-500'
                      }`}>
                        {step.id}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <span className={`text-sm font-medium ${
                      step.id === currentStep ? 'text-wujha-primary' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                    <p className="text-xs text-gray-500 mt-1 max-w-32 hidden sm:block">{step.description}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          {/* Step 1: Service Details */}
          {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Service Details</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Category *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.serviceCategory}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    serviceCategory: e.target.value,
                    serviceType: '' // Reset service type when category changes
                  }))}
                >
                  <option value="">Select Category</option>
                  {serviceCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.serviceCategory && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceCategory}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Type *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.serviceType}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value }))}
                  disabled={!formData.serviceCategory}
                >
                  <option value="">Select Type</option>
                  {formData.serviceCategory && serviceTypes[formData.serviceCategory as keyof typeof serviceTypes]?.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.serviceType && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.departmentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                >
                  <option value="">{loadingDepartments ? 'Loading departments...' : 'Select department'}</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}{dept.code ? ` (${dept.code})` : ''}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.projectId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                  placeholder="Optional project reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Requestor *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.requestor}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestor: e.target.value }))}
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
            <h3 className="text-lg font-medium text-gray-900">Scope Definition</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Scope of Work *
              </label>
              <textarea
                rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                value={formData.detailedScope}
                onChange={(e) => setFormData(prev => ({ ...prev, detailedScope: e.target.value }))}
                placeholder="Describe the overall scope of work, objectives, requirements, and expectations for this service..."
              />
              {errors.detailedScope && (
                <p className="mt-1 text-sm text-red-600">{errors.detailedScope}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Technical Specifications
              </label>
              <textarea
                rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                value={formData.technicalSpecifications || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, technicalSpecifications: e.target.value }))}
                placeholder="Technical requirements, standards, compliance requirements..."
              />
            </div>

            {/* Service Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Service Items</h4>
                <button
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
                        onChange={(e) => {
                          const value = e.target.value;
                          // Prevent spaces-only input
                          if (value.trim() === '' && value.length > 0 && value.match(/^\s+$/)) {
                            return; // Don't update if it's only spaces
                          }
                          updateServiceItem(index, 'description', value);
                        }}
                        onBlur={(e) => handleItemBlur(index, 'description', e.target.value)}
                        placeholder="Describe this specific service item (e.g., 'Installation of HVAC system', 'Monthly maintenance service')..."
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
                        <select
                          className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                          value={item.unit}
                          onChange={(e) => {
                            const selectedUnit = e.target.value;
                            updateServiceItem(index, 'unit', selectedUnit);
                            if (!isDurationBasedUnit(selectedUnit)) {
                              updateServiceItem(index, 'duration', 1);
                              updateServiceItem(index, 'durationUnit', 'Days');
                            }
                          }}
                        >
                          {billingUnitOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Select how this service item is priced (job, visit, hour, day, etc.).
                      </p>
                    </div>

                    {isDurationBasedUnit(item.unit) ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Service Period *
                        </label>
                        <div className="flex rounded-lg shadow-sm">
                          <input
                            type="number"
                            min="1"
                            className="block w-full rounded-l-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                            value={item.duration}
                            onChange={(e) => updateServiceItem(index, 'duration', parseInt(e.target.value) || 1)}
                          />
                          <select
                            className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                            value={item.durationUnit}
                            onChange={(e) => updateServiceItem(index, 'durationUnit', e.target.value)}
                          >
                            <option value="Days">Days</option>
                            <option value="Weeks">Weeks</option>
                            <option value="Months">Months</option>
                          </select>
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
                        Rate (OMR per {item.unit || 'unit'}) *
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
                              const newDeliverables = [...item.deliverables];
                              newDeliverables[delIndex] = e.target.value;
                              updateServiceItem(index, 'deliverables', newDeliverables);
                            }}
                            placeholder="e.g., Detailed project report, Training materials..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newDeliverables = item.deliverables.filter((_, i) => i !== delIndex);
                              updateServiceItem(index, 'deliverables', newDeliverables);
                            }}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          updateServiceItem(index, 'deliverables', [...item.deliverables, '']);
                        }}
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
                              const newMetrics = [...item.performanceMetrics];
                              newMetrics[metIndex] = e.target.value;
                              updateServiceItem(index, 'performanceMetrics', newMetrics);
                            }}
                            placeholder="e.g., 99.9% uptime, Response time < 2 hours..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newMetrics = item.performanceMetrics.filter((_, i) => i !== metIndex);
                              updateServiceItem(index, 'performanceMetrics', newMetrics);
                            }}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          updateServiceItem(index, 'performanceMetrics', [...item.performanceMetrics, '']);
                        }}
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
                      {isDurationBasedUnit(item.unit)
                        ? 'Formula: Quantity x Service Period x Rate'
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
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No service items</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a service item.</p>
                  <div className="mt-6">
                    <button
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

            {/* Material Lines (mixed mode) */}
            {isMixedMode && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Material Lines</h4>
                  <button
                    type="button"
                    onClick={addMaterialItem}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Material
                  </button>
                </div>

                {errors.materialItems && (
                  <p className="mb-3 text-sm text-red-600">{errors.materialItems}</p>
                )}

                {formData.materialItems.map((material, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-sm font-medium text-gray-900">Material {index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeMaterialItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Item *</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                          value={material.itemId}
                          onChange={(e) => updateMaterialItem(index, 'itemId', e.target.value)}
                          disabled={loadingItems}
                        >
                          <option value="">{loadingItems ? 'Loading items...' : 'Select item'}</option>
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.itemCode} - {item.nameEn} ({item.unitOfMeasure})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                          value={material.quantity}
                          onChange={(e) => updateMaterialItem(index, 'quantity', Number(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Unit Price *</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                          value={material.estimatedPrice}
                          onChange={(e) => updateMaterialItem(index, 'estimatedPrice', Number(e.target.value) || 0)}
                        />
                      </div>

                      <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700">Specifications</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                          value={material.specifications || ''}
                          onChange={(e) => updateMaterialItem(index, 'specifications', e.target.value)}
                          placeholder="Material specifications"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Required Date</label>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                          value={material.requiredDate || ''}
                          onChange={(e) => updateMaterialItem(index, 'requiredDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Cost Display */}
            {formData.items.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calculator className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">Total Estimated Cost</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(calculateTotalCost() + (isMixedMode ? calculateMaterialCost() : 0))}
                  </span>
                </div>
                {isMixedMode && (
                  <div className="mt-2 text-xs text-gray-600">
                    Service: {formatCurrency(calculateTotalCost())} | Materials: {formatCurrency(calculateMaterialCost())}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Commercial Details */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Commercial Details</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Estimated Cost *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">OMR</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    className="pl-12 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.000"
                  />
                </div>
                {errors.estimatedCost && (
                  <p className="mt-1 text-sm text-red-600">{errors.estimatedCost}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Terms *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  <option value="NET_15">Net 15 Days</option>
                  <option value="NET_30">Net 30 Days</option>
                  <option value="NET_45">Net 45 Days</option>
                  <option value="NET_60">Net 60 Days</option>
                  <option value="ADVANCE">Advance Payment</option>
                  <option value="COD">Cash on Delivery</option>
                </select>
                {errors.paymentTerms && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentTerms}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Schedule *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.paymentSchedule}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentSchedule: e.target.value as any }))}
                >
                  <option value="LUMPSUM">Lump Sum</option>
                  <option value="MILESTONE">Milestone-based</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Vendors
                </label>
                
                {/* Selected Vendors as Tags */}
                {formData.preferredVendors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 border border-gray-200 rounded-lg bg-gray-50 min-h-[50px]">
                    {formData.preferredVendors.map((vendorId) => {
                      const vendor = vendors.find(v => v.id === vendorId);
                      if (!vendor) return null;
                      return (
                        <span
                          key={vendorId}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-wujha-primary text-white text-sm rounded-full"
                        >
                          <span>{vendor.nameEn} ({vendor.vendorCode})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                preferredVendors: prev.preferredVendors.filter(id => id !== vendorId)
                              }));
                            }}
                            className="ml-1 hover:bg-wujha-primary-hover rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Vendor Dropdown */}
                <div className="relative" data-vendor-dropdown>
                  <button
                    type="button"
                    onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                    disabled={loadingVendors}
                    className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary bg-white disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-between"
                  >
                    <span className="text-gray-500">
                      {loadingVendors ? 'Loading vendors...' : 'Select vendors...'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${vendorDropdownOpen ? 'transform rotate-180' : ''}`} />
                  </button>

                  {vendorDropdownOpen && !loadingVendors && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search vendors..."
                            value={vendorSearchTerm}
                            onChange={(e) => setVendorSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-sm text-gray-900 bg-white"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Vendor List */}
                      <div className="overflow-y-auto max-h-48">
                        {vendors.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500 text-center">No vendors available</div>
                        ) : (
                          vendors
                            .filter(vendor => 
                              vendor.nameEn.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
                              vendor.vendorCode.toLowerCase().includes(vendorSearchTerm.toLowerCase())
                            )
                            .map((vendor) => {
                              const isSelected = formData.preferredVendors.includes(vendor.id);
                              return (
                                <button
                                  key={vendor.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setFormData(prev => ({
                                        ...prev,
                                        preferredVendors: prev.preferredVendors.filter(id => id !== vendor.id)
                                      }));
                                    } else {
                                      setFormData(prev => ({
                                        ...prev,
                                        preferredVendors: [...prev.preferredVendors, vendor.id]
                                      }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                                    isSelected ? 'bg-wujha-primary/10 text-wujha-primary' : 'text-gray-700'
                                  }`}
                                >
                                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                    isSelected ? 'border-wujha-primary bg-wujha-primary' : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium">{vendor.nameEn}</div>
                                    <div className="text-xs text-gray-500">{vendor.vendorCode}</div>
                                  </div>
                                </button>
                              );
                            })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Compliance & Budget */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Compliance & Budget</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Budget Code *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.budgetCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetCode: e.target.value }))}
                  placeholder="Enter budget code"
                />
                {errors.budgetCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.budgetCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cost Center
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                  value={formData.costCenter || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, costCenter: e.target.value }))}
                  placeholder="Optional cost center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Required By Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white ${
                    errors.requiredByDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.requiredByDate}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setFormData(prev => ({ ...prev, requiredByDate: inputValue }));
                    
                    // Clear error when user starts typing
                    if (errors.requiredByDate) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.requiredByDate;
                        return newErrors;
                      });
                    }
                    
                    // Validate date if provided
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
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.requiredByDate;
                            return newErrors;
                          });
                        }
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const inputValue = e.target.value;
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
                        }
                      }
                    }
                  }}
                />
                {errors.requiredByDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.requiredByDate}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                      className="h-4 w-4 text-wujha-primary focus:outline-none focus:ring-wujha-primary border-gray-300 rounded"
                  checked={formData.insuranceRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, insuranceRequired: e.target.checked }))}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Insurance Required
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Safety Requirements
              </label>
              <textarea
                rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                value={formData.safetyRequirements || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, safetyRequirements: e.target.value }))}
                placeholder="Specify any safety requirements, certifications, or compliance needs..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quality Standards
              </label>
              <textarea
                rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                value={formData.qualityStandards || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, qualityStandards: e.target.value }))}
                placeholder="Quality standards, certifications, or performance requirements..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Justification *
              </label>
              <textarea
                rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-gray-900 bg-white"
                value={formData.justification}
                onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                placeholder="Provide business justification for this service requirement..."
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
            <h3 className="text-lg font-medium text-gray-900">Review & Submit</h3>
            
            {/* Service Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Service Requisition Summary</h4>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formData.serviceCategory}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formData.serviceType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Department</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formData.departmentId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Priority</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formData.priority}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Required By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(formData.requiredByDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Service Items</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formData.items.length}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Total Estimated Cost</dt>
                  <dd className="mt-1 text-lg font-bold text-gray-900">
                    {formatCurrency(formData.estimatedCost)}
                  </dd>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      {errors.submit}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Service Request
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

export default function NewServiceRequisition() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
        </div>
      }
    >
      <NewServiceRequisitionContent />
    </Suspense>
  );
}


