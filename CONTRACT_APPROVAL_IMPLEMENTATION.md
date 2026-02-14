# Contract Approval & Negotiation Implementation

**Implementation Date:** February 12, 2026  
**Status:** ✅ COMPLETE - Ready for Database Migration

---

## 📋 Executive Summary

This implementation adds a comprehensive contract approval and vendor negotiation workflow to the Wujha Procurement System. The solution follows best practices with:

- ✅ **Zero direct vendor access** to the application
- ✅ **Email-based negotiation** via secure, tokenized links
- ✅ **Full version history** tracking every contract change
- ✅ **Multi-level approval workflow** (Head of Procurement → Billing Engineer)
- ✅ **Minimal database changes** (2 new tables, 3 new fields)

---

## 🎯 Requirements Implemented

### ✅ Contract Approval Process
- [x] Contract created as DRAFT
- [x] Submit for approval
- [x] Approval sequence: Head of Procurement → Billing Engineer
- [x] Contract version sent to vendor after approval
- [x] Negotiation cycle with accept/reject
- [x] Activation after vendor acceptance

### ✅ Contract Negotiation Cycle
- [x] Vendor receives email with contract details
- [x] Vendor can ACCEPT or REJECT via secure email links
- [x] Comments captured for rejections
- [x] Rejected contracts return to DRAFT for revision
- [x] Revised contracts go through full approval cycle again

### ✅ Contract Version Management
- [x] New version created on each edit
- [x] Version history saved with change tracking
- [x] Users can navigate through all versions
- [x] Comparison between versions
- [x] Complete audit trail

---

## 📊 Database Schema Changes

### New Tables Created

#### 1. `ServiceContractVersion`
Stores complete snapshots of contract data at each version.

**Key Fields:**
- `versionNumber` - Sequential version identifier
- `contractNumber`, `totalValue`, `paymentTerms`, etc. - Full contract snapshot
- `changeReason` - Why this version was created
- `changeDescription` - What changed
- `createdBy`, `createdByName` - Audit trail
- `approvalStatus` - PENDING, APPROVED, REJECTED

#### 2. `VendorContractResponse`
Tracks vendor acceptance/rejection via email.

**Key Fields:**
- `responseToken` - Secure token for email links (unique, indexed)
- `vendorEmail`, `vendorName` - Vendor contact info
- `status` - PENDING, ACCEPTED, REJECTED, EXPIRED, PROCESSED
- `responseType` - ACCEPT, REJECT, REQUEST_CHANGES
- `comments` - Vendor feedback
- `respondedAt` - Timestamp of response
- `expiresAt` - Link expiration (default 30 days)
- `emailSentAt`, `emailOpenedAt`, `reminderSentAt` - Email tracking

### Modified Tables

#### `ServiceContract`
Added 3 new fields:
- `versionNumber` (Int, default: 1)
- `approvalId` (String, nullable, indexed)
- `createdBy` (String, nullable)

Added relations:
- `approval` → Approval
- `versions` → ServiceContractVersion[]
- `vendorResponses` → VendorContractResponse[]

#### `Approval`
Added 1 new field:
- `serviceContractId` (String, nullable, indexed)

Added relation:
- `serviceContracts` → ServiceContract[]

---

## 🔧 Services & Libraries Created

### 1. Contract Version Service
**File:** `src/lib/contract-version-service.ts`

**Functions:**
- `createContractVersion()` - Create new version snapshot
- `getContractVersions()` - Get all versions for a contract
- `getContractVersion()` - Get specific version
- `compareContractVersions()` - Compare two versions with diff
- `approveContractVersion()` - Mark version as approved
- `rejectContractVersion()` - Mark version as rejected
- `getContractVersionHistory()` - Get complete history with changes
- `restoreContractVersion()` - Restore to previous version
- `getContractVersionStats()` - Version statistics

### 2. Vendor Response Service
**File:** `src/lib/vendor-response-service.ts`

**Functions:**
- `createVendorResponseRequest()` - Create request and send email
- `getVendorResponseByToken()` - Retrieve response by token
- `validateResponseToken()` - Validate token and check expiry
- `recordVendorResponse()` - Save vendor accept/reject response
- `markResponseProcessed()` - Mark as processed internally
- `getContractResponses()` - Get all responses for contract
- `getPendingResponses()` - Get all pending responses
- `getExpiredResponses()` - Get all expired responses
- `sendResponseReminder()` - Send reminder email
- `cleanupExpiredResponses()` - Batch cleanup expired tokens
- `getVendorResponseStats()` - Response statistics & metrics

