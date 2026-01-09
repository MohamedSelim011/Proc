import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import puppeteer from 'puppeteer';
import { readFile } from 'fs/promises';
import { join } from 'path';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 3
  }).format(amount);

const formatDate = (date: string | Date) => {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return parsed.toLocaleDateString('en-OM', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// GET /api/purchase-requisitions/[id]/download - Download Purchase Requisition as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser;
  try {
    const { id } = await params;

    const pr = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    if (!pr) {
      return NextResponse.json(
        { error: 'Purchase requisition not found' },
        { status: 404 }
      );
    }

    let logoBase64 = '';
    try {
      const logoPath = join(process.cwd(), 'public', 'Wujha-logo.webp');
      const logoBuffer = await readFile(logoPath);
      logoBase64 = logoBuffer.toString('base64');
    } catch (error) {
      console.warn('Could not load logo file:', error);
    }

    const itemsTotal = pr.items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.estimatedPrice) || 0;
      return sum + quantity * price;
    }, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              margin: 20mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', 'Helvetica Neue', Tahoma, Geneva, Verdana, sans-serif;
              padding: 24px 32px;
              color: #111827;
              background: #ffffff;
              font-size: 12px;
              line-height: 1.6;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 4px solid #f97316;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .logo {
              max-width: 170px;
              max-height: 64px;
              object-fit: contain;
            }
            .header-right {
              text-align: right;
            }
            .company-name {
              font-size: 22px;
              font-weight: 700;
              color: #f97316;
            }
            .document-title {
              font-size: 18px;
              font-weight: 700;
              margin-top: 4px;
            }
            .doc-meta {
              font-size: 11px;
              color: #6b7280;
              margin-top: 6px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 20px;
            }
            .info-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              background: #f9fafb;
            }
            .info-title {
              font-weight: 700;
              font-size: 12px;
              color: #f97316;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding-bottom: 6px;
              margin-bottom: 6px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 11px;
            }
            .info-row:last-child {
              border-bottom: none;
              margin-bottom: 0;
              padding-bottom: 0;
            }
            .info-label {
              color: #6b7280;
              font-weight: 600;
            }
            .info-value {
              color: #111827;
              font-weight: 600;
              text-align: right;
            }
            .status-badge {
              display: inline-block;
              padding: 3px 10px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              background: #e5e7eb;
              color: #374151;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
              font-size: 10px;
            }
            .items-table th {
              background: #f97316;
              color: #fff;
              padding: 10px 8px;
              text-align: left;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }
            .items-table td {
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            .items-table tr:nth-child(even) {
              background: #f9fafb;
            }
            .total-row {
              background: #fef3c7;
              font-weight: 700;
            }
            .section {
              margin-top: 18px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              color: #f97316;
              margin-bottom: 8px;
            }
            .section-content {
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px;
              background: #ffffff;
              font-size: 11px;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 28px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              font-size: 10px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${logoBase64 ? `<img class="logo" src="data:image/webp;base64,${logoBase64}" alt="Wujha Logo" />` : ''}
            </div>
            <div class="header-right">
              <div class="company-name">WUJHA PROCUREMENT</div>
              <div class="document-title">PURCHASE REQUISITION</div>
              <div class="doc-meta">
                <div><strong>PR Number:</strong> ${escapeHtml(pr.prNumber)}</div>
                <div><strong>Date:</strong> ${formatDate(new Date())}</div>
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <div class="info-title">Requisition Details</div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value"><span class="status-badge">${escapeHtml(pr.status)}</span></span>
              </div>
              <div class="info-row">
                <span class="info-label">Priority</span>
                <span class="info-value">${escapeHtml(pr.priority)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Request Date</span>
                <span class="info-value">${formatDate(pr.requestDate)}</span>
              </div>
              ${pr.requiredByDate ? `
              <div class="info-row">
                <span class="info-label">Required By</span>
                <span class="info-value">${formatDate(pr.requiredByDate)}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Item Type</span>
                <span class="info-value">${escapeHtml(pr.itemType)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Department</span>
                <span class="info-value">${escapeHtml(pr.departmentId || 'N/A')}</span>
              </div>
              ${pr.projectId ? `
              <div class="info-row">
                <span class="info-label">Project ID</span>
                <span class="info-value">${escapeHtml(pr.projectId)}</span>
              </div>
              ` : ''}
              ${pr.boqReference ? `
              <div class="info-row">
                <span class="info-label">BOQ Reference</span>
                <span class="info-value">${escapeHtml(pr.boqReference)}</span>
              </div>
              ` : ''}
            </div>

            <div class="info-card">
              <div class="info-title">Budget & Requestor</div>
              <div class="info-row">
                <span class="info-label">Budget Code</span>
                <span class="info-value">${escapeHtml(pr.budgetCode || 'N/A')}</span>
              </div>
              ${pr.costCenter ? `
              <div class="info-row">
                <span class="info-label">Cost Center</span>
                <span class="info-value">${escapeHtml(pr.costCenter)}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Requester ID</span>
                <span class="info-value">${escapeHtml(pr.requesterId || 'N/A')}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Created By</span>
                <span class="info-value">${escapeHtml(pr.createdBy || 'N/A')}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Estimated Cost</span>
                <span class="info-value" style="color: #f97316;">${formatCurrency(Number(pr.estimatedCost || 0))}</span>
              </div>
            </div>
          </div>

          ${pr.justification ? `
          <div class="section">
            <div class="section-title">Justification</div>
            <div class="section-content">${escapeHtml(pr.justification)}</div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Requested Items</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${pr.items.length > 0 ? pr.items.map((item) => `
                  <tr>
                    <td>${escapeHtml(item.item?.itemCode || 'N/A')}</td>
                    <td>${escapeHtml(item.item?.nameEn || 'N/A')}</td>
                    <td>${escapeHtml(item.item?.category?.nameEn || 'N/A')}</td>
                    <td>${item.quantity || 0} ${escapeHtml(item.item?.unitOfMeasure || '')}</td>
                    <td>${formatCurrency(Number(item.estimatedPrice || 0))}</td>
                    <td>${formatCurrency((Number(item.quantity) || 0) * (Number(item.estimatedPrice) || 0))}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 16px; color: #9ca3af;">No items found</td>
                  </tr>
                `}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="5" style="text-align: right; padding-right: 12px;">TOTAL ESTIMATED COST:</td>
                  <td>${formatCurrency(itemsTotal || Number(pr.estimatedCost || 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="footer">
            <p>This is a system-generated document and does not require signature.</p>
            <p>Generated on ${formatDate(new Date())} by Wujha Procurement System</p>
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
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      },
      printBackground: true
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Purchase_Requisition_${pr.prNumber}.pdf"`
      }
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating purchase requisition PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
