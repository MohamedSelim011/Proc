import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // false for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify transporter configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('[OK] Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('[ERROR] Email server verification failed:', error);
    return false;
  }
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Send email
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate email configuration
    if (!process.env.SMTP_FROM_EMAIL) {
      const errorMsg = 'SMTP_FROM_EMAIL is not configured';
      console.error('[ERROR]', errorMsg);
      return { success: false, error: errorMsg };
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      const errorMsg = 'SMTP credentials are not configured';
      console.error('[ERROR]', errorMsg);
      return { success: false, error: errorMsg };
    }

    // Validate recipient email
    if (!options.to || !options.to.includes('@')) {
      const errorMsg = `Invalid recipient email address: ${options.to}`;
      console.error('[ERROR]', errorMsg);
      return { success: false, error: errorMsg };
    }

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Wujha Procurement'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || '',
    });

    console.log('[MAIL] Email sent successfully:', info.messageId, 'to:', options.to);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[ERROR] Failed to send email to', options.to, ':', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// RFQ Invitation Email Template
export function generateRFQInvitationEmail(data: {
  vendorName: string;
  rfqNumber: string;
  title: string;
  description: string;
  closingDate: Date;
  items: Array<{ name: string; quantity: number; specifications?: string }>;
  termsAndConditions?: string;
  submissionLink: string;
}): { html: string; text: string } {
  const resolveColor = (value: string | undefined, fallback: string): string => {
    const raw = (value || '').trim();
    if (!raw) return fallback;

    if (/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(raw)) {
      return raw;
    }

    const rgbMatch = raw.match(/^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/);
    if (!rgbMatch) return fallback;

    const toChannel = (v: string) => Math.max(0, Math.min(255, Number(v)));
    return `rgb(${toChannel(rgbMatch[1])}, ${toChannel(rgbMatch[2])}, ${toChannel(rgbMatch[3])})`;
  };

  const primaryColor = resolveColor(process.env.THEME_PRIMARY_COLOR, '#FF5722');
  const secondaryColor = resolveColor(process.env.THEME_SECONDARY_COLOR, '#FA6335');
  const companyName = process.env.SMTP_FROM_NAME || 'Wujha Procurement System';
  const supportEmail = process.env.SMTP_FROM_EMAIL || 'procurement@wujha.local';

  const closingDateFormatted = new Date(data.closingDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsList = data.items
    .map(
      (item, index) =>
        `<tr>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; width: 36px;">${index + 1}</td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">
            ${item.name}
            ${item.specifications ? `<div style="margin-top: 4px; color: #475569; font-size: 13px; font-weight: 400;">${item.specifications}</div>` : ''}
          </td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: right; font-weight: 600; white-space: nowrap;">Qty ${item.quantity}</td>
        </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RFQ Invitation</title>
</head>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: Segoe UI, Tahoma, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" style="max-width: 680px; width: 100%; border-collapse: separate; border-spacing: 0;">
          <tr>
            <td style="background: linear-gradient(120deg, ${primaryColor} 0%, ${secondaryColor} 100%); border-radius: 16px 16px 0 0; padding: 28px 28px 24px 28px; color: #ffffff;">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.9;">Vendor Invitation</div>
              <h1 style="margin: 12px 0 8px 0; font-size: 30px; line-height: 1.15; font-weight: 700;">Request for Quotation</h1>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">${companyName}</p>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; padding: 28px;">
              <p style="margin: 0 0 14px 0; color: #334155; font-size: 15px;">Dear <strong>${data.vendorName}</strong>,</p>
              <p style="margin: 0 0 18px 0; color: #334155; font-size: 15px;">You are invited to submit your quotation for the RFQ below.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 18px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="margin-bottom: 8px; font-size: 14px; color: #334155;"><strong>RFQ Number:</strong> ${data.rfqNumber}</div>
                    <div style="margin-bottom: 8px; font-size: 14px; color: #334155;"><strong>Title:</strong> ${data.title}</div>
                    <div style="font-size: 14px; color: #334155;"><strong>Closing Date:</strong> <span style="font-weight: 700; color: ${primaryColor};">${closingDateFormatted}</span></div>
                  </td>
                </tr>
              </table>

              ${data.description ? `
              <div style="margin-bottom: 18px;">
                <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #0f172a;">Description</h3>
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${data.description}</p>
              </div>
              ` : ''}

              <div style="margin-bottom: 18px;">
                <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a;">Requested Items</h3>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 10px; border-collapse: separate; border-spacing: 0; overflow: hidden;">
                  ${itemsList}
                </table>
              </div>

              ${data.termsAndConditions ? `
              <div style="margin-bottom: 18px;">
                <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #0f172a;">Terms and Conditions</h3>
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${data.termsAndConditions}</p>
              </div>
              ` : ''}

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="display: inline-flex; width: 22px; height: 22px; border-radius: 999px; align-items: center; justify-content: center; background: ${primaryColor}; vertical-align: middle;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="display: block;">
                          <path d="M12 9v4m0 4h.01M4.93 19h14.14a2 2 0 0 0 1.73-3l-7.07-12a2 2 0 0 0-3.46 0l-7.07 12a2 2 0 0 0 1.73 3Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                      <span style="font-size: 14px; color: #7c2d12; line-height: 1.55;"><strong>Important:</strong> This submission link is unique to your company and expires on the RFQ closing date.</span>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${data.submissionLink}" style="display: inline-block; padding: 14px 34px; border-radius: 9px; text-decoration: none; font-size: 16px; font-weight: 700; color: #ffffff; background: ${primaryColor};">Open Vendor Submission Portal</a>
              </div>

              <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">Need assistance? Contact procurement support at <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>.</p>
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">If the button does not open, use this URL:</p>
                <p style="margin: 0; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; word-break: break-all;">${data.submissionLink}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 16px 16px; padding: 16px 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">(c) ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Request for Quotation

Dear ${data.vendorName},

You are invited to submit a proposal for the following RFQ:

RFQ Number: ${data.rfqNumber}
Title: ${data.title}
Closing Date: ${closingDateFormatted}

${data.description ? `Description:\n${data.description}\n\n` : ''}

Items Required:
${data.items.map((item, index) => `${index + 1}. ${item.name} - Quantity: ${item.quantity}${item.specifications ? `\n   Specifications: ${item.specifications}` : ''}`).join('\n')}

${data.termsAndConditions ? `\nTerms and Conditions:\n${data.termsAndConditions}\n\n` : ''}

Submission Link:
${data.submissionLink}

Important:
- This link is unique to your company.
- The link expires on the RFQ closing date.

For support, contact ${supportEmail}.

Best regards,
${companyName}
  `;

  return { html, text };
}

// Purchase Order Email Template - Text Version Update

// Send RFQ Invitation to Vendors
export async function sendRFQInvitationToVendors(data: {
  rfqId: string;
  rfqNumber: string;
  title: string;
  description: string;
  closingDate: Date;
  items: Array<{ name: string; quantity: number; specifications?: string }>;
  termsAndConditions?: string;
  vendors: Array<{ email: string; name: string; submissionToken: string }>;
  baseUrl: string;
}): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const vendor of data.vendors) {
    try {
      const submissionLink = `${data.baseUrl}/rfq/submit/${data.rfqId}/${vendor.submissionToken}`;
      
      const { html, text } = generateRFQInvitationEmail({
        vendorName: vendor.name,
        rfqNumber: data.rfqNumber,
        title: data.title,
        description: data.description,
        closingDate: data.closingDate,
        items: data.items,
        termsAndConditions: data.termsAndConditions,
        submissionLink,
      });

      const emailResult = await sendEmail({
        to: vendor.email,
        subject: `Request for Quotation: ${data.rfqNumber} - ${data.title}`,
        html,
        text,
      });

      if (emailResult.success) {
        success++;
      } else {
        failed++;
        errors.push(`Failed to send email to ${vendor.email}${emailResult.error ? ': ' + emailResult.error : ''}`);
      }
    } catch (error) {
      failed++;
      errors.push(`Error sending to ${vendor.email}: ${error}`);
      console.error(`Error sending RFQ invitation to ${vendor.email}:`, error);
    }
  }

  return { success, failed, errors };
}

