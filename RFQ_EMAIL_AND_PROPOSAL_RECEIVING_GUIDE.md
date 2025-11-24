# RFQ Email & Proposal Receiving Guide

## 1. Environment Variables for Gmail SMTP

Add these variables to your `.env` file:

```env
# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ziad.warethkhaled@gmail.com
SMTP_PASSWORD=dzte nzaq iqlc mqme
SMTP_FROM_EMAIL=ziad.warethkhaled@gmail.com
SMTP_FROM_NAME=Wujha Procurement System

# Optional: For production, consider using environment-specific values
# SMTP_REPLY_TO=procurement@wujha.com
```

**Important Notes:**
- The App Password should be used as-is (with spaces) or without spaces: `dztenzaqiqlcmqme`
- Gmail App Passwords are 16 characters without spaces
- Make sure 2-Factor Authentication is enabled on the Gmail account
- Never commit `.env` file to version control

## 2. Options for Receiving Vendor Proposals

### **Option A: Vendor Portal (Recommended - Professional & Automated)**

**How it works:**
- Vendors log into a dedicated vendor portal
- They see RFQs they've been invited to
- They submit proposals directly through the portal with:
  - Price breakdown
  - Technical specifications
  - File attachments (PDFs, documents)
  - Terms and conditions

**Pros:**
- ✅ Professional and automated
- ✅ All proposals in one place
- ✅ Easy to compare and evaluate
- ✅ Automatic notifications
- ✅ Audit trail
- ✅ Can enforce submission deadlines
- ✅ Structured data (not just PDFs)

**Cons:**
- ⚠️ Requires vendor registration/login system
- ⚠️ More development time initially
- ⚠️ Vendors need to learn the system

**Implementation:**
- Create vendor authentication system
- Vendor dashboard showing their RFQs
- Proposal submission form with file upload
- Link proposals to RFQResponse records

---

### **Option B: Email with Secure Upload Link (Hybrid - Best Balance)**

**How it works:**
- Send email to vendors with RFQ details
- Include a unique, secure link for each vendor
- Link leads to a simple form where they can:
  - Enter price and details
  - Upload PDF proposal
  - Submit (no login required, but link is unique)

**Pros:**
- ✅ Professional appearance
- ✅ No vendor registration needed
- ✅ Secure (unique links)
- ✅ All proposals stored in system
- ✅ Easy to implement
- ✅ Vendors familiar with email workflow

**Cons:**
- ⚠️ Requires email delivery
- ⚠️ Links can expire (security feature)

**Implementation:**
- Generate unique token per vendor per RFQ
- Email contains link: `https://yoursite.com/rfq/[rfqId]/submit/[token]`
- Simple submission form (no login)
- Store proposal in RFQResponse with attachments

---

### **Option C: Email Attachments Only (Simplest - Not Recommended)**

**How it works:**
- Send email to vendors with RFQ details
- Vendors reply with PDF attachments
- Manual upload of received PDFs to system

**Pros:**
- ✅ Very simple
- ✅ Vendors familiar with email
- ✅ No development needed

**Cons:**
- ❌ Manual work (checking emails, uploading PDFs)
- ❌ Easy to miss proposals
- ❌ No structured data (just PDFs)
- ❌ Hard to compare proposals
- ❌ No automatic deadline enforcement
- ❌ Security concerns (email can be forwarded)

---

### **Option D: Vendor Portal + Email Fallback (Most Professional)**

**How it works:**
- Primary: Vendor portal for registered vendors
- Fallback: Email with secure link for new/unregistered vendors
- Both methods feed into the same system

**Pros:**
- ✅ Best of both worlds
- ✅ Accommodates all vendor types
- ✅ Professional for regular vendors
- ✅ Accessible for new vendors

**Cons:**
- ⚠️ Most complex to implement
- ⚠️ Requires maintaining two systems

---

## 3. Recommendation: **Option B (Email with Secure Upload Link)**

**Why this is the best choice:**
1. **Professional** - Vendors receive proper email with branded template
2. **Easy for vendors** - No registration, just click link and submit
3. **Secure** - Unique tokens prevent unauthorized access
4. **Automated** - Proposals automatically stored in system
5. **Structured** - Can capture both data (prices, specs) and files
6. **Quick to implement** - Can be built in 1-2 days
7. **Scalable** - Can add vendor portal later if needed

## 4. Proposed Workflow

### When RFQ is Published:

