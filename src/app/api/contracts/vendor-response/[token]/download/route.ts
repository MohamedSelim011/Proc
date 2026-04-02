import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { validateResponseToken } from '@/lib/vendor-response-service';

// GET /api/contracts/vendor-response/[token]/download - Download contract PDF for vendor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  let browser;
  try {
    const { token } = await params;

    const validation = await validateResponseToken(token);
    if (!validation.valid || !validation.response) {
      return NextResponse.json(
        { error: validation.reason || 'Invalid or expired token' },
        { status: 400 }
      );
    }

    const contract = validation.response.contract;

    const formatCurrency = (amount: number, currency: string = 'OMR') => {
      return new Intl.NumberFormat('en-OM', {
        style: 'currency',
        currency,
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

    const formatJsonField = (value: string | object | null | undefined): string => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) {
        if (value.length === 0) return '';
        return value.map((item, index) => `${index + 1}. ${String(item)}`).join('\n');
      }
      if (typeof value === 'object') {
        return Object.entries(value).map(([key, val]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          return `${formattedKey}: ${String(val)}`;
        }).join('\n');
      }
      return String(value);
    };

    let logoBase64 = '';
    try {
      const logoPath = join(process.cwd(), 'public', 'Wujha-logo.webp');
      const logoBuffer = await readFile(logoPath);
      logoBase64 = logoBuffer.toString('base64');
    } catch (error) {
      console.warn('Could not load logo file:', error);
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', 'Helvetica Neue', Tahoma, Geneva, Verdana, sans-serif;
              padding: 30px 40px;
              color: #1f2937;
              background: white;
              font-size: 12px;
              line-height: 1.6;
            }
            @page { margin: 20mm; }
            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              margin-bottom: 40px;
              border-bottom: 3px solid #f97316;
              padding-bottom: 25px;
            }
            .logo { max-width: 180px; max-height: 70px; height: auto; object-fit: contain; }
            .company-name { font-size: 22px; font-weight: 700; color: #f97316; margin-bottom: 4px; letter-spacing: 0.5px; }
            .document-title { font-size: 20px; font-weight: 700; color: #1f2937; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
            .document-meta { font-size: 11px; color: #6b7280; margin-top: 4px; }
            .section { margin-bottom: 30px; }
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
            .info-grid { display: flex; gap: 20px; margin-bottom: 20px; }
            .info-column { flex: 1; }
            .info-item { padding: 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 12px; }
            .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; letter-spacing: 0.5px; }
            .info-value { font-size: 13px; color: #111827; font-weight: 600; }
            .info-value.large { font-size: 18px; color: #f97316; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
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
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
            tr:nth-child(even) { background: #f9fafb; }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 10px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${logoBase64 ? `<img src="data:image/webp;base64,${logoBase64}" alt="Wujha Logo" class="logo" />` : ''}
            </div>
            <div style="text-align:right; flex:1;">
              <div class="company-name">WUJHA PROCUREMENT</div>
              <div class="document-title">SERVICE CONTRACT</div>
              <div class="document-meta">
                <div><strong>Contract Number:</strong> ${contract.contractNumber}</div>
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-OM', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div><strong>Status:</strong> ${contract.status}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Contract Information</div>
            <div class="info-grid">
              <div class="info-column">
                <div class="info-item">
                  <div class="info-label">Contract Number</div>
                  <div class="info-value">${contract.contractNumber}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Service Requisition</div>
                  <div class="info-value">${contract.servicePR?.prNumber || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Vendor</div>
                  <div class="info-value">${contract.vendor.nameEn || contract.vendor.nameAr || 'N/A'}</div>
                </div>
              </div>
              <div class="info-column">
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
                  <div class="info-value large">${formatCurrency(Number(contract.totalValue), contract.currency)}</div>
                </div>
              </div>
            </div>
          </div>

          ${contract.servicePR ? `
          <div class="section">
            <div class="section-title">Service Requirements</div>
            <div class="info-grid">
              <div class="info-column">
                <div class="info-item">
                  <div class="info-label">Service Scope</div>
                  <div class="info-value">${contract.servicePR.serviceScope || 'N/A'}</div>
                </div>
              </div>
              <div class="info-column">
                <div class="info-item">
                  <div class="info-label">Duration</div>
                  <div class="info-value">${contract.servicePR.duration || 0} ${contract.servicePR.durationUnit || 'DAYS'}</div>
                </div>
              </div>
            </div>
            ${contract.servicePR.technicalSpecifications ? `
              <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 6px;">
                <div class="info-label">Technical Specifications</div>
                <div class="info-value" style="margin-top: 8px;">${contract.servicePR.technicalSpecifications}</div>
              </div>
            ` : ''}
          </div>
          ` : ''}

          ${contract.servicePR?.items && contract.servicePR.items.length > 0 ? `
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
                ${contract.servicePR.items.map((item: any) => `
                  <tr>
                    <td>${item.serviceItem?.serviceCode || 'N/A'}</td>
                    <td>${item.serviceItem?.nameEn || 'N/A'}</td>
                    <td>${item.serviceItem?.serviceCategory?.nameEn || 'N/A'}</td>
                    <td>${item.quantity || 0} ${item.serviceItem?.unitOfMeasure || 'units'}</td>
                    <td>${formatCurrency(Number(item.estimatedRate || 0), contract.currency)}</td>
                    <td>${item.duration || 1} ${item.durationUnit || 'DAYS'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${contract.servicePR?.materialItems && contract.servicePR.materialItems.length > 0 ? `
          <div class="section">
            <div class="section-title">Material Items (Mixed Requisition)</div>
            <table>
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                ${contract.servicePR.materialItems.map((item: any) => `
                  <tr>
                    <td>${item.item?.itemCode || 'N/A'}</td>
                    <td>${item.item?.nameEn || 'N/A'}</td>
                    <td>${item.item?.category?.nameEn || 'N/A'}</td>
                    <td>${item.quantity || 0} ${item.item?.unitOfMeasure || 'Unit'}</td>
                    <td>${formatCurrency(Number(item.estimatedPrice || 0), contract.currency)}</td>
                    <td>${formatCurrency(Number(item.quantity || 0) * Number(item.estimatedPrice || 0), contract.currency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${contract.slaTerms || contract.penaltyClause || contract.insuranceRequirements ? `
          <div class="section">
            <div class="section-title">Contract Terms & Conditions</div>
            ${contract.slaTerms ? `
              <div style="margin-top: 15px; padding: 15px; background: #fef3c7; border-left: 4px solid #f97316; border-radius: 4px;">
                <div class="info-label">SLA Terms</div>
                <div class="info-value" style="white-space: pre-line;">${formatJsonField(contract.slaTerms)}</div>
              </div>
            ` : ''}
            ${contract.penaltyClause ? `
              <div style="margin-top: 15px; padding: 15px; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
                <div class="info-label">Penalty Clause</div>
                <div class="info-value" style="white-space: pre-line;">${contract.penaltyClause}</div>
              </div>
            ` : ''}
            ${contract.insuranceRequirements ? `
              <div style="margin-top: 15px; padding: 15px; background: #fef3c7; border-left: 4px solid #f97316; border-radius: 4px;">
                <div class="info-label">Insurance Requirements</div>
                <div class="info-value" style="white-space: pre-line;">${formatJsonField(contract.insuranceRequirements)}</div>
              </div>
            ` : ''}
          </div>
          ` : ''}

          <div class="footer">
            <p><strong>WUJHA Procurement System</strong> | This is a system-generated document</p>
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

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printBackground: true
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=\"Service_Contract_${contract.contractNumber}.pdf\"`,
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating vendor contract PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
