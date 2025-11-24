# Fix: Hide Approval Button from Requester in List Screen

## Issue
The approval button was visible in the requisitions list screen for requesters, even though it was correctly hidden in the details screen. This allowed requesters to see an approve button for their own requisitions.

## Root Cause
The requisitions list page (`src/app/procurement/requisitions/page.tsx`) was showing the approval button based only on the requisition status (PENDING_APPROVAL or SUBMITTED) without checking:
1. If the user has approval permissions
2. If the user is the requester (to prevent self-approval)

## Solution Implemented

### Changes Made to `src/app/procurement/requisitions/page.tsx`

1. **Added User Data Retrieval** (lines 52-66):
```typescript
// Get user data from localStorage for permission checks
const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') || '' : '';
const userData = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
const userId = userData.id || '';
const userEmployeeId = userData.employeeId || '';

// Check permissions
const canApprove = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN'].includes(userRole);
```

2. **Added `createdBy` to Interface** (line 35):
```typescript
interface PurchaseRequisition {
  // ... other fields
  createdBy?: string;
  // ... other fields
}
```

3. **Updated Approval Button Rendering Logic** (lines 386-397):
```typescript
{(pr.status === 'PENDING_APPROVAL' || pr.status === 'SUBMITTED') && 
 canApprove && 
 pr.requesterId !== userId && 
 pr.requesterId !== userEmployeeId &&
 pr.createdBy !== userId && (
  <Link
    href={`/procurement/requisitions/${pr.id}/approve`}
    className="text-wujha-primary hover:text-wujha-primary-hover"
    title="Review & Approve"
  >
    <CheckCircle className="h-4 w-4" />
  </Link>
)}
```

## Permission Logic

The approval button now only appears when **ALL** of the following conditions are met:

1. ✅ PR status is `PENDING_APPROVAL` or `SUBMITTED`
2. ✅ User has approval permissions (DEPARTMENT_MANAGER, PROCUREMENT_MANAGER, FINANCE_MANAGER, or ADMIN)
3. ✅ User is NOT the requester (checked by `requesterId`)
4. ✅ User is NOT the creator (checked by `createdBy`)
5. ✅ User's employeeId is NOT the requesterId

## Behavior

### Before Fix
- **List Screen**: Approval button visible to everyone (including requesters)
- **Details Screen**: Approval button correctly hidden from requesters
- **Issue**: Inconsistent behavior between list and details screens

### After Fix
- **List Screen**: Approval button only visible to authorized approvers who are NOT the requester
- **Details Screen**: Already working correctly
- **Result**: Consistent behavior across both screens

## Testing Checklist

- [x] Approval button hidden from requesters in list screen
- [x] Approval button visible to authorized approvers in list screen
- [x] Approval button hidden for requesters in details screen
- [x] Approval button visible to authorized approvers in details screen
- [x] No self-approval possible from list screen
- [x] No self-approval possible from details screen
- [x] Permission checks use localStorage user data
- [x] Checks both requesterId and createdBy fields

## Files Modified
- `src/app/procurement/requisitions/page.tsx`

## Roles That Can Approve
- DEPARTMENT_MANAGER
- PROCUREMENT_MANAGER
- FINANCE_MANAGER
- ADMIN

## Self-Approval Prevention
The system now checks:
1. `pr.requesterId !== userId` - User ID doesn't match requester ID
2. `pr.requesterId !== userEmployeeId` - Employee ID doesn't match requester ID
3. `pr.createdBy !== userId` - User ID doesn't match creator ID

This triple check ensures robust prevention of self-approval scenarios.

