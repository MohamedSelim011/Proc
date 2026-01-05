import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import puppeteer from 'puppeteer';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/invoices/[id]/download - Download Invoice as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser;
  try {
    const { id } = await params;
    
    // Fetch the invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        po: {
          include: {
            items: {
              include: {
                item: true
              }
            }
          }
        },
        items: {
          include: {
            item: true,
            poItem: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const formatCurrency = (amount: number, currency: string = 'OMR') => {
      return new Intl.NumberFormat('en-OM', {
        style: 'currency',
        currency: currency
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

    // Format vendor address
    const formatAddress = (address: any): string => {
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
            .invoice-info {
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
              font-weight: 700;
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
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .status-draft { background: #f3f4f6; color: #374151; }
            .status-submitted { background: #fef3c7; color: #92400e; }
            .status-approved { background: #dbeafe; color: #1e40af; }
            .status-paid { background: #d1fae5; color: #065f46; }
            .status-overdue { background: #fee2e2; color: #991b1b; }
            .status-rejected { background: #fee2e2; color: #991b1b; }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th {
              background: #f97316;
              color: white;
              padding: 12px;
              text-align: left;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 12px;
            }
            .items-table tr:nth-child(even) {
              background: #f9fafb;
            }
            .text-right {
              text-align: right;
            }
            .totals-section {
              margin-top: 30px;
              float: right;
              width: 350px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
              font-size: 12px;
            }
            .total-row.final {
              border-top: 2px solid #f97316;
              border-bottom: 2px solid #f97316;
              font-weight: 700;
              font-size: 14px;
              padding-top: 12px;
              padding-bottom: 12px;
              margin-top: 8px;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 10px;
              color: #6b7280;
              page-break-inside: avoid;
              clear: both;
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
              <div class="document-title">INVOICE</div>
              <div class="document-meta">
                <div><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</div>
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-OM', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
          </div>

          <div class="invoice-info">
            <div class="info-section">
              <div class="info-title">Invoice Details</div>
              <div class="info-item">
                <span class="info-label">Invoice Number:</span>
                <span class="info-value">${invoice.invoiceNumber}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Invoice Date:</span>
                <span class="info-value">${formatDate(invoice.invoiceDate)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Due Date:</span>
                <span class="info-value">${formatDate(invoice.dueDate)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">
                  <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Payment Status:</span>
                <span class="info-value">${invoice.paymentStatus}</span>
              </div>
              ${invoice.paymentTerms ? `
              <div class="info-item">
                <span class="info-label">Payment Terms:</span>
                <span class="info-value">${invoice.paymentTerms}</span>
              </div>
              ` : ''}
              ${invoice.po ? `
              <div class="info-item">
                <span class="info-label">PO Number:</span>
                <span class="info-value">${invoice.po.poNumber}</span>
              </div>
              ` : ''}
            </div>

            <div class="info-section">
              <div class="info-title">Vendor Information</div>
              <div class="info-item">
                <span class="info-label">Vendor:</span>
                <span class="info-value">${invoice.vendor.nameEn}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">${invoice.vendor.email}</span>
              </div>
              ${invoice.vendor.mobile ? `
              <div class="info-item">
                <span class="info-label">Phone:</span>
                <span class="info-value">${invoice.vendor.mobile}</span>
              </div>
              ` : ''}
              ${invoice.vendor.address ? `
              <div class="info-item">
                <span class="info-label">Address:</span>
                <span class="info-value" style="text-align: right; max-width: 200px;">${formatAddress(invoice.vendor.address)}</span>
              </div>
              ` : ''}
              <div class="info-item">
                <span class="info-label">Currency:</span>
                <span class="info-value">${invoice.currency}</span>
              </div>
            </div>
          </div>

          ${invoice.description ? `
          <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #f97316;">Description</div>
            <p style="font-size: 12px; color: #374151;">${invoice.description}</p>
          </div>
          ` : ''}

          <div style="margin-bottom: 20px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 10px; color: #f97316;">Invoice Items</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map((item: any) => `
                  <tr>
                    <td>${item.item?.itemCode || 'N/A'}</td>
                    <td>${item.item?.nameEn || item.description || 'Service Item'}</td>
                    <td class="text-right">${item.quantity}${item.item?.unitOfMeasure ? ' ' + item.item.unitOfMeasure : ''}</td>
                    <td class="text-right">${formatCurrency(Number(item.unitPrice), invoice.currency)}</td>
                    <td class="text-right">${formatCurrency(Number(item.totalPrice), invoice.currency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(Number(invoice.totalAmount) - Number(invoice.taxAmount) + Number(invoice.discountAmount || 0), invoice.currency)}</span>
            </div>
            ${invoice.discountAmount && Number(invoice.discountAmount) > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatCurrency(Number(invoice.discountAmount), invoice.currency)}</span>
            </div>
            ` : ''}
            <div class="total-row">
              <span>Tax:</span>
              <span>${formatCurrency(Number(invoice.taxAmount), invoice.currency)}</span>
            </div>
            <div class="total-row final">
              <span>Total Amount:</span>
              <span style="color: #f97316;">${formatCurrency(Number(invoice.totalAmount), invoice.currency)}</span>
            </div>
          </div>

          <div class="footer">
            <p><strong>WUJHA Procurement System</strong> | This is a system-generated document</p>
            <p>Generated on ${new Date().toLocaleString('en-OM', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p>For any queries, please contact our accounts department.</p>
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
        'Content-Disposition': `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