### 3. Email Templates
**File:** `src/lib/email-service.ts`

**New Templates:**
- `generateContractReviewEmail()` - Vendor review request with Accept/Reject buttons
- `sendContractReviewToVendor()` - Send contract review email
- `generateContractApprovedEmail()` - Internal approval notification
- `generateVendorAcceptedEmail()` - Vendor acceptance notification
- `generateVendorRejectedEmail()` - Vendor rejection notification with comments

### 4. Approval Routing Updates
**File:** `src/lib/approval-routing.ts`

**Changes:**
- Added `SERVICE_CONTRACT` to `DocumentType` union
- Updated `canUserApproveAtLevel()` to include `serviceContractId`
- Updated `getApprovalStatus()` to include `serviceContractId`

---

## 🌐 API Endpoints Created

### Contract Approval Endpoints

#### 1. Submit for Approval
**POST** `/api/service-contracts/[id]/submit-approval`

**Request:**
```json
{
  "userId": "user_id",
  "userName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contract submitted for approval",
  "approval": {
    "id": "approval_id",
    "status": "PENDING",
    "level": 1,
    "totalLevels": 2,
    "estimatedDuration": "48 hours"
  }
}
```

#### 2. Approve Contract
**POST** `/api/service-contracts/[id]/approve`

**Request:**
```json
{
  "userId": "user_id",
  "userName": "Jane Smith",
  "comments": "Approved - terms look good"
}
```

**Response (Intermediate Level):**
```json
{
  "success": true,
  "message": "Approved at level 1. Awaiting approval at level 2",
  "approval": {
    "status": "PENDING",
    "level": 1,
    "nextLevel": 2,
    "isFinalApproval": false
  }
}
```

**Response (Final Level):**
```json
{
  "success": true,
  "message": "Contract fully approved and sent to vendor for acceptance",
  "approval": {
    "status": "APPROVED",
    "level": 2,
    "isFinalApproval": true,
    "vendorResponseSent": true,
    "vendorResponseExpiresAt": "2026-03-14T12:00:00Z"
  }
}
```

#### 3. Reject Contract
**POST** `/api/service-contracts/[id]/reject`

**Request:**
```json
{
  "userId": "user_id",
  "userName": "Jane Smith",
  "comments": "Payment terms need revision"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contract rejected and returned to DRAFT status",
  "rejection": {
    "level": 1,
    "rejectedBy": "Jane Smith",
    "comments": "Payment terms need revision",
    "status": "DRAFT"
  }
}
```

### Version Management Endpoints

