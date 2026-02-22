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
  Download,
  Settings,
  DollarSign,
  Users,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { getUserRole, getUserData } from '@/lib/jwt';

interface ServiceRequisition {
  id: string;
  prNumber: string;
  itemType: string;
  departmentId: string;
  projectId?: string;
  costCenter?: string;
  requesterId: string;
  priority: string;
  status: string;
  estimatedCost: string;
  budgetCode: string;
  justification: string;
  requestedDeliveryDate?: string;
  createdAt: string;
  updatedAt: string;
  servicePR: {
    id: string;
    serviceScope: string;
    serviceCategory?: string;
    serviceType?: string;
    requestor?: string;
    technicalSpecifications?: string;
    qualityStandards?: string;
    duration: number;
    durationUnit: string;
    deliverables?: string[] | any;
    performanceMetrics?: string[] | any;
    safetyRequirements?: string;
    paymentSchedule?: string;
    paymentTerms?: string;
    retentionPercentage?: number;
    insuranceRequired?: boolean;
    certificationRequired?: boolean;
    preferredVendors?: string[] | any;
    milestones?: any;
    items: Array<{
      id: string;
      quantity: string;
      estimatedRate: string;
      unit?: string;
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
  items?: Array<{
    id: string;
    quantity: number;
    estimatedPrice: string;
    specifications?: string;
    item: {
      id: string;
      itemCode: string;
      nameEn: string;
      unitOfMeasure: string;
      category?: {
        nameEn: string;
      };
    };
  }>;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-wujha-primary/10 text-wujha-primary',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
};

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  NORMAL: 'bg-wujha-primary/10 text-wujha-primary',
  HIGH: 'bg-yellow-100 text-yellow-800',
  URGENT: 'bg-red-100 text-red-800'
};

export default function ServiceRequisitionDetail() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [sr, setSr] = useState<ServiceRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [preferredVendors, setPreferredVendors] = useState<Array<{ id: string; nameEn: string; vendorCode: string }>>([]);
  const [approving, setApproving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  const handleExportPDF = async () => {
    if (!sr) return;

    try {
      showToast('info', 'Generating PDF...');
      
      // Use the API endpoint to download the file (with cache busting)
      const response = await fetch(`/api/services/requisitions/${sr.id}/download?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast('error', errorData.error || 'Failed to download Service Requisition');
        return;
      }

      // Check if response is PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        showToast('error', 'Server returned non-PDF content');
        return;
      }

      // Get the blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Service_Requisition_${sr.prNumber}.pdf`;
      link.style.display = 'none';
      link.setAttribute('download', `Service_Requisition_${sr.prNumber}.pdf`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
        showToast('success', 'PDF downloaded successfully');
      }, 100);
    } catch (error) {
      console.error('Error downloading service requisition:', error);
      showToast('error', 'Failed to download Service Requisition');
    }
  };

  // Legacy function kept for reference but not used
  const generateHTMLContent = () => {
    if (!sr) return '';

    // Format deliverables and performance metrics
    const formatArray = (arr: any): string => {
      if (!arr) return 'N/A';
      if (Array.isArray(arr)) {
        return arr.filter(item => item && item.trim()).join(', ') || 'N/A';
      }
      return String(arr) || 'N/A';
    };

    // Generate HTML content for PDF download
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Service Requisition ${sr.prNumber}</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              @page {
                size: A4 landscape;
                margin: 15mm;
              }
              .no-print {
                display: none !important;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              color: #1f2937;
              background: white;
              font-size: 11px;
              line-height: 1.5;
            }
            .download-buttons {
              position: fixed;
              top: 10px;
              right: 10px;
              display: flex;
              gap: 10px;
              z-index: 1000;
              background: white;
              padding: 10px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .download-btn {
              padding: 10px 20px;
              border: 1px solid #ddd;
              border-radius: 6px;
              background: white;
              cursor: pointer;
              font-size: 13px;
              font-weight: 600;
              transition: all 0.2s;
              color: #374151;
            }
            .download-btn:hover {
              background: #f9fafb;
            }
            .download-btn.primary {
              background: #f97316;
              color: white;
              border-color: #f97316;
            }
            .download-btn.primary:hover {
              background: #ea580c;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 4px solid #f97316;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #f97316;
              margin-bottom: 8px;
              letter-spacing: 1px;
            }
            .document-title {
              font-size: 20px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 12px;
            }
            .pr-number {
              font-size: 16px;
              color: #6b7280;
              font-weight: 500;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
            }
            .info-section {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #f97316;
            }
            .info-title {
              font-weight: 700;
              font-size: 13px;
              margin-bottom: 12px;
              color: #f97316;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding-bottom: 6px;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-row:last-child {
              border-bottom: none;
              margin-bottom: 0;
            }
            .info-label {
              color: #6b7280;
              font-weight: 600;
              font-size: 10px;
            }
            .info-value {
              color: #1f2937;
              font-weight: 600;
              font-size: 11px;
              text-align: right;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .status-${sr.status} {
              ${sr.status === 'APPROVED' ? 'background: #d1fae5; color: #065f46;' : ''}
              ${sr.status === 'SUBMITTED' || sr.status === 'PENDING_APPROVAL' ? 'background: #fef3c7; color: #92400e;' : ''}
              ${sr.status === 'DRAFT' ? 'background: #f3f4f6; color: #374151;' : ''}
              ${sr.status === 'REJECTED' ? 'background: #fee2e2; color: #991b1b;' : ''}
            }
            .priority-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .priority-${sr.priority} {
              ${sr.priority === 'URGENT' ? 'background: #fee2e2; color: #991b1b;' : ''}
              ${sr.priority === 'HIGH' ? 'background: #fef3c7; color: #92400e;' : ''}
              ${sr.priority === 'NORMAL' ? 'background: #fef3c7; color: #f97316;' : ''}
              ${sr.priority === 'LOW' ? 'background: #d1fae5; color: #065f46;' : ''}
            }
            .section {
              margin: 25px 0;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #f97316;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 2px solid #f97316;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-content {
              background: #ffffff;
              padding: 15px;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
              white-space: pre-wrap;
              font-size: 11px;
              line-height: 1.6;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 10px;
            }
            .items-table th {
              background: #f97316;
              color: white;
              padding: 12px 8px;
              text-align: left;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .items-table td {
              padding: 10px 8px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 10px;
            }
            .items-table tr:nth-child(even) {
              background: #f9fafb;
            }
            .items-table tr:hover {
              background: #fef3c7;
            }
            .total-row {
              background: #fef3c7 !important;
              font-weight: 700;
              border-top: 2px solid #f97316;
            }
            .total-row td {
              padding: 12px 8px;
              font-size: 11px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 9px;
              color: #6b7280;
              text-align: center;
            }
            .metadata {
              font-size: 9px;
              color: #9ca3af;
              margin-top: 5px;
            }
            .deliverables-list, .metrics-list {
              margin-top: 10px;
              padding-left: 20px;
            }
            .deliverables-list li, .metrics-list li {
              margin-bottom: 4px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="download-buttons no-print">
            <button class="download-btn primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
            <button class="download-btn" onclick="window.close()">✕ Close</button>
          </div>

          <div class="header">
            <div class="company-name">WUJHA PROCUREMENT</div>
            <div class="document-title">SERVICE REQUISITION</div>
            <div class="pr-number">${sr.prNumber}</div>
            <div class="metadata">Generated: ${new Date().toLocaleString('en-OM', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</div>
          </div>

          <div class="info-grid">
            <div class="info-section">
              <div class="info-title">Requisition Information</div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value"><span class="status-badge status-${sr.status}">${sr.status}</span></span>
              </div>
              <div class="info-row">
                <span class="info-label">Priority:</span>
                <span class="info-value"><span class="priority-badge priority-${sr.priority}">${sr.priority}</span></span>
              </div>
              <div class="info-row">
                <span class="info-label">Created Date:</span>
                <span class="info-value">${formatDate(sr.createdAt)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Department:</span>
                <span class="info-value">${sr.departmentId || 'N/A'}</span>
              </div>
              ${sr.projectId ? `
              <div class="info-row">
                <span class="info-label">Project ID:</span>
                <span class="info-value">${sr.projectId}</span>
              </div>
              ` : ''}
            </div>

            <div class="info-section">
              <div class="info-title">Service Details</div>
              <div class="info-row">
                <span class="info-label">Service Category:</span>
                <span class="info-value">${sr.servicePR?.serviceCategory || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Service Type:</span>
                <span class="info-value">${sr.servicePR?.serviceType || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Duration:</span>
                <span class="info-value">${sr.servicePR?.duration || 0} ${sr.servicePR?.durationUnit || 'DAYS'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Requester:</span>
                <span class="info-value">${sr.requesterId || 'N/A'}</span>
              </div>
              ${sr.servicePR?.requestor ? `
              <div class="info-row">
                <span class="info-label">Requestor Name:</span>
                <span class="info-value">${sr.servicePR.requestor}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="info-grid">
            <div class="info-section">
              <div class="info-title">Financial Information</div>
              <div class="info-row">
                <span class="info-label">Budget Code:</span>
                <span class="info-value">${sr.budgetCode || 'N/A'}</span>
              </div>
              ${sr.costCenter ? `
              <div class="info-row">
                <span class="info-label">Cost Center:</span>
                <span class="info-value">${sr.costCenter}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Total Estimated Cost:</span>
                <span class="info-value" style="color: #f97316; font-size: 13px;">${formatCurrency(parseFloat(sr.estimatedCost))}</span>
              </div>
            </div>

            <div class="info-section">
              <div class="info-title">Payment Terms</div>
              <div class="info-row">
                <span class="info-label">Payment Schedule:</span>
                <span class="info-value">${sr.servicePR?.paymentSchedule || 'N/A'}</span>
              </div>
              ${sr.servicePR?.paymentTerms ? `
              <div class="info-row">
                <span class="info-label">Payment Terms:</span>
                <span class="info-value">${sr.servicePR.paymentTerms}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Retention:</span>
                <span class="info-value">${sr.servicePR?.retentionPercentage || 0}%</span>
              </div>
              <div class="info-row">
                <span class="info-label">Insurance Required:</span>
                <span class="info-value">${sr.servicePR?.insuranceRequired ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          ${sr.justification ? `
          <div class="section">
            <div class="section-title">Business Justification</div>
            <div class="section-content">${sr.justification}</div>
          </div>
          ` : ''}

          ${sr.servicePR?.serviceScope ? `
          <div class="section">
            <div class="section-title">Scope of Work</div>
            <div class="section-content">${sr.servicePR.serviceScope}</div>
          </div>
          ` : ''}

          ${sr.servicePR?.technicalSpecifications ? `
          <div class="section">
            <div class="section-title">Technical Specifications</div>
            <div class="section-content">${sr.servicePR.technicalSpecifications}</div>
          </div>
          ` : ''}

          ${sr.servicePR?.qualityStandards ? `
          <div class="section">
            <div class="section-title">Quality Standards</div>
            <div class="section-content">${sr.servicePR.qualityStandards}</div>
          </div>
          ` : ''}

          ${sr.servicePR?.safetyRequirements ? `
          <div class="section">
            <div class="section-title">Safety Requirements</div>
            <div class="section-content">${sr.servicePR.safetyRequirements}</div>
          </div>
          ` : ''}

          ${sr.servicePR?.deliverables && (Array.isArray(sr.servicePR.deliverables) ? sr.servicePR.deliverables.length > 0 : sr.servicePR.deliverables) ? `
          <div class="section">
            <div class="section-title">Deliverables</div>
            <div class="section-content">
              <ul class="deliverables-list">
                ${Array.isArray(sr.servicePR.deliverables) 
                  ? sr.servicePR.deliverables.filter((d: any) => d && d.trim()).map((deliverable: string) => `<li>${deliverable}</li>`).join('')
                  : `<li>${sr.servicePR.deliverables}</li>`}
              </ul>
            </div>
          </div>
          ` : ''}

          ${sr.servicePR?.performanceMetrics && (Array.isArray(sr.servicePR.performanceMetrics) ? sr.servicePR.performanceMetrics.length > 0 : sr.servicePR.performanceMetrics) ? `
          <div class="section">
            <div class="section-title">Performance Metrics</div>
            <div class="section-content">
              <ul class="metrics-list">
                ${Array.isArray(sr.servicePR.performanceMetrics)
                  ? sr.servicePR.performanceMetrics.filter((m: any) => m && m.trim()).map((metric: string) => `<li>${metric}</li>`).join('')
                  : `<li>${sr.servicePR.performanceMetrics}</li>`}
              </ul>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Service Items</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 30%;">Service Description</th>
                  <th style="width: 15%;">Category</th>
                  <th style="width: 12%;">Quantity</th>
                  <th style="width: 12%;">Unit Rate</th>
                  <th style="width: 10%;">Duration</th>
                  <th style="width: 21%; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${sr.servicePR?.items && sr.servicePR.items.length > 0 ? sr.servicePR.items.map((item: any) => `
                  <tr>
                    <td>
                      <strong>${item.serviceItem?.serviceCode || 'N/A'}</strong><br>
                      <span style="color: #6b7280; font-size: 9px;">${item.serviceItem?.nameEn || 'N/A'}</span>
                      ${item.specifications ? `<br><span style="color: #9ca3af; font-size: 8px; font-style: italic;">${item.specifications.substring(0, 100)}${item.specifications.length > 100 ? '...' : ''}</span>` : ''}
                    </td>
                    <td>${item.serviceItem?.serviceCategory?.nameEn || 'N/A'}</td>
                    <td>${item.quantity || 0} ${item.serviceItem?.unitOfMeasure || 'units'}</td>
                    <td>${formatCurrency(parseFloat(item.estimatedRate || 0))}</td>
                    <td>${item.duration || 1} ${item.durationUnit || 'DAYS'}</td>
                    <td style="text-align: right; font-weight: 600;">${formatCurrency((parseFloat(item.quantity || 0) * parseFloat(item.estimatedRate || 0) * (item.duration || 1)))}</td>
                  </tr>
                `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #9ca3af;">No service items found</td></tr>'}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="5" style="text-align: right; padding-right: 15px;"><strong>TOTAL ESTIMATED COST:</strong></td>
                  <td style="text-align: right; font-size: 12px; color: #f97316;"><strong>${formatCurrency(parseFloat(sr.estimatedCost))}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="footer">
            <p><strong>WUJHA Procurement System</strong> | This is a system-generated document</p>
            <p style="margin-top: 5px;">For inquiries, please contact the Procurement Department</p>
          </div>
        </body>
      </html>
    `;
    return htmlContent;
  };

  const handleEdit = () => {
    router.push(`/procurement/services/requisitions/${sr?.id}/edit`);
  };

  const fetchPreferredVendors = async (vendorIds: string[]) => {
    try {
      const vendorPromises = vendorIds.map(async (id) => {
        try {
          const res = await fetch(`/api/vendors/${id}`);
          if (res.ok) {
            const vendor = await res.json();
            return { id: vendor.id, nameEn: vendor.nameEn, vendorCode: vendor.vendorCode };
          }
          return null;
        } catch (err) {
          console.error(`Error fetching vendor ${id}:`, err);
          return null;
        }
      });
      const vendors = await Promise.all(vendorPromises);
      setPreferredVendors(vendors.filter(v => v !== null) as Array<{ id: string; nameEn: string; vendorCode: string }>);
    } catch (error) {
      console.error('Error fetching preferred vendors:', error);
    }
  };

  const handleSubmitRequisition = async () => {
    if (!sr) return;
    
    try {
      const response = await fetch(`/api/services/requisitions/${sr.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'PENDING_APPROVAL'
        }),
      });

      if (response.ok) {
        // Refresh the data to show updated status
        showToast('success', 'Requisition submitted successfully!');
        fetchServiceRequisition();
      } else {
        const errorData = await response.json();
        showToast('error', `Failed to submit: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting requisition:', error);
      showToast('error', 'Failed to submit requisition');
    }
  };

  const handleApproveRequisition = async () => {
    if (!sr) return;
    setShowConfirmModal(true);
  };

  const confirmApproveRequisition = async () => {
    if (!sr) return;
    setShowConfirmModal(false);

    try {
      setApproving(true);
      
      const response = await fetch(`/api/services/requisitions/${sr.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED'
        }),
      });

      if (response.ok) {
        showToast('success', 'Service requisition approved successfully!');
        // Refresh the data to show updated status
        fetchServiceRequisition();
      } else {
        const errorData = await response.json();
        showToast('error', `Failed to approve: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error approving requisition:', error);
      showToast('error', 'Failed to approve service requisition');
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    fetchServiceRequisition();
  }, [params.id]);

  // Get user role for permission checks - similar to PO detail page
  useEffect(() => {
    const updateUserInfo = () => {
      if (typeof window === 'undefined') return;
      
      // Try multiple sources for role
      let role = '';
      let user: any = {};
      
      // Method 1: From JWT utility
      const jwtRole = getUserRole();
      const jwtUser = getUserData();
      
      // Method 2: Direct from localStorage
      const localRole = localStorage.getItem('role');
      const localUserStr = localStorage.getItem('user');
      let localUser: any = null;
      if (localUserStr) {
        try {
          localUser = JSON.parse(localUserStr);
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }
      
      // Method 3: Decode from JWT token directly
      const token = localStorage.getItem('token');
      let tokenRole = '';
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            tokenRole = payload.role || '';
          }
        } catch (e) {
          console.error('Error decoding token:', e);
        }
      }
      
      // Priority: JWT util > localStorage role > token decode
      role = jwtRole || localRole || tokenRole || '';
      user = jwtUser || localUser || {};
      
      console.log('Service Requisition Detail - Role Detection:', {
        jwtRole,
        localRole,
        tokenRole,
        finalRole: role,
        jwtUser,
        localUser,
        finalUser: user,
        tokenExists: !!token
      });
      
      setUserRole(role ? role.toUpperCase() : null);
    };

    // Initial load
    updateUserInfo();

    // Listen for storage changes (e.g., token updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'role' || e.key === 'user') {
        updateUserInfo();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // Debug logging
  useEffect(() => {
    if (sr) {
      console.log('ServiceRequisition Data:', sr);
      console.log('ServicePR Items:', sr.servicePR?.items);
      console.log('Items Length:', sr.servicePR?.items?.length);
    }
  }, [sr]);

  // Debug button visibility
  useEffect(() => {
    if (sr && userRole) {
      const statusMatch = sr.status === 'SUBMITTED' || sr.status === 'PENDING_APPROVAL';
      const roleMatch = userRole.toUpperCase() === 'SUPER_ADMIN' || 
                       userRole.toUpperCase() === 'SYSTEM_ADMIN' || 
                       userRole.toUpperCase() === 'ADMIN' || 
                       userRole.toUpperCase() === 'HEAD_OF_PROCUREMENT' || 
                       userRole.toUpperCase() === 'HEAD_OF_PROCUREMENT' ||
                       userRole.toUpperCase() === 'PROCUREMENT_MANAGER' || 
                       userRole.toUpperCase() === 'APPROVER' || 
                       userRole.toUpperCase() === 'DEPARTMENT_MANAGER';
      
      console.log('Approve Button Visibility Check:', {
        status: sr.status,
        statusMatch,
        userRole,
        roleMatch,
        shouldShow: statusMatch && roleMatch
      });
    }
  }, [sr, userRole]);

  const fetchServiceRequisition = async () => {
    try {
      setLoading(true);
      // Use the dedicated service requisitions API
      const response = await fetch(`/api/services/requisitions/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('Fetched service requisition data:', data);
        setSr(data);
        
        // Fetch preferred vendors if they exist
        if (data.servicePR?.preferredVendors && Array.isArray(data.servicePR.preferredVendors) && data.servicePR.preferredVendors.length > 0) {
          fetchPreferredVendors(data.servicePR.preferredVendors);
        }
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
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
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
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
          <button 
            onClick={handleExportPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </button>
          {sr.status === 'DRAFT' && (
            <button 
              onClick={handleEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
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
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[sr.priority as keyof typeof priorityColors]}`}>
                  {sr.priority}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[sr.status as keyof typeof statusColors]}`}>
                  {sr.status}
                </span>
              </div>
              {sr.status === 'DRAFT' && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleSubmitRequisition}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </button>
                  <button 
                    onClick={handleEdit}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Requisition
                  </button>
                </div>
              )}
              {(sr.status === 'SUBMITTED' || sr.status === 'PENDING_APPROVAL') && userRole && (
                userRole.toUpperCase() === 'SUPER_ADMIN' ||
                userRole.toUpperCase() === 'ADMIN' ||
                userRole.toUpperCase() === 'PROCUREMENT_MANAGER'
              ) && (
                <button
                  onClick={handleApproveRequisition}
                  disabled={approving}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Workflow Status */}
        <div className=" w-full px-6 py-4 bg-gray-50 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Approval Workflow</h3>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${sr.status === 'DRAFT' ? 'text-wujha-primary' : sr.status === 'SUBMITTED' || sr.status === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sr.status === 'DRAFT' ? 'bg-wujha-primary/10' : sr.status === 'SUBMITTED' || sr.status === 'APPROVED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-medium">1</span>
              </div>
              <span className="ml-2 text-sm font-medium">Draft</span>
            </div>
            <div className={`w-8 h-1 ${sr.status === 'SUBMITTED' || sr.status === 'APPROVED' ? 'bg-green-200' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${sr.status === 'SUBMITTED' ? 'text-wujha-primary' : sr.status === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sr.status === 'SUBMITTED' ? 'bg-wujha-primary/10' : sr.status === 'APPROVED' ? 'bg-green-100' : 'bg-gray-100'}`}>
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
                Service Category
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {sr.servicePR?.serviceCategory || 'N/A'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Service Type
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {sr.servicePR?.serviceType || 'N/A'}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Budget Code
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{sr.budgetCode}</dd>
            </div>

            {sr.costCenter && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Cost Center
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{sr.costCenter}</dd>
              </div>
            )}

            {sr.projectId && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Project ID
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{sr.projectId}</dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Requester ID
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{sr.requesterId}</dd>
            </div>

            {sr.servicePR?.requestor && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Requestor Name
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{sr.servicePR.requestor}</dd>
              </div>
            )}

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

        {/* Technical Specifications */}
        {sr.servicePR?.technicalSpecifications && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Technical Specifications</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{sr.servicePR.technicalSpecifications}</dd>
          </div>
        )}

        {/* Quality Standards */}
        {sr.servicePR?.qualityStandards && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Quality Standards</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{sr.servicePR.qualityStandards}</dd>
          </div>
        )}

        {/* Safety Requirements */}
        {sr.servicePR?.safetyRequirements && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Safety Requirements</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{sr.servicePR.safetyRequirements}</dd>
          </div>
        )}

        {/* Payment Information */}
        <div className="px-6 py-4 border-t border-gray-200">
          <dt className="text-sm font-medium text-gray-500 mb-2">Payment Information</dt>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
            <div>
              <span className="text-xs text-gray-500">Payment Schedule:</span>
              <p className="text-sm text-gray-900">{sr.servicePR?.paymentSchedule || 'N/A'}</p>
            </div>
            {sr.servicePR?.paymentTerms && (
              <div>
                <span className="text-xs text-gray-500">Payment Terms:</span>
                <p className="text-sm text-gray-900">{sr.servicePR.paymentTerms}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500">Retention:</span>
              <p className="text-sm text-gray-900">{sr.servicePR?.retentionPercentage || 0}%</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Insurance Required:</span>
              <p className="text-sm text-gray-900">{sr.servicePR?.insuranceRequired ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Preferred Vendors */}
        {sr.servicePR?.preferredVendors && Array.isArray(sr.servicePR.preferredVendors) && sr.servicePR.preferredVendors.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Preferred Vendors
            </dt>
            <dd className="flex flex-wrap gap-2 mt-2">
              {preferredVendors.length > 0 ? (
                preferredVendors.map((vendor) => (
                  <span
                    key={vendor.id}
                    className="inline-flex items-center px-3 py-1 bg-wujha-primary/10 text-wujha-primary text-sm rounded-full border border-wujha-primary/30"
                  >
                    {vendor.nameEn} ({vendor.vendorCode})
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">Loading vendor information...</span>
              )}
            </dd>
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
          {(sr.items?.length || 0) > 0 && (
            <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-wujha-primary/10 text-wujha-primary">
              Mixed Requisition (Service + Materials)
            </span>
          )}
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
                      {formatCurrency(parseFloat(String(item.estimatedRate ?? 0)))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency((parseFloat(String(item.quantity ?? 0)) * parseFloat(String(item.estimatedRate ?? 0)) * (item.duration || 1)))}
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

      {/* Material Items (for mixed requisitions) */}
      {sr.items && sr.items.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Material Items</h3>
            <p className="mt-1 text-sm text-gray-500">{sr.items.length} material line(s)</p>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sr.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.item?.itemCode || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{item.item?.nameEn || 'N/A'}</div>
                      {item.specifications && (
                        <div className="text-xs text-gray-400 mt-1">{item.specifications}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.item?.category?.nameEn || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity} {item.item?.unitOfMeasure || 'Unit'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(Number(item.estimatedPrice || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(Number(item.quantity || 0) * Number(item.estimatedPrice || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Service-Specific Information */}
      {sr.itemType === 'SERVICE' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Service Requirements</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-wujha-primary/10 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-wujha-primary mb-2">Scope of Work</h4>
              {sr.servicePR?.serviceScope ? (
                <p className="text-sm text-wujha-primary/80 whitespace-pre-wrap">
                  {sr.servicePR.serviceScope}
                </p>
              ) : (
                <p className="text-sm text-wujha-primary/80 italic">
                  No scope of work specified
                </p>
              )}
              {sr.servicePR?.deliverables && sr.servicePR.deliverables.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-wujha-primary mb-1">Deliverables:</h5>
                  <ul className="text-xs text-wujha-primary/80 list-disc list-inside space-y-1">
                    {Array.isArray(sr.servicePR.deliverables) ? (
                      sr.servicePR.deliverables.map((deliverable: string, index: number) => (
                        <li key={index}>{deliverable}</li>
                      ))
                    ) : (
                      <li>{String(sr.servicePR.deliverables)}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-900 mb-2">Performance Metrics</h4>
              {sr.servicePR?.performanceMetrics && sr.servicePR.performanceMetrics.length > 0 ? (
                <ul className="text-sm text-green-800 list-disc list-inside space-y-1">
                  {Array.isArray(sr.servicePR.performanceMetrics) ? (
                    sr.servicePR.performanceMetrics.map((metric: string, index: number) => (
                      <li key={index}>{metric}</li>
                    ))
                  ) : (
                    <li>{String(sr.servicePR.performanceMetrics)}</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-green-800 italic">
                  No performance metrics specified
                </p>
              )}
              {sr.servicePR?.technicalSpecifications && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-green-900 mb-1">Technical Specifications:</h5>
                  <p className="text-xs text-green-800 whitespace-pre-wrap">
                    {sr.servicePR.technicalSpecifications}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      {sr.status === 'APPROVED' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
          <div className="flex">
            <button
              onClick={() => router.push(`/procurement/services/contracts/new?prId=${sr.id}`)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Service Contract
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-wujha-primary mr-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Approval
                </h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to approve this service requisition? This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={approving}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApproveRequisition}
                  disabled={approving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {approving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
