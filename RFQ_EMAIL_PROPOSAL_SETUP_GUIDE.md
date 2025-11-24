# RFQ Email & Proposal System Setup Guide

## 1. Environment Variables

Create or update your `.env` file in the root directory:

```env
# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ziad.warethkhaled@gmail.com
SMTP_PASSWORD=dztenzaqiqlcmqme
SMTP_FROM_EMAIL=ziad.warethkhaled@gmail.com
SMTP_FROM_NAME=Wujha Procurement System
```

**Important:** The app password should be entered without spaces: `dztenzaqiqlcmqme`

## 2. Database Migration

Run this command to update your database schema:

```bash
npx prisma db push
```

This will add the new fields to the `RFQResponse` table for storing submission tokens and file paths.

## 3. How the System Works

### Step 1: Create RFQ with Selected Vendors
1. Go to `/procurement/rfq/new`
2. Select a Purchase Requisition
3. Select vendors from the list
4. Fill in RFQ details
5. Save as DRAFT

### Step 2: Approve RFQ
1. Request approval for the RFQ
2. Approver reviews and approves
3. RFQ status changes to APPROVED

### Step 3: Send Email Invitations
1. On the RFQ detail page, click "Publish & Send Invitations"
2. System:
   - Creates unique token for each vendor
   - Sends branded email to each vendor
   - Email contains unique submission link
   - Updates RFQ status to PUBLISHED

### Step 4: Vendor Receives Email
Vendor receives email with:
- RFQ details
- Items list
- Terms and conditions
- **Unique submission link** (example: `https://yoursite.com/rfq/submit/rfq123/abc-def-ghi`)

### Step 5: Vendor Submits Proposal
1. Vendor clicks link (no login required)
2. Sees RFQ details and requirements
3. Fills in proposal form:
   - Total Amount (required)
   - Quotation Valid Until (required)
   - **Upload PDF Proposal** (required, max 10MB)
   - Price Breakdown (optional)
   - Technical Details (optional)
   - Delivery Terms (optional)
   - Additional Notes (optional)
4. Clicks "Submit Proposal"
5. PDF is uploaded to: `public/uploads/rfq-proposals/[rfqId]/[vendorId]/proposal_[timestamp].pdf`

### Step 6: View Proposals
1. Go to RFQ detail page
2. See all submitted proposals
3. View details and download PDFs
4. Evaluate and score proposals
5. Award to selected vendor

## 4. File Storage Structure

```
public/
└── uploads/
    └── rfq-proposals/
        └── [rfqId]/           # Each RFQ has its own folder
            └── [vendorId]/     # Each vendor has their own subfolder
                ├── proposal_1234567890_proposal.pdf
                ├── proposal_1234567891_revised.pdf
                └── ...
```

**Access URL:** `/uploads/rfq-proposals/[rfqId]/[vendorId]/[filename]`

## 5. Security Features

- ✅ Unique token per vendor per RFQ (UUID v4)
- ✅ One-time use tokens (cannot submit twice)
- ✅ Token validation before submission
- ✅ Automatic expiration after closing date
- ✅ Only PDF files allowed
- ✅ 10MB file size limit
- ✅ IP address tracking
- ✅ Complete audit trail via ProcessAudit
- ✅ Vendor cannot see other vendors' tokens
- ✅ No authentication required for submission (secure by unique token)

## 6. Database Schema Updates

### RFQResponse Model (Updated)
```prisma
model RFQResponse {
  // Existing fields...
  
  // NEW: File attachments
  proposalFileUrl    String?   // Path to uploaded PDF
  attachments        Json?     // Array of additional file paths
  
  // NEW: Additional proposal data
  priceBreakdown     String?   // Price breakdown details
  technicalDetails   String?   // Technical specifications
  deliveryTerms      String?   // Delivery terms
  notes              String?   // Additional notes
  
  // NEW: Submission tracking
  submittedVia       String?   @default("EMAIL_LINK")
  submissionToken    String?   @unique  // Unique token for submission
  submissionIp       String?   // IP address
  tokenSentAt        DateTime? // When email was sent
  tokenUsed          Boolean   @default(false) // Token usage status
}
```

## 7. API Endpoints

### Send Invitations
```
POST /api/rfq/[id]/send-invitations

Body: {
  "vendorIds": ["vendor1", "vendor2"],
  "sentBy": "employeeId"
}

Response: {
  "success": 2,
  "failed": 0,
  "totalVendors": 2
}
```

### Get Submission Form (Vendor Side)
```
GET /api/rfq/submit/[rfqId]/[token]

Response: {
  "rfq": {...},
  "vendor": {...},
  "alreadySubmitted": false,
  "isOpen": true
}
```

### Submit Proposal (Vendor Side)
```
POST /api/rfq/submit/[rfqId]/[token]

Content-Type: multipart/form-data

Fields:
- totalAmount: number
- validUntil: date
- proposalFile: PDF file
- priceBreakdown: string (optional)
- technicalDetails: string (optional)
- deliveryTerms: string (optional)
- notes: string (optional)
```

## 8. Email Template Features

The invitation email includes:
- Wujha branding with primary color
- RFQ details (number, title, closing date)
- Items list with quantities and specifications
- Terms and conditions
- Prominent "Submit Your Proposal" button
- Warning about link expiration
- Fallback text version

## 9. Testing

### Test Email Delivery
```bash
# The email service will log to console
# Check server logs for: 📧 Email sent successfully
```

### Test Vendor Submission
1. Create test RFQ
2. Add test vendor with your email
3. Approve RFQ and send invitations
4. Check your email
5. Click link and submit test proposal
6. Verify PDF is saved to `public/uploads/rfq-proposals/...`

## 10. Troubleshooting

### Email Not Sending
- Check Gmail 2FA is enabled on the account
- Verify app password is correct (no spaces)
- Check `.env` file exists in root directory
- Restart server after adding env variables
- Look for "Email server is ready" message in logs

### File Upload Fails
- Ensure `public/uploads` directory exists and has write permissions
- Check file is actually PDF (not renamed file)
- Verify file size is under 10MB
- Check server disk space

### Invalid Link Error
- Token may have expired (check closing date)
- Token may have been used already
- RFQ may not be published
- Verify token is correct in URL

## 11. Production Considerations

### Email Service
- Consider using a professional email service (SendGrid, AWS SES) for production
- Current Gmail setup is good for development/testing
- Gmail has daily sending limits (500 emails/day for free accounts)

### File Storage
- For production, consider cloud storage (AWS S3, Google Cloud Storage)
- Current local storage is good for development/small scale
- Add file backup strategy

### Security
- Add CSRF protection
- Implement rate limiting on submission endpoint
- Add virus scanning for uploaded files
- Use HTTPS in production
- Consider adding CAPTCHA for vendor submissions

## 12. Next Steps

After setup:
1. Create test RFQ with vendors
2. Test email delivery
3. Test vendor submission
4. Test PDF download
5. Deploy to production environment
6. Monitor email delivery rates
7. Set up file backup strategy

