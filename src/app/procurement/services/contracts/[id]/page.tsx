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
  DollarSign,
  Shield,
  Award
} from 'lucide-react';

interface ServiceContract {
  id: string;
  contractNumber: string;
  prId: string;
  vendorId: string;
  contractType: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  currency: string;
  paymentTerms: string;
  slaTerms?: string;
  penaltyClause?: string;
  performanceBond?: number;
  retentionAmount?: number;
  insuranceRequirements?: string;
  status: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: string;
    vendorCode: string;
    nameEn: string;
    nameAr: string;
    email: string;
    mobile: string;
  };
  pr: {
    id: string;
    prNumber: string;
    requesterId: string;
    departmentId: string;
    estimatedCost: string;
    justification: string;
    servicePR: {
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
  };
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  TERMINATED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800'
};

const contractTypeColors = {
  SERVICE_AGREEMENT: 'bg-blue-100 text-blue-800',
  CONSULTING_CONTRACT: 'bg-purple-100 text-purple-800',
  MAINTENANCE_CONTRACT: 'bg-green-100 text-green-800',
  SUPPORT_CONTRACT: 'bg-orange-100 text-orange-800'
};

export default function ServiceContractDetail() {
  const params = useParams();
  const router = useRouter();
  const [contract, setContract] = useState<ServiceContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activating, setActivating] = useState(false);

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

  useEffect(() => {
    if (params.id) {
      fetchContract();
    }
  }, [params.id]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/service-contracts/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data);
      } else {
        setError('Failed to fetch service contract');
      }
    } catch (error) {
      setError('Error fetching service contract');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateContract = async () => {
    try {
      setActivating(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/service-contracts/${params.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activatedBy: 'current-user-id' // This should come from user context
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Contract activated successfully!');
        // Refresh the contract data to show updated status
        setTimeout(() => {
          fetchContract();
        }, 1000);
      } else {
        setError(data.error || 'Failed to activate contract');
      }
    } catch (error) {
      console.error('Error activating contract:', error);
      setError('Failed to activate contract');
    } finally {
      setActivating(false);
    }
  };

  const handleExportPDF = () => {
    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    if (!printWindow || !contract) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Service Contract - ${contract.contractNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #1f2937;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1e40af;
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header .subtitle {
            color: #6b7280;
            font-size: 14px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title {
            background: #eff6ff;
            padding: 12px 15px;
            font-size: 18px;
            font-weight: 600;
            color: #1e40af;
            border-left: 4px solid #2563eb;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-item {
            padding: 12px;
            background: #f9fafb;
            border-radius: 6px;
          }
          .info-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 14px;
            color: #111827;
            font-weight: 500;
          }
          .info-value.large {
            font-size: 20px;
            color: #059669;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #d1d5db;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-active { background: #d1fae5; color: #065f46; }
          .status-draft { background: #f3f4f6; color: #374151; }
          .terms-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-top: 15px;
            border-radius: 4px;
          }
          .terms-box h4 {
            color: #92400e;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .terms-box p {
            color: #78350f;
            font-size: 13px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SERVICE CONTRACT</h1>
          <h2>${contract.contractNumber}</h2>
          <p class="subtitle">Service Agreement - ${contract.contractType.replace('_', ' ')}</p>
          <div style="margin-top: 15px;">
            <span class="status-badge status-${contract.status.toLowerCase()}">${contract.status}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Contract Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Contract Number</div>
              <div class="info-value">${contract.contractNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Purchase Requisition</div>
              <div class="info-value">${contract.pr.prNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Vendor</div>
              <div class="info-value">${contract.vendor.nameEn}</div>
              <div style="font-size: 12px; color: #6b7280;">${contract.vendor.vendorCode}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Contract Period</div>
              <div class="info-value">${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Payment Terms</div>
              <div class="info-value">${contract.paymentTerms}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Total Contract Value</div>
              <div class="info-value large">${formatCurrency(contract.totalValue)} ${contract.currency}</div>
            </div>
          </div>
        </div>

        ${contract.pr.servicePR ? `
        <div class="section">
          <div class="section-title">Service Requirements</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Service Scope</div>
              <div class="info-value">${contract.pr.servicePR.serviceScope}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Duration</div>
              <div class="info-value">${contract.pr.servicePR.duration} ${contract.pr.servicePR.durationUnit}</div>
            </div>
          </div>
          ${contract.pr.servicePR.technicalSpecifications ? `
            <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 6px;">
              <div class="info-label">Technical Specifications</div>
              <div class="info-value">${contract.pr.servicePR.technicalSpecifications}</div>
            </div>
          ` : ''}
        </div>
        ` : ''}

        ${contract.pr.servicePR?.items && contract.pr.servicePR.items.length > 0 ? `
        <div class="section">
          <div class="section-title">Service Items</div>
          <table>
            <thead>
              <tr>
                <th>Service Code</th>
                <th>Description</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${contract.pr.servicePR.items.map(item => `
                <tr>
                  <td>${item.serviceItem.serviceCode}</td>
                  <td>${item.serviceItem.nameEn}</td>
                  <td>${item.serviceItem.serviceCategory.nameEn}</td>
                  <td>${item.quantity} ${item.serviceItem.unitOfMeasure}</td>
                  <td>${formatCurrency(parseFloat(item.estimatedRate))}</td>
                  <td>${item.duration} ${item.durationUnit}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${contract.performanceBond || contract.retentionAmount ? `
        <div class="section">
          <div class="section-title">Financial Guarantees</div>
          <div class="info-grid">
            ${contract.performanceBond ? `
              <div class="info-item">
                <div class="info-label">Performance Bond</div>
                <div class="info-value">${formatCurrency(contract.performanceBond)} ${contract.currency}</div>
              </div>
            ` : ''}
            ${contract.retentionAmount ? `
              <div class="info-item">
                <div class="info-label">Retention Amount</div>
                <div class="info-value">${formatCurrency(contract.retentionAmount)} ${contract.currency}</div>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        ${contract.slaTerms || contract.penaltyClause || contract.insuranceRequirements ? `
        <div class="section">
          <div class="section-title">Contract Terms & Conditions</div>
          ${contract.slaTerms ? `
            <div class="terms-box" style="background: #dbeafe; border-color: #3b82f6;">
              <h4 style="color: #1e40af;">SLA Terms</h4>
              <p style="color: #1e3a8a;">${contract.slaTerms}</p>
            </div>
          ` : ''}
          ${contract.penaltyClause ? `
            <div class="terms-box" style="background: #fee2e2; border-color: #ef4444;">
              <h4 style="color: #991b1b;">Penalty Clause</h4>
              <p style="color: #7f1d1d;">${contract.penaltyClause}</p>
            </div>
          ` : ''}
          ${contract.insuranceRequirements ? `
            <div class="terms-box" style="background: #d1fae5; border-color: #10b981;">
              <h4 style="color: #065f46;">Insurance Requirements</h4>
              <p style="color: #064e3b;">${contract.insuranceRequirements}</p>
            </div>
          ` : ''}
        </div>
        ` : ''}

        ${contract.pr.justification ? `
        <div class="section">
          <div class="section-title">Business Justification</div>
          <div style="padding: 15px; background: #f9fafb; border-radius: 6px;">
            <p style="font-size: 13px; color: #374151;">${contract.pr.justification}</p>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>WUJHA HR Procurement System</strong></p>
          <p>Generated on ${new Date().toLocaleString('en-OM', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p style="margin-top: 10px; font-size: 11px;">This is a system-generated document</p>
        </div>

        <div class="no-print" style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
          <button
            onclick="window.print()"
            style="background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
          >
            Print / Save as PDF
          </button>
          <button
            onclick="window.close()"
            style="background: #6b7280; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin-left: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
          >
            Close
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error || 'Service contract not found'}</p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/procurement/services/contracts')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Service Contracts
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
            onClick={() => router.push('/procurement/services/contracts')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Service Contracts
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            title="Export contract as PDF"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          {contract.status === 'DRAFT' && (
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

      {/* Service Contract Header Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{contract.contractNumber}</h1>
              <p className="mt-1 text-sm text-gray-500">Service Contract Details</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contractTypeColors[contract.contractType as keyof typeof contractTypeColors] || 'bg-gray-100 text-gray-800'}`}>
                {contract.contractType.replace('_', ' ')}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[contract.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                {contract.status}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Vendor
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div>{contract.vendor.nameEn}</div>
                <div className="text-gray-500">{contract.vendor.vendorCode}</div>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Purchase Requisition
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{contract.pr.prNumber}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Contract Period
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Total Value
              </dt>
              <dd className="mt-1 text-lg font-bold text-gray-900">
                {formatCurrency(contract.totalValue)} {contract.currency}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Payment Terms
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{contract.paymentTerms}</dd>
            </div>

            {contract.performanceBond && contract.performanceBond > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Performance Bond
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatCurrency(contract.performanceBond)} {contract.currency}
                </dd>
              </div>
            )}

            {contract.retentionAmount && contract.retentionAmount > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  Retention Amount
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatCurrency(contract.retentionAmount)} {contract.currency}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Service Requirements */}
        {contract.pr.servicePR && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Service Requirements</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Service Scope</dt>
                <dd className="mt-1 text-sm text-gray-900">{contract.pr.servicePR.serviceScope}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.pr.servicePR.duration} {contract.pr.servicePR.durationUnit}
                </dd>
              </div>
            </div>

            {contract.pr.servicePR.technicalSpecifications && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500">Technical Specifications</dt>
                <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {contract.pr.servicePR.technicalSpecifications}
                </dd>
              </div>
            )}
          </div>
        )}

        {/* Service Items */}
        {contract.pr.servicePR?.items && contract.pr.servicePR.items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Service Items</h3>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contract.pr.servicePR.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.serviceItem.serviceCode}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.serviceItem.nameEn}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.serviceItem.serviceCategory.nameEn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity} {item.serviceItem.unitOfMeasure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(parseFloat(item.estimatedRate))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.duration} {item.durationUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contract Terms */}
        {(contract.slaTerms || contract.penaltyClause || contract.insuranceRequirements) && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Terms</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {contract.slaTerms && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">SLA Terms</h4>
                  <p className="text-sm text-blue-800">{contract.slaTerms}</p>
                </div>
              )}
              
              {contract.penaltyClause && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-red-900 mb-2">Penalty Clause</h4>
                  <p className="text-sm text-red-800">{contract.penaltyClause}</p>
                </div>
              )}

              {contract.insuranceRequirements && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Insurance Requirements</h4>
                  <p className="text-sm text-green-800">{contract.insuranceRequirements}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Business Justification */}
        {contract.pr.justification && (
          <div className="px-6 py-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-500 mb-2">Business Justification</dt>
            <dd className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
              {contract.pr.justification}
            </dd>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {contract.status === 'DRAFT' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
          <div className="flex space-x-3">
            <button 
              onClick={handleActivateContract}
              disabled={activating}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate Contract
                </>
              )}
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <Edit className="h-4 w-4 mr-2" />
              Edit Contract
            </button>
          </div>
        </div>
      )}

      {/* Next Steps */}
      {contract.status === 'ACTIVE' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push(`/procurement/services/milestones/new?contractId=${contract.id}`)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Clock className="h-4 w-4 mr-2" />
              Create Milestones
            </button>
            <button
              onClick={() => router.push(`/procurement/services/receipts/new?contractId=${contract.id}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 