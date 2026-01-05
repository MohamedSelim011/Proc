import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import puppeteer from 'puppeteer';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/goods-receipts/[id]/download - Download Goods Receipt as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser;
  try {
    const { id } = await params;
    
    // Fetch the goods receipt with all related data
    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        po: {
          include: {
            vendor: true
          }
        },
        items: {
          include: {
            item: true
          }
        }
      }
    });

    if (!receipt) {
      return NextResponse.json(
        { error: 'Goods receipt not found' },
        { status: 404 }
      );
    }

    const formatDate = (dateString: string | Date) => {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('en-OM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const formatDateTime = (dateString: string | Date) => {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleString('en-OM', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
              font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
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
            .document-meta {
              font-size: 11px;
              color: #6b7280;
              margin-top: 4px;
            }
            .info-section {
              margin-bottom: 25px;
            }
            .info-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              background: #f5f5f5;
              padding: 8px;
              color: #f97316;
            }
            .info-grid {
              display: flex;
              flex-direction: row;
              gap: 30px;
              margin-bottom: 15px;
            }
            .info-column {
              flex: 1;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px dotted #ccc;
              font-size: 12px;
            }
            .info-label {
              font-weight: bold;
              width: 40%;
              color: #6b7280;
            }
            .info-value {
              width: 60%;
              text-align: right;
              color: #111827;
              font-weight: 600;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .items-table th {
              background: #f97316;
              color: white;
              padding: 10px;
              text-align: left;
              font-size: 11px;
              font-weight: bold;
            }
            .items-table td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 11px;
            }
            .items-table tr:nth-child(even) {
              background: #f9fafb;
            }
            .status-completed {
              color: #10b981;
              font-weight: bold;
            }
            .status-partial {
              color: #f59e0b;
              font-weight: bold;
            }
            .status-pending {
              color: #3b82f6;
              font-weight: bold;
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
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              ${logoBase64 ? `<div class="logo-container"><img src="data:image/webp;base64,${logoBase64}" alt="Wujha Logo" class="logo" /></div>` : ''}
            </div>
            <div class="header-right">
              <div class="company-name">WUJHA PROCUREMENT</div>
              <div class="document-title">Goods Receipt Note</div>
              <div class="document-meta">
                <div><strong>GR Number:</strong> ${receipt.grNumber}</div>
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-OM', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
          </div>

          <div class="info-section">
            <div class="info-title">Receipt Information</div>
            <div class="info-grid">
              <div class="info-column">
                <div class="info-item">
                  <span class="info-label">GR Number:</span>
                  <span class="info-value">${receipt.grNumber}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Status:</span>
                  <span class="info-value status-${receipt.status.toLowerCase()}">${receipt.status}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Received Date:</span>
                  <span class="info-value">${formatDate(receipt.receivedDate)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Received By:</span>
                  <span class="info-value">${receipt.receivedBy}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Storage Location:</span>
                  <span class="info-value">${receipt.storageLocation || 'Not specified'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Delivery Note:</span>
                  <span class="info-value">${receipt.deliveryNote || 'Not specified'}</span>
                </div>
              </div>
              <div class="info-column">
                <div class="info-item">
                  <span class="info-label">PO Number:</span>
                  <span class="info-value">${receipt.po?.poNumber || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Vendor:</span>
                  <span class="info-value">${receipt.po?.vendor?.nameEn || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Quality Check:</span>
                  <span class="info-value">${receipt.qualityChecked ? 'Checked' : 'Pending'}</span>
                </div>
                ${receipt.qualityInspector ? `
                <div class="info-item">
                  <span class="info-label">Quality Inspector:</span>
                  <span class="info-value">${receipt.qualityInspector}</span>
                </div>
                ` : ''}
                <div class="info-item">
                  <span class="info-label">Transport Details:</span>
                  <span class="info-value">${receipt.transportDetails || 'Not specified'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Special Handling:</span>
                  <span class="info-value">${receipt.specialHandling || 'None'}</span>
                </div>
              </div>
            </div>
            ${receipt.qualityComments ? `
            <div style="margin-top: 15px;">
              <div class="info-label">Quality Comments:</div>
              <div style="padding: 10px; background: #f9f9f9; border: 1px solid #ddd; margin-top: 5px; font-size: 11px;">
                ${receipt.qualityComments}
              </div>
            </div>
            ` : ''}
          </div>

          <div class="info-section">
            <div class="info-title">Received Items</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Ordered</th>
                  <th>Received</th>
                  <th>Accepted</th>
                  <th>Rejected</th>
                  <th>Unit</th>
                  <th>Rejection Reason</th>
                </tr>
              </thead>
              <tbody>
                ${receipt.items.map(item => `
                  <tr>
                    <td>${item.item.itemCode}</td>
                    <td>${item.item.nameEn}</td>
                    <td>${item.orderedQuantity}</td>
                    <td>${item.receivedQuantity}</td>
                    <td>${item.acceptedQuantity}</td>
                    <td>${item.rejectedQuantity}</td>
                    <td>${item.item.unitOfMeasure || 'N/A'}</td>
                    <td>${item.rejectionReason || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="info-section">
            <div class="info-title">Summary</div>
            <div class="info-grid">
              <div class="info-column">
                <div class="info-item">
                  <span class="info-label">Total Items:</span>
                  <span class="info-value">${receipt.items.length}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Received:</span>
                  <span class="info-value">${receipt.items.reduce((sum, item) => sum + item.receivedQuantity, 0)}</span>
                </div>
              </div>
              <div class="info-column">
                <div class="info-item">
                  <span class="info-label">Total Accepted:</span>
                  <span class="info-value">${receipt.items.reduce((sum, item) => sum + item.acceptedQuantity, 0)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Rejected:</span>
                  <span class="info-value">${receipt.items.reduce((sum, item) => sum + item.rejectedQuantity, 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This document was generated electronically and is valid without signature.</p>
            <p>Generated on ${formatDateTime(new Date().toISOString())} by Wujha Procurement System</p>
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
        'Content-Disposition': `attachment; filename="Goods_Receipt_${receipt.grNumber}.pdf"`,
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating goods receipt PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