// Service RFP Email Template
export function generateServiceRFPInvitationEmail(data: {
  vendorName: string;
  rfpNumber: string;
  title: string;
  description: string;
  closingDate: Date;
  scopeOfWork: string;
  evaluationCriteria: Array<{ name: string; weight: number }>;
  termsAndConditions?: string;
  submissionLink: string;
}): { html: string; text: string } {
  const closingDateFormatted = new Date(data.closingDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .section { background: white; padding: 20px; margin: 20px 0; border-radius: 6px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: linear-gradient(135deg, #F7931E 0%, #FF6B35 100%); }
          .deadline { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
          .criteria { margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f9fafb; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Request for Proposal Invitation</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.rfpNumber}</p>
          </div>
          
          <div class="content">
            <p>Dear ${data.vendorName},</p>
            
            <p>You are cordially invited to submit a proposal for the following service requirement:</p>
            
            <div class="section">
              <h2 style="color: #FF6B35; margin-top: 0;">${data.title}</h2>
              <p><strong>Description:</strong><br/>${data.description}</p>
            </div>

            <div class="section">
              <h3 style="color: #FF6B35;">Scope of Work</h3>
              <p style="white-space: pre-wrap;">${data.scopeOfWork}</p>
            </div>

            <div class="section">
              <h3 style="color: #FF6B35;">Evaluation Criteria</h3>
              <p>Your proposal will be evaluated based on the following criteria:</p>
              ${data.evaluationCriteria.map(criteria => `
                <div class="criteria">
                  <strong>${criteria.name}</strong> - ${criteria.weight}%
                </div>
              `).join('')}
            </div>

            ${data.termsAndConditions ? `
              <div class="section">
                <h3 style="color: #FF6B35;">Terms & Conditions</h3>
                <p style="white-space: pre-wrap;">${data.termsAndConditions}</p>
              </div>
            ` : ''}

            <div class="deadline">
              <strong>Submission Deadline:</strong><br/>
              ${closingDateFormatted}
            </div>

            <div style="text-align: center;">
              <a href="${data.submissionLink}" class="button">Submit Your Proposal</a>
            </div>

            <p style="margin-top: 30px;"><strong>Important Notes:</strong></p>
            <ul>
              <li>Please ensure your proposal addresses all requirements in the scope of work</li>
              <li>Include detailed pricing breakdown and timeline</li>
              <li>Provide relevant experience and references</li>
              <li>Submit all required documentation before the deadline</li>
              <li>Late submissions will not be accepted</li>
            </ul>

            <p>If you have any questions or need clarification, please contact our procurement team.</p>
            
            <p>We look forward to receiving your proposal.</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br/>
              <strong>WUJHA Procurement Team</strong>
            </p>
          </div>

          <div class="footer">
            <p>This is an automated message from the WUJHA Procurement System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
WUJHA Procurement System
Request for Proposal Invitation
${data.rfpNumber}

Dear ${data.vendorName},

You are cordially invited to submit a proposal for the following service requirement:

${data.title}

Description:
${data.description}

Scope of Work:
${data.scopeOfWork}

Evaluation Criteria:
${data.evaluationCriteria.map(criteria => `- ${criteria.name}: ${criteria.weight}%`).join('\n')}

${data.termsAndConditions ? `Terms & Conditions:\n${data.termsAndConditions}\n\n` : ''}

SUBMISSION DEADLINE: ${closingDateFormatted}

To submit your proposal, please visit:
${data.submissionLink}

Important Notes:
- Please ensure your proposal addresses all requirements in the scope of work
- Include detailed pricing breakdown and timeline
- Provide relevant experience and references
- Submit all required documentation before the deadline
- Late submissions will not be accepted

If you have any questions or need clarification, please contact our procurement team.

We look forward to receiving your proposal.

Best regards,
WUJHA Procurement Team

---
This is an automated message from the WUJHA Procurement System.
Please do not reply to this email.
  `;

  return { html, text };
}

// Send Service RFP Invitation to Vendors
export async function sendServiceRFPInvitationToVendors(data: {
  rfpId: string;
  rfpNumber: string;
  title: string;
  description: string;
  closingDate: Date;
  scopeOfWork: string;
  evaluationCriteria: Array<{ name: string; weight: number }>;
  termsAndConditions?: string;
  vendors: Array<{ email: string; name: string; submissionToken: string }>;
  baseUrl: string;
}): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const vendor of data.vendors) {
    try {
      const submissionLink = `${data.baseUrl}/rfp/submit/${data.rfpId}/${vendor.submissionToken}`;
      
      const { html, text } = generateServiceRFPInvitationEmail({
        vendorName: vendor.name,
        rfpNumber: data.rfpNumber,
        title: data.title,
        description: data.description,
        closingDate: data.closingDate,
        scopeOfWork: data.scopeOfWork,
        evaluationCriteria: data.evaluationCriteria,
        termsAndConditions: data.termsAndConditions,
        submissionLink,
      });

      const emailResult = await sendEmail({
        to: vendor.email,
        subject: `Service RFP Invitation: ${data.rfpNumber} - ${data.title}`,
        html,
        text,
      });

      if (emailResult.success) {
        success++;
      } else {
        failed++;
        const errorMsg = `Failed to send email to ${vendor.email} (${vendor.name})${emailResult.error ? ': ' + emailResult.error : ''}`;
        errors.push(errorMsg);
        console.error(`[ERROR] ${errorMsg}`);
      }
    } catch (error) {
      failed++;
      const errorMsg = `Error sending to ${vendor.email} (${vendor.name}): ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.error(`[ERROR] ${errorMsg}`, error);
    }
  }

  return { success, failed, errors };
}

// Purchase Order Email Template
export function generatePOEmail(data: {
  vendorName: string;
  vendorEmail: string;
  poNumber: string;
  orderDate: Date;
  deliveryDate: Date;
  totalAmount: number;
  currency: string;
  paymentTerms: string;
  deliveryAddress: string;
  items: Array<{
    itemCode: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deliveryDate?: Date;
  }>;
  prNumber?: string;
  notes?: string;
  acknowledgmentLink?: string; // Link for vendor to acknowledge the PO
}): { html: string; text: string } {
  const orderDateFormatted = new Date(data.orderDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const deliveryDateFormatted = new Date(data.deliveryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsList = data.items
    .map(
      (item, index) =>
        `<tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px; text-align: left;">${index + 1}</td>
          <td style="padding: 12px; text-align: left;">
            <strong>${item.itemCode}</strong><br/>
            <span style="color: #666; font-size: 14px;">${item.name}</span>
          </td>
          <td style="padding: 12px; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right;">${data.currency} ${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 12px; text-align: right;"><strong>${data.currency} ${item.totalPrice.toFixed(2)}</strong></td>
        </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #C7253E 0%, #821131 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Purchase Order</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Wujha Procurement System</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Dear <strong>${data.vendorName}</strong>,</p>
    
    <p style="font-size: 16px;">We are pleased to issue the following Purchase Order for your review and confirmation:</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C7253E;">
      <p style="margin: 5px 0;"><strong>PO Number:</strong> ${data.poNumber}</p>
      <p style="margin: 5px 0;"><strong>Order Date:</strong> ${orderDateFormatted}</p>
      <p style="margin: 5px 0;"><strong>Delivery Date:</strong> <span style="color: #C7253E; font-weight: bold;">${deliveryDateFormatted}</span></p>
      ${data.prNumber ? `<p style="margin: 5px 0;"><strong>PR Reference:</strong> ${data.prNumber}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Payment Terms:</strong> ${data.paymentTerms}</p>
      <p style="margin: 5px 0;"><strong>Total Amount:</strong> <span style="color: #C7253E; font-size: 18px; font-weight: bold;">${data.currency} ${data.totalAmount.toFixed(2)}</span></p>
    </div>
    
    <div style="margin: 20px 0;">
      <h3 style="color: #C7253E; margin-bottom: 15px;">Delivery Address</h3>
      <p style="margin: 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">${data.deliveryAddress}</p>
    </div>
    
    <div style="margin: 20px 0;">
      <h3 style="color: #C7253E; margin-bottom: 15px;">Items Ordered</h3>
      <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e0e0e0;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #C7253E;">#</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #C7253E;">Item</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #C7253E;">Quantity</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #C7253E;">Unit Price</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #C7253E;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
          <tr style="background: #f8f9fa; font-weight: bold;">
            <td colspan="4" style="padding: 12px; text-align: right; border-top: 2px solid #C7253E;">Grand Total:</td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #C7253E; color: #C7253E; font-size: 18px;">
              ${data.currency} ${data.totalAmount.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    ${data.notes ? `
    <div style="margin: 20px 0;">
      <h3 style="color: #C7253E; margin-bottom: 10px;">Additional Notes</h3>
      <p style="margin: 0; padding: 15px; background: #f8f9fa; border-radius: 6px; white-space: pre-wrap;">${data.notes}</p>
    </div>
    ` : ''}
    
    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Important:</strong> Please review this Purchase Order and confirm acceptance. If you have any questions or concerns, please contact us immediately.
      </p>
    </div>
    
    ${data.acknowledgmentLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.acknowledgmentLink}" 
         style="display: inline-block; background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(40, 167, 69, 0.3);">
        Acknowledge Purchase Order
      </a>
    </div>
    <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #28a745;">
      <p style="margin: 0; font-size: 14px; color: #155724;">
        <strong>Action Required:</strong> Please click the button above to acknowledge receipt and acceptance of this Purchase Order. This confirms that you have received and reviewed the order details.
      </p>
    </div>
    ` : ''}
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 14px; color: #666; margin: 5px 0;">
        If you have any questions, please contact us at <a href="mailto:${process.env.SMTP_FROM_EMAIL}" style="color: #C7253E;">${process.env.SMTP_FROM_EMAIL}</a>
      </p>
      <p style="font-size: 14px; color: #666; margin: 5px 0;">
        We look forward to your prompt confirmation and delivery.
      </p>
    </div>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #666;">
      (c) ${new Date().getFullYear()} Wujha Procurement System. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
Purchase Order

Dear ${data.vendorName},

We are pleased to issue the following Purchase Order for your review and confirmation:

PO Number: ${data.poNumber}
Order Date: ${orderDateFormatted}
Delivery Date: ${deliveryDateFormatted}
${data.prNumber ? `PR Reference: ${data.prNumber}\n` : ''}Payment Terms: ${data.paymentTerms}
Total Amount: ${data.currency} ${data.totalAmount.toFixed(2)}

Delivery Address:
${data.deliveryAddress}

Items Ordered:
${data.items.map((item, index) => `${index + 1}. ${item.itemCode} - ${item.name}\n   Quantity: ${item.quantity} | Unit Price: ${data.currency} ${item.unitPrice.toFixed(2)} | Total: ${data.currency} ${item.totalPrice.toFixed(2)}`).join('\n')}

Grand Total: ${data.currency} ${data.totalAmount.toFixed(2)}

${data.notes ? `\nAdditional Notes:\n${data.notes}\n` : ''}

${data.acknowledgmentLink ? `
ACTION REQUIRED: Please acknowledge this Purchase Order by clicking the link below:
${data.acknowledgmentLink}

This confirms that you have received and reviewed the order details.
` : ''}

Please review this Purchase Order and confirm acceptance. If you have any questions or concerns, please contact us immediately at ${process.env.SMTP_FROM_EMAIL}

We look forward to your prompt confirmation and delivery.

Best regards,
Wujha Procurement Team
  `;

  return { html, text };
}

// Send Purchase Order to Vendor
export async function sendPOToVendor(data: {
  poId: string;
  poNumber: string;
  vendorEmail: string;
  vendorName: string;
  orderDate: Date;
  deliveryDate: Date;
  totalAmount: number;
  currency: string;
  paymentTerms: string;
  deliveryAddress: string;
  items: Array<{
    itemCode: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    deliveryDate?: Date;
  }>;
  prNumber?: string;
  notes?: string;
  acknowledgmentLink?: string;
}): Promise<boolean> {
  try {
    const { html, text } = generatePOEmail({
      vendorName: data.vendorName,
      vendorEmail: data.vendorEmail,
      poNumber: data.poNumber,
      orderDate: data.orderDate,
      deliveryDate: data.deliveryDate,
      totalAmount: data.totalAmount,
      currency: data.currency,
      paymentTerms: data.paymentTerms,
      deliveryAddress: data.deliveryAddress,
      items: data.items,
      prNumber: data.prNumber,
      notes: data.notes,
      acknowledgmentLink: data.acknowledgmentLink,
    });

    const emailResult = await sendEmail({
      to: data.vendorEmail,
      subject: `Purchase Order ${data.poNumber} - Wujha Procurement`,
      html,
      text,
    });

    return emailResult.success;
  } catch (error) {
    console.error('Error sending PO email:', error);
    return false;
  }
}

// ============================================
// CONTRACT EMAIL TEMPLATES
// ============================================

// Contract Review Request Email Template (for Vendor)
export function generateContractReviewEmail(data: {
  vendorName: string;
  contractNumber: string;
  contractType: string;
  totalValue: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  paymentTerms: string;
  acceptLink: string;
  rejectLink: string;
  expiryDate: Date;
}): { html: string; text: string } {
  const startDateFormatted = new Date(data.startDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const endDateFormatted = new Date(data.endDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const expiryDateFormatted = new Date(data.expiryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Service Contract Review</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Wujha Procurement System</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Dear <strong>${data.vendorName}</strong>,</p>
    
    <p style="font-size: 16px;">We are pleased to share the following Service Contract for your review and acceptance:</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a8a;">
      <p style="margin: 5px 0;"><strong>Contract Number:</strong> ${data.contractNumber}</p>
      <p style="margin: 5px 0;"><strong>Contract Type:</strong> ${data.contractType}</p>
      <p style="margin: 5px 0;"><strong>Total Value:</strong> <span style="color: #1e3a8a; font-size: 18px; font-weight: bold;">${data.currency} ${data.totalValue.toLocaleString()}</span></p>
      <p style="margin: 5px 0;"><strong>Contract Period:</strong> ${startDateFormatted} to ${endDateFormatted}</p>
      <p style="margin: 5px 0;"><strong>Payment Terms:</strong> ${data.paymentTerms}</p>
    </div>
    
    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Response Required:</strong> Please review and respond by <strong>${expiryDateFormatted}</strong>
      </p>
    </div>
    
    <div style="margin: 30px 0;">
      <h3 style="color: #1e3a8a; margin-bottom: 15px;">Action Required</h3>
      <p style="margin: 0 0 20px 0;">Click the button below to review the contract and submit your response:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.acceptLink}" 
           style="display: inline-block; background: #1e3a8a; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);">
          Review Contract & Respond
        </a>
      </div>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: bold;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="margin: 0; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 13px; color: #1e3a8a; word-break: break-all;">
          ${data.acceptLink}
        </p>
      </div>
    </div>
    
    <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a8a;">
      <h4 style="margin: 0 0 10px 0; color: #1e3a8a;">Important Notes:</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li>The link will take you to a secure page where you can review all contract details</li>
        <li>You can choose to <strong>Accept</strong> the contract or <strong>Request Changes</strong></li>
        <li>If you request changes, you'll be able to provide detailed comments</li>
        <li>This link is unique and secure - do not share it with others</li>
        <li>After the expiry date, this link will no longer be valid</li>
      </ul>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 14px; color: #666; margin: 5px 0;">
        If you have any questions, please contact our procurement team at <a href="mailto:${process.env.SMTP_FROM_EMAIL}" style="color: #1e3a8a;">${process.env.SMTP_FROM_EMAIL}</a>
      </p>
    </div>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #666;">
      (c) ${new Date().getFullYear()} Wujha Procurement System. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
Service Contract Review Request

Dear ${data.vendorName},

We are pleased to share the following Service Contract for your review and acceptance:

Contract Number: ${data.contractNumber}
Contract Type: ${data.contractType}
Total Value: ${data.currency} ${data.totalValue.toLocaleString()}
Contract Period: ${startDateFormatted} to ${endDateFormatted}
Payment Terms: ${data.paymentTerms}

RESPONSE REQUIRED BY: ${expiryDateFormatted}

ACTION REQUIRED:
Click the link below to review the contract and submit your response:

Review Contract & Respond:
${data.acceptLink}

(Copy and paste the link above into your browser if it doesn't open automatically)

Important Notes:
- The link will take you to a secure page where you can review all contract details
- You can choose to Accept the contract or Request Changes
- If you request changes, you'll be able to provide detailed comments
- If you accept, the contract will proceed to the signing phase
- If you request changes, please provide detailed comments about your concerns
- This link is unique and secure - do not share it with others
- After the expiry date, this link will no longer be valid

If you have any questions, please contact our procurement team at ${process.env.SMTP_FROM_EMAIL}

Best regards,
Wujha Procurement Team
  `;

  return { html, text };
}

// Send Contract Review Request to Vendor
export async function sendContractReviewToVendor(data: {
  vendorEmail: string;
  vendorName: string;
  contractNumber: string;
  contractType: string;
  totalValue: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  paymentTerms: string;
  acceptLink: string;
  rejectLink: string;
  expiryDate: Date;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = generateContractReviewEmail(data);

    const emailResult = await sendEmail({
      to: data.vendorEmail,
      subject: `Contract Review Required: ${data.contractNumber} - ${data.contractType}`,
      html,
      text,
    });

    return emailResult;
  } catch (error) {
    console.error('Error sending contract review email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Contract Approved - Internal Notification
export function generateContractApprovedEmail(data: {
  contractNumber: string;
  approverName: string;
  approvalLevel: string;
  nextAction: string;
  contractUrl: string;
}): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Contract Approved</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Wujha Procurement System</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Good news!</p>
    
    <p style="font-size: 16px;">Contract <strong>${data.contractNumber}</strong> has been approved by <strong>${data.approverName}</strong> at the ${data.approvalLevel} level.</p>
    
    <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
      <p style="margin: 5px 0;"><strong>Next Action:</strong> ${data.nextAction}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.contractUrl}" 
         style="display: inline-block; background: #059669; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);">
        View Contract Details
      </a>
    </div>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #666;">
      (c) ${new Date().getFullYear()} Wujha Procurement System. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
Contract Approved

Good news!

Contract ${data.contractNumber} has been approved by ${data.approverName} at the ${data.approvalLevel} level.

Next Action: ${data.nextAction}

View contract details: ${data.contractUrl}

Best regards,
Wujha Procurement System
  `;

  return { html, text };
}

// Vendor Accepted Contract - Internal Notification
export function generateVendorAcceptedEmail(data: {
  contractNumber: string;
  vendorName: string;
  respondedAt: Date;
  contractUrl: string;
}): { html: string; text: string } {
  const respondedAtFormatted = new Date(data.respondedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Contract Accepted by Vendor</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Wujha Procurement System</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Excellent news!</p>
    
    <p style="font-size: 16px;"><strong>${data.vendorName}</strong> has accepted Contract <strong>${data.contractNumber}</strong>.</p>
    
    <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
      <p style="margin: 5px 0;"><strong>Accepted At:</strong> ${respondedAtFormatted}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Ready for signing and activation</p>
    </div>
    
    <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin: 0 0 10px 0; color: #1e3a8a;">Next Steps:</h4>
      <ol style="margin: 0; padding-left: 20px;">
        <li>Prepare final contract documents for signing</li>
        <li>Coordinate signing ceremony or digital signature</li>
        <li>Activate the contract in the system</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.contractUrl}" 
         style="display: inline-block; background: #059669; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);">
        View Contract Details
      </a>
    </div>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #666;">
      (c) ${new Date().getFullYear()} Wujha Procurement System. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
Contract Accepted by Vendor

Excellent news!

${data.vendorName} has accepted Contract ${data.contractNumber}.

Accepted At: ${respondedAtFormatted}
Status: Ready for signing and activation

Next Steps:
1. Prepare final contract documents for signing
2. Coordinate signing ceremony or digital signature
3. Activate the contract in the system

View contract details: ${data.contractUrl}

Best regards,
Wujha Procurement System
  `;

  return { html, text };
}

// Vendor Rejected Contract - Internal Notification
export function generateVendorRejectedEmail(data: {
  contractNumber: string;
  vendorName: string;
  comments: string;
  respondedAt: Date;
  contractUrl: string;
}): { html: string; text: string } {
  const respondedAtFormatted = new Date(data.respondedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Contract Changes Requested</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Wujha Procurement System</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Attention Required</p>
    
    <p style="font-size: 16px;"><strong>${data.vendorName}</strong> has requested changes to Contract <strong>${data.contractNumber}</strong>.</p>
    
    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="margin: 5px 0;"><strong>Responded At:</strong> ${respondedAtFormatted}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Requires revision</p>
    </div>
    
    <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin: 0 0 10px 0; color: #dc3545;">Vendor Comments:</h4>
      <p style="margin: 0; white-space: pre-wrap;">${data.comments}</p>
    </div>
    
    <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin: 0 0 10px 0; color: #1e3a8a;">Next Steps:</h4>
      <ol style="margin: 0; padding-left: 20px;">
        <li>Review vendor's comments and concerns</li>
        <li>Revise contract terms as appropriate</li>
        <li>Create a new contract version</li>
        <li>Submit for re-approval through the approval workflow</li>
        <li>Resend to vendor for review</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.contractUrl}" 
         style="display: inline-block; background: #dc3545; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(220, 53, 69, 0.3);">
        Review & Revise Contract
      </a>
    </div>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #666;">
      (c) ${new Date().getFullYear()} Wujha Procurement System. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
Contract Changes Requested by Vendor

Attention Required

${data.vendorName} has requested changes to Contract ${data.contractNumber}.

Responded At: ${respondedAtFormatted}
Status: Requires revision

Vendor Comments:
${data.comments}

Next Steps:
1. Review vendor's comments and concerns
2. Revise contract terms as appropriate
3. Create a new contract version
4. Submit for re-approval through the approval workflow
5. Resend to vendor for review

Review & revise contract: ${data.contractUrl}

Best regards,
Wujha Procurement System
  `;

  return { html, text };
}

