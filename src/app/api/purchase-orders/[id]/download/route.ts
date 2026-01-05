import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import puppeteer from 'puppeteer';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/purchase-orders/[id]/download - Download PO as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser;
  try {
    const { id } = await params;
    
    // Fetch the purchase order with all related data
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        pr: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Format delivery address
    const formatDeliveryAddress = (address: any): string => {
      if (!address) return 'Not specified';
      if (typeof address === 'string') return address;
      return [
        address.building,
        address.street,
        address.city,
        address.governorate,
        address.postalCode,
        address.country
      ].filter(Boolean).join(', ') || 'Not specified';
    };

    const formatCurrency = (amount: number, currency: string = 'OMR') => {
      return new Intl.NumberFormat('en-OM', {
        style: 'currency',
        currency: currency
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-OM', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
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
            .po-info {
              display: flex;
              flex-direction: row;
              gap: 30px;
              margin-bottom: 30px;
            }
            .info-section {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
              flex: 1;
            }
            .info-title {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 10px;
              color: #f97316;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .info-label {
              color: #6b7280;
              font-weight: 500;
            }
            .info-value {
              color: #111827;
              font-weight: 600;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
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
            .total-row {
              background: #fef3c7 !important;
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
              <div class="document-title">PURCHASE ORDER</div>
              <div class="document-meta">
                <div><strong>PO Number:</strong> ${order.poNumber}</div>
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-OM', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
          </div>

          <div class="po-info">
            <div class="info-section">
              <div class="info-title">Purchase Order Details</div>
              <div class="info-item">
                <span class="info-label">PO Number:</span>
                <span class="info-value">${order.poNumber}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Order Date:</span>
                <span class="info-value">${formatDate(order.orderDate.toISOString())}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Delivery Date:</span>
                <span class="info-value">${order.deliveryDate ? formatDate(order.deliveryDate.toISOString()) : 'Not specified'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">${order.status}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Payment Terms:</span>
                <span class="info-value">${order.paymentTerms || 'Standard'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Currency:</span>
                <span class="info-value">${order.currency}</span>
              </div>
              ${order.pr ? `
              <div class="info-item">
                <span class="info-label">PR Number:</span>
                <span class="info-value">${order.pr.prNumber || 'N/A'}</span>
              </div>
              ${order.pr.departmentId ? `
              <div class="info-item">
                <span class="info-label">Department:</span>
                <span class="info-value">${order.pr.departmentId}</span>
              </div>
              ` : ''}
              ` : ''}
            </div>

            <div class="info-section">
              <div class="info-title">Vendor Information</div>
              <div class="info-item">
                <span class="info-label">Vendor Name:</span>
                <span class="info-value">${order.vendor.nameEn}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">${order.vendor.email}</span>
              </div>
              ${order.vendor.mobile ? `
              <div class="info-item">
                <span class="info-label">Phone:</span>
                <span class="info-value">${order.vendor.mobile}</span>
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Delivery Address:</span>
                <span class="info-value">${formatDeliveryAddress(order.deliveryAddress)}</span>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #f97316;">Order Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Price</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.item.itemCode || 'N/A'}</td>
                    <td>${item.item.nameEn || 'N/A'}</td>
                    <td>${item.quantity}${item.item.unitOfMeasure ? ' ' + item.item.unitOfMeasure : ''}</td>
                    <td>${formatCurrency(Number(item.unitPrice), order.currency)}</td>
                    <td>${formatCurrency(Number(item.totalPrice), order.currency)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="4" style="text-align: right; padding-right: 20px;">Total Amount:</td>
                  <td style="font-size: 14px;">${formatCurrency(Number(order.totalAmount), order.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>This is a computer-generated document. No signature is required.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
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
        'Content-Disposition': `attachment; filename="Purchase_Order_${order.poNumber}.pdf"`,
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating purchase order PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
