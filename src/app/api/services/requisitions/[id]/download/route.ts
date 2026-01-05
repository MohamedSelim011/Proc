import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import puppeteer from 'puppeteer';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/services/requisitions/[id]/download - Download Service Requisition as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser;
  try {
    const { id } = await params;
    
    // Fetch the service requisition with all related data
    const sr = await prisma.purchaseRequisition.findUnique({
      where: { id },
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
    });

    if (!sr) {
      return NextResponse.json(
        { error: 'Service requisition not found' },
        { status: 404 }
      );
    }

    // Check if it's a service requisition
    if (sr.itemType !== 'SERVICE' && sr.itemType !== 'NON_STOCK') {
      return NextResponse.json(
        { error: 'This is not a service requisition' },
        { status: 400 }
      );
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-OM', {
        style: 'currency',
        currency: 'OMR',
        minimumFractionDigits: 3
      }).format(amount);
    };

    const formatDate = (dateString: string | Date) => {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('en-OM', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatArray = (arr: any): string => {
      if (!arr) return 'N/A';
      if (Array.isArray(arr)) {
        return arr.filter(item => item && item.trim()).join(', ') || 'N/A';
      }
      return String(arr) || 'N/A';
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
            @media print {
              @page {
                size: A4 landscape;
                margin: 15mm;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', 'Helvetica Neue', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
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
              border-bottom: 4px solid #f97316;
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
              font-size: 24px;
              font-weight: 700;
              color: #f97316;
              margin-bottom: 4px;
              letter-spacing: 0.5px;
            }
            .document-title {
              font-size: 22px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .document-meta {
              font-size: 11px;
              color: #6b7280;
              margin-top: 4px;
            }
            .pr-number {
              font-size: 16px;
              color: #6b7280;
              font-weight: 500;
            }
            .info-grid {
              display: flex;
              flex-direction: row;
              gap: 20px;
              margin-bottom: 25px;
            }
            .info-section {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #f97316;
              flex: 1;
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
            .status-APPROVED { background: #d1fae5; color: #065f46; }
            .status-SUBMITTED, .status-PENDING_APPROVAL { background: #fef3c7; color: #92400e; }
            .status-DRAFT { background: #f3f4f6; color: #374151; }
            .status-REJECTED { background: #fee2e2; color: #991b1b; }
            .priority-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .priority-URGENT { background: #fee2e2; color: #991b1b; }
            .priority-HIGH { background: #fef3c7; color: #92400e; }
            .priority-NORMAL { background: #fef3c7; color: #f97316; }
            .priority-LOW { background: #d1fae5; color: #065f46; }
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
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 10px;
              color: #6b7280;
              text-align: center;
              page-break-inside: avoid;
            }
            .footer p {
              margin: 4px 0;
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
          <div class="header">
            <div class="header-left">
              ${logoBase64 ? `<div class="logo-container"><img src="data:image/webp;base64,${logoBase64}" alt="Wujha Logo" class="logo" /></div>` : ''}
            </div>
            <div class="header-right">
              <div class="company-name">WUJHA PROCUREMENT</div>
              <div class="document-title">SERVICE REQUISITION</div>
              <div class="document-meta">
                <div><strong>PR Number:</strong> ${sr.prNumber}</div>
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-OM', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
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
                <span class="info-value"><span class="priority-badge priority-${sr.priority || 'NORMAL'}">${sr.priority || 'NORMAL'}</span></span>
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
                <span class="info-value" style="color: #f97316; font-size: 13px;">${formatCurrency(Number(sr.estimatedCost || 0))}</span>
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

          ${sr.servicePR?.deliverables ? `
          <div class="section">
            <div class="section-title">Deliverables</div>
            <div class="section-content">
              <ul class="deliverables-list">
                ${(() => {
                  let deliverables = sr.servicePR.deliverables;
                  // If it's a string, try to parse as JSON
                  if (typeof deliverables === 'string') {
                    try {
                      deliverables = JSON.parse(deliverables);
                    } catch {
                      // If parsing fails, treat as single string
                      return `<li>${deliverables}</li>`;
                    }
                  }
                  // If it's an array, format as list
                  if (Array.isArray(deliverables)) {
                    return deliverables.filter((d: any) => d && String(d).trim()).map((deliverable: any) => {
                      const text = typeof deliverable === 'object' ? JSON.stringify(deliverable) : String(deliverable);
                      return `<li>${text.trim()}</li>`;
                    }).join('');
                  }
                  // If it's an object, format as key-value pairs
                  if (typeof deliverables === 'object' && deliverables !== null) {
                    return Object.entries(deliverables).map(([key, val]) => {
                      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                      return `<li><strong>${formattedKey}:</strong> ${val}</li>`;
                    }).join('');
                  }
                  return `<li>${deliverables}</li>`;
                })()}
              </ul>
            </div>
          </div>
          ` : ''}

          ${sr.servicePR?.performanceMetrics ? `
          <div class="section">
            <div class="section-title">Performance Metrics</div>
            <div class="section-content">
              <ul class="metrics-list">
                ${(() => {
                  let metrics = sr.servicePR.performanceMetrics;
                  // If it's a string, try to parse as JSON
                  if (typeof metrics === 'string') {
                    try {
                      metrics = JSON.parse(metrics);
                    } catch {
                      // If parsing fails, treat as single string
                      return `<li>${metrics}</li>`;
                    }
                  }
                  // If it's an array, format as list
                  if (Array.isArray(metrics)) {
                    return metrics.filter((m: any) => m && String(m).trim()).map((metric: any) => {
                      const text = typeof metric === 'object' ? JSON.stringify(metric) : String(metric);
                      return `<li>${text.trim()}</li>`;
                    }).join('');
                  }
                  // If it's an object, format as key-value pairs
                  if (typeof metrics === 'object' && metrics !== null) {
                    return Object.entries(metrics).map(([key, val]) => {
                      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                      return `<li><strong>${formattedKey}:</strong> ${val}</li>`;
                    }).join('');
                  }
                  return `<li>${metrics}</li>`;
                })()}
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
                    <td>${formatCurrency(Number(item.estimatedRate || 0))}</td>
                    <td>${item.duration || 1} ${item.durationUnit || 'DAYS'}</td>
                    <td style="text-align: right; font-weight: 600;">${formatCurrency((Number(item.quantity || 0) * Number(item.estimatedRate || 0) * (item.duration || 1)))}</td>
                  </tr>
                `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #9ca3af;">No service items found</td></tr>'}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="5" style="text-align: right; padding-right: 15px;"><strong>TOTAL ESTIMATED COST:</strong></td>
                  <td style="text-align: right; font-size: 12px; color: #f97316;"><strong>${formatCurrency(Number(sr.estimatedCost || 0))}</strong></td>
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

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF in landscape orientation
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
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
        'Content-Disposition': `attachment; filename="Service_Requisition_${sr.prNumber}.pdf"`,
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating service requisition PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