1. **System sends email to each selected vendor** with:
   - RFQ details (title, description, closing date)
   - Items/requirements
   - Terms and conditions
   - **Unique secure submission link**
   - Instructions

2. **Vendor clicks link** → Opens submission form (no login)

3. **Vendor submits proposal** with:
   - Total amount
   - Price breakdown (optional)
   - Technical details (optional)
   - **PDF proposal file** (required)
   - Other attachments (optional)
   - Valid until date

4. **System stores proposal** in `RFQResponse` table with:
   - Vendor ID
   - Total amount
   - File attachments (stored in cloud storage or server)
   - Submission timestamp
   - Status: SUBMITTED

5. **Procurement team** can:
   - View all proposals in RFQ detail page
   - Download PDFs
   - Compare prices
   - Evaluate and score proposals
   - Award to selected vendor

## 5. Database Schema Updates Needed

Add to `RFQResponse` model:
```prisma
model RFQResponse {
  // ... existing fields ...
  
  // File attachments
  proposalFileUrl    String?  // URL to uploaded PDF
  attachments        Json?    // Array of additional file URLs
  
  // Additional proposal data
  priceBreakdown     Json?    // Structured price breakdown
  technicalDetails   String?  // Technical specifications
  deliveryTerms      String?  // Delivery terms and conditions
  
  // Submission tracking
  submittedVia       String?  // 'PORTAL', 'EMAIL_LINK', 'MANUAL'
  submissionToken    String?  // Unique token for email link submission
  submissionIp       String?  // IP address of submission
}
```

## 6. File Storage Options

### Option 1: Local Server Storage
- Store files in `/uploads/rfq-proposals/[rfqId]/[vendorId]/`
- Simple but requires server space management
- Good for small scale

### Option 2: Cloud Storage (Recommended)
- **AWS S3** - Most popular, reliable
- **Google Cloud Storage** - Good integration with Gmail
- **Azure Blob Storage** - If using Azure
- Store file URLs in database
- Better scalability and backup

### Option 3: Database Storage (Not Recommended)
- Store files as base64 in database
- Only for very small files
- Not scalable

## 7. Implementation Steps

### Phase 1: Email Sending (Day 1)
1. Install `nodemailer` package
2. Create email service utility
3. Create email templates for RFQ invitations
4. Update RFQ publish action to send emails
5. Test email delivery

### Phase 2: Secure Submission Links (Day 2)
1. Generate unique tokens per vendor per RFQ
2. Create token validation system
3. Create public submission page (no auth required)
4. Add file upload functionality
5. Store proposals in database

### Phase 3: Proposal Management (Day 3)
1. Update RFQ detail page to show proposals
2. Add file download functionality
3. Add proposal comparison view
4. Add evaluation scoring interface

## 8. Security Considerations

1. **Token Security:**
   - Tokens should expire after closing date
   - Tokens should be one-time use (optional)
   - Use cryptographically secure random tokens

2. **File Upload Security:**
   - Validate file types (only PDF, DOC, DOCX)
   - Limit file size (e.g., 10MB max)
   - Scan for viruses (optional but recommended)
   - Sanitize file names

3. **Access Control:**
   - Only vendors with valid tokens can submit
   - Only authorized users can view proposals
   - Proposals should be visible only to procurement team

## 9. Email Template Example

```
Subject: Request for Quotation: [RFQ Number] - [Title]

Dear [Vendor Name],

You have been invited to submit a proposal for the following Request for Quotation:

RFQ Number: RFQ-2024-0001
Title: [RFQ Title]
Description: [Description]
Closing Date: [Date and Time]

Items Required:
- Item 1: [Description] - Quantity: [Qty]
- Item 2: [Description] - Quantity: [Qty]

Terms and Conditions:
[Terms and conditions text]

To submit your proposal, please click the link below:
[Secure Submission Link]

This link is unique to your company and will expire on [Closing Date].

If you have any questions, please contact us at [Contact Email].

Best regards,
Wujha Procurement Team
```

## 10. Next Steps

1. **Decide on approach** (I recommend Option B)
2. **Set up environment variables** in `.env`
3. **Install required packages** (`nodemailer`, file upload library)
4. **Implement email sending** when RFQ is published
5. **Create secure submission system**
6. **Test with sample vendors**
7. **Deploy and monitor**

Would you like me to proceed with implementing Option B (Email with Secure Upload Link)?

