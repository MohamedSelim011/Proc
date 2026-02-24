'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Search,
  AlertCircle,
  CheckCircle,
  Calculator,
  FileText,
  BarChart2,
  Loader2,
  Flag,
  ClipboardList,
  Link2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/apiFetch';

const CREATE_PR_PREFILL_KEY = 'requisitionCreatePrPrefill';

interface PRItem {
  itemId: string;
  itemCode?: string;
  itemName?: string;
  quantity: number;
  estimatedPrice: number;
  specifications?: string;
  requiredDate?: string;
  unit?: string;
}

interface PRFormData {
  // Step 1: Basic Information
  itemType: 'STOCK' | 'NON_STOCK' | 'SERVICE';
  departmentId: string;
  projectId?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requiredByDate: string;
  justification: string;
  // Material only (Inventory): required for check-availability and Create MR
  deliveryWarehouseId?: string;
  inventoryProjectId?: string;

  // Step 2: Items
  items: PRItem[];

  // Step 3: Review
}

interface Item {
  id: string;
  itemCode: string;
  nameEn: string;
  nameAr: string;
  unitOfMeasure: string;
  category: {
    nameEn: string;
  };
}

interface DepartmentOption {
  id: string;
  name: string;
  code?: string | null;
}

export default function NewPurchaseRequisition() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [materialRequestMode, setMaterialRequestMode] = useState<'WITH_REQUEST' | 'WITHOUT_REQUEST' | ''>('');
  const [selectedMaterialRequestId, setSelectedMaterialRequestId] = useState('');
  const [availableMaterialRequests, setAvailableMaterialRequests] = useState<
    Array<{ id: string; externalId: string; status: string; categoryName?: string | null; requesterName?: string | null }>
  >([]);
  const [materialRequestsLoading, setMaterialRequestsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [budgetInfo, setBudgetInfo] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [requestBasis, setRequestBasis] = useState<'DEPARTMENT' | 'PROJECT'>('DEPARTMENT');
  const [createPrMode, setCreatePrMode] = useState(false);
  const [insufficientStock, setInsufficientStock] = useState(false);
  const [stockAnalysisLoading, setStockAnalysisLoading] = useState(false);
  const [stockAnalysisResult, setStockAnalysisResult] = useState<{
    overallRecommendation: string;
    summary?: { fullyAvailable?: number; notAvailable?: number; totalItems?: number };
    items?: Array<{
      itemId: string;
      itemCode?: string;
      itemName?: string;
      requestedQuantity: number;
      availableStock?: number;
      canFulfillNow?: number;
      needsProcurement?: number;
      suggestedFulfillment?: string;
    }>;
  } | null>(null);

  const [formData, setFormData] = useState<PRFormData>({
    itemType: 'STOCK',
    departmentId: '',
    priority: 'NORMAL',
    requiredByDate: '',
    justification: '',
    items: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(CREATE_PR_PREFILL_KEY) : null;
      if (raw) {
        const prefill = JSON.parse(raw) as Partial<PRFormData>;
        sessionStorage.removeItem(CREATE_PR_PREFILL_KEY);
        if (prefill.departmentId != null) {
          setFormData((prev) => ({
            ...prev,
            departmentId: prefill.departmentId ?? prev.departmentId,
            justification: prefill.justification ?? prev.justification,
            requiredByDate: prefill.requiredByDate ?? prev.requiredByDate,
            priority: prefill.priority ?? prev.priority,
            projectId: prefill.projectId ?? prev.projectId,
          }));
          setCreatePrMode(true);
          setMaterialRequestMode('WITHOUT_REQUEST');
          setRequestBasis(prefill.projectId ? 'PROJECT' : 'DEPARTMENT');
          setCurrentStep(1);
          showToast('info', 'Add items from the procurement catalog in Step 2, then submit to create the PR (approval → PO).');
        }
      }
    } catch {
      sessionStorage.removeItem(CREATE_PR_PREFILL_KEY);
    }
  }, [showToast]);

  useEffect(() => {
    if (currentStep === 2) {
      fetchItems();
    }
  }, [currentStep, formData.itemType, createPrMode]);

  useEffect(() => {
    const isMaterial = formData.itemType === 'STOCK' || formData.itemType === 'NON_STOCK';
    if (currentStep === 1) {
      setDepartmentsLoading(true);
      apiFetch('/api/hr/departments')
        .then((r) => r.json())
        .then((d) => setDepartments(Array.isArray(d?.data) ? d.data : []))
        .catch(() => setDepartments([]))
        .finally(() => setDepartmentsLoading(false));
    }
    if (currentStep === 1 && isMaterial) {
      fetch('/api/inventory-warehouses?limit=50')
        .then((r) => r.json())
        .then((d) => setWarehouses(d.warehouses || []))
        .catch(() => setWarehouses([]));
      fetch('/api/inventory-projects?limit=50')
        .then((r) => r.json())
        .then((d) => setProjects(d.projects || []))
        .catch(() => setProjects([]));
    }
  }, [currentStep, formData.itemType]);

  useEffect(() => {
    if (currentStep !== 0 || materialRequestMode !== 'WITH_REQUEST') return;
    const loadMaterialRequests = async () => {
      try {
        setMaterialRequestsLoading(true);
        // Ensure local DB is up-to-date from HR before loading approved requests.
        await apiFetch('/api/hr/material-requests/sync', { method: 'POST' });

        const approvedRows: Array<{
          id: string;
          externalId: string;
          status: string;
          categoryName?: string | null;
          requesterName?: string | null;
        }> = [];
        let page = 1;
        let totalPages = 1;

        do {
          const response = await apiFetch(`/api/hr/material-requests?status=approved&limit=100&page=${page}`, {
            cache: 'no-store',
          });
          const data = (await response.json()) as {
            data?: Array<{
              id: string;
              externalId: string;
              status: string;
              categoryName?: string | null;
              requesterName?: string | null;
            }>;
            pagination?: { totalPages?: number };
          };

          if (!response.ok) break;
          if (Array.isArray(data.data)) {
            approvedRows.push(...data.data);
          }
          totalPages = Math.max(1, Number(data.pagination?.totalPages || 1));
          page += 1;
        } while (page <= totalPages);

        setAvailableMaterialRequests(approvedRows);
        if (approvedRows.length === 0) {
          showToast('info', 'No approved material requests found in database.');
        }
      } catch {
        setAvailableMaterialRequests([]);
        showToast('error', 'Failed to load approved material requests');
      } finally {
        setMaterialRequestsLoading(false);
      }
    };
    void loadMaterialRequests();
  }, [currentStep, materialRequestMode]);

  useEffect(() => {
    if (requestBasis === 'PROJECT' && formData.projectId && formData.inventoryProjectId !== formData.projectId) {
      setFormData((prev) => ({ ...prev, inventoryProjectId: prev.projectId }));
    }
  }, [requestBasis, formData.projectId, formData.inventoryProjectId]);

  const fetchItems = async () => {
    try {
      const isMaterial = formData.itemType === 'STOCK' || formData.itemType === 'NON_STOCK';
      const useProcurementCatalog = createPrMode || !isMaterial;
      const url = useProcurementCatalog ? '/api/items' : '/api/inventory-items?limit=100';
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!materialRequestMode) {
        newErrors.materialRequestMode = 'Please choose how to create this material requisition';
      }
      if (materialRequestMode === 'WITH_REQUEST' && !selectedMaterialRequestId) {
        newErrors.selectedMaterialRequestId = 'Please choose a material request';
      }
    }

    if (step === 1) {
      if (requestBasis === 'DEPARTMENT') {
        if (!formData.departmentId?.trim()) {
          newErrors.departmentId = 'Department is required';
        }
      } else {
        if (!formData.projectId?.trim()) {
          newErrors.projectId = 'Project is required';
        }
      }
      
      // Validate Required By Date
      if (!formData.requiredByDate) {
        newErrors.requiredByDate = 'Required date is required';
      } else {
        const selectedDate = new Date(formData.requiredByDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to compare dates only
        
        // Check if date is valid
        if (isNaN(selectedDate.getTime())) {
          newErrors.requiredByDate = 'Invalid date format';
        } else {
          // Check if date is too far in the past (before year 1900)
          if (selectedDate.getFullYear() < 1900) {
            newErrors.requiredByDate = 'Date cannot be before year 1900';
          }
          // Check if date is in the past
          else if (selectedDate < today) {
            newErrors.requiredByDate = 'Required date must be today or in the future';
          }
          // Check if date is too far in the future (more than 10 years)
          else {
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() + 10);
            if (selectedDate > maxDate) {
              newErrors.requiredByDate = 'Date cannot be more than 10 years in the future';
            }
          }
        }
      }
      
      if (!formData.justification || !formData.justification.trim()) newErrors.justification = 'Justification is required';

      const isMaterial = formData.itemType === 'STOCK' || formData.itemType === 'NON_STOCK';
      if (isMaterial && !createPrMode) {
        if (!formData.deliveryWarehouseId?.trim()) newErrors.deliveryWarehouseId = 'Delivery warehouse is required for material requisition';
        if (requestBasis === 'PROJECT') {
          if (!formData.inventoryProjectId?.trim()) newErrors.inventoryProjectId = 'Project is required for material requisition';
        }
      }
    }

    if (step === 2) {
      if (formData.items.length === 0) {
        newErrors.items = 'At least one item is required';
      } else {
        formData.items.forEach((item, index) => {
          if (!item.itemId) newErrors[`item_${index}_id`] = 'Item is required';
          if (!item.quantity || item.quantity <= 0) newErrors[`item_${index}_quantity`] = 'Valid quantity is required';
          if (!item.estimatedPrice || item.estimatedPrice <= 0) newErrors[`item_${index}_price`] = 'Valid price is required';
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep === 3) setStockAnalysisResult(null);
    setCurrentStep(currentStep - 1);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        itemId: '',
        quantity: 1,
        estimatedPrice: 0,
        specifications: '',
        requiredDate: prev.requiredByDate
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof PRItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));

    // If item is selected, populate details
    if (field === 'itemId' && value) {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((item, i) => 
            i === index ? { 
              ...item, 
              itemCode: selectedItem.itemCode,
              itemName: selectedItem.nameEn,
              unit: selectedItem.unitOfMeasure
            } : item
          )
        }));
      }
    }
  };

  const calculateTotalCost = () => {
    return formData.items.reduce((total, item) => 
      total + (item.quantity * item.estimatedPrice), 0
    );
  };

  const runStockAnalysis = async () => {
    const warehouseId = formData.deliveryWarehouseId?.trim();
    if (!warehouseId || formData.items.length === 0) {
      showToast('error', 'Add at least one item and select a delivery warehouse (Step 1) to run stock analysis.');
      return;
    }
    setStockAnalysisLoading(true);
    setStockAnalysisResult(null);
    try {
      const res = await fetch('/api/material-requisition/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: formData.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            warehouseId,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Stock analysis failed.');
        setStockAnalysisLoading(false);
        return;
      }
      const recommendation = data?.data?.overallRecommendation;
      const summary = data?.data?.summary;
      const items = data?.data?.items;
      setStockAnalysisResult({
        overallRecommendation: recommendation ?? 'PROCUREMENT_REQUIRED',
        summary: summary ? { fullyAvailable: summary.fullyAvailable, notAvailable: summary.notAvailable, totalItems: summary.totalItems } : undefined,
        items: Array.isArray(items) ? items.map((it: { itemId?: string; itemCode?: string; itemName?: string; requestedQuantity?: number; availableStock?: number; canFulfillNow?: number; needsProcurement?: number; suggestedFulfillment?: string }) => ({
          itemId: it.itemId ?? '',
          itemCode: it.itemCode,
          itemName: it.itemName,
          requestedQuantity: Number(it.requestedQuantity) ?? 0,
          availableStock: it.availableStock != null ? Number(it.availableStock) : undefined,
          canFulfillNow: it.canFulfillNow != null ? Number(it.canFulfillNow) : undefined,
          needsProcurement: it.needsProcurement != null ? Number(it.needsProcurement) : undefined,
          suggestedFulfillment: it.suggestedFulfillment,
        })) : undefined,
      });
    } catch {
      showToast('error', 'Stock analysis failed. Try again.');
    } finally {
      setStockAnalysisLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    const isMaterial = formData.itemType === 'STOCK' || formData.itemType === 'NON_STOCK';
    const warehouseId = formData.deliveryWarehouseId?.trim();
    const projectId = formData.inventoryProjectId?.trim() || formData.projectId?.trim();
    const resolvedDepartmentId = formData.departmentId?.trim() || formData.projectId?.trim() || '';

    const log = (msg: string, data?: unknown) => {
      console.log('[Requisition]', msg, data ?? '');
    };

    const markSourceRequestAsFullfilled = async () => {
      if (!selectedMaterialRequestId) return true;
      try {
        const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const approverExternalId = userData?.employeeId || userData?.id || 'procurement-user';

        const response = await apiFetch(`/api/hr/material-requests/${selectedMaterialRequestId}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: 'fullfilled',
            approved_by_external: approverExternalId,
            updatedAt: new Date().toISOString(),
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
          log('Failed to mark source material request as fullfilled', {
            requestId: selectedMaterialRequestId,
            status: response.status,
            data,
          });
          showToast('warning', `Requisition created, but source request was not marked fullfilled (${selectedMaterialRequestId}).`);
          return false;
        }
        return true;
      } catch (error) {
        log('Error marking source material request as fullfilled', { requestId: selectedMaterialRequestId, error });
        showToast('warning', `Requisition created, but source request was not marked fullfilled (${selectedMaterialRequestId}).`);
        return false;
      }
    };

    let loadingTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      setLoading(true);
      loadingTimeout = setTimeout(() => setLoading(false), 90_000);
      log('Submit started', { isMaterial, createPrMode, warehouseId: !!warehouseId, projectId: !!projectId, items: formData.items.length });

      if (createPrMode) {
        const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const requesterId = userData?.employeeId || userData?.id || 'emp001';
        const submitData = {
          ...formData,
          departmentId: resolvedDepartmentId,
          requesterId,
          estimatedCost: calculateTotalCost(),
          autoSubmit: false,
          sourceMaterialRequestId: selectedMaterialRequestId || undefined,
        };
        const response = await fetch('/api/purchase-requisitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
        const data = await response.json();
        if (response.ok) {
          await markSourceRequestAsFullfilled();
          showToast('success', 'Purchase requisition created successfully!');
          router.push(`/procurement/requisitions/${data.id}`);
        } else {
          showToast('error', data.error || 'Failed to create purchase requisition');
          setErrors({ submit: data.error || 'Failed to create purchase requisition' });
        }
        return;
      }

      if (isMaterial && warehouseId && projectId) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        log('Calling check-availability', { warehouseId, itemCount: formData.items.length });
        const checkRes = await fetch('/api/material-requisition/check-availability', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            items: formData.items.map((i) => ({
              itemId: i.itemId,
              quantity: i.quantity,
              warehouseId,
            })),
          }),
        });
        const checkData = await checkRes.json();
        log('check-availability response', { ok: checkRes.ok, status: checkRes.status, recommendation: checkData?.data?.overallRecommendation, error: checkData?.error, full: checkData });

        if (!checkRes.ok) {
          const errMsg = checkData.error || 'Failed to check availability';
          showToast('error', errMsg);
          setErrors({ submit: `${errMsg} Check server console (terminal) and browser DevTools (F12 → Console) for details.` });
          return;
        }

        const recommendation = checkData?.data?.overallRecommendation;
        if (recommendation === 'DIRECT_ISSUE_ALL') {
          const mrRes = await fetch('/api/material-requisition/create-mr', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              projectId,
              deliveryWarehouseId: warehouseId,
              requiredDate: formData.requiredByDate,
              purpose: formData.justification?.trim() || 'Material requisition from Procurement',
              priority: formData.priority,
              sourceMaterialRequestId: selectedMaterialRequestId || undefined,
              items: formData.items.map((i) => ({
                itemId: i.itemId,
                quantity: i.quantity,
                requiredDate: formData.requiredByDate,
              })),
              justification: formData.justification?.trim(),
            }),
          });
          const mrData = await mrRes.json();

          if (mrRes.ok) {
            await markSourceRequestAsFullfilled();
            showToast('success', 'Material requisition (MR) created in Inventory. Please follow up with the Inventory team for stock issuance.');
            setFormData({
              itemType: 'STOCK',
              departmentId: '',
              priority: 'NORMAL',
              requiredByDate: '',
              justification: '',
              items: [],
            });
            setMaterialRequestMode('');
            setSelectedMaterialRequestId('');
            setCurrentStep(0);
            setItems([]);
          } else {
            const errMsg = mrData.error || 'Failed to create material requisition';
            log('create-mr failed', { status: mrRes.status, error: mrData.error, full: mrData });
            showToast('error', errMsg);
            setErrors({ submit: `${errMsg} Check server console and browser Console (F12) for details.` });
          }
          return;
        }

        // Stock insufficient: create PR in Procurement and MR in Inventory (Needs PO) in one go
        log('Stock insufficient - calling create-pr-and-mr', { departmentId: resolvedDepartmentId, items: formData.items.length, deliveryWarehouseId: warehouseId, inventoryProjectId: projectId });
        const prAndMrRes = await fetch('/api/material-requisition/create-pr-and-mr', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            departmentId: resolvedDepartmentId,
            justification: formData.justification?.trim(),
            requiredByDate: formData.requiredByDate,
            priority: formData.priority,
            projectId: formData.projectId,
            deliveryWarehouseId: warehouseId,
            inventoryProjectId: projectId,
            sourceMaterialRequestId: selectedMaterialRequestId || undefined,
            items: formData.items.map((i) => ({
              itemCode: i.itemCode,
              quantity: i.quantity,
              estimatedPrice: i.estimatedPrice ?? 0,
              inventoryItemId: i.itemId,
              requiredDate: formData.requiredByDate,
            })),
          }),
        });
        const prAndMrData = await prAndMrRes.json();
        log('create-pr-and-mr response', { ok: prAndMrRes.ok, status: prAndMrRes.status, prId: prAndMrData?.data?.prId, mrId: prAndMrData?.data?.mrId, mrError: prAndMrData?.data?.mrError, error: prAndMrData?.error, full: prAndMrData });

        if (prAndMrRes.ok && prAndMrData?.data?.prId) {
          await markSourceRequestAsFullfilled();
          if (prAndMrData.data.mrError) {
            showToast(
              'warning',
              `PR created. MR in Inventory was not created: ${prAndMrData.data.mrError}`
            );
          } else if (prAndMrData.data.mrId) {
            showToast(
              'success',
              "Purchase Requisition (PR) created and MR created in Inventory with status 'Needs PO'. Follow the approval cycle for the PR; once the PO is created, the Inventory team can fulfill the MR."
            );
          } else {
            showToast('success', 'Purchase Requisition (PR) created. Follow the approval cycle to create a PO.');
          }
          router.push(`/procurement/requisitions/${prAndMrData.data.prId}`);
          return;
        }

        const errMsg = prAndMrData?.error || 'Could not create PR automatically.';
        showToast('error', errMsg);
        setInsufficientStock(true);
        setErrors({
          submit: `${errMsg} Check server terminal and browser Console (F12) for [req] create-pr-and-mr logs. If you see validation or Inventory errors there, fix and try again.`,
        });
        return;
      }

      const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const requesterId = userData?.employeeId || userData?.id || 'emp001';
      const submitData = {
        ...formData,
        departmentId: resolvedDepartmentId,
        requesterId,
        estimatedCost: calculateTotalCost(),
        autoSubmit: false,
        sourceMaterialRequestId: selectedMaterialRequestId || undefined,
      };

      const response = await fetch('/api/purchase-requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      const data = await response.json();

      if (response.ok) {
        await markSourceRequestAsFullfilled();
        showToast('success', 'Purchase requisition created successfully!');
        router.push(`/procurement/requisitions/${data.id}`);
      } else {
        const errMsg = data.error || 'Failed to create purchase requisition';
        log('POST /api/purchase-requisitions failed', { status: response.status, error: data.error, full: data });
        showToast('error', errMsg);
        setErrors({ submit: `${errMsg} Check server console and browser Console (F12) for details.` });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'An error occurred while creating the requisition';
      log('Submit threw', error);
      showToast('error', errMsg);
      setErrors({ submit: `${errMsg} Check browser Console (F12) and server terminal.` });
    } finally {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Create Purchase Requisition</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Follow the guided steps below to create a comprehensive purchase requisition for your department
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <nav aria-label="Progress" className="max-w-4xl mx-auto">
            <ol className="flex items-center justify-between">
              {[
                { id: 0, name: 'Request Source', description: 'Choose creation source' },
                { id: 1, name: 'Basic Information', description: 'Department and requirements' },
                { id: 2, name: 'Add Items', description: 'Select items and quantities' },
                { id: 3, name: 'Review & Submit', description: 'Review details and submit' }
              ].map((step, stepIdx) => (
                <li key={step.id} className="relative flex-1">
                  {stepIdx !== 3 && (
                    <div className="absolute top-4 left-1/2 w-full h-0.5 bg-gray-200 -translate-y-1/2" aria-hidden="true">
                      <div className={`h-full transition-all duration-300 ${
                        step.id < currentStep ? 'bg-wujha-primary w-full' : 'w-0'
                      }`} />
                    </div>
                  )}
                  <div className="relative flex flex-col items-center group">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                      step.id < currentStep 
                        ? 'bg-wujha-primary border-wujha-primary shadow-lg' 
                        : step.id === currentStep 
                          ? 'border-wujha-primary bg-white shadow-md ring-4 ring-wujha-primary/20' 
                          : 'border-gray-300 bg-white group-hover:border-gray-400'
                    }`}>
                      {step.id < currentStep ? (
                        <CheckCircle className="h-6 w-6 text-white" />
                      ) : (
                        <span className={`text-sm font-semibold ${
                          step.id === currentStep ? 'text-wujha-primary' : 'text-gray-500'
                        }`}>
                          {step.id}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      <span className={`text-sm font-semibold block ${
                        step.id === currentStep ? 'text-wujha-primary' : step.id < currentStep ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </span>
                      <p className="text-xs text-gray-500 mt-1 max-w-24">{step.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Form Content */}
        <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-10">
            {createPrMode && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">
                  <strong>Creating a Purchase Requisition (PR) for procurement.</strong> Your details are pre-filled. Go to <strong>Step 2</strong>, add the same or equivalent items from the <strong>procurement catalog</strong>, then <strong>Step 3</strong> and submit. This PR will enter the approval cycle; after approval it can be converted to a Purchase Order (PO).
                </p>
                <p className="mt-1 text-xs text-amber-800">PR → Approval → Purchase Order</p>
              </div>
            )}
            {/* Step 0: Source Selection */}
            {currentStep === 0 && (
              <div className="space-y-8">
                <div className="text-center pb-6 border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Material Requisition Source</h3>
                  <p className="text-gray-600">Choose whether to create this requisition from an existing material request or without one.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMaterialRequestMode('WITH_REQUEST');
                      if (errors.materialRequestMode) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.materialRequestMode;
                          return next;
                        });
                      }
                    }}
                    className={`rounded-xl border p-5 text-left transition ${
                      materialRequestMode === 'WITH_REQUEST'
                        ? 'border-wujha-primary bg-wujha-primary/5'
                        : 'border-gray-200 bg-white hover:border-wujha-primary/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-wujha-primary/10 p-2">
                        <Link2 className="h-5 w-5 text-wujha-primary" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">Create For Material Request</p>
                        <p className="mt-1 text-sm text-gray-600">Link this requisition to an existing approved material request.</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMaterialRequestMode('WITHOUT_REQUEST');
                      setSelectedMaterialRequestId('');
                      if (errors.materialRequestMode || errors.selectedMaterialRequestId) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.materialRequestMode;
                          delete next.selectedMaterialRequestId;
                          return next;
                        });
                      }
                    }}
                    className={`rounded-xl border p-5 text-left transition ${
                      materialRequestMode === 'WITHOUT_REQUEST'
                        ? 'border-wujha-primary bg-wujha-primary/5'
                        : 'border-gray-200 bg-white hover:border-wujha-primary/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-wujha-primary/10 p-2">
                        <ClipboardList className="h-5 w-5 text-wujha-primary" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">Create Without Material Request</p>
                        <p className="mt-1 text-sm text-gray-600">Create a new requisition directly from procurement side.</p>
                      </div>
                    </div>
                  </button>
                </div>

                {errors.materialRequestMode && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.materialRequestMode}
                  </p>
                )}

                {materialRequestMode === 'WITH_REQUEST' && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <label className="block text-sm font-semibold text-gray-800">
                      Select Material Request <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="mt-2 block w-full rounded-lg border-gray-300 bg-white py-3 px-4 text-base text-gray-900 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary"
                      value={selectedMaterialRequestId}
                      onChange={(e) => {
                        setSelectedMaterialRequestId(e.target.value);
                        if (errors.selectedMaterialRequestId && e.target.value) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.selectedMaterialRequestId;
                            return next;
                          });
                        }
                      }}
                    >
                      <option value="">{materialRequestsLoading ? 'Loading approved requests...' : 'Select approved material request'}</option>
                      {availableMaterialRequests.map((mr) => (
                        <option key={mr.id} value={mr.externalId}>
                          {mr.externalId} - {(mr.categoryName || 'Uncategorized')} - {(mr.requesterName || 'Unknown requester')}
                        </option>
                      ))}
                    </select>
                    {errors.selectedMaterialRequestId && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.selectedMaterialRequestId}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      Approved material requests are loaded from internal DB and kept synced with HR.
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="text-center pb-6 border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h3>
                  <p className="text-gray-600">Provide essential details for your purchase requisition</p>
                </div>
              
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Item Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200"
                      value={formData.itemType}
                      onChange={(e) => setFormData(prev => ({ ...prev, itemType: e.target.value as any }))}
                    >
                      <option value="STOCK">Stock Items</option>
                      <option value="NON_STOCK">Non-Stock Items</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Request Basis <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200"
                      value={requestBasis}
                      onChange={(e) => {
                        const basis = e.target.value as 'DEPARTMENT' | 'PROJECT';
                        setRequestBasis(basis);
                        setFormData((prev) => ({
                          ...prev,
                          departmentId: basis === 'DEPARTMENT' ? prev.departmentId : '',
                          projectId: basis === 'PROJECT' ? prev.projectId : '',
                          inventoryProjectId: basis === 'PROJECT' ? prev.inventoryProjectId : '',
                        }));
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.departmentId;
                          delete next.projectId;
                          delete next.inventoryProjectId;
                          return next;
                        });
                      }}
                    >
                      <option value="DEPARTMENT">Department</option>
                      <option value="PROJECT">Project</option>
                    </select>
                  </div>

                  {requestBasis === 'DEPARTMENT' ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                          errors.departmentId ? 'border-red-300 ring-red-100' : ''
                        }`}
                        value={formData.departmentId}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => ({ ...prev, departmentId: value, projectId: '' }));
                          if (errors.departmentId) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.departmentId;
                              return next;
                            });
                          }
                        }}
                      >
                        <option value="">{departmentsLoading ? 'Loading departments...' : 'Select department'}</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}{dept.code ? ` (${dept.code})` : ''}
                          </option>
                        ))}
                      </select>
                      {errors.departmentId && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.departmentId}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800">
                        Project <span className="text-red-500">*</span>
                      </label>
                      <select
                        className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                          errors.projectId ? 'border-red-300 ring-red-100' : ''
                        }`}
                        value={formData.projectId || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            projectId: value,
                            inventoryProjectId: value || prev.inventoryProjectId,
                            departmentId: '',
                          }));
                          if (errors.projectId) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.projectId;
                              return next;
                            });
                          }
                        }}
                      >
                        <option value="">Select project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.code} - {project.name}
                          </option>
                        ))}
                      </select>
                      {errors.projectId && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.projectId}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="NORMAL">Normal Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent Priority</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Required By Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                        errors.requiredByDate ? 'border-red-300 ring-red-100' : ''
                      }`}
                      value={formData.requiredByDate}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setFormData(prev => ({ ...prev, requiredByDate: inputValue }));
                        
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
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.requiredByDate}
                      </p>
                    )}
                  </div>

                  {(formData.itemType === 'STOCK' || formData.itemType === 'NON_STOCK') && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800">
                          Delivery Warehouse <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base ${
                            errors.deliveryWarehouseId ? 'border-red-300' : ''
                          }`}
                          value={formData.deliveryWarehouseId || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, deliveryWarehouseId: e.target.value }))}
                        >
                          <option value="">Select warehouse</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                          ))}
                        </select>
                        {errors.deliveryWarehouseId && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.deliveryWarehouseId}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Justification <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 resize-none ${
                      errors.justification ? 'border-red-300 ring-red-100' : ''
                    }`}
                    value={formData.justification}
                    onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                    placeholder="Explain the business need for this requisition in detail..."
                  />
                  {errors.justification && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.justification}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Add Items */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="text-center pb-6 border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Add Items</h3>
                  <p className="text-gray-600">Select and configure the items you need for this requisition</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-wujha-primary/10 rounded-lg">
                      <Plus className="h-5 w-5 text-wujha-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Item Selection</h4>
                      <p className="text-sm text-gray-600">Add items to your requisition</p>
                    </div>
                  </div>
                  <button
                    onClick={addItem}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Item
                  </button>
                </div>

                {errors.items && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{errors.items}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-wujha-primary/10 rounded-full">
                            <span className="text-sm font-bold text-wujha-primary">{index + 1}</span>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900">Item {index + 1}</h4>
                        </div>
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Remove item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            Item <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative">
                            <input
                              type="text"
                              placeholder="Search items by code or name..."
                              className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 pr-10 text-base transition-colors duration-200 ${
                                errors[`item_${index}_id`] ? 'border-red-300 ring-red-100' : ''
                              }`}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            {searchTerm && filteredItems.length > 0 && (
                              <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-white shadow-xl max-h-64 rounded-lg border border-gray-200 overflow-hidden">
                                <div className="py-2 max-h-64 overflow-y-auto">
                                {filteredItems.map((searchItem) => (
                                  <div
                                    key={searchItem.id}
                                    className="cursor-pointer select-none relative px-4 py-3 hover:bg-wujha-primary/5 transition-colors duration-150"
                                    onClick={() => {
                                      updateItem(index, 'itemId', searchItem.id);
                                      setSearchTerm('');
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                          <span className="font-semibold text-gray-900 text-sm">
                                            {searchItem.itemCode}
                                          </span>
                                          <span className="text-gray-600 text-sm">
                                            {searchItem.nameEn}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <span className="text-xs text-wujha-primary bg-wujha-primary/10 px-2 py-1 rounded-full">
                                            {searchItem.category.nameEn}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {searchItem.unitOfMeasure}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              </div>
                            )}
                          </div>
                          {searchTerm && filteredItems.length === 0 && (
                            <div className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <p className="text-sm text-gray-600">No items found matching "{searchTerm}"</p>
                            </div>
                          )}
                          {item.itemName && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg relative z-0">
                              <p className="text-sm text-green-800 font-medium">
                                ✓ Selected: <span className="font-semibold">{item.itemCode}</span> - {item.itemName}
                              </p>
                            </div>
                          )}
                          {errors[`item_${index}_id`] && (
                            <p className="mt-2 text-sm text-red-600 flex items-center relative z-0">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors[`item_${index}_id`]}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 flex rounded-lg shadow-sm">
                            <input
                              type="number"
                              min="1"
                              className={`block w-full rounded-l-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                                errors[`item_${index}_quantity`] ? 'border-red-300 ring-red-100' : ''
                              }`}
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            />
                            <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-600 text-sm font-medium">
                              {item.unit || 'Unit'}
                            </span>
                          </div>
                          {errors[`item_${index}_quantity`] && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors[`item_${index}_quantity`]}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            Estimated Unit Price <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">OMR</span>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              className={`pl-16 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 ${
                                errors[`item_${index}_price`] ? 'border-red-300 ring-red-100' : ''
                              }`}
                              value={item.estimatedPrice}
                              onChange={(e) => updateItem(index, 'estimatedPrice', parseFloat(e.target.value) || 0)}
                              placeholder="0.000"
                            />
                          </div>
                          {errors[`item_${index}_price`] && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors[`item_${index}_price`]}
                            </p>
                          )}
                        </div>

                        <div className="lg:col-span-3 space-y-2">
                          <label className="block text-sm font-semibold text-gray-800">
                            Specifications
                          </label>
                          <textarea
                            rows={3}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-wujha-primary focus:ring-wujha-primary text-gray-900 py-3 px-4 text-base transition-colors duration-200 resize-none"
                            value={item.specifications || ''}
                            onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                            placeholder="Technical specifications, brand preferences, quality requirements, etc."
                          />
                        </div>

                        <div className="lg:col-span-3 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between p-4 bg-wujha-primary/10 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Calculator className="h-5 w-5 text-wujha-primary" />
                              <span className="text-sm font-semibold text-wujha-primary">Line Total</span>
                            </div>
                            <span className="text-lg font-bold text-wujha-primary">
                              {formatCurrency(item.quantity * item.estimatedPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.items.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-wujha-primary/5 border border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                          <Calculator className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <span className="text-lg font-bold text-gray-900">Total Estimated Cost</span>
                          <p className="text-sm text-gray-600">{formData.items.length} item{formData.items.length !== 1 ? 's' : ''} selected</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatCurrency(calculateTotalCost())}
                        </span>
                        <p className="text-sm text-gray-600">Omani Rial</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="text-center pb-6 border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h3>
                  <p className="text-gray-600">Review your requisition details before submission</p>
                </div>

                {/* PR Summary */}
                <div className="bg-gradient-to-br from-gray-50 to-wujha-primary/5 border border-gray-200 rounded-xl p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 bg-wujha-primary/10 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-wujha-primary" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Purchase Requisition Summary</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Department</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900">{formData.departmentId || 'N/A'}</dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Project</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900">{formData.projectId || 'N/A'}</dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Source Request</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900">
                        {selectedMaterialRequestId
                          ? (availableMaterialRequests.find((r) => r.externalId === selectedMaterialRequestId)?.externalId || selectedMaterialRequestId)
                          : 'None'}
                      </dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Priority</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900 flex items-center">
                        <Flag className="h-4 w-4 text-wujha-primary" />
                        <span className="ml-2">{formData.priority}</span>
                      </dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Required By</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900">
                        {new Date(formData.requiredByDate).toLocaleDateString('en-GB')}
                      </dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Items</dt>
                      <dd className="mt-2 text-lg font-bold text-gray-900">{formData.items.length} item{formData.items.length !== 1 ? 's' : ''}</dd>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm sm:col-span-2">
                      <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Estimated Cost</dt>
                      <dd className="mt-2 text-2xl font-bold text-wujha-primary">
                        {formatCurrency(calculateTotalCost())}
                      </dd>
                    </div>
                  </div>
                </div>

                {/* Stock Analysis (material only, not createPrMode) */}
                {(formData.itemType === 'STOCK' || formData.itemType === 'NON_STOCK') && !createPrMode && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={runStockAnalysis}
                      disabled={stockAnalysisLoading || formData.items.length === 0 || !formData.deliveryWarehouseId?.trim()}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {stockAnalysisLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BarChart2 className="h-4 w-4" />
                      )}
                      {stockAnalysisLoading ? 'Analyzing stock…' : 'Stock Analysis'}
                    </button>
                    {stockAnalysisResult && (
                      <div
                        className={`rounded-xl border-2 p-5 ${
                          stockAnalysisResult.overallRecommendation === 'DIRECT_ISSUE_ALL'
                            ? 'border-green-300 bg-green-50'
                            : stockAnalysisResult.overallRecommendation === 'MIXED_FULFILLMENT'
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-amber-400 bg-amber-50'
                        }`}
                      >
                        <p className="font-semibold text-gray-900 mb-1">Stock analysis result</p>
                        {stockAnalysisResult.overallRecommendation === 'DIRECT_ISSUE_ALL' && (
                          <p className="text-sm text-green-900">
                            All items are available in inventory. When you submit, <strong>only a Material Requisition (MR)</strong> will be created in the Inventory system. <strong>No Purchase Order will be created.</strong> Please follow up with the Inventory team for stock issuance.
                          </p>
                        )}
                        {stockAnalysisResult.overallRecommendation === 'PROCUREMENT_REQUIRED' && (
                          <p className="text-sm text-amber-900">
                            One or more items are not fully in stock. When you submit, a <strong>Purchase Requisition (PR)</strong> will be created and will go through <strong>approval → Purchase Order (PO)</strong>. An MR will also be created in Inventory with status &quot;Needs PO&quot;.
                          </p>
                        )}
                        {stockAnalysisResult.overallRecommendation === 'MIXED_FULFILLMENT' && (
                          <p className="text-sm text-amber-900">
                            Some items can be issued from stock, others need procurement. When you submit: an <strong>MR</strong> will be created for the available items (follow up with the Inventory team), and a <strong>PR</strong> will be created for the rest (approval → PO).
                          </p>
                        )}
                        {stockAnalysisResult.summary && (
                          <p className="mt-2 text-xs text-gray-600">
                            Summary: {stockAnalysisResult.summary.fullyAvailable ?? 0} fully available, {stockAnalysisResult.summary.notAvailable ?? 0} not available
                            {stockAnalysisResult.summary.totalItems != null && ` (${stockAnalysisResult.summary.totalItems} total)`}.
                          </p>
                        )}
                        {stockAnalysisResult.items && stockAnalysisResult.items.length > 0 && (
                          <div className="mt-4 overflow-x-auto">
                            <p className="font-medium text-gray-900 mb-2">Per item</p>
                            <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                              <thead>
                                <tr className="bg-gray-100 text-left">
                                  <th className="px-3 py-2 font-semibold text-gray-700">Item</th>
                                  <th className="px-3 py-2 font-semibold text-gray-700 text-right">Requested</th>
                                  <th className="px-3 py-2 font-semibold text-gray-700 text-right">Available</th>
                                  <th className="px-3 py-2 font-semibold text-gray-700 text-right">From stock</th>
                                  <th className="px-3 py-2 font-semibold text-gray-700 text-right">Needs procurement</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stockAnalysisResult.items.map((row, idx) => (
                                  <tr key={row.itemId || idx} className="border-t border-gray-200 bg-white">
                                    <td className="px-3 py-2 text-gray-900">
                                      {row.itemName || row.itemCode || row.itemId || '—'}
                                      {row.itemCode && row.itemName && row.itemCode !== row.itemName && (
                                        <span className="text-gray-500 ml-1">({row.itemCode})</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right">{row.requestedQuantity}</td>
                                    <td className="px-3 py-2 text-right">{row.availableStock ?? '—'}</td>
                                    <td className="px-3 py-2 text-right">{row.canFulfillNow ?? '—'}</td>
                                    <td className="px-3 py-2 text-right">
                                      {row.needsProcurement != null && row.needsProcurement > 0 ? (
                                        <span className="font-medium text-amber-800">{row.needsProcurement}</span>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {errors.submit && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="ml-3 flex-1">
                        <p className="text-sm text-red-800">{errors.submit}</p>
                        {insufficientStock && (
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                sessionStorage.setItem(CREATE_PR_PREFILL_KEY, JSON.stringify({
                                  departmentId: formData.departmentId,
                                  justification: formData.justification,
                                  requiredByDate: formData.requiredByDate,
                                  priority: formData.priority,
                                  projectId: formData.projectId,
                                }));
                                router.push('/procurement/requisitions/new');
                              } catch {
                                router.push('/procurement/requisitions/new');
                              }
                            }}
                            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Create PR (next: add items from catalog, then submit → approval → PO)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-wujha-primary/5 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </button>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Step {currentStep + 1} of 4</span>
              <div className="flex space-x-1">
                {[0, 1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`w-2 h-2 rounded-full ${
                      step <= currentStep ? 'bg-wujha-primary' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : currentStep === 3 ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Create Requisition
                </>
              ) : (
                <>
                  Next Step
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
