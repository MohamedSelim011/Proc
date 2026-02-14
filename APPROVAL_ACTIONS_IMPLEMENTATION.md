# Approval Actions Implementation

## Overview
Added comprehensive approval controls for Head of Procurement and Billing Engineer to take action on pending contracts. Approvers can now **Approve**, **Request Edit**, or **Reject** contracts.

---

## Three Approval Actions

### 1. ✅ **Approve**
- Moves contract to next approval level
- If Level 1: Advances to Level 2 (Billing Engineer)
- If Level 2 (final): Marks contract as APPROVED and sends to vendor
- Comments are optional

### 2. 📝 **Request Edit** (Soft Rejection)
- Returns contract to DRAFT status with feedback
- Notifies contract creator via email
- Preserves approval history
- Contract can be edited and resubmitted
- Comments are required (explains what needs to be changed)
- Previous version is automatically saved

### 3. ❌ **Reject** (Hard Rejection)
- Permanently rejects the contract
- Returns contract to DRAFT status
- Clears approval reference
- Comments are required (explains reason for rejection)
- Contract can be revised and resubmitted

---

## UI Components Added

### Approval Buttons
Located in the "Approval Progress" section when contract status is `PENDING_APPROVAL`:

```typescript
- Only visible to users who can approve at current level
- Checks user role matches required role for level
- Level 1: HEAD_OF_PROCUREMENT only
- Level 2: BILLING_ENGINEER only
```

### Action Modal
Modal dialog for entering comments and confirming actions:
- **Approve**: Optional comments
- **Request Edit**: Required feedback/comments
- **Reject**: Required reason/comments
- Visual confirmation before action is taken

### Permission Checking
```typescript
const canApprove = 
  (currentLevel === 1 && userRole === 'HEAD_OF_PROCUREMENT') ||
  (currentLevel === 2 && userRole === 'BILLING_ENGINEER');
```

---

## Backend Implementation

### New API Endpoint

**File:** `src/app/api/service-contracts/[id]/request-edit/route.ts`

**Endpoint:** `POST /api/service-contracts/[id]/request-edit`

**Functionality:**
1. Validates user has permission for current level
2. Requires comments (feedback for creator)
3. Creates approval history entry with action `REQUEST_EDIT`
4. Updates contract status to `DRAFT`
5. Clears `approvalId` (allows resubmission)
6. Sends email notification to contract creator
7. Returns success message

**Request Body:**
```json
{
  "comments": "Please adjust the payment terms to net-30 and clarify SLA response times."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Edit requested successfully. Contract returned to DRAFT status and creator has been notified.",
  "editRequest": {
    "level": 1,
    "requestedBy": "Ali Procurement",
    "comments": "Please adjust the payment terms...",
    "status": "DRAFT"
  }
}
```

### Email Notification

Sent to contract creator when edit is requested:

**Subject:** `Edit Requested: [Contract Number]`

**Content:**
- Reviewer name and level
- Specific feedback/comments
- Action buttons to edit contract
- Instructions for next steps

---

## Frontend Changes

### File: `src/app/procurement/services/contracts/[id]/page.tsx`

#### Added State Variables
```typescript
const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'request-edit' | null>(null);
const [approvalComments, setApprovalComments] = useState('');
const [processingApproval, setProcessingApproval] = useState(false);
const [canApprove, setCanApprove] = useState(false);
const [currentUser, setCurrentUser] = useState<any>(null);
```

#### Added Functions
- `checkApprovalPermission()` - Determines if current user can approve
- `handleApprovalAction()` - Processes approve/reject/request-edit actions

#### Added UI Components
- Approval action buttons (visible only to eligible approvers)
- Action confirmation modal with comment field
- Real-time permission checking

---

## Database Schema Changes

### ApprovalHistory Model Updates

**File:** `prisma/schema.prisma`

Added fields to support current implementation:
```prisma
model ApprovalHistory {
  id             String          @id @default(cuid())
  approvalId     String
  approval       Approval        @relation(fields: [approvalId], references: [id], onDelete: Cascade)
  level          Int
  action         String // APPROVED, REJECTED, REQUEST_EDIT, etc.
  performedBy    String?
  approverId     String?    // NEW: User ID who performed action
  approverName   String?    // NEW: User name for display
  previousStatus ApprovalStatus?
  newStatus      ApprovalStatus?
  comments       String?
  metadata       Json?
  timestamp      DateTime?  // NEW: When action occurred
  createdAt      DateTime   @default(now())
  
  @@index([approvalId])
  @@index([performedBy])
  @@index([approverId])  // NEW
  @@index([level])
}
```

---

## User Flow Examples

### Scenario 1: Approve at Level 1