#### 4. Get Contract Versions
**GET** `/api/service-contracts/[id]/versions`

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "version": {
        "versionNumber": 2,
        "changeReason": "Vendor requested changes",
        "createdBy": "user_id",
        "createdAt": "2026-02-12T10:00:00Z"
      },
      "changesSummary": ["totalValue changed", "paymentTerms changed"],
      "isLatestVersion": true
    }
  ],
  "stats": {
    "totalVersions": 2,
    "currentVersion": 2,
    "approvedVersions": 1
  }
}
```

#### 5. Compare Versions
**GET** `/api/service-contracts/[id]/versions?compareFrom=1&compareTo=2`

**Response:**
```json
{
  "success": true,
  "comparison": {
    "fromVersion": { ... },
    "toVersion": { ... },
    "changes": [
      {
        "field": "totalValue",
        "oldValue": 50000,
        "newValue": 45000,
        "changed": true
      }
    ],
    "hasChanges": true
  }
}
```

#### 6. Send to Vendor
**POST** `/api/service-contracts/[id]/send-to-vendor`

**Request:**
```json
{
  "expiryDays": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contract sent to ABC Corporation for review",
  "vendorResponse": {
    "email": "vendor@example.com",
    "expiresAt": "2026-03-14T12:00:00Z",
    "status": "PENDING"
  }
}
```

### Public Vendor Response Endpoints (No Auth Required)

#### 7. Get Contract Details (Vendor View)
**GET** `/api/contracts/vendor-response/[token]`

**Response:**
```json
{
  "success": true,
  "contract": {
    "contractNumber": "SC-2026-0001",
    "contractType": "SERVICE_AGREEMENT",
    "vendorName": "ABC Corporation",
    "totalValue": 50000,
    "currency": "OMR",
    "startDate": "2026-03-01",
    "endDate": "2027-02-28",
    "paymentTerms": "Net 30"
  },
  "response": {
    "versionNumber": 1,
    "expiresAt": "2026-03-14T12:00:00Z"
  },
  "token": "secure_token_here"
}
```

#### 8. Submit Vendor Response
**POST** `/api/contracts/vendor-response/[token]`

**Request (Accept):**
```json
{
  "action": "accept",
  "respondedBy": "John Vendor"
}
```

**Request (Reject):**
```json
{
  "action": "reject",
  "comments": "Payment terms need to be revised to Net 60",
  "respondedBy": "John Vendor"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you! You have successfully accepted the contract.",
  "response": {
    "status": "ACCEPTED",
    "respondedAt": "2026-02-12T15:30:00Z",
    "contractNumber": "SC-2026-0001"
  }
}
```

### Updated Existing Endpoints

#### 9. Create Contract (Updated)
**POST** `/api/service-contracts`

**Added Fields:**
```json
{
  "createdBy": "user_id",
  "createdByName": "John Doe"
}
```

**Behavior:** Automatically creates version 1 snapshot.

#### 10. Update Contract (Updated)
**PUT** `/api/service-contracts/[id]`

**Added Fields:**
```json
{
  "editedBy": "user_id",
  "editedByName": "John Doe",
  "changeReason": "Updated payment terms",
  "changeDescription": "Changed Net 30 to Net 45"
}
```

**Behavior:** Automatically creates new version snapshot on edit.

#### 11. Get Contract (Updated)
**GET** `/api/service-contracts/[id]`

**Now Includes:**
- `approval` - Approval workflow details
- `versions` - Recent 5 versions
- `vendorResponses` - All vendor responses

---

## 📧 Email Workflow

### 1. Contract Submitted for Approval (Internal)
**Recipients:** Head of Procurement (Level 1 Approver)  
**Trigger:** POST to `/submit-approval`  
**Contains:** Contract details, approval button

### 2. Contract Approved at Level 1 (Internal)
**Recipients:** Billing Engineer (Level 2 Approver)  
**Trigger:** POST to `/approve` (intermediate level)  
**Contains:** Contract details, previous approvals, approve/reject buttons

### 3. Contract Fully Approved (Internal)
**Recipients:** Informed parties (RACI)  
**Trigger:** POST to `/approve` (final level)  
**Contains:** Approval summary, next steps

### 4. Contract Sent to Vendor (External)
**Recipients:** Vendor contact email  
**Trigger:** Final approval OR manual `/send-to-vendor`  
**Contains:**
- Contract details (number, type, value, dates, terms)
- **Accept Button** → Green button with secure link
- **Request Changes Button** → Red button with secure link
- Expiry warning (30 days default)
- Important notes and instructions

**Email Features:**
- Beautiful HTML design with Wujha branding
- Mobile-responsive layout
- Secure tokenized links (no login required)
- Fallback plain text version
- Tracking timestamps

### 5. Vendor Accepted Contract (Internal)
**Recipients:** Procurement team (SMTP_FROM_EMAIL)  
**Trigger:** Vendor clicks Accept button  
**Contains:**
- Vendor name
- Contract number
- Acceptance timestamp
- Next steps (signing, activation)
- Link to contract in system

### 6. Vendor Rejected Contract (Internal)
**Recipients:** Procurement team (SMTP_FROM_EMAIL)  
**Trigger:** Vendor clicks Reject button  
**Contains:**
- Vendor name
- Contract number
- Vendor comments/feedback
- Rejection timestamp
- Next steps (revise, resubmit)
- Link to contract in system

### 7. Contract Rejected by Approver (Internal)
**Recipients:** Contract creator, informed parties  
**Trigger:** POST to `/reject`  
**Contains:**
- Rejection reason/comments
- Approver name
- Next steps (revise and resubmit)

---

## 🔒 Security Features

### Token Security
- **Cryptographic tokens:** 64-character hex strings (256-bit security)
- **Single-use:** Token becomes invalid after response
- **Time-limited:** Configurable expiry (default 30 days)
- **Scoped:** Token tied to specific contract version
- **Audited:** All token usage logged

### Access Control
- **No vendor login:** Zero application access for external parties
- **Email validation:** Vendor email must match contract vendor
- **Token validation:** Checked on every request
- **Rate limiting:** Recommended for production
- **Audit trail:** All actions logged with timestamps

### Data Protection
- **Read-only vendor view:** Vendors can only view, not modify
- **Secure transmission:** HTTPS required in production
- **Email tracking:** Know when emails are sent/opened
- **Expiry cleanup:** Automatic cleanup of expired tokens

---

## 🔄 Complete Workflow Example

### Scenario: Create and Approve a Service Contract

**Step 1: Create Contract**
```http
POST /api/service-contracts
{
  "prId": "pr_123",
  "vendorId": "vendor_456",
  "contractType": "SERVICE_AGREEMENT",
  "totalValue": 50000,
  "startDate": "2026-03-01",
  "endDate": "2027-02-28",
  "paymentTerms": "Net 30",
  "createdBy": "user_789",
  "createdByName": "Alice Johnson"
}
```
✅ Contract created with `status: DRAFT`, `versionNumber: 1`  
✅ Version 1 snapshot saved

**Step 2: Submit for Approval**
```http
POST /api/service-contracts/sc_123/submit-approval
{
  "userId": "user_789",
  "userName": "Alice Johnson"
}
```
✅ Approval workflow initiated  
✅ Email sent to Head of Procurement  
✅ Status changed to `APPROVED` (awaiting approval)

**Step 3: Level 1 Approval**
```http
POST /api/service-contracts/sc_123/approve
{
  "userId": "user_101",
  "userName": "Bob Smith (Head of Procurement)",
  "comments": "Approved"
}
```
✅ Level 1 approval recorded  
✅ Email sent to Billing Engineer

**Step 4: Level 2 Approval (Final)**
```http
POST /api/service-contracts/sc_123/approve
{
  "userId": "user_202",
  "userName": "Carol Davis (Billing Engineer)",
  "comments": "Budget confirmed, approved"
}
```
✅ All approvals complete  
✅ Contract version approved  
✅ Email sent to vendor with Accept/Reject links  
✅ 30-day expiry set

**Step 5: Vendor Response**

**Option A: Vendor Accepts**
```http
POST /api/contracts/vendor-response/abc123token456
{
  "action": "accept",
  "respondedBy": "John Vendor"
}
```
✅ Response recorded as `ACCEPTED`  
✅ Contract status changed to `SIGNED`  
✅ Email notification sent to internal team  
✅ Ready for activation

**Option B: Vendor Rejects**
```http
POST /api/contracts/vendor-response/abc123token456
{
  "action": "reject",
  "comments": "Payment terms need to be Net 60 instead of Net 30",
  "respondedBy": "John Vendor"
}
```
✅ Response recorded as `REJECTED`  
✅ Contract status changed back to `DRAFT`  
✅ Email notification sent to internal team with comments  
✅ Ready for revision

**Step 6: Revise Contract (if rejected)**
```http
PUT /api/service-contracts/sc_123
{
  "paymentTerms": "Net 60",
  "editedBy": "user_789",
  "editedByName": "Alice Johnson",
  "changeReason": "Vendor requested change",
  "changeDescription": "Updated payment terms to Net 60"
}
```
✅ Contract updated  
✅ New version (v2) created  
✅ Status remains `DRAFT`

**Step 7: Resubmit (Loop back to Step 2)**
```http
POST /api/service-contracts/sc_123/submit-approval
```
✅ Full approval cycle starts again with v2

---

## 🎨 Status Flow Diagram

```
┌─────────┐
│  DRAFT  │ ← Contract Created
└────┬────┘
     │ Submit for Approval
     ↓
