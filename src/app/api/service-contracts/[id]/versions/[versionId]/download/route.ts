import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import puppeteer from 'puppeteer';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/service-contracts/[id]/versions/[versionId]/download - Download Contract Version as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  let browser;
  try {
    const { id, versionId } = await params;
    
    // Fetch the contract version with vendor data
    const version = await prisma.serviceContractVersion.findUnique({
      where: { id: versionId },
      include: {
        contract: {
          include: {
            vendor: true,
            pr: {
              include: {
                servicePR: {
                  include: {
                    items: {
                      include: {
                        serviceItem: {
                          include: {
                            serviceCategory: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!version || version.contractId !== id) {
      return NextResponse.json(
        { error: 'Contract version not found' },
        { status: 404 }
      );
    }

    const formatCurrency = (amount: number | string, currency: string = 'OMR') => {
      return new Intl.NumberFormat('en-OM', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 3
      }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
    };

    const formatDate = (dateString: string | Date) => {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('en-OM', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatJsonField = (value: string | object | null | undefined): string => {
      if (!value) return '';
      
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return formatJsonField(parsed);
        } catch {
          return value;
        }
      }
      
      if (Array.isArray(value)) {
        if (value.length === 0) return '';
        return value.map((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const entries = Object.entries(item).map(([key, val]) => {
              const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
              return `${formattedKey}: ${val}`;
            }).join(', ');
            return `${index + 1}. ${entries}`;
          }
          return `${index + 1}. ${item}`;
        }).join('\n');
      }
      
      if (typeof value === 'object' && value !== null) {
        return Object.entries(value).map(([key, val]) => {
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
          
          if (val === null || val === undefined) {
            return `${formattedKey}: N/A`;
          } else if (typeof val === 'object') {
            const nested = formatJsonField(val);
            return `${formattedKey}:\n${nested.split('\n').map(line => `  ${line}`).join('\n')}`;
          } else if (typeof val === 'boolean') {
            return `${formattedKey}: ${val ? 'Yes' : 'No'}`;
          } else {
            return `${formattedKey}: ${val}`;
          }
        }).join('\n');
      }
      
      return String(value);
    };

    // Read and convert logo to base64
    let logoBase64 = '';
    try {
      const logoPath = join(process.cwd(), 'public', 'Wujha-logo.webp');
      const logoBuffer = await readFile(logoPath);
      logoBase64 = logoBuffer.toString('base64');
    } catch (error) {
      console.warn('Could not load logo file:', error);
    }

    // Generate HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', 'Helvetica Neue', Tahoma, Geneva, Verdana, sans-serif;
              padding: 30px 40px;
              color: #1f2937;
              background: white;
              font-size: 12px;
              line-height: 1.6;
            }
            @page {
              margin: 20mm;
            }
            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              margin-bottom: 40px;
              border-bottom: 3px solid #f97316;
              padding-bottom: 25px;
              page-break-inside: avoid;
            }
            .header-left {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
            }
            .logo-container {
              margin-bottom: 10px;
            }
            .logo {
              max-width: 180px;
              max-height: 70px;
              height: auto;
              object-fit: contain;
            }
            .header-right {
              text-align: right;
              flex: 1;
            }
            .company-name {
              font-size: 22px;
              font-weight: 700;
              color: #f97316;
              margin-bottom: 4px;
              letter-spacing: 0.5px;
            }
            .document-title {
              font-size: 20px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .version-badge {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 8px;
            }
            .document-meta {
              font-size: 11px;
              color: #6b7280;
              margin-top: 4px;
            }
            .version-info {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 15px;
              margin-bottom: 25px;
              border-radius: 4px;
              page-break-inside: avoid;
            }
            .version-info h3 {
              color: #1e40af;
              font-size: 14px;
              margin-bottom: 8px;
            }
            .version-info p {
              color: #1e40af;
              font-size: 12px;
              margin: 4px 0;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section-title {
              background: #fef3c7;
              padding: 12px 15px;
              font-size: 16px;
              font-weight: 700;
              color: #f97316;
              border-left: 4px solid #f97316;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-grid {
              display: flex;
              flex-direction: row;
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-column {
              flex: 1;
            }
            .info-item {
              padding: 12px;
              background: #f9fafb;
              border-radius: 6px;
              margin-bottom: 12px;
            }
            .info-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
              margin-bottom: 5px;
              letter-spacing: 0.5px;
            }
            .info-value {
              font-size: 13px;
              color: #111827;
              font-weight: 600;
            }
            .info-value.large {
              font-size: 18px;
              color: #f97316;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th {
              background: #f97316;
              color: white;
              padding: 12px;
              text-align: left;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 12px;
            }
            tr:nth-child(even) {
              background: #f9fafb;
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
            .status-draft { background: #fef3c7; color: #92400e; }
            .status-completed { background: #dbeafe; color: #1e40af; }
            .status-terminated { background: #fee2e2; color: #991b1b; }
            .status-suspended { background: #fef3c7; color: #92400e; }
            .status-pending_approval { background: #fef3c7; color: #92400e; }
            .status-signed { background: #d1fae5; color: #065f46; }
            .terms-box {
              background: #fef3c7;
              border-left: 4px solid #f97316;
              padding: 15px;
              margin-top: 15px;
              border-radius: 4px;
            }
            .terms-box h4 {
              color: #f97316;
              font-size: 13px;
              font-weight: 700;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .terms-box p {
              color: #92400e;
              font-size: 12px;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 10px;
              color: #6b7280;
              page-break-inside: avoid;
            }
            .footer p {
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              ${logoBase64 ? `<div class="logo-container"><img src="data:image/webp;base64,${logoBase64}" alt="Wujha Logo" class="logo" /></div>` : ''}
            </div>
            <div class="header-right">
              <div class="company-name">WUJHA PROCUREMENT</div>
              <div class="document-title">SERVICE CONTRACT</div>
              <div class="version-badge">Version ${version.versionNumber}</div>
              <div class="document-meta">
                <div><strong>Contract Number:</strong> ${version.contractNumber}</div>
                <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-OM', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div><strong>Status:</strong> <span class="status-badge status-${version.status.toLowerCase()}">${version.status}</span></div>
              </div>
            </div>
          </div>

          ${version.changeReason || version.changeDescription ? `
          <div class="version-info">
            <h3>📝 Version ${version.versionNumber} Information</h3>
            ${version.changeReason ? `<p><strong>Change Reason:</strong> ${version.changeReason}</p>` : ''}
            ${version.changeDescription ? `<p><strong>Change Description:</strong> ${version.changeDescription}</p>` : ''}
            <p><strong>Created By:</strong> ${version.createdByName || 'N/A'}</p>
            <p><strong>Created On:</strong> ${formatDate(version.createdAt)}</p>
            ${version.approvalStatus ? `<p><strong>Approval Status:</strong> ${version.approvalStatus}</p>` : ''}
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Contract Information</div>
            <div class="info-grid">
              <div class="info-column">
                <div class="info-item">
                  <div class="info-label">Contract Number</div>
                  <div class="info-value">${version.contractNumber}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Purchase Requisition</div>
                  <div class="info-value">${version.contract.pr?.prNumber || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Vendor</div>
                  <div class="info-value">${version.contract.vendor.nameEn}</div>
                  <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">${version.contract.vendor.vendorCode}</div>
                </div>
              </div>
              <div class="info-column">
                <div class="info-item">
                  <div class="info-label">Contract Period</div>
                  <div class="info-value">${formatDate(version.startDate)} - ${formatDate(version.endDate)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Payment Terms</div>
                  <div class="info-value">${version.paymentTerms}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Total Contract Value</div>
                  <div class="info-value large">${formatCurrency(version.totalValue.toString(), version.currency)}</div>
                </div>
              </div>
            </div>
          </div>

          ${version.contract.pr?.servicePR ? `
          <div class="section">
            <div class="section-title">Service Requirements</div>
            <div class="info-grid">
              <div class="info-column">
                <div class="info-item">
                  <div class="info-label">Service Scope</div>
                  <div class="info-value">${version.contract.pr.servicePR.serviceScope || 'N/A'}</div>
                </div>
              </div>
              <div class="info-column">
                <div class="info-item">
                  <div class="info-label">Duration</div>
                  <div class="info-value">${version.contract.pr.servicePR.duration || 0} ${version.contract.pr.servicePR.durationUnit || 'DAYS'}</div>
                </div>
              </div>
            </div>
            ${version.contract.pr.servicePR.technicalSpecifications ? `
              <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 6px;">
                <div class="info-label">Technical Specifications</div>
                <div class="info-value" style="margin-top: 8px;">${version.contract.pr.servicePR.technicalSpecifications}</div>
              </div>
            ` : ''}
          </div>
          ` : ''}

          ${version.contract.pr?.servicePR?.items && version.contract.pr.servicePR.items.length > 0 ? `
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
                ${version.contract.pr.servicePR.items.map((item: any) => `
                  <tr>
                    <td>${item.serviceItem?.serviceCode || 'N/A'}</td>
                    <td>${item.serviceItem?.nameEn || 'N/A'}</td>
                    <td>${item.serviceItem?.serviceCategory?.nameEn || 'N/A'}</td>
                    <td>${item.quantity || 0} ${item.serviceItem?.unitOfMeasure || 'units'}</td>
                    <td>${formatCurrency(Number(item.estimatedRate || 0), version.currency)}</td>
                    <td>${item.duration || 1} ${item.durationUnit || 'DAYS'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${version.performanceBond || version.retentionAmount ? `
          <div class="section">
            <div class="section-title">Financial Guarantees</div>
            <div class="info-grid">
              ${version.performanceBond ? `
                <div class="info-column">
                  <div class="info-item">
                    <div class="info-label">Performance Bond</div>
                    <div class="info-value">${formatCurrency(version.performanceBond.toString(), version.currency)}</div>
                  </div>
                </div>
              ` : ''}
              ${version.retentionAmount ? `
                <div class="info-column">
                  <div class="info-item">
                    <div class="info-label">Retention Amount</div>
                    <div class="info-value">${formatCurrency(version.retentionAmount.toString(), version.currency)}</div>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          ${version.slaTerms || version.penaltyClause || version.insuranceRequirements ? `
          <div class="section">
            <div class="section-title">Contract Terms & Conditions</div>
            ${version.slaTerms ? `
              <div class="terms-box">
                <h4>SLA Terms</h4>
                <p style="white-space: pre-line; margin: 0;">${formatJsonField(version.slaTerms)}</p>
              </div>
            ` : ''}
            ${version.penaltyClause ? `
              <div class="terms-box" style="background: #fee2e2; border-color: #ef4444;">
                <h4 style="color: #dc2626;">Penalty Clause</h4>
                <p style="color: #991b1b; margin: 0;">${version.penaltyClause}</p>
              </div>
            ` : ''}
            ${version.insuranceRequirements ? `
              <div class="terms-box">
                <h4>Insurance Requirements</h4>
                <p style="white-space: pre-line; margin: 0;">${formatJsonField(version.insuranceRequirements)}</p>
              </div>
            ` : ''}
          </div>
          ` : ''}

          ${version.contract.pr?.justification ? `
          <div class="section">
            <div class="section-title">Business Justification</div>
            <div style="padding: 15px; background: #f9fafb; border-radius: 6px;">
              <p style="font-size: 12px; color: #374151; white-space: pre-wrap;">${version.contract.pr.justification}</p>
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p><strong>WUJHA Procurement System</strong> | Version ${version.versionNumber} Document</p>
            <p>Generated on ${new Date().toLocaleString('en-OM', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </body>
      </html>
    `;

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      },
      printBackground: true
    });

    await browser.close();

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Service_Contract_${version.contractNumber}_v${version.versionNumber}.pdf"`,
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating contract version PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
