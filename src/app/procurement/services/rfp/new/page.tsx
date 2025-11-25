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
  FileText,
  Users,
  Calendar,
  Award,
  Shield,
  DollarSign
} from 'lucide-react';

interface EvaluationCriteria {
  id: string;
  name: string;
  weight: number;
  description: string;
}

interface SelectedVendor {
  id: string;
  nameEn: string;
  email: string;
  phone: string;
  status: string;
}

interface ServiceRFPFormData {
  // Step 1: RFP Details
  title: string;
  description: string;
  serviceRequisitionId?: string;
  scopeOfWork: string;
  evaluationCriteria: EvaluationCriteria[];
  submissionDeadline: string;
  
  // Step 2: Vendor Selection
  selectedVendors: SelectedVendor[];
  
  // Step 3: Terms & Conditions
  serviceLevelAgreements: string;
  penaltyClause: string;
  insuranceRequirements: string;
  liabilityTerms: string;
  confidentialityClause: string;
  paymentTerms: string;
  contractDuration: string;
  contractDurationValue: number;
  contractDurationUnit: string;
}

function NewServiceRFPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableVendors, setAvailableVendors] = useState<SelectedVendor[]>([]);
  const [serviceRequisitions, setServiceRequisitions] = useState<any[]>([]);

  const [formData, setFormData] = useState<ServiceRFPFormData>({
    title: '',
    description: '',
    scopeOfWork: '',
    evaluationCriteria: [
      { id: '1', name: 'Technical Compliance', weight: 40, description: 'Technical capability and compliance with requirements' },
      { id: '2', name: 'Commercial Proposal', weight: 35, description: 'Price competitiveness and value for money' },
      { id: '3', name: 'Experience & References', weight: 15, description: 'Past performance and relevant experience' },
      { id: '4', name: 'Resource Availability', weight: 10, description: 'Availability of required resources and timeline' }
    ],
    submissionDeadline: '',
    selectedVendors: [],
    serviceLevelAgreements: '',
    penaltyClause: '',
    insuranceRequirements: '',
    liabilityTerms: '',
    confidentialityClause: '',
    paymentTerms: 'NET_30',
    contractDuration: '',
    contractDurationValue: 12,
    contractDurationUnit: 'months'
  });

  const steps = [
    { id: 1, name: 'RFP Details', description: 'Basic RFP information' },
    { id: 2, name: 'Vendor Selection', description: 'Select qualified vendors' },
    { id: 3, name: 'Terms & Conditions', description: 'Contract terms' },
    { id: 4, name: 'Review & Issue', description: 'Final review' }
  ];

  useEffect(() => {
    fetchInitialData();
    
    // Pre-fill from URL params if coming from a specific PR
    const prId = searchParams.get('prId');
    
    if (prId) {
      setFormData(prev => ({ ...prev, serviceRequisitionId: prId }));
      // Fetch the service requisition to get preferred vendors
      fetchServiceRequisitionVendors(prId);
    }
  }, [searchParams]);

  const fetchServiceRequisitionVendors = async (prId: string) => {
    try {
      const response = await fetch(`/api/services/requisitions/${prId}`);
      const data = await response.json();
      
      if (response.ok) {
        // Pre-populate RFP details from Service Requisition
        setFormData(prev => ({
          ...prev,
          title: `Service RFP for ${data.prNumber}`,
          description: data.servicePR?.serviceScope || data.justification || '',
          scopeOfWork: data.servicePR?.serviceScope || '',
          serviceRequisitionId: prId
        }));

        // Get preferred vendors if available
        if (data.servicePR?.preferredVendors) {
          try {
            // preferredVendors is already parsed as JSON by Prisma (it's a Json field)
            // It could be an array or a string, so handle both cases
            let preferredVendorIds: string[] = [];
            
            if (Array.isArray(data.servicePR.preferredVendors)) {
              preferredVendorIds = data.servicePR.preferredVendors;
            } else if (typeof data.servicePR.preferredVendors === 'string') {
              // If it's a string, try to parse it
              try {
                preferredVendorIds = JSON.parse(data.servicePR.preferredVendors);
              } catch (e) {
                // If parsing fails, treat it as a single ID
                preferredVendorIds = [data.servicePR.preferredVendors];
              }
            }
            
            // Fetch vendor details for these IDs
            const vendorsResponse = await fetch('/api/vendors?status=ACTIVE');
            const vendorsData = await vendorsResponse.json();
            
            if (vendorsResponse.ok && preferredVendorIds.length > 0) {
              // Filter vendors to only those in preferred list
              const preferred = vendorsData.vendors.filter((v: any) => 
                preferredVendorIds.includes(v.id)
              );
              
              // Auto-select preferred vendors
              setFormData(prev => ({
                ...prev,
                selectedVendors: preferred.map((v: any) => ({
                  id: v.id,
                  nameEn: v.nameEn,
                  email: v.email,
                  phone: v.mobile,
                  status: v.status
                }))
              }));
            }
          } catch (parseError) {
            console.error('Error parsing preferred vendors:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching service requisition vendors:', error);
    }
  };

  const fetchInitialData = async () => {
    try {
      // Fetch available vendors
      const vendorsResponse = await fetch('/api/vendors?status=ACTIVE');
      const vendorsData = await vendorsResponse.json();
      
      if (vendorsResponse.ok) {
        setAvailableVendors(vendorsData.vendors || []);
      }

      // Fetch approved service requisitions using the service-specific API
      const prResponse = await fetch('/api/services/requisitions?status=APPROVED&limit=1000');
      const prData = await prResponse.json();
      
      if (prResponse.ok) {
        setServiceRequisitions(prData.serviceRequisitions || []);
        console.log('Fetched service requisitions:', prData.serviceRequisitions?.length || 0);
      } else {
        console.error('Failed to fetch service requisitions:', prData);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const addEvaluationCriteria = () => {
    const newCriteria: EvaluationCriteria = {
      id: Date.now().toString(),
      name: '',
      weight: 0,
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: [...prev.evaluationCriteria, newCriteria]
    }));
  };

  const removeEvaluationCriteria = (index: number) => {
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: prev.evaluationCriteria.filter((_, i) => i !== index)
    }));
  };

  const updateEvaluationCriteria = (index: number, field: keyof EvaluationCriteria, value: any) => {
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: prev.evaluationCriteria.map((criteria, i) => 
        i === index ? { ...criteria, [field]: value } : criteria
      )
    }));
  };

  const toggleVendorSelection = (vendor: SelectedVendor) => {
    setFormData(prev => ({
      ...prev,
      selectedVendors: prev.selectedVendors.find(v => v.id === vendor.id)
        ? prev.selectedVendors.filter(v => v.id !== vendor.id)
        : [...prev.selectedVendors, vendor]
    }));
  };

  const getTotalWeight = () => {
    return formData.evaluationCriteria.reduce((sum, criteria) => sum + criteria.weight, 0);
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.serviceRequisitionId) newErrors.serviceRequisitionId = 'Service requisition is required';
        if (!formData.title) newErrors.title = 'RFP title is required';
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.scopeOfWork) newErrors.scopeOfWork = 'Scope of work is required';
        if (!formData.submissionDeadline) newErrors.submissionDeadline = 'Submission deadline is required';
        if (getTotalWeight() !== 100) newErrors.evaluationCriteria = 'Total evaluation criteria weight must equal 100%';
        break;
      case 2:
        if (formData.selectedVendors.length === 0) newErrors.selectedVendors = 'At least one vendor must be selected';
        break;
      case 3:
        if (!formData.serviceLevelAgreements) newErrors.serviceLevelAgreements = 'Service level agreements are required';
        if (!formData.insuranceRequirements) newErrors.insuranceRequirements = 'Insurance requirements are required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    try {
      setLoading(true);

      // Convert datetime-local string to ISO date string
      const submissionDeadline = formData.submissionDeadline 
        ? new Date(formData.submissionDeadline).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default to 7 days from now

      // Create Service RFP
      const response = await fetch('/api/services/rfp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prId: formData.serviceRequisitionId,
          title: formData.title,
          description: formData.description,
          submissionDeadline: submissionDeadline,
          evaluationCriteria: formData.evaluationCriteria,
          termsAndConditions: {
            serviceLevelAgreements: formData.serviceLevelAgreements,
            penaltyClause: formData.penaltyClause,
            insuranceRequirements: formData.insuranceRequirements,
            liabilityTerms: formData.liabilityTerms,
            confidentialityClause: formData.confidentialityClause,
            paymentTerms: formData.paymentTerms,
            contractDuration: formData.contractDuration,
            scopeOfWork: formData.scopeOfWork
          },
          invitedVendors: formData.selectedVendors.map(vendor => vendor.id),
          createdBy: 'SYSTEM'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Send invitations to vendors
        try {
          await fetch(`/api/services/rfp/${result.id}/send-invitations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sentBy: 'SYSTEM'
            }),
          });
        } catch (emailError) {
          console.error('Error sending invitations:', emailError);
        }

        router.push(`/procurement/services/rfp/${result.id}`);
      } else {
        setErrors({ submit: result.error || 'Failed to create Service RFP' });
      }
    } catch (error) {
      console.error('Error creating Service RFP:', error);
      setErrors({ submit: 'Failed to create Service RFP' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Issue Service RFP</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create a Request for Proposal for service requirements
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center">
                  <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                    step.id < currentStep 
                      ? 'bg-wujha-primary' 
                      : step.id === currentStep 
                        ? 'border-2 border-wujha-primary bg-white' 
                        : 'border-2 border-gray-300 bg-white'
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
                </div>
                <div className="mt-2">
                  <span className={`text-sm font-medium ${
                    step.id === currentStep ? 'text-wujha-primary' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {/* Step 1: RFP Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">RFP Details</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service Requisition *
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.serviceRequisitionId || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, serviceRequisitionId: e.target.value }));
                    if (e.target.value) {
                      fetchServiceRequisitionVendors(e.target.value);
                    }
                  }}
                  disabled={!!searchParams.get('prId')}
                >
                  <option value="">Select Approved Service Requisition</option>
                  {serviceRequisitions.map(pr => (
                    <option key={pr.id} value={pr.id}>
                      {pr.prNumber} - {pr.servicePR?.serviceScope?.substring(0, 50) || pr.departmentId}
                    </option>
                  ))}
                </select>
                {errors.serviceRequisitionId && (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceRequisitionId}</p>
                )}
                {searchParams.get('prId') && (
                  <p className="mt-1 text-xs text-gray-500">
                    Linked from Service Requisition
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                RFP Title *
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter RFP title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the RFP purpose and objectives"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Scope of Work *
              </label>
              <textarea
                rows={5}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900"
                value={formData.scopeOfWork}
                onChange={(e) => setFormData(prev => ({ ...prev, scopeOfWork: e.target.value }))}
                placeholder="Detailed scope of work, requirements, deliverables, and expectations..."
              />
              {errors.scopeOfWork && (
                <p className="mt-1 text-sm text-red-600">{errors.scopeOfWork}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Submission Deadline *
              </label>
              <input
                type="datetime-local"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900"
                value={formData.submissionDeadline}
                onChange={(e) => setFormData(prev => ({ ...prev, submissionDeadline: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.submissionDeadline && (
                <p className="mt-1 text-sm text-red-600">{errors.submissionDeadline}</p>
              )}
            </div>

            {/* Evaluation Criteria */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Evaluation Criteria</h4>
                <button
                  onClick={addEvaluationCriteria}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Criteria
                </button>
              </div>

              {formData.evaluationCriteria.map((criteria, index) => (
                <div key={criteria.id} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-medium text-gray-900">Criteria {index + 1}</h5>
                    <button
                      onClick={() => removeEvaluationCriteria(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Criteria Name *
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900"
                        value={criteria.name}
                        onChange={(e) => updateEvaluationCriteria(index, 'name', e.target.value)}
                        placeholder="e.g., Technical Compliance"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Weight (%) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900"
                        value={criteria.weight}
                        onChange={(e) => updateEvaluationCriteria(index, 'weight', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900"
                        value={criteria.description}
                        onChange={(e) => updateEvaluationCriteria(index, 'description', e.target.value)}
                        placeholder="Brief description"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Total Weight:</span>
                  <span className={`text-lg font-bold ${getTotalWeight() === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {getTotalWeight()}%
                  </span>
                </div>
                {getTotalWeight() !== 100 && (
                  <p className="mt-1 text-sm text-red-600">Total weight must equal 100%</p>
                )}
              </div>

              {errors.evaluationCriteria && (
                <p className="mt-1 text-sm text-red-600">{errors.evaluationCriteria}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Vendor Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Vendor Selection</h3>
            
            <div className="bg-wujha-primary/10 p-4 rounded-lg">
              <div className="flex">
                <Users className="h-5 w-5 text-wujha-primary mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-wujha-primary">Vendor Invitation</h4>
                  <p className="mt-1 text-sm text-wujha-primary/80">
                    Select qualified vendors to invite for this RFP. Only active vendors with relevant capabilities will be shown.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {availableVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.selectedVendors.find(v => v.id === vendor.id)
                      ? 'border-wujha-primary bg-wujha-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleVendorSelection(vendor)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-wujha-primary focus:ring-wujha-primary border-gray-300 rounded"
                        checked={!!formData.selectedVendors.find(v => v.id === vendor.id)}
                        onChange={() => toggleVendorSelection(vendor)}
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {vendor.nameEn}
                        </div>
                        <div className="text-sm text-gray-500">
                          {vendor.email} • {vendor.phone}
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      vendor.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {vendor.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {formData.selectedVendors.length > 0 && (
              <div className="bg-wujha-primary/10 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-wujha-primary mb-2">
                  Selected Vendors ({formData.selectedVendors.length})
                </h4>
                <div className="space-y-1">
                  {formData.selectedVendors.map(vendor => (
                    <div key={vendor.id} className="text-sm text-wujha-primary/80">
                      • {vendor.nameEn}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errors.selectedVendors && (
              <p className="mt-1 text-sm text-red-600">{errors.selectedVendors}</p>
            )}
          </div>
        )}

        {/* Step 3: Terms & Conditions */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Terms & Conditions</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms *
                </label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 px-3 py-2"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  <option value="NET_15">Net 15 Days</option>
                  <option value="NET_30">Net 30 Days</option>
                  <option value="NET_45">Net 45 Days</option>
                  <option value="NET_60">Net 60 Days</option>
                  <option value="MILESTONE">Milestone-based</option>
                  <option value="ADVANCE">Advance Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Duration
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 px-3 py-2"
                    value={formData.contractDurationValue}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setFormData(prev => ({ 
                        ...prev, 
                        contractDurationValue: value,
                        contractDuration: `${value} ${prev.contractDurationUnit}`
                      }));
                    }}
                    placeholder="12"
                  />
                  <select
                    className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 px-3 py-2"
                    value={formData.contractDurationUnit}
                    onChange={(e) => {
                      const unit = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        contractDurationUnit: unit,
                        contractDuration: `${prev.contractDurationValue} ${unit}`
                      }));
                    }}
                  >
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Level Agreements (SLAs) *
              </label>
              <textarea
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 px-3 py-2"
                value={formData.serviceLevelAgreements}
                onChange={(e) => setFormData(prev => ({ ...prev, serviceLevelAgreements: e.target.value }))}
                placeholder="Define service level requirements, response times, availability, etc."
              />
              {errors.serviceLevelAgreements && (
                <p className="mt-1 text-sm text-red-600">{errors.serviceLevelAgreements}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insurance Requirements *
              </label>
              <textarea
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 px-3 py-2"
                value={formData.insuranceRequirements}
                onChange={(e) => setFormData(prev => ({ ...prev, insuranceRequirements: e.target.value }))}
                placeholder="Specify required insurance coverage, amounts, and validity periods"
              />
              {errors.insuranceRequirements && (
                <p className="mt-1 text-sm text-red-600">{errors.insuranceRequirements}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penalty Clause
              </label>
              <textarea
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 px-3 py-2"
                value={formData.penaltyClause}
                onChange={(e) => setFormData(prev => ({ ...prev, penaltyClause: e.target.value }))}
                placeholder="Define penalties for non-compliance, delays, or quality issues"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Liability Terms
              </label>
              <textarea
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 px-3 py-2"
                value={formData.liabilityTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, liabilityTerms: e.target.value }))}
                placeholder="Define liability limits and responsibilities"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidentiality Clause
              </label>
              <textarea
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 px-3 py-2"
                value={formData.confidentialityClause}
                onChange={(e) => setFormData(prev => ({ ...prev, confidentialityClause: e.target.value }))}
                placeholder="Define confidentiality and non-disclosure requirements"
              />
            </div>
          </div>
        )}

        {/* Step 4: Review & Issue */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review & Issue RFP</h3>
            
            {/* RFP Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">RFP Summary</h4>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">RFP Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formData.rfpType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formData.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submission Deadline</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(formData.submissionDeadline).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Selected Vendors</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formData.selectedVendors.length}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Evaluation Criteria</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formData.evaluationCriteria.map(criteria => 
                      `${criteria.name} (${criteria.weight}%)`
                    ).join(', ')}
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

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Issuing RFP...
                </>
              ) : (
                <>
                  <Award className="h-4 w-4 mr-2" />
                  Issue RFP
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewServiceRFP() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    }>
      <NewServiceRFPContent />
    </Suspense>
  );
}
