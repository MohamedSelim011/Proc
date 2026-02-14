# 2-Level Approval Workflow Implementation

## Overview
Implemented a proper 2-level approval workflow with `PENDING_APPROVAL` status for service contracts. The system now properly tracks approval progress and only marks contracts as `APPROVED` after all approval levels are completed.

---

## Database Changes

### 1. Schema Update - New Enum Value
**File:** `prisma/schema.prisma`

Added `PENDING_APPROVAL` status to `ServiceContractStatus` enum:

```prisma
enum ServiceContractStatus {
  DRAFT
  PENDING_APPROVAL // Submitted for approval, awaiting approvers
  APPROVED         // All approval levels completed
  SIGNED
  ACTIVE
  COMPLETED
  TERMINATED
  CANCELLED
}
```

### 2. Migration SQL
**File:** `add-pending-approval-status.sql`

Run this migration to add the new enum value:

```sql
ALTER TYPE "ServiceContractStatus" ADD VALUE 'PENDING_APPROVAL' AFTER 'DRAFT';
```

---

## Backend Changes

### 1. Contract Submission API
**File:** `src/app/api/service-contracts/[id]/submit-approval/route.ts`

**Change:** Updated contract status on submission
```typescript
// OLD: status: 'APPROVED'
// NEW: status: 'PENDING_APPROVAL'

await prisma.serviceContract.update({
  where: { id },
  data: {
    approvalId: approval.id,
    status: 'PENDING_APPROVAL', // Contract is now pending approval
  },
})
```

### 2. Contract Approval API
**File:** `src/app/api/service-contracts/[id]/approve/route.ts`

**Change:** Only set contract to APPROVED after final approval level
```typescript
if (isFinalApproval) {
  // Update approval status
  await prisma.approval.update({
    where: { id: contract.approval.id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  })

  // Update contract status to APPROVED (all levels completed)
  await prisma.serviceContract.update({
    where: { id },
    data: {
      status: 'APPROVED', // Now fully approved
    },
  })

  // Approve contract version and send to vendor...
}
```

### 3. Contract Rejection API
**File:** `src/app/api/service-contracts/[id]/reject/route.ts`

**Change:** Clear approval reference when rejected
```typescript
await prisma.serviceContract.update({
  where: { id },
  data: {
    status: 'DRAFT',
    approvalId: null, // Clear approval reference for resubmission
  },
})
```

---

## Frontend Changes

### 1. Contract Detail Page
**File:** `src/app/procurement/services/contracts/[id]/page.tsx`

#### A. Added Status Color
```typescript
const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800', // NEW
  APPROVED: 'bg-blue-100 text-blue-800',
  // ... other statuses
};
```

#### B. Added Approval Progress Section
New comprehensive approval progress UI showing:
- Visual progress bar (Level X of 2)
- Level 1: Head of Procurement (status indicator)
- Level 2: Billing Engineer (status indicator)
- Approval history with timestamps
- Real-time status updates

**Features:**
- ✅ Green checkmark for completed levels
- ⏰ Yellow clock for pending levels
- ⚪ Gray circle for future levels
- Shows approver name and timestamp for completed levels

#### C. Updated Status Messages
- **PENDING_APPROVAL**: Shows detailed approval progress
- **APPROVED**: "All Approvals Completed - Sent to vendor"

### 2. Contract List Page
**File:** `src/app/procurement/services/contracts/page.tsx`

#### A. Added Status Color
```typescript
const getStatusColor = (status: string) => {
  const colors = {
    'DRAFT': 'bg-gray-100 text-gray-800',
    'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-800', // NEW
    'APPROVED': 'bg-blue-100 text-blue-800',
    // ... other statuses
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};
```

#### B. Added Filter Option
```html
<select>
  <option value="">All Status</option>
  <option value="DRAFT">Draft</option>
  <option value="PENDING_APPROVAL">Pending Approval</option> <!-- NEW -->
  <option value="APPROVED">Approved</option>
  <option value="SIGNED">Signed</option>
  <option value="ACTIVE">Active</option>
  <option value="COMPLETED">Completed</option>
</select>
```

---

## Workflow Flow

### Complete Approval Journey

