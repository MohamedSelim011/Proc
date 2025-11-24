# Purchase Order Approval and Toast Fixes

## Changes Made

### 1. Replaced Alert with Toast Component in PO Creation

**File: `src/app/procurement/purchase-orders/new/page.tsx`**

- **Added**: Import for `useToast` hook from `@/components/ui/toast`
- **Updated**: `NewPurchaseOrderContent` function to use `showToast` hook
- **Replaced**: All `alert()` calls with toast notifications:
  - Success: `showToast('success', 'Purchase order created successfully!')`
  - Error: `showToast('error', data.error || 'Failed to create purchase order')`
  - General Error: `showToast('error', 'An error occurred while creating the purchase order')`

### 2. Fixed PO Approval Permissions

#### Issue
The approve and reject buttons were visible to requesters/buyers who should only be able to submit POs for approval, not approve them.

#### Solution

**File: `src/app/procurement/purchase-orders/[id]/page.tsx`**

Updated permission checks:

```typescript
// Check permissions
// Only Department Manager, Procurement Manager, Finance Manager, and Admin can approve
const canApprove = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN'].includes(userRole);
const isCreator = po?.createdBy === userId;
// Only Buyer (REQUESTOR), Procurement Officer (PROCUREMENT_MANAGER), and Admin can submit POs for approval
const canSubmit = ['BUYER', 'REQUESTOR', 'PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER', 'ADMIN'].includes(userRole);
```

**Roles that can submit POs for approval:**
- BUYER
- REQUESTOR
- PROCUREMENT_OFFICER
- PROCUREMENT_MANAGER
- ADMIN

**Roles that can approve POs:**
- DEPARTMENT_MANAGER
- PROCUREMENT_MANAGER
- FINANCE_MANAGER
- ADMIN

**File: `src/app/procurement/purchase-orders/[id]/approve/page.tsx`**

Added permission check to prevent unauthorized users from accessing the approval page:

```typescript
// Check if user has permission to approve
const hasApprovalPermission = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN'].includes(userRole);

// If user doesn't have permission, show warning
if (!hasApprovalPermission) {
  return (
    // ... Access Denied message with user's current role
  );
}
```

### 3. Added CreatedBy Field to PO Creation

**File: `src/app/procurement/purchase-orders/new/page.tsx`**

Updated `handleSubmit` to include the creator's ID:

```typescript
// Get current user ID
const userData = JSON.parse(localStorage.getItem('user') || '{}');
const createdBy = userData.employeeId || userData.id || '';

const submitData = {
  // ... other fields
  createdBy: createdBy
};
```

**File: `src/app/api/purchase-orders/route.ts`**

Updated the `POST` endpoint to save `createdBy`:

```typescript
const order = await prisma.purchaseOrder.create({
  data: {
    // ... other fields
    createdBy: body.createdBy || null,
    // ... items
  }
});
```

## Testing Checklist

### Toast Notifications
- [x] Create a new PO - verify success toast appears (green)
- [x] Create a PO with validation errors - verify error toast appears (red)
- [x] Verify toasts auto-dismiss after a few seconds

### PO Approval Permissions
- [x] As **BUYER/REQUESTOR**: Can see "Submit for Approval" button on DRAFT POs
- [x] As **BUYER/REQUESTOR**: Cannot see "Review & Approve" button on PENDING_APPROVAL POs
- [x] As **DEPARTMENT_MANAGER**: Can see "Review & Approve" button on PENDING_APPROVAL POs
- [x] As **PROCUREMENT_MANAGER**: Can see "Review & Approve" button on PENDING_APPROVAL POs
- [x] As **FINANCE_MANAGER**: Can see "Review & Approve" button on PENDING_APPROVAL POs
- [x] As **ADMIN**: Can both submit and approve POs
- [x] Verify approval page shows "Access Denied" for unauthorized users

### CreatedBy Tracking
- [x] Create a new PO and verify `createdBy` is set correctly
- [x] Verify creator cannot approve their own PO

## User Role Summary

| Role | Can Submit PO | Can Approve PO |
|------|---------------|----------------|
| BUYER | ✅ | ❌ |
| REQUESTOR | ✅ | ❌ |
| PROCUREMENT_OFFICER | ✅ | ❌ |
| DEPARTMENT_MANAGER | ❌ | ✅ |
| PROCUREMENT_MANAGER | ✅ | ✅ |
| FINANCE_MANAGER | ❌ | ✅ |
| ADMIN | ✅ | ✅ |

## Additional Notes

- The approval workflow prevents self-approval by checking `isCreator`
- All toast messages use the consistent Wujha design system
- Permission checks are performed both on the client-side (UI) and should be enforced on the server-side (API) for security

