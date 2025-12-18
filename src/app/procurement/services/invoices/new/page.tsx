'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  DollarSign,
  Building,
  Upload,
  Plus,
  Minus,
  Search,
  AlertCircle,
  Clock,
  Target,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Contract {
  id: string;
  contractNumber: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
  };
  serviceType: string;
  totalAmount: number;
  currency: string;
  milestones: {
    id: string;
    name: string;
    amount: number;
    targetDate: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  }[];
}

interface SRN {
  id: string;
  srnNumber: string;
  contractId: string;
  completionDate: string;
  acceptanceStatus: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  serviceDetails: {
    description: string;
    completionPercentage: number;
    qualityRating: number;
    deliverables: string[];
  };
  approvedBy: string;
  approvedAt: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  milestoneId?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  srnReference?: string;
}

interface MatchingResult {
  status: 'MATCHED' | 'DISCREPANCY' | 'PENDING';
  contractMatch: boolean;
  srnMatch: boolean;
  amountMatch: boolean;
  discrepancies: {
    type: 'CONTRACT' | 'SRN' | 'AMOUNT' | 'MILESTONE';
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
}

export default function NewServiceInvoicePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [srns, setSrns] = useState<SRN[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedSRN, setSelectedSRN] = useState<SRN | null>(null);
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    contractId: '',
    srnId: '',
    description: '',
    serviceType: 'CONSULTING' as 'CONSULTING' | 'MAINTENANCE' | 'TRAINING' | 'SUPPORT' | 'OTHER',
    currency: 'OMR',
    items: [] as InvoiceItem[],
    attachments: [] as File[],
    notes: '',
    paymentTerms: '',
    milestoneReference: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    if (formData.contractId) {
      fetchSRNs(formData.contractId);
      const contract = contracts.find(c => c.id === formData.contractId);
      setSelectedContract(contract || null);
    }
  }, [formData.contractId, contracts]);

  useEffect(() => {
    if (formData.srnId) {
      const srn = srns.find(s => s.id === formData.srnId);
      setSelectedSRN(srn || null);
    }
  }, [formData.srnId, srns]);

  useEffect(() => {
    if (selectedContract && selectedSRN && formData.items.length > 0) {
      performThreeWayMatching();
    }
  }, [selectedContract, selectedSRN, formData.items]);

  const fetchContracts = async () => {
    try {
      // Fetch service contracts - use ACTIVE status for contracts ready for invoicing
      const response = await fetch('/api/services/contracts?status=ACTIVE&limit=100');
      const data = await response.json();

      if (response.ok) {
        const contractData: Contract[] = data.contracts?.map((contract: any) => ({
          id: contract.id,
          contractNumber: contract.contractNumber,
          vendor: contract.vendor,
          serviceType: contract.contractType || 'Service Contract',
          totalAmount: contract.totalValue,
          currency: contract.currency || 'OMR',
          milestones: contract.milestones || []
        })) || [];

        setContracts(contractData);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchSRNs = async (contractId: string) => {
    try {
      // Generate mock SRN data based on contract
      const mockSRNs: SRN[] = [
        {
          id: `srn-${contractId}-1`,
          srnNumber: `SRN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          contractId,
          completionDate: new Date().toISOString().split('T')[0],
          acceptanceStatus: 'ACCEPTED',
          serviceDetails: {
            description: 'Service delivery completed as per contract specifications',
            completionPercentage: 100,
            qualityRating: 4.5,
            deliverables: ['Technical Documentation', 'Training Materials', 'System Configuration']
          },
          approvedBy: 'Project Manager',
          approvedAt: new Date().toISOString()
        }
      ];
      
      setSrns(mockSRNs);
    } catch (error) {
      console.error('Error fetching SRNs:', error);
    }
  };

  const generateMilestones = (contractId: string, totalAmount: number) => {
    return [
      {
        id: `milestone-${contractId}-1`,
        name: 'Project Initiation',
        amount: totalAmount * 0.3,
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'COMPLETED' as const
      },
      {
        id: `milestone-${contractId}-2`,
        name: 'Implementation Phase',
        amount: totalAmount * 0.5,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'IN_PROGRESS' as const
      },
      {
        id: `milestone-${contractId}-3`,
        name: 'Project Completion',
        amount: totalAmount * 0.2,
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'PENDING' as const
      }
    ];
  };

  const performThreeWayMatching = () => {
    if (!selectedContract || !selectedSRN || formData.items.length === 0) return;

    const totalInvoiceAmount = formData.items.reduce((sum, item) => sum + item.totalAmount, 0);
    const contractAmount = selectedContract.totalAmount;
    const srnAccepted = selectedSRN.acceptanceStatus === 'ACCEPTED';

    const discrepancies: MatchingResult['discrepancies'] = [];

    // Contract matching
    const contractMatch = formData.contractId === selectedContract.id;
    if (!contractMatch) {
      discrepancies.push({
        type: 'CONTRACT',
        description: 'Invoice contract reference does not match selected contract',
        severity: 'HIGH'
      });
    }

    // SRN matching
    const srnMatch = srnAccepted && selectedSRN.contractId === formData.contractId;
    if (!srnMatch) {
      discrepancies.push({
        type: 'SRN',
        description: 'Service Receipt Note not accepted or contract mismatch',
        severity: 'HIGH'
      });
    }

    // Amount matching (allow 5% variance)
    const amountVariance = Math.abs(totalInvoiceAmount - contractAmount) / contractAmount;
    const amountMatch = amountVariance <= 0.05;
    if (!amountMatch) {
      discrepancies.push({
        type: 'AMOUNT',
        description: `Invoice amount variance of ${(amountVariance * 100).toFixed(1)}% exceeds 5% threshold`,
        severity: amountVariance > 0.1 ? 'HIGH' : 'MEDIUM'
      });
    }

    // Milestone validation
    const milestoneItems = formData.items.filter(item => item.milestoneId);
    if (milestoneItems.length > 0) {
      milestoneItems.forEach(item => {
        const milestone = selectedContract.milestones.find(m => m.id === item.milestoneId);
        if (milestone && milestone.status !== 'COMPLETED') {
          discrepancies.push({
            type: 'MILESTONE',
            description: `Milestone "${milestone.name}" is not completed`,
            severity: 'MEDIUM'
          });
        }
      });
    }

    const status: MatchingResult['status'] = 
      discrepancies.length === 0 ? 'MATCHED' :
      discrepancies.some(d => d.severity === 'HIGH') ? 'DISCREPANCY' : 'PENDING';

    setMatchingResult({
      status,
      contractMatch,
      srnMatch,
      amountMatch,
      discrepancies
    });
  };

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total amount
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalAmount = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const removeInvoiceItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.invoiceNumber || !formData.invoiceNumber.trim()) {
        newErrors.invoiceNumber = 'Invoice number is required';
      } else if (formData.invoiceNumber.includes(' ')) {
        newErrors.invoiceNumber = 'Invoice number cannot contain spaces';
      }
      // Invoice date is auto-set to current date, so we just check if due date is valid
      if (!formData.dueDate) {
        newErrors.dueDate = 'Due date is required';
      } else if (formData.invoiceDate && new Date(formData.invoiceDate) > new Date(formData.dueDate)) {
        newErrors.dueDate = 'Due date must be after or equal to invoice date';
      }
      if (!formData.contractId) newErrors.contractId = 'Contract selection is required';
    }

    if (step === 2) {
      if (!formData.srnId) newErrors.srnId = 'SRN selection is required';
      if (formData.items.length === 0) newErrors.items = 'At least one invoice item is required';
      formData.items.forEach((item, index) => {
        if (!item.description) newErrors[`item_${index}_description`] = 'Description is required';
        if (item.quantity <= 0) newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
        if (item.unitPrice <= 0) newErrors[`item_${index}_unitPrice`] = 'Unit price must be greater than 0';
      });
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
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const totalAmount = formData.items.reduce((sum, item) => sum + item.totalAmount, 0);
      
      const invoiceData = {
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        vendorId: selectedContract?.vendor.id,
        poId: formData.contractId,
        totalAmount,
        currency: formData.currency,
        description: formData.description,
        notes: formData.notes,
        status: 'SUBMITTED',
        paymentStatus: 'UNPAID',
        items: formData.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount
        })),
        serviceDetails: {
          serviceType: formData.serviceType,
          srnReference: formData.srnId,
          milestoneReference: formData.milestoneReference,
          matchingStatus: matchingResult?.status || 'PENDING'
        }
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/procurement/services/invoices/${result.id}`);
      } else {
        throw new Error('Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating service invoice:', error);
      setErrors({ submit: 'Failed to create invoice. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, name: 'Invoice Details', description: 'Basic invoice information and contract selection' },
    { id: 2, name: 'Service Items & SRN', description: 'Service items and receipt note matching' },
    { id: 3, name: '3-Way Matching', description: 'Contract, SRN, and invoice validation' },
    { id: 4, name: 'Review & Submit', description: 'Final review and submission' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Service Invoice</h1>
        <p className="text-gray-600 mt-1">Create a new service invoice with SRN 3-way matching</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow p-6">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center">
                  <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                    step.id < currentStep
                      ? 'bg-green-600'
                      : step.id === currentStep
                      ? 'bg-orange-600'
                      : 'bg-gray-300'
                  }`}>
                    {step.id < currentStep ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <span className="text-white text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  <div className="ml-4 min-w-0">
                    <p className={`text-sm font-medium ${
                      step.id <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </p>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Invoice Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${
                    errors.invoiceNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.invoiceNumber}
                  onChange={(e) => {
                    // Remove all spaces from the input
                    const value = e.target.value.replace(/\s/g, '');
                    setFormData(prev => ({ ...prev, invoiceNumber: value }));
                    // Clear error if user starts typing
                    if (errors.invoiceNumber && value) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.invoiceNumber;
                        return newErrors;
                      });
                    }
                  }}
                  onBlur={(e) => {
                    // Validate on blur
                    const value = e.target.value.trim();
                    if (!value) {
                      setErrors(prev => ({ ...prev, invoiceNumber: 'Invoice number is required' }));
                    } else if (value !== e.target.value) {
                      setFormData(prev => ({ ...prev, invoiceNumber: value }));
                    }
                  }}
                  placeholder="Enter invoice number"
                />
                {errors.invoiceNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  value={formData.serviceType}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value as any }))}
                >
                  <option value="CONSULTING">Consulting</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="TRAINING">Training</option>
                  <option value="SUPPORT">Support</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  value={formData.invoiceDate}
                  disabled
                  readOnly
                />
                <p className="mt-1 text-xs text-gray-500">Automatically set to today's date</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${
                    errors.dueDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.dueDate}
                  onChange={(e) => {
                    const newDueDate = e.target.value;
                    setFormData(prev => ({ ...prev, dueDate: newDueDate }));
                    
                    // Validate against invoice date (which is always today)
                    if (formData.invoiceDate && new Date(formData.invoiceDate) > new Date(newDueDate)) {
                      setErrors(prev => ({ 
                        ...prev, 
                        dueDate: 'Due date must be after or equal to invoice date'
                      }));
                    } else {
                      // Clear error if valid
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.dueDate;
                        return newErrors;
                      });
                    }
                  }}
                  min={formData.invoiceDate}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Service Contract *
              </label>
              <select
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${
                  errors.contractId ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.contractId}
                onChange={(e) => setFormData(prev => ({ ...prev, contractId: e.target.value }))}
              >
                <option value="">Select a service contract...</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contractNumber} - {contract.vendor.nameEn} - {(Number(contract.totalAmount) || 0).toLocaleString()} {contract.currency}
                  </option>
                ))}
              </select>
              {errors.contractId && (
                <p className="mt-1 text-sm text-red-600">{errors.contractId}</p>
              )}
            </div>

            {selectedContract && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Contract Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Vendor:</span>
                    <span className="ml-2 text-blue-900">{selectedContract.vendor.nameEn}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Service Type:</span>
                    <span className="ml-2 text-blue-900">{selectedContract.serviceType}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Contract Value:</span>
                    <span className="ml-2 text-blue-900">{(Number(selectedContract.totalAmount) || 0).toLocaleString()} {selectedContract.currency}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Milestones:</span>
                    <span className="ml-2 text-blue-900">{selectedContract.milestones.length} defined</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Service Items & SRN Matching</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Service Receipt Note (SRN) *
              </label>
              <select
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${
                  errors.srnId ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.srnId}
                onChange={(e) => setFormData(prev => ({ ...prev, srnId: e.target.value }))}
              >
                <option value="">Select an SRN...</option>
                {srns.map((srn) => (
                  <option key={srn.id} value={srn.id}>
                    {srn.srnNumber} - {srn.acceptanceStatus} - {new Date(srn.completionDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {errors.srnId && (
                <p className="mt-1 text-sm text-red-600">{errors.srnId}</p>
              )}
            </div>

            {selectedSRN && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Selected SRN Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">SRN Number:</span>
                    <span className="ml-2 text-green-900">{selectedSRN.srnNumber}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      selectedSRN.acceptanceStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      selectedSRN.acceptanceStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedSRN.acceptanceStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700">Completion:</span>
                    <span className="ml-2 text-green-900">{selectedSRN.serviceDetails.completionPercentage}%</span>
                  </div>
                  <div>
                    <span className="text-green-700">Quality Rating:</span>
                    <span className="ml-2 text-green-900">{selectedSRN.serviceDetails.qualityRating}/5</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-gray-900">Invoice Items</h4>
                <button
                  type="button"
                  onClick={addInvoiceItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-orange-600 bg-orange-100 hover:bg-orange-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-4">
                    <h5 className="text-sm font-medium text-gray-900">Item {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeInvoiceItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${
                          errors[`item_${index}_description`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                        placeholder="Service description"
                      />
                      {errors[`item_${index}_description`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_description`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${
                          errors[`item_${index}_quantity`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_quantity`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${
                          errors[`item_${index}_unitPrice`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        value={item.unitPrice}
                        onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                      {errors[`item_${index}_unitPrice`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_unitPrice`]}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Milestone Reference
                      </label>
                      <select
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                        value={item.milestoneId || ''}
                        onChange={(e) => updateInvoiceItem(index, 'milestoneId', e.target.value)}
                      >
                        <option value="">No milestone</option>
                        {selectedContract?.milestones.map((milestone) => (
                          <option key={milestone.id} value={milestone.id}>
                            {milestone.name} - {milestone.amount.toLocaleString()} {selectedContract.currency}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {item.totalAmount.toLocaleString()} {formData.currency}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {errors.items && (
                <p className="mt-1 text-sm text-red-600">{errors.items}</p>
              )}

              {formData.items.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No items added</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding your first invoice item.</p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={addInvoiceItem}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Invoice Item
                    </button>
                  </div>
                </div>
              )}
            </div>

            {formData.items.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Invoice Amount:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formData.items.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()} {formData.currency}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && matchingResult && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">3-Way Matching Results</h3>
            
            <div className={`border rounded-lg p-6 ${
              matchingResult.status === 'MATCHED' ? 'border-green-200 bg-green-50' :
              matchingResult.status === 'DISCREPANCY' ? 'border-red-200 bg-red-50' :
              'border-yellow-200 bg-yellow-50'
            }`}>
              <div className="flex items-center mb-4">
                {matchingResult.status === 'MATCHED' ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : matchingResult.status === 'DISCREPANCY' ? (
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                ) : (
                  <Clock className="h-8 w-8 text-yellow-600" />
                )}
                <div className="ml-4">
                  <h4 className={`text-lg font-semibold ${
                    matchingResult.status === 'MATCHED' ? 'text-green-900' :
                    matchingResult.status === 'DISCREPANCY' ? 'text-red-900' :
                    'text-yellow-900'
                  }`}>
                    {matchingResult.status === 'MATCHED' ? 'All Checks Passed' :
                     matchingResult.status === 'DISCREPANCY' ? 'Discrepancies Found' :
                     'Pending Validation'}
                  </h4>
                  <p className={`text-sm ${
                    matchingResult.status === 'MATCHED' ? 'text-green-700' :
                    matchingResult.status === 'DISCREPANCY' ? 'text-red-700' :
                    'text-yellow-700'
                  }`}>
                    {matchingResult.status === 'MATCHED' 
                      ? 'Invoice matches contract and SRN requirements'
                      : matchingResult.status === 'DISCREPANCY'
                      ? 'Issues found that require attention'
                      : 'Some validations need review'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`flex items-center p-3 rounded-lg ${
                  matchingResult.contractMatch ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {matchingResult.contractMatch ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`ml-2 text-sm font-medium ${
                    matchingResult.contractMatch ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Contract Match
                  </span>
                </div>

                <div className={`flex items-center p-3 rounded-lg ${
                  matchingResult.srnMatch ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {matchingResult.srnMatch ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`ml-2 text-sm font-medium ${
                    matchingResult.srnMatch ? 'text-green-800' : 'text-red-800'
                  }`}>
                    SRN Match
                  </span>
                </div>

                <div className={`flex items-center p-3 rounded-lg ${
                  matchingResult.amountMatch ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {matchingResult.amountMatch ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`ml-2 text-sm font-medium ${
                    matchingResult.amountMatch ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Amount Match
                  </span>
                </div>
              </div>

              {matchingResult.discrepancies.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Discrepancies Found:</h5>
                  <div className="space-y-2">
                    {matchingResult.discrepancies.map((discrepancy, index) => (
                      <div key={index} className={`flex items-start p-3 rounded-lg ${
                        discrepancy.severity === 'HIGH' ? 'bg-red-100' :
                        discrepancy.severity === 'MEDIUM' ? 'bg-yellow-100' :
                        'bg-wujha-primary/10'
                      }`}>
                        <AlertTriangle className={`h-4 w-4 mt-0.5 mr-2 ${
                          discrepancy.severity === 'HIGH' ? 'text-red-600' :
                          discrepancy.severity === 'MEDIUM' ? 'text-yellow-600' :
                          'text-wujha-primary'
                        }`} />
                        <div>
                          <p className={`text-sm font-medium ${
                            discrepancy.severity === 'HIGH' ? 'text-red-800' :
                            discrepancy.severity === 'MEDIUM' ? 'text-yellow-800' :
                            'text-wujha-primary'
                          }`}>
                            {discrepancy.type} Issue ({discrepancy.severity})
                          </p>
                          <p className={`text-sm ${
                            discrepancy.severity === 'HIGH' ? 'text-red-700' :
                            discrepancy.severity === 'MEDIUM' ? 'text-yellow-700' :
                            'text-wujha-primary/80'
                          }`}>
                            {discrepancy.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Matching Summary:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Contract:</span>
                  <span className="ml-2 text-gray-900">{selectedContract?.contractNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">SRN:</span>
                  <span className="ml-2 text-gray-900">{selectedSRN?.srnNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">Contract Amount:</span>
                  <span className="ml-2 text-gray-900">{selectedContract?.totalAmount.toLocaleString()} {selectedContract?.currency}</span>
                </div>
                <div>
                  <span className="text-gray-600">Invoice Amount:</span>
                  <span className="ml-2 text-gray-900">
                    {formData.items.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()} {formData.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review & Submit</h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Invoice Summary</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Number:</span>
                      <span className="text-gray-900">{formData.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Date:</span>
                      <span className="text-gray-900">{new Date(formData.invoiceDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="text-gray-900">{new Date(formData.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Type:</span>
                      <span className="text-gray-900">{formData.serviceType}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Contract & SRN</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contract:</span>
                      <span className="text-gray-900">{selectedContract?.contractNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vendor:</span>
                      <span className="text-gray-900">{selectedContract?.vendor.nameEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SRN:</span>
                      <span className="text-gray-900">{selectedSRN?.srnNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Matching Status:</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        matchingResult?.status === 'MATCHED' ? 'bg-green-100 text-green-800' :
                        matchingResult?.status === 'DISCREPANCY' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {matchingResult?.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Invoice Items</h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.unitPrice.toLocaleString()} {formData.currency}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.totalAmount.toLocaleString()} {formData.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Total Amount:</td>
                        <td className="px-4 py-2 text-sm font-bold text-gray-900">
                          {formData.items.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()} {formData.currency}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes or comments..."
              />
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex gap-3">
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Service Invoice'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