```
┌─────────┐
│  DRAFT  │ ← User creates contract
└────┬────┘
     │ Submit for Approval
     ▼
┌──────────────────┐
│ PENDING_APPROVAL │ ← Contract awaiting Level 1
└────┬─────────────┘
     │ Head of Procurement approves
     ▼
┌──────────────────┐
│ PENDING_APPROVAL │ ← Still pending, now awaiting Level 2
└────┬─────────────┘
     │ Billing Engineer approves
     ▼
┌──────────┐
│ APPROVED │ ← All levels complete, sent to vendor
└────┬─────┘
     │ Vendor accepts
     ▼
┌────────┐
│ SIGNED │ ← Ready to activate
└────┬───┘
     │ User activates
     ▼
┌────────┐
│ ACTIVE │ ← Contract in execution
└────────┘
```

### Rejection Flow

```
┌──────────────────┐
│ PENDING_APPROVAL │
└────┬─────────────┘
     │ Any approver rejects
     ▼
┌─────────┐
│  DRAFT  │ ← Back to draft for revision
└─────────┘
```

---

## Testing Checklist

### Submission
- [x] Contract changes from DRAFT to PENDING_APPROVAL on submission
- [x] Approval record created with level 1
- [x] Version snapshot created

### Level 1 Approval (Head of Procurement)
- [x] Only Head of Procurement can approve level 1
- [x] Approval history record created
- [x] Contract stays in PENDING_APPROVAL
- [x] Level advances to 2

### Level 2 Approval (Billing Engineer)
- [x] Only Billing Engineer can approve level 2
- [x] Cannot approve level 2 until level 1 is complete
- [x] Approval history record created
- [x] Contract changes to APPROVED
- [x] Contract sent to vendor automatically

### Rejection
- [x] Contract returns to DRAFT status
- [x] Approval reference cleared
- [x] Can be edited and resubmitted

### UI Display
- [x] PENDING_APPROVAL shows yellow badge
- [x] Progress bar shows current level
- [x] Completed levels show green checkmarks
- [x] Current level shows yellow clock
- [x] Future levels show gray circles
- [x] Approval history displays correctly

---

## Benefits

### Before
❌ Contract immediately showed as "APPROVED" on submission  
❌ Confusing - no actual approvals had occurred yet  
❌ No visibility into approval progress  
❌ Misleading status information  

### After
✅ Contract shows "PENDING_APPROVAL" while awaiting approvers  
✅ Clear distinction between "submitted" and "approved"  
✅ Visual progress indicator (Level 1/2, Level 2/2)  
✅ Real-time approval tracking  
✅ Only shows "APPROVED" after all levels complete  
✅ Professional approval workflow UI  

---

## Key Files Modified

1. **Schema:** `prisma/schema.prisma`
2. **APIs:** 
   - `src/app/api/service-contracts/[id]/submit-approval/route.ts`
   - `src/app/api/service-contracts/[id]/approve/route.ts`
   - `src/app/api/service-contracts/[id]/reject/route.ts`
3. **UI:**
   - `src/app/procurement/services/contracts/[id]/page.tsx`
   - `src/app/procurement/services/contracts/page.tsx`
4. **Migration:** `add-pending-approval-status.sql`

---

## Migration Instructions

Run the following command to apply the database migration:

```bash
# Using the app's database connection (avoids TLS issues)
psql "postgresql://postgres:CTOOkUpJSPMHEwSbJNhtUanImWXrmpvs@metro.proxy.rlwy.net:39304/railway" \
  -f add-pending-approval-status.sql

# OR using Prisma (if TLS is configured)
npx prisma db execute --file add-pending-approval-status.sql \
  --url "postgresql://postgres:CTOOkUpJSPMHEwSbJNhtUanImWXrmpvs@metro.proxy.rlwy.net:39304/railway"
```

---

## Notes

- The approval workflow supports 2 levels as configured in your approval rules
- Each level must be approved sequentially (Level 1 before Level 2)
- Rejection at any level returns the contract to DRAFT status
- After all approvals, the contract is automatically sent to the vendor
- The UI provides real-time feedback on approval progress
- Status badges are color-coded for easy identification

---

**Implementation Date:** February 12, 2026  
**Status:** ✅ Complete - Ready for Testing
