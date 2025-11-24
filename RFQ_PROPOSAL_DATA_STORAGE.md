# RFQ Proposal Data Storage Guide

## Overview
This document explains where all proposal data and uploaded documents are stored when a vendor submits a proposal via the email invitation link.

## Data Storage Locations

### 1. Form Data (Database - `RFQResponse` Table)

All form fields are saved in the `RFQResponse` table in the database:

| Field | Database Column | Description |
|-------|----------------|-------------|
| **Total Amount** | `totalAmount` | Decimal field storing the quoted price |
| **Valid Until Date** | `validUntil` | DateTime field for quotation validity |
| **Price Breakdown** | `priceBreakdown` | Text field (optional) |
| **Technical Details** | `technicalDetails` | Text field (optional) |
| **Delivery Terms** | `deliveryTerms` | Text field (optional) |
| **Additional Notes** | `notes` | Text field (optional) |
| **Proposal File Path** | `proposalFileUrl` | String field storing the relative path to the PDF |

**Additional Tracking Fields:**
- `submittedAt`: Timestamp when proposal was submitted
- `submissionToken`: Unique token used in the submission link
- `tokenUsed`: Boolean flag indicating if the token has been used
- `submissionIp`: IP address of the vendor who submitted
- `status`: Current status of the response (SUBMITTED, UNDER_REVIEW, etc.)

### 2. PDF Document (File System)

The uploaded PDF proposal is saved to the local file system:

**Storage Path:**
```
public/uploads/rfq-proposals/[rfqId]/[vendorId]/proposal_[timestamp]_[filename].pdf
```

**Example:**
```
public/uploads/rfq-proposals/cmic7tymv0007uia0hmnitikd/vendor123/proposal_1735000000000_MyProposal.pdf
```

**File Naming Convention:**
- Format: `proposal_[timestamp]_[sanitized-filename]`
- Timestamp: Unix timestamp in milliseconds
- Filename: Original filename with special characters replaced by underscores
- Maximum file size: 10MB
- Allowed format: PDF only

**Access:**
- The file path stored in the database is relative to the `public` directory
- Files can be accessed via URL: `/uploads/rfq-proposals/[rfqId]/[vendorId]/[filename]`
- Example: `http://localhost:3001/uploads/rfq-proposals/cmic7tymv0007uia0hmnitikd/vendor123/proposal_1735000000000_MyProposal.pdf`

### 3. Process Audit Trail (Database - `ProcessAudit` Table)

Every submission creates an audit record:

| Field | Description |
|-------|-------------|
| `processType` | `RFQ_PROPOSAL_SUBMITTED` |
| `documentId` | RFQ ID |
| `documentType` | `RFQ` |
| `action` | `PROPOSAL_SUBMITTED` |
| `performedBy` | Vendor ID |
| `details` | JSON object containing:
  - `rfqNumber`: RFQ number
  - `vendorName`: Vendor name
  - `totalAmount`: Quoted amount
  - `fileName`: Uploaded file name
  - `fileSize`: File size in bytes
  - `submissionMethod`: `EMAIL_LINK` |
| `ipAddress` | Vendor's IP address |
| `userAgent` | Browser user agent |

## Database Schema

### RFQResponse Model
```prisma
model RFQResponse {
  id              String            @id @default(cuid())
  rfqId           String
  vendorId        String
  submittedAt     DateTime          @default(now())
  totalAmount     Decimal?
  validUntil      DateTime?
  status          RFQResponseStatus @default(SUBMITTED)
  
  // File attachments
  proposalFileUrl    String?  // Path to uploaded PDF
  
  // Additional proposal data
  priceBreakdown     String?
  technicalDetails   String?
  deliveryTerms      String?
  notes              String?
  
  // Submission tracking
  submittedVia       String?  @default("EMAIL_LINK")
  submissionToken    String?  @unique
  submissionIp       String?
  tokenSentAt        DateTime?
  tokenUsed          Boolean   @default(false)

  @@unique([rfqId, vendorId])
  @@index([submissionToken])
}
```

## How to Access Submitted Data

### 1. View in RFQ Details Page
- Navigate to `/procurement/rfq/[id]`
- Scroll to "Invited Vendors & Submission Status" section
- See submission status (Submitted/Pending)
- Download proposal PDF if submitted

### 2. Query Database Directly
```typescript
// Get all responses for an RFQ
const responses = await prisma.rFQResponse.findMany({
  where: { rfqId: 'rfq-id' },
  include: {
    vendor: true,
    rfq: true
  }
});

// Get a specific response
const response = await prisma.rFQResponse.findUnique({
  where: {
    rfqId_vendorId: {
      rfqId: 'rfq-id',
      vendorId: 'vendor-id'
    }
  }
});
```

### 3. Access Files Programmatically
```typescript
// Read file from file system
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', response.proposalFileUrl);
const fileBuffer = fs.readFileSync(filePath);
```

## Security Considerations

1. **File Upload Validation:**
   - Only PDF files are accepted
   - Maximum file size: 10MB
   - Filenames are sanitized to prevent path traversal attacks

2. **Token Security:**
   - Each submission link has a unique UUID token
   - Tokens can only be used once (`tokenUsed` flag)
   - Tokens are validated against the RFQ ID and vendor ID

3. **Access Control:**
   - Only vendors with valid tokens can submit
   - RFQ must be in `PUBLISHED` status
   - Submission deadline must not have passed

4. **File Storage:**
   - Files are stored in `public` directory (accessible via URL)
   - Consider moving to secure storage (S3, etc.) for production
   - Files are organized by RFQ ID and Vendor ID for easy management

## Troubleshooting

### Issue: "Nothing happens when clicking Submit"
**Possible Causes:**
1. Form validation failing (check browser console)
2. Missing required fields (Total Amount, Valid Until, PDF file)
3. API error not being displayed (check network tab)
4. Token already used or invalid

**Solution:**
- Check browser console for JavaScript errors
- Check network tab for API response
- Verify all required fields are filled
- Ensure PDF file is selected

### Issue: "File not found after upload"
**Possible Causes:**
1. Upload directory doesn't exist
2. File permissions issue
3. Path stored incorrectly in database

**Solution:**
- Ensure `public/uploads/rfq-proposals` directory exists
- Check file system permissions
- Verify `proposalFileUrl` in database matches actual file location

## File System Structure

```
public/
└── uploads/
    └── rfq-proposals/
        └── [rfqId]/
            └── [vendorId]/
                └── proposal_[timestamp]_[filename].pdf
```

## Summary

- **Form Data**: Stored in `RFQResponse` table in database
- **PDF Files**: Stored in `public/uploads/rfq-proposals/[rfqId]/[vendorId]/`
- **Audit Trail**: Stored in `ProcessAudit` table
- **Access**: Via RFQ details page or direct database queries
- **Security**: Token-based, one-time use, validated submissions

