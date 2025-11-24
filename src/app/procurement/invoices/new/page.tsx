'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  AlertCircle,
  CheckCircle,
  FileText,
  Calculator,
  Shield,
  AlertTriangle,
  XCircle,
  Package
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: {
    id: string;
    nameEn: string;
    email: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    item: {
      id: string;
      itemCode: string;
      nameEn: string;
    };
  }>;
}

interface GoodsReceipt {
  id: string;
  grNumber: string;
  items: Array<{
    id: string;
    poItemId: string;
    acceptedQuantity: number;
    item: {
      itemCode: string;
      nameEn: string;
    };
  }>;
}

interface ServiceReceipt {
  id: string;
  srnNumber: string;
  serviceDescription: string;
  qualityRating: number;
  completionPercentage: number;
  contract: {
    contractNumber: string;
    vendor: {
      id: string;
      nameEn: string;
      email: string;
    };
  };
  milestone?: {
    name: string;
    amount: string;
  };
}

interface InvoiceFormData {
  // Step 1: PO & GR Selection
  poId?: string;
  grId?: string;
  serviceReceiptId?: string;
  invoiceType: 'GOODS' | 'SERVICE';
  vendorId?: string;
  
  // Step 2: Invoice Details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  
  // Step 3: Line Items & Matching
  items: Array<{
    poItemId: string;
    itemId: string;
    invoiceQuantity: number;
    invoiceUnitPrice: number;
    invoiceTotal: number;
    // Matching data
    poQuantity: number;
    poUnitPrice: number;
    grQuantity: number;
    // Discrepancies
    quantityVariance: number;
    priceVariance: number;
    totalVariance: number;
    variancePercentage: number;
    matchingStatus: 'MATCHED' | 'QUANTITY_VARIANCE' | 'PRICE_VARIANCE' | 'BOTH_VARIANCE';
  }>;
  
  // Step 4: Totals & Taxes
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  
  // Additional fields
  paymentTerms: string;
  description?: string;
  attachments?: string[];
}