┌─────────┐
│APPROVED │ ← Awaiting Approvals
└────┬────┘
     │ All Approvals Complete
     │ Email Sent to Vendor
     ↓
     ├───→ [Vendor Accepts] ─────→ ┌────────┐
     │                               │ SIGNED │
     │                               └───┬────┘
     │                                   │ Manual Activate
     │                                   ↓
     │                               ┌────────┐
     │                               │ ACTIVE │
     │                               └────────┘
     │
     └───→ [Vendor Rejects] ─────→ ┌────────┐
                                    │ DRAFT  │ ← Loop back for revision
                                    └────────┘
```

---

## 📝 Migration Instructions

**IMPORTANT:** The code is complete but migrations have NOT been applied yet.

### To Apply Database Changes:

1. **Review the schema changes:**
   ```bash
   cat prisma/schema.prisma
   ```

2. **Create the migration:**
   ```bash
   npx prisma migrate dev --name add_contract_approval_and_versioning
   ```

3. **Verify the migration:**
   ```bash
   npx prisma migrate status
   ```

4. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

5. **Seed approval rules (optional but recommended):**
   Create a seed script to add approval rules for SERVICE_CONTRACT:
   
   ```typescript
   // In prisma/seed.ts
   await prisma.approvalRule.create({
     data: {
       name: "Service Contract Approval",
       documentType: "SERVICE_CONTRACT",
       priority: 1,
       isActive: true,
       conditions: {
         minAmount: 0,
         maxAmount: null
       },
       routings: {
         create: [
           {
             level: 1,
             approverRole: "HEAD_OF_PROCUREMENT",
             raciType: "ACCOUNTABLE",
             isOptional: false,
             timeoutHours: 48
           },
           {
             level: 2,
             approverRole: "BILLING_ENGINEER",
             raciType: "ACCOUNTABLE",
             isOptional: false,
             timeoutHours: 24
           }
         ]
       }
     }
   });
   ```

6. **Run the seed:**
   ```bash
   npx prisma db seed
   ```

### Environment Variables Required

Add these to your `.env` file:

```bash
# Email Configuration (already exists)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@wujha.com
SMTP_FROM_NAME=Wujha Procurement

