# Purchase Order Edit Colors and Approval Button Fixes

## Changes Made

### 1. ✅ Updated Edit Purchase Order Screen Colors to Wujha Primary Palette

**File: `src/app/procurement/purchase-orders/[id]/edit/page.tsx`**

**Color Updates:**
- ✅ Loading spinner: `border-blue-600` → `border-wujha-primary`
- ✅ Save button: `bg-blue-600 hover:bg-blue-700` → `bg-wujha-primary hover:bg-wujha-primary-hover`
- ✅ Progress step connector: `bg-blue-600` → `bg-wujha-primary`
- ✅ Active step circle: `bg-blue-600 border-blue-600` → `bg-wujha-primary border-wujha-primary`
- ✅ Current step border: `border-blue-600` → `border-wujha-primary`
- ✅ Step number text: `text-blue-600` → `text-wujha-primary`
- ✅ Selected PR card: `border-blue-500 bg-blue-50` → `border-wujha-primary bg-wujha-primary/10`
- ✅ Selected PR checkmark: `text-blue-600` → `text-wujha-primary`
- ✅ Selected vendor card: `border-blue-500 bg-blue-50` → `border-wujha-primary bg-wujha-primary/10`
- ✅ Selected vendor checkmark: `text-blue-600` → `text-wujha-primary`

**All Steps Updated:**
- Step 1: PR & Vendor selection
- Step 2: Delivery Details
- Step 3: Items & Pricing
- Step 4: Terms & Review

### 2. ✅ Added "Request Approval" Button to List Screen

**File: `src/app/procurement/purchase-orders/page.tsx`**

**Changes:**
1. **Added `Send` icon import** from lucide-react
2. **Created `handleRequestApproval` function:**
   ```typescript
   const handleRequestApproval = async (poId: string) => {
     // Confirms with user, then calls /api/purchase-orders/${poId}/submit
     // Shows success/error toast
     // Refreshes the orders list
   }
   ```
3. **Added "Request Approval" button in Actions column:**
   - Shows for DRAFT status POs
   - Only visible to users with `canSubmit` permission
   - Uses Send icon with Wujha primary color
   - Directly submits PO for approval without navigating to detail page

**Button Location:**
- In the ACTIONS column of the PO list table
- Appears as a Send icon (📤) in Wujha primary color
- Positioned between View and Edit buttons

### 3. ✅ Fixed "Request Approval" Button on Detail Page

**File: `src/app/procurement/purchase-orders/[id]/page.tsx`**

**Improvements:**
1. **Enhanced Permission Checks:**
   - Made role checking case-insensitive using `.toUpperCase()`
   - Added `SUPER_ADMIN` to allowed roles
   - Added `userEmployeeId` state for better creator matching
   - Allow creators to submit their own POs even if role doesn't match

2. **Updated Button Text:**
   - Changed from "Submit for Approval" to "Request Approval" (matches user request)

3. **Better Creator Detection:**
   ```typescript
   const isCreator = po?.createdBy === userId || po?.createdBy === userEmployeeId;
   const canSubmit = [...roles...].includes(userRole?.toUpperCase()) || isCreator;
   ```

4. **Enhanced Debug Logging:**
   - Added `userEmployeeId` to console logs
   - More detailed permission check logging

## Permission Matrix

### Who Can Request Approval:
- ✅ BUYER
- ✅ REQUESTOR
- ✅ PROCUREMENT_OFFICER
- ✅ PROCUREMENT_MANAGER
- ✅ ADMIN
- ✅ SUPER_ADMIN
- ✅ PO Creator (regardless of role)

### Who Can Approve:
- ✅ DEPARTMENT_MANAGER
- ✅ PROCUREMENT_MANAGER
- ✅ FINANCE_MANAGER
- ✅ ADMIN
- ✅ SUPER_ADMIN

## Testing Checklist

### Edit Screen Colors
- [ ] Open edit page for any PO
- [ ] Verify all blue colors are replaced with orange (Wujha primary)
- [ ] Check progress stepper uses orange for active steps
- [ ] Verify selected PR/vendor cards have orange borders
- [ ] Confirm Save button is orange

### Request Approval Button - List Screen
- [ ] Login as BUYER or REQUESTOR
- [ ] Go to Purchase Orders list
- [ ] Find a DRAFT status PO
- [ ] Verify "Request Approval" button (Send icon) is visible in Actions column
- [ ] Click the button
- [ ] Confirm dialog appears
- [ ] After approval, verify PO status changes to PENDING_APPROVAL
- [ ] Verify success toast appears

### Request Approval Button - Detail Screen
- [ ] Login as BUYER or REQUESTOR
- [ ] Open a DRAFT PO detail page
- [ ] Verify "Request Approval" button is visible in top right
- [ ] Click the button
- [ ] Verify PO status updates
- [ ] Check console logs for permission debugging info

### Permission Testing
- [ ] As REQUESTOR: Can see Request Approval button, cannot see Approve button
- [ ] As DEPARTMENT_MANAGER: Cannot see Request Approval, can see Approve button
- [ ] As PROCUREMENT_MANAGER: Can see both buttons
- [ ] As ADMIN: Can see both buttons

## Debugging Guide

If "Request Approval" button still doesn't show:

1. **Check Browser Console:**
   ```
   PO Detail - User Role: [your role]
   PO Detail - Permissions Check: { canSubmit: true/false, ... }
   ```

2. **Check localStorage:**
   ```javascript
   // In browser console
   console.log('Role:', localStorage.getItem('role'));
   console.log('User:', JSON.parse(localStorage.getItem('user')));
   ```

3. **Verify PO Status:**
   - Button only shows for DRAFT status
   - Check console log: `poStatus: 'DRAFT'`

4. **Check Role Matching:**
   - Role check is now case-insensitive
   - If your role is stored differently, it should still work
   - Creator can always submit their own PO

## Files Modified

1. `src/app/procurement/purchase-orders/[id]/edit/page.tsx` - Color updates
2. `src/app/procurement/purchase-orders/page.tsx` - Added Request Approval button
3. `src/app/procurement/purchase-orders/[id]/page.tsx` - Fixed button visibility and permissions

## Notes

- All color changes maintain the same visual hierarchy, just with Wujha primary color
- The Request Approval button works from both list and detail screens
- Permission checks are now more flexible (case-insensitive, creator override)
- Console logging helps debug permission issues
- API handles final permission validation on the server side