interface MatchingResult {
  overallStatus: 'MATCHED' | 'DISCREPANCY';
  totalVariance: number;
  variancePercentage: number;
  issues: Array<{
    type: 'QUANTITY' | 'PRICE' | 'TOTAL';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    itemIndex?: number;
  }>;
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get('poId');
  const grId = searchParams.get('grId');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availablePOs, setAvailablePOs] = useState<PurchaseOrder[]>([]);
  const [availableGRs, setAvailableGRs] = useState<GoodsReceipt[]>([]);
  const [serviceReceipts, setServiceReceipts] = useState<ServiceReceipt[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedGR, setSelectedGR] = useState<GoodsReceipt | null>(null);
  const [selectedServiceReceipt, setSelectedServiceReceipt] = useState<ServiceReceipt | null>(null);
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);

  const [formData, setFormData] = useState<InvoiceFormData>({
    poId: poId || '',
    grId: grId || '',
    serviceReceiptId: '',
    invoiceType: 'GOODS',
    vendorId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    currency: 'OMR',
    items: [],
    subtotal: 0,
    taxRate: 5, // 5% VAT in Oman
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    paymentTerms: 'Net 30 days'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAvailablePOs();
    fetchServiceReceipts();
    if (poId) {
      fetchPODetails(poId);
    }
  }, [poId]);

  useEffect(() => {
    if (selectedPO) {
      fetchGRsForPO(selectedPO.id);
    }
  }, [selectedPO]);

  useEffect(() => {
    if (grId && availableGRs.length > 0) {
      const gr = availableGRs.find(g => g.id === grId);
      if (gr) {
        console.log(gr, "gr")
        setSelectedGR(gr);
        setFormData(prev => ({ ...prev, grId }));
      }
    }
  }, [grId, availableGRs]);

  useEffect(() => {
    // Auto-calculate due date (30 days from invoice date)
    if (formData.invoiceDate) {
      const invoiceDate = new Date(formData.invoiceDate);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);
      setFormData(prev => ({ 
        ...prev, 
        dueDate: dueDate.toISOString().split('T')[0] 
      }));
    }
  }, [formData.invoiceDate]);

  useEffect(() => {
    // Recalculate totals when items change
    calculateTotals();
  }, [formData.items, formData.taxRate, formData.discountAmount]);

  const fetchAvailablePOs = async () => {
    try {
      const response = await fetch('/api/purchase-orders?status=APPROVED,SENT,ACKNOWLEDGED,PARTIAL,COMPLETED');
      const data = await response.json();
      if (response.ok) {
        setAvailablePOs(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching available POs:', error);
    }
  };

  const fetchPODetails = async (id: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedPO(data);
        setFormData(prev => ({ ...prev, poId: id }));
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
    }
  };

  const fetchGRsForPO = async (poId: string) => {
    try {
      const response = await fetch(`/api/goods-receipts?poId=${poId}&status=COMPLETED,PARTIAL`);
      const data = await response.json();
      if (response.ok) {
        console.log('Fetched GRs for PO:', data.receipts);
        setAvailableGRs(data.receipts || []);
      }
    } catch (error) {
      console.error('Error fetching GRs for PO:', error);
    }
  };

  const fetchServiceReceipts = async () => {
    try {
      const response = await fetch('/api/service-receipts?status=ACCEPTED');
      const data = await response.json();
      if (response.ok) {
        setServiceReceipts(data.receipts || []);
      }
    } catch (error) {
      console.error('Error fetching service receipts:', error);
    }
  };

  const initializeInvoiceItems = () => {
    if (formData.invoiceType === 'GOODS' && selectedPO) {
      // Debug: Log the structures to understand the matching
      console.log('PO Items:', selectedPO.items.map(item => ({ id: item.id, itemId: item.item.id, itemCode: item.item.itemCode })));
      console.log('GR Items:', selectedGR?.items.map(item => ({ id: item.id, itemId: item.itemId, acceptedQuantity: item.acceptedQuantity })));
      
      // Handle goods/PO items
      const items = selectedPO.items.map(poItem => {
        // Match GR items by itemId (both PO and GR reference the same item)
        const grItem = selectedGR?.items.find(gr => gr.itemId === poItem.item.id);
        const grQuantity = grItem?.acceptedQuantity || 0;
        
        console.log(`Matching PO item ${poItem.item.itemCode} (itemId: ${poItem.item.id}) with GR quantity: ${grQuantity}`);
        
        return {
          poItemId: poItem.id,
          itemId: poItem.item.id,
          invoiceQuantity: grQuantity,
          invoiceUnitPrice: Number(poItem.unitPrice),
          invoiceTotal: grQuantity * Number(poItem.unitPrice),
          poQuantity: poItem.quantity,
          poUnitPrice: Number(poItem.unitPrice),
          grQuantity,
          quantityVariance: 0,
          priceVariance: 0,
          totalVariance: 0,
          variancePercentage: 0,
          matchingStatus: 'MATCHED' as const
        };
      });

      setFormData(prev => ({ ...prev, items }));
    } else if (formData.invoiceType === 'SERVICE' && selectedServiceReceipt) {
      // Handle service receipt items
      const items = [{
        poItemId: selectedServiceReceipt.id,
        itemId: selectedServiceReceipt.id,
        invoiceQuantity: 1, // Service is typically 1 unit
        invoiceUnitPrice: parseFloat(selectedServiceReceipt.milestone?.amount || '0'),
        invoiceTotal: parseFloat(selectedServiceReceipt.milestone?.amount || '0'),
        poQuantity: 1,
        poUnitPrice: parseFloat(selectedServiceReceipt.milestone?.amount || '0'),
        grQuantity: 1,
        quantityVariance: 0,
        priceVariance: 0,
        totalVariance: 0,
        variancePercentage: 0,
        matchingStatus: 'MATCHED' as const
      }];

      setFormData(prev => ({ ...prev, items }));
    }
  };

  const performThreeWayMatching = () => {
    if (!selectedPO || formData.items.length === 0) return;

    const updatedItems = formData.items.map(item => {
      // Calculate variances
      const quantityVariance = item.invoiceQuantity - item.grQuantity;
      const priceVariance = item.invoiceUnitPrice - item.poUnitPrice;
      const totalVariance = item.invoiceTotal - (item.grQuantity * item.poUnitPrice);
      const variancePercentage = item.grQuantity > 0 
        ? Math.abs(totalVariance) / (item.grQuantity * item.poUnitPrice) * 100 
        : 0;

      // Determine matching status
      let matchingStatus: 'MATCHED' | 'QUANTITY_VARIANCE' | 'PRICE_VARIANCE' | 'BOTH_VARIANCE' = 'MATCHED';
      
      const quantityTolerance = 0.02; // 2% tolerance
      const priceTolerance = 0.05; // 5% tolerance
      
      const hasQuantityVariance = Math.abs(quantityVariance) > (item.grQuantity * quantityTolerance);
      const hasPriceVariance = Math.abs(priceVariance) > (item.poUnitPrice * priceTolerance);
      
      if (hasQuantityVariance && hasPriceVariance) {
        matchingStatus = 'BOTH_VARIANCE';
      } else if (hasQuantityVariance) {
        matchingStatus = 'QUANTITY_VARIANCE';
      } else if (hasPriceVariance) {
        matchingStatus = 'PRICE_VARIANCE';
      }

      return {
        ...item,
        quantityVariance,
        priceVariance,
        totalVariance,
        variancePercentage,
        matchingStatus
      };
    });

    setFormData(prev => ({ ...prev, items: updatedItems }));

    // Calculate overall matching result
    const totalPOValue = updatedItems.reduce((sum, item) => sum + (item.grQuantity * item.poUnitPrice), 0);
    const totalInvoiceValue = updatedItems.reduce((sum, item) => sum + item.invoiceTotal, 0);
    const totalVariance = totalInvoiceValue - totalPOValue;
    const overallVariancePercentage = totalPOValue > 0 ? Math.abs(totalVariance) / totalPOValue * 100 : 0;

    const issues: MatchingResult['issues'] = [];
    
    updatedItems.forEach((item, index) => {
      if (item.matchingStatus !== 'MATCHED') {
        if (item.matchingStatus === 'QUANTITY_VARIANCE' || item.matchingStatus === 'BOTH_VARIANCE') {
          issues.push({
            type: 'QUANTITY',
            severity: Math.abs(item.quantityVariance) > item.grQuantity * 0.1 ? 'HIGH' : 'MEDIUM',
            message: `Quantity variance: ${item.quantityVariance > 0 ? '+' : ''}${item.quantityVariance}`,
            itemIndex: index
          });
        }
        
        if (item.matchingStatus === 'PRICE_VARIANCE' || item.matchingStatus === 'BOTH_VARIANCE') {
          issues.push({
            type: 'PRICE',
            severity: Math.abs(item.priceVariance) > item.poUnitPrice * 0.2 ? 'HIGH' : 'MEDIUM',
            message: `Price variance: ${formatCurrency(item.priceVariance)}`,
            itemIndex: index
          });
        }
      }
    });

    setMatchingResult({
      overallStatus: issues.length > 0 ? 'DISCREPANCY' : 'MATCHED',
      totalVariance,
      variancePercentage: overallVariancePercentage,
      issues
    });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.invoiceTotal, 0);
    const taxAmount = subtotal * (formData.taxRate / 100);
    const totalAmount = subtotal + taxAmount - formData.discountAmount;

    setFormData(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      totalAmount
    }));
  };

  const updateItemField = (index: number, field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value };
          
          // Recalculate invoice total when quantity or price changes
          if (field === 'invoiceQuantity' || field === 'invoiceUnitPrice') {
            updated.invoiceTotal = updated.invoiceQuantity * updated.invoiceUnitPrice;
          }
          
          return updated;
        }
        return item;
      })
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (formData.invoiceType === 'GOODS') {
        if (!formData.poId) newErrors.poId = 'Purchase order is required';
        if (!formData.vendorId) newErrors.vendorId = 'Vendor is required';
      } else if (formData.invoiceType === 'SERVICE') {
        if (!formData.serviceReceiptId) newErrors.serviceReceiptId = 'Service receipt is required';
        if (!formData.vendorId) newErrors.vendorId = 'Vendor is required';
      }
    }

    if (step === 2) {
      if (!formData.invoiceNumber) newErrors.invoiceNumber = 'Invoice number is required';
      if (!formData.invoiceDate) newErrors.invoiceDate = 'Invoice date is required';
      if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    }

    if (step === 3) {
      if (formData.items.length === 0) {
        newErrors.items = 'At least one item is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2 && formData.items.length === 0) {
        initializeInvoiceItems();
      }
      if (currentStep === 3) {
        performThreeWayMatching();
      }
      if (currentStep === 4) {
        handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const submitData = {
        poId: formData.poId,
        grId: formData.grId,
        serviceReceiptId: formData.serviceReceiptId,
        invoiceType: formData.invoiceType,
        vendorId: formData.vendorId,
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        currency: formData.currency,
        subtotal: formData.subtotal,
        taxAmount: formData.taxAmount,
        discountAmount: formData.discountAmount,
        totalAmount: formData.totalAmount,
        paymentTerms: formData.paymentTerms,
        description: formData.description,
        matchingStatus: matchingResult?.overallStatus || 'MATCHED',
        status: 'DRAFT',
        items: formData.items.map(item => ({
          poItemId: item.poItemId,
          itemId: item.itemId,
          quantity: item.invoiceQuantity,
          unitPrice: item.invoiceUnitPrice,
          totalPrice: item.invoiceTotal,
          description: item.itemId === item.poItemId ? 'Service Item' : 'Goods Item'
        }))
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/procurement/invoices/${data.id}`);
      } else {
        console.error('Error creating invoice:', data.error);
        setErrors({ submit: data.error || 'Failed to create invoice' });
      }
    } catch (error) {
      console.error('Error submitting invoice:', error);
      setErrors({ submit: 'Failed to create invoice' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount);
  };

  const getMatchingStatusColor = (status: string) => {
    switch (status) {
      case 'MATCHED':
        return 'bg-green-100 text-green-800';
      case 'QUANTITY_VARIANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'PRICE_VARIANCE':
        return 'bg-orange-100 text-orange-800';
      case 'BOTH_VARIANCE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVarianceIcon = (status: string) => {
    switch (status) {
      case 'MATCHED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'QUANTITY_VARIANCE':
      case 'PRICE_VARIANCE':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'BOTH_VARIANCE':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-8xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create vendor invoice with three-way matching validation
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress" className="bg-gray-50 rounded-lg p-6">
          <ol className="flex items-center justify-between w-full">
            {[
              { id: 1, name: 'PO/Service Selection', description: 'Select purchase order and goods receipt OR service receipt' },
              { id: 2, name: 'Invoice Details', description: 'Enter invoice information' },
              { id: 3, name: 'Line Items', description: 'Configure invoice line items' },
              { id: 4, name: '3-Way Matching', description: 'Validate and review matching' }
            ].map((step, stepIdx) => (
              <li key={step.id} className="relative flex-1 pt-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx < 3 && (
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
          {/* Step 1: PO & GR Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Select Purchase Order & Goods Receipt OR Service Receipt</h3>
              
              {/* Invoice Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Invoice Type *
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, invoiceType: 'GOODS' }));
                      setSelectedPO(null);
                      setSelectedServiceReceipt(null);
                    }}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      formData.invoiceType === 'GOODS'
                        ? 'border-wujha-primary bg-wujha-primary/10 text-wujha-primary'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Goods & Materials
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, invoiceType: 'SERVICE' }));
                      setSelectedPO(null);
                      setSelectedServiceReceipt(null);
                    }}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      formData.invoiceType === 'SERVICE'
                        ? 'border-wujha-primary bg-wujha-primary/10 text-wujha-primary'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Services
                  </button>
                </div>
              </div>
              
              {/* PO Selection - Only show for goods */}
              {formData.invoiceType === 'GOODS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Purchase Order *
                  </label>
                {selectedPO ? (
                  <div className="bg-wujha-primary/10 border border-wujha-primary/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-wujha-primary">{selectedPO.poNumber}</h4>
                        <p className="text-sm text-wujha-primary/80">{selectedPO.vendor.nameEn}</p>
                        <p className="text-sm text-wujha-primary/80">{selectedPO.items.length} items</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-wujha-primary" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {availablePOs.map((po) => (
                      <div
                        key={po.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          formData.poId === po.id
                            ? 'border-wujha-primary bg-wujha-primary/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedPO(po);
                          setFormData(prev => ({ ...prev, poId: po.id, vendorId: po.vendor.id }));
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{po.poNumber}</h4>
                            <p className="text-sm text-gray-500">{po.vendor.nameEn}</p>
                            <p className="text-sm text-gray-500">{po.items.length} items</p>
                          </div>
                          {formData.poId === po.id && (
                            <CheckCircle className="h-5 w-5 text-wujha-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.poId && (
                  <p className="mt-1 text-sm text-red-600">{errors.poId}</p>
                )}
              </div>
              )}

              {/* GR Selection */}
              {availableGRs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Goods Receipt (Optional)
                  </label>
                  <div className="space-y-3">
                    {availableGRs.map((gr) => (
                      <div
                        key={gr.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          formData.grId === gr.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          console.log(gr, "gr selected")
                          setSelectedGR(gr);
                          setFormData(prev => ({ ...prev, grId: gr.id }));
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{gr.grNumber}</h4>
                            <p className="text-sm text-gray-500">{gr.items.length} items received</p>
                          </div>
                          {formData.grId === gr.id && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Receipt Selection - Only show for services */}
              {formData.invoiceType === 'SERVICE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Service Receipt *
                  </label>
                  {selectedServiceReceipt ? (
                    <div className="bg-wujha-primary/10 border border-wujha-primary/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-wujha-primary">{selectedServiceReceipt.srnNumber}</h4>
                          <p className="text-sm text-wujha-primary/80">{selectedServiceReceipt.contract.vendor.nameEn}</p>
                          <p className="text-sm text-wujha-primary/80">{selectedServiceReceipt.serviceDescription}</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-wujha-primary" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {serviceReceipts.map((receipt) => (
                        <div
                          key={receipt.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            formData.serviceReceiptId === receipt.id
                              ? 'border-wujha-primary bg-wujha-primary/10'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedServiceReceipt(receipt);
                            setFormData(prev => ({ 
                              ...prev, 
                              serviceReceiptId: receipt.id,
                              vendorId: receipt.contract.vendor.id 
                            }));
                            // Auto-initialize items for service receipt
                            setTimeout(() => {
                              const items = [{
                                poItemId: receipt.id,
                                itemId: receipt.id,
                                invoiceQuantity: 1,
                                invoiceUnitPrice: parseFloat(receipt.milestone?.amount || '0'),
                                invoiceTotal: parseFloat(receipt.milestone?.amount || '0'),
                                poQuantity: 1,
                                poUnitPrice: parseFloat(receipt.milestone?.amount || '0'),
                                grQuantity: 1,
                                quantityVariance: 0,
                                priceVariance: 0,
                                totalVariance: 0,
                                variancePercentage: 0,
                                matchingStatus: 'MATCHED' as const
                              }];
                              setFormData(prev => ({ ...prev, items }));
                            }, 100);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{receipt.srnNumber}</h4>
                              <p className="text-sm text-gray-500">{receipt.contract.vendor.nameEn}</p>
                              <p className="text-sm text-gray-500">{receipt.serviceDescription}</p>
                              {receipt.milestone && (
                                <p className="text-sm text-gray-500">Milestone: {receipt.milestone.name}</p>
                              )}
                            </div>
                            {formData.serviceReceiptId === receipt.id && (
                              <CheckCircle className="h-5 w-5 text-wujha-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.serviceReceiptId && (
                    <p className="mt-1 text-sm text-red-600">{errors.serviceReceiptId}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Invoice Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Invoice Details</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary ${
                      errors.invoiceNumber ? 'border-red-300' : ''
                    }`}
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="INV-2024-001"
                  />
                  {errors.invoiceNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Currency
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    <option value="OMR">Omani Rial (OMR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary ${
                      errors.invoiceDate ? 'border-red-300' : ''
                    }`}
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.invoiceDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.invoiceDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary ${
                      errors.dueDate ? 'border-red-300' : ''
                    }`}
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    min={formData.invoiceDate}
                  />
                  {errors.dueDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Terms
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  <option value="Net 30 days">Net 30 days</option>
                  <option value="Net 45 days">Net 45 days</option>
                  <option value="Net 60 days">Net 60 days</option>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Advance Payment">Advance Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Invoice description or notes..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Line Items */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Invoice Line Items</h3>
              
              {errors.items && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{errors.items}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PO Qty/Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GR Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Qty *
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Price *
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.invoiceType === 'GOODS' && selectedPO?.items.map((poItem, index) => {
                      const invoiceItem = formData.items[index];
                      // Match GR items by itemId (both PO and GR reference the same item)
                      const grItem = selectedGR?.items.find(gr => gr.itemId === poItem.item.id);
                      
                      return (
                        <tr key={poItem.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {poItem.item.itemCode}
                              </div>
                              <div className="text-sm text-gray-500">{poItem.item.nameEn}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {poItem.quantity} × {formatCurrency(Number(poItem.unitPrice))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {grItem?.acceptedQuantity || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="block w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-sm"
                              value={invoiceItem?.invoiceQuantity || 0}
                              onChange={(e) => updateItemField(index, 'invoiceQuantity', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                                {formData.currency}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="pl-12 block w-32 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary text-sm"
                                value={invoiceItem?.invoiceUnitPrice || 0}
                                onChange={(e) => updateItemField(index, 'invoiceUnitPrice', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoiceItem?.invoiceTotal || 0)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {formData.invoiceType === 'SERVICE' && formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedServiceReceipt?.srnNumber}
                            </div>
                            <div className="text-sm text-gray-500">{selectedServiceReceipt?.serviceDescription}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            1 × {formatCurrency(item.poUnitPrice)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            1
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="block w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={item.invoiceQuantity || 0}
                            onChange={(e) => updateItemField(index, 'invoiceQuantity', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                              {formData.currency}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="pl-12 block w-32 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              value={item.invoiceUnitPrice || 0}
                              onChange={(e) => updateItemField(index, 'invoiceUnitPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.invoiceTotal || 0)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Invoice Totals
                </h4>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                      value={formData.taxRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Discount Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        {formData.currency}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-12 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary"
                        value={formData.discountAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-sm font-medium">{formatCurrency(formData.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tax:</span>
                      <span className="text-sm font-medium">{formatCurrency(formData.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Discount:</span>
                      <span className="text-sm font-medium">-{formatCurrency(formData.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-base font-medium text-gray-900">Total:</span>
                      <span className="text-base font-bold text-gray-900">{formatCurrency(formData.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Three-Way Matching */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Three-Way Matching Validation
              </h3>
              
              {/* Overall Matching Status */}
              {matchingResult && (
                <div className={`rounded-lg p-4 ${
                  matchingResult.overallStatus === 'MATCHED' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    {matchingResult.overallStatus === 'MATCHED' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <div className="ml-3">
                      <h4 className={`text-sm font-medium ${
                        matchingResult.overallStatus === 'MATCHED' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {matchingResult.overallStatus === 'MATCHED' 
                          ? 'All items matched successfully' 
                          : `${matchingResult.issues.length} discrepancies found`
                        }
                      </h4>
                      <p className={`text-sm ${
                        matchingResult.overallStatus === 'MATCHED' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        Total variance: {formatCurrency(Math.abs(matchingResult.totalVariance))} 
                        ({matchingResult.variancePercentage.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Issues List */}
              {matchingResult?.issues && matchingResult.issues.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Discrepancies Found</h4>
                  <div className="space-y-2">
                    {matchingResult.issues.map((issue, index) => (
                      <div key={index} className={`flex items-start p-3 rounded-lg ${
                        issue.severity === 'HIGH' 
                          ? 'bg-red-50 border border-red-200' 
                          : 'bg-yellow-50 border border-yellow-200'
                      }`}>
                        <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                          issue.severity === 'HIGH' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${
                            issue.severity === 'HIGH' ? 'text-red-800' : 'text-yellow-800'
                          }`}>
                            Item {(issue.itemIndex || 0) + 1}: {issue.message}
                          </p>
                          <p className={`text-xs ${
                            issue.severity === 'HIGH' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {issue.severity} severity {issue.type.toLowerCase()} variance
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Matching Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PO vs Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GR vs Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.items.map((item, index) => {
                      const poItem = selectedPO?.items[index];
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {poItem?.item.itemCode}
                            </div>
                            <div className="text-sm text-gray-500">{poItem?.item.nameEn}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>Qty: {item.poQuantity} → {item.invoiceQuantity}</div>
                            <div>Price: {formatCurrency(item.poUnitPrice)} → {formatCurrency(item.invoiceUnitPrice)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>Qty: {item.grQuantity} → {item.invoiceQuantity}</div>
                            <div className={item.quantityVariance !== 0 ? 'text-red-600' : 'text-green-600'}>
                              Variance: {item.quantityVariance > 0 ? '+' : ''}{item.quantityVariance}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${item.totalVariance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(Math.abs(item.totalVariance))}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.variancePercentage.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getVarianceIcon(item.matchingStatus)}
                              <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMatchingStatusColor(item.matchingStatus)}`}>
                                {item.matchingStatus.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Final Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h4>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formData.invoiceNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formData.invoiceType === 'GOODS' 
                        ? selectedPO?.vendor.nameEn 
                        : selectedServiceReceipt?.contract.vendor.nameEn}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Invoice Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(formData.invoiceDate).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(formData.dueDate).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                    <dd className="mt-1 text-lg font-bold text-gray-900">
                      {formatCurrency(formData.totalAmount)} {formData.currency}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Matching Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        matchingResult?.overallStatus === 'MATCHED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {matchingResult?.overallStatus || 'PENDING'}
                      </span>
                    </dd>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="rounded-md bg-red-50 p-4">
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
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Creating...'
            ) : currentStep === 4 ? (
              'Create Invoice'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewInvoice() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wujha-primary"></div>
      </div>
    }>
      <NewInvoiceContent />
    </Suspense>
  );
}