# Application URL (for vendor response links)
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

---

## 🧪 Testing Checklist

### Unit Tests Needed
- [ ] Contract version creation
- [ ] Token generation and validation
- [ ] Vendor response recording
- [ ] Approval workflow progression
- [ ] Email template generation

### Integration Tests Needed
- [ ] Full approval cycle (submit → approve → send to vendor)
- [ ] Vendor acceptance workflow
- [ ] Vendor rejection and revision cycle
- [ ] Version comparison
- [ ] Token expiry handling

### Manual Testing Steps
1. Create a test contract
2. Submit for approval
3. Approve at each level
4. Check vendor email reception
5. Click Accept/Reject links
6. Verify status updates
7. Test version history
8. Test contract revision after rejection

---

## 📚 Additional Features to Consider (Future)

### Nice to Have
- [ ] **Bulk vendor reminders** - Send reminders to all pending responses
- [ ] **Contract templates** - Pre-fill common contract types
- [ ] **Digital signatures** - Integration with DocuSign/HelloSign
- [ ] **Contract analytics dashboard** - Approval times, acceptance rates
- [ ] **Automated reminders** - Cron job to remind vendors before expiry
- [ ] **PDF generation** - Generate PDF of contract for download
- [ ] **Multi-vendor comparison** - Compare responses from multiple vendors
- [ ] **Contract renewal alerts** - Notify before contract expiration
- [ ] **SLA monitoring** - Track SLA compliance automatically

---

## 🎓 Key Decisions Made

1. **No Database Schema Changes to Core Tables:** Only added nullable fields to existing tables
2. **Reused Existing Approval Infrastructure:** Leveraged existing Approval and ApprovalRule models
3. **Email-Based Vendor Access:** No vendor login required, secure token-based access
4. **Comprehensive Version Tracking:** Full snapshots instead of delta changes for simplicity
5. **Automatic Version Creation:** Versions created automatically on create/edit
6. **30-Day Default Expiry:** Configurable per request
7. **Status Flow:** DRAFT → APPROVED → SIGNED → ACTIVE
8. **Two-Level Approval:** Head of Procurement → Billing Engineer (configurable via ApprovalRule)

---

## 📞 Support & Questions

For questions or issues with this implementation, refer to:
- **Prisma Schema:** `prisma/schema.prisma` (lines 1038-1420)
- **Approval Routing:** `src/lib/approval-routing.ts`
- **Version Service:** `src/lib/contract-version-service.ts`
- **Vendor Response Service:** `src/lib/vendor-response-service.ts`
- **Email Templates:** `src/lib/email-service.ts` (lines 750+)

---

**Implementation Complete! ✅**  
**Ready for migration and testing.**
