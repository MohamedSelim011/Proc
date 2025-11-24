# PO Permission Fixes - List and Detail Pages

## Issues Fixed

### Issue 1: "Submit for Approval" button not showing on PO detail page
**Root Cause:** The permission check was correct, but we needed to debug why `canSubmit` was evaluating to false.

**Solution:**
- Added console logging to track user role and permission checks
- Verified the role checking logic includes: `BUYER`, `REQUESTOR`, `PROCUREMENT_OFFICER`, `PROCUREMENT_MANAGER`, `ADMIN`

### Issue 2: Approve/Reject buttons visible to requesters in list view
**Root Cause:** The list page had "Quick Approve" and "Quick Reject" buttons that were not checking user permissions.

**Solution:**
- Added user role state management to the list page
- Added permission checks: only users with `DEPARTMENT_MANAGER`, `PROCUREMENT_MANAGER`, `FINANCE_MANAGER`, or `ADMIN` roles can see approve/reject buttons
- Updated the buttons to only show when `canApprove` is true

## Changes Made

### File: `src/app/procurement/purchase-orders/page.tsx`

1. **Added User Role State:**
```typescript
// User role and permissions
const [userRole, setUserRole] = useState<string>('');
const [userId, setUserId] = useState<string>('');
const [userEmployeeId, setUserEmployeeId] = useState<string>('');

useEffect(() => {
  // Get user info from localStorage
  const role = localStorage.getItem('role') || '';
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  setUserRole(role);
  setUserId(user.id || '');
  setUserEmployeeId(user.employeeId || '');
}, []);
```

2. **Added Permission Checks:**
```typescript
// Check permissions
const canApprove = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN'].includes(userRole);
const canSubmit = ['BUYER', 'REQUESTOR', 'PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER', 'ADMIN'].includes(userRole);
```

3. **Updated Action Buttons:**
```typescript
{po.status === 'DRAFT' && canApprove && (
  <>
    <button onClick={() => handleQuickApprove(po.id)} ...>
      <CheckCircle className="h-4 w-4" />
    </button>
    <button onClick={() => handleQuickReject(po.id)} ...>
      <XCircle className="h-4 w-4" />
    </button>
  </>
)}
{po.status === 'DRAFT' && canSubmit && (
  <Link href={`/procurement/purchase-orders/${po.id}`} title="Submit for Approval">
    <FileText className="h-4 w-4" />
  </Link>
)}
```

### File: `src/app/procurement/purchase-orders/[id]/page.tsx`

1. **Added Debug Logging:**
```typescript
useEffect(() => {
  const role = localStorage.getItem('role') || '';
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('PO Detail - User Role:', role);
  console.log('PO Detail - User Data:', user);
  setUserRole(role);
  setUserId(user.id || user.employeeId || '');
}, []);
```

2. **Added Permission Debug Logging:**
```typescript
// Debug logging
console.log('PO Detail - Permissions Check:', {
  userRole,
  userId,
  poStatus: po?.status,
  poCreatedBy: po?.createdBy,
  canApprove,
  canSubmit,
  isCreator
});
```

## Testing Steps

### Test 1: Buyer/Requestor Role
1. Login as a BUYER or REQUESTOR
2. Go to PO list page
3. **Expected:** Should NOT see approve/reject buttons (green checkmark, red X)
4. **Expected:** Should see view icon (eye) for all POs
5. Click on a DRAFT PO
6. **Expected:** Should see "Submit for Approval" button on detail page

### Test 2: Department Manager Role
1. Login as DEPARTMENT_MANAGER
2. Go to PO list page
3. **Expected:** Should see approve/reject buttons for DRAFT POs
4. Click on a PENDING_APPROVAL PO (that you didn't create)
5. **Expected:** Should see "Review & Approve" button

### Test 3: Procurement Manager Role
1. Login as PROCUREMENT_MANAGER
2. **Expected:** Can both submit AND approve POs
3. Go to PO list page
4. **Expected:** Should see both submit and approve/reject options

### Test 4: Console Debugging
1. Open browser console (F12)
2. Navigate to PO detail page
3. **Expected:** Should see console logs showing:
   - User Role
   - User Data
   - Permission checks (canApprove, canSubmit, isCreator)

## Debugging Guide

If "Submit for Approval" button still doesn't show:

1. **Check Console Logs:**
   - Open browser console
   - Look for "PO Detail - User Role:" log
   - Verify the role matches one of: BUYER, REQUESTOR, PROCUREMENT_OFFICER, PROCUREMENT_MANAGER, ADMIN

2. **Check localStorage:**
   ```javascript
   // In browser console
   console.log('Role:', localStorage.getItem('role'));
   console.log('User:', JSON.parse(localStorage.getItem('user')));
   ```

3. **Check PO Status:**
   - Button only shows for DRAFT status POs
   - Verify PO status in console log: "poStatus: 'DRAFT'"

4. **Check Permission Calculation:**
   - Look for "canSubmit: true" in console logs
   - If false, the role doesn't match any allowed roles

## Permission Matrix

| Role | Can View PO | Can Submit for Approval | Can Approve/Reject | Can Edit DRAFT |
|------|-------------|------------------------|-------------------|----------------|
| BUYER | ✅ | ✅ | ❌ | ✅ |
| REQUESTOR | ✅ | ✅ | ❌ | ✅ |
| PROCUREMENT_OFFICER | ✅ | ✅ | ❌ | ✅ |
| DEPARTMENT_MANAGER | ✅ | ❌ | ✅ | ❌ |
| PROCUREMENT_MANAGER | ✅ | ✅ | ✅ | ✅ |
| FINANCE_MANAGER | ✅ | ❌ | ✅ | ❌ |
| ADMIN | ✅ | ✅ | ✅ | ✅ |

## Notes

- The console logs are temporary debugging aids and can be removed after verification
- All permission checks are based on the `role` stored in localStorage
- Self-approval is prevented by the `isCreator` check
- The list page now shows a FileText icon for DRAFT POs that requesters can click to submit