1. Head of Procurement logs in
2. Opens contract in PENDING_APPROVAL status
3. Sees "Take Action" buttons
4. Clicks "Approve"
5. Optionally enters comments
6. Confirms approval
7. Contract advances to Level 2 (Billing Engineer)
8. Billing Engineer receives notification

### Scenario 2: Request Edit at Level 1

1. Head of Procurement reviews contract
2. Finds issues (e.g., payment terms need clarification)
3. Clicks "Request Edit"
4. Enters specific feedback: "Please adjust payment terms to net-30"
5. Confirms request
6. Contract returns to DRAFT
7. Creator receives email with feedback
8. Creator edits contract
9. Version increments automatically on next submission

### Scenario 3: Reject at Level 2

1. Billing Engineer reviews contract
2. Finds fundamental issue
3. Clicks "Reject"
4. Enters rejection reason
5. Confirms rejection
6. Contract returns to DRAFT
7. Creator can revise and resubmit

---

## Workflow States

```
DRAFT → Submit → PENDING_APPROVAL (Level 1)
                        ↓
                   [HEAD_OF_PROCUREMENT]
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
    APPROVE      REQUEST_EDIT       REJECT
        ↓               ↓               ↓
 PENDING_APPROVAL    DRAFT           DRAFT
   (Level 2)     (with feedback) (with reason)
        ↓
 [BILLING_ENGINEER]
        ↓
 ┌──────┼──────┐
 ↓      ↓      ↓
APPROVE REQUEST REJECT
 ↓      ↓      ↓
APPROVED DRAFT DRAFT
 ↓
Send to Vendor
```

---

## Testing Checklist

### Permission Testing
- [ ] HEAD_OF_PROCUREMENT can take action at Level 1
- [ ] BILLING_ENGINEER can take action at Level 2
- [ ] Other roles cannot see action buttons
- [ ] Cannot approve level 2 until level 1 is complete
- [ ] Cannot approve same level twice

### Approve Action
- [ ] Optional comments work
- [ ] Level 1 approval advances to Level 2
- [ ] Level 2 approval marks contract as APPROVED
- [ ] Level 2 approval sends contract to vendor
- [ ] Approval history created correctly

### Request Edit Action
- [ ] Comments are required
- [ ] Contract returns to DRAFT
- [ ] approvalId is cleared
- [ ] Email sent to creator
- [ ] Approval history shows REQUEST_EDIT
- [ ] Creator can edit and resubmit
- [ ] Version increments on resubmission

### Reject Action
- [ ] Comments are required
- [ ] Contract returns to DRAFT
- [ ] approvalId is cleared
- [ ] Approval history shows REJECTED
- [ ] Creator can revise and resubmit

### UI/UX
- [ ] Modal appears for each action
- [ ] Comment field validation works
- [ ] Loading state shows while processing
- [ ] Success toast appears
- [ ] Page refreshes to show new status
- [ ] Action buttons disappear after action
- [ ] Modal can be canceled

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/service-contracts/[id]/approve` | POST | Approve contract | Yes (Approver) |
| `/api/service-contracts/[id]/reject` | POST | Reject contract | Yes (Approver) |
| `/api/service-contracts/[id]/request-edit` | POST | Request edits | Yes (Approver) |

---

## Key Files Modified

1. **Frontend:**
   - `src/app/procurement/services/contracts/[id]/page.tsx`

2. **Backend:**
   - `src/app/api/service-contracts/[id]/request-edit/route.ts` (NEW)
   - `src/app/api/service-contracts/[id]/approve/route.ts` (EXISTING)
   - `src/app/api/service-contracts/[id]/reject/route.ts` (EXISTING)

3. **Schema:**
   - `prisma/schema.prisma` (ApprovalHistory model updated)

---

## Migration Notes

Run migration to add new fields to `ApprovalHistory`:
- `approverId` (String, optional)
- `approverName` (String, optional)
- `timestamp` (DateTime, optional)

Make `newStatus` and `previousStatus` optional in `ApprovalHistory`.

---

## Email Template

The Request Edit email includes:
- Professional header
- Reviewer name and level
- Contract details
- Feedback/comments in highlighted box
- Clear next steps (numbered list)
- Direct link to edit contract
- Professional footer

---

## Benefits

### For Approvers
✅ Clear action buttons - no confusion  
✅ Ability to provide specific feedback  
✅ Soft rejection option (Request Edit)  
✅ Hard rejection option (Reject)  
✅ Comment field for documentation  

### For Contract Creators
✅ Receive specific feedback via email  
✅ Know exactly what needs to be changed  
✅ Can edit and resubmit easily  
✅ Version history preserved  
✅ No data loss  

### For Organization
✅ Better communication in approval process  
✅ Reduced back-and-forth  
✅ Audit trail of all actions  
✅ Professional workflow  
✅ Email notifications for transparency  

---

**Implementation Date:** February 12, 2026  
**Status:** ✅ Complete - Ready for Testing
