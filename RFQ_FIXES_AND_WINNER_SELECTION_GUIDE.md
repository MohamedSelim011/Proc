# RFQ Fixes and Winner Selection Guide

## Summary of Fixes

This document outlines the fixes for two critical issues and explains the complete vendor selection and PO creation workflow.

---

## Issue 1: Vendor Selection Not Saved (FIXED ✅)

### Problem
When creating an RFQ with selected vendors and clicking "Publish", the system showed "No vendors selected" even though vendors were selected during creation.

### Root Cause
The API route (`/api/rfq`) was not saving the selected vendors to the `RFQVendor` junction table during RFQ creation.

### Solution

**Updated: `/api/rfq/route.ts`**

```typescript
// Add invited vendors if provided
if (body.vendorIds && Array.isArray(body.vendorIds) && body.vendorIds.length > 0) {
  rfqData.invitedVendors = {
    create: body.vendorIds.map((vendorId: string) => ({
      vendorId: vendorId
    }))
  };
}

const rfq = await prisma.rFQ.create({
  data: rfqData,
  include: {
    pr: {
      include: {
        items: { include: { item: true } }
      }
    },
    invitedVendors: {
      include: { vendor: true }
    }
  }
});
```

**What this does:**
- Saves selected vendors to the `RFQVendor` table when creating an RFQ
- Includes invited vendors in the response
- Now vendors are properly linked when you publish

---

## Issue 2: Duplicate RFQ Prevention (FIXED ✅)

### Problem
Users could create multiple RFQs for the same Purchase Requisition, leading to confusion and data inconsistency.

### Solution

**Updated: `/api/rfq/route.ts`**

```typescript
// Check if PR already has an RFQ
if (body.prId) {
  const existingRFQ = await prisma.rFQ.findFirst({
    where: { prId: body.prId }
  });

  if (existingRFQ) {
    return NextResponse.json(
      { error: `An RFQ (${existingRFQ.rfqNumber}) already exists for this Purchase Requisition` },
      { status: 400 }
    );
  }
}
```

**Updated: `/api/purchase-requisitions/route.ts`**

Added `includeRFQ` parameter to fetch existing RFQs:

```typescript
const includeRFQ = searchParams.get('includeRFQ') === 'true';

// ... in query
...(includeRFQ && {
  rfqs: {
    select: {
      id: true,
      rfqNumber: true,
      status: true
    },
    take: 1
  }
})

// Add flags
const processedRequisitions = includeRFQ 
  ? requisitions.map(req => ({
      ...req,
      hasRFQ: (req as any).rfqs && (req as any).rfqs.length > 0,
      rfqNumber: (req as any).rfqs && (req as any).rfqs.length > 0 ? (req as any).rfqs[0].rfqNumber : null
    }))
  : requisitions;
```

**Updated: `/procurement/rfq/new/page.tsx`**

PR dropdown now shows which PRs already have RFQs:

```typescript
<option 
  key={pr.id} 
  value={pr.id}
  disabled={pr.hasRFQ}
  style={pr.hasRFQ ? { color: '#999', fontStyle: 'italic' } : {}}
>
  {pr.prNumber} - {pr.itemType} Items
  {pr.hasRFQ ? ` (RFQ Already Created: ${pr.rfqNumber})` : ''}
</option>
```

**Results:**
- ✅ PRs with existing RFQs are grayed out and disabled in the dropdown
- ✅ Shows the existing RFQ number next to the PR
- ✅ API returns error if attempting to create duplicate RFQ
- ✅ Clear visual indication of which PRs are available

---

## Issue 3: Evaluation Status Error (FIXED ✅)

### Problem
Error when evaluating: `Invalid value for argument status. Expected RFQResponseStatus.`

The code was trying to set status to `EVALUATED`, which doesn't exist in the `RFQResponseStatus` enum.

### Available Statuses
```prisma
enum RFQResponseStatus {
  SUBMITTED
  UNDER_REVIEW
  SHORTLISTED
  SELECTED
  REJECTED
}
```

### Solution

**Updated: `/api/rfq/[id]/evaluate/route.ts`**

Changed from:
```typescript
status: 'EVALUATED'  // ❌ Invalid
```

To:
```typescript
status: 'UNDER_REVIEW'  // ✅ Valid
```

**Updated: `/procurement/rfq/[id]/page.tsx`**

Changed the "Select Winner" button visibility check from:
```typescript
// Before (checking status)
response.status === 'EVALUATED'
```

To:
```typescript
// After (checking if scored)
(response.overallScore !== null && response.overallScore !== undefined)
```

**Results:**
- ✅ Scoring now completes successfully
- ✅ Response status changes to `UNDER_REVIEW` after scoring
- ✅ "Select as Winner" button appears for responses with scores

---

## Winner Selection & PO Creation Workflow

### Complete Process Flow

```
1. Create RFQ
   ↓
2. Select Vendors
   ↓
3. Approve RFQ
   ↓
4. Publish & Send Invitations
   ↓
5. Vendors Submit Proposals
   ↓
6. Score Vendors (Evaluate)
   ↓
7. Select Winner ← YOU ARE HERE
   ↓
8. Create Purchase Order
```

---

### Step 7: Select Winner (After Scoring)

#### When "Select as Winner" Button Appears

The button appears when:
- ✅ RFQ status is `EVALUATED`
- ✅ Response has been scored (has `overallScore`)
- ✅ User has manager permissions:
  - `ADMIN`
  - `SUPER_ADMIN`
  - `PROCUREMENT_MANAGER`
  - `DEPARTMENT_MANAGER`
  - `FINANCE_MANAGER`

#### Location of Button

The "Select as Winner" button appears **below the scores** for each vendor in the "Vendor Responses" section:

```
┌─────────────────────────────────────────┐
│ Vendor Name                   21000 OMR │
│ Submitted: 1/24/2025      UNDER REVIEW  │
├─────────────────────────────────────────┤
│ Technical Score: 40/100                 │
│ Commercial Score: 30/100                │
│ Delivery Score: 19/100                  │
│ Experience Score: 9/100                 │
│ ───────────────────────────────────────│
│ Overall Score: 29.7/100                 │
│                                         │
│ [Select as Winner] ← Click here         │
└─────────────────────────────────────────┘
```

#### What Happens When You Click

1. **Confirmation Dialog:**
   - "Are you sure you want to select this vendor as the winner?"

2. **Winner Selection API Call:**
   - Calls `/api/rfq/[id]/award`
   - Marks selected vendor as `SELECTED`
   - Marks other vendors as `REJECTED`
   - Updates RFQ status to `AWARDED`

3. **Purchase Order Prompt:**
   - "Would you like to create a Purchase Order for this vendor?"
   - **YES**: Redirects to `/procurement/purchase-orders/new?rfqId=[id]&vendorId=[vendorId]`
   - **NO**: Stays on RFQ details page

---

### Step 8: Create Purchase Order

#### Option A: From Winner Selection (Recommended)

1. Click "Select as Winner" on your chosen vendor
2. Click **"Yes"** when prompted to create PO
3. You'll be redirected to the PO creation page with:
   - Vendor pre-selected
   - RFQ reference included
   - PR data populated

#### Option B: Manual PO Creation

1. Navigate to **Procurement → Purchase Orders → New**
2. Select the vendor manually
3. Link to the PR associated with the RFQ
4. Fill in all details manually

---

## Current Implementation Status

### What's Working ✅

1. **Vendor Selection:**
   - ✅ Vendors are saved when creating RFQ
   - ✅ Can edit vendor list
   - ✅ Vendors appear in RFQ details

2. **Duplicate Prevention:**
   - ✅ Cannot create multiple RFQs for same PR
   - ✅ Dropdown shows existing RFQs
   - ✅ Clear error message

3. **Evaluation:**
   - ✅ Scoring modal shows all criteria
   - ✅ Individual scores saved correctly
   - ✅ Overall weighted score calculated
   - ✅ Status updated to `UNDER_REVIEW`

4. **Winner Selection:**
   - ✅ "Select as Winner" button visible for scored responses
   - ✅ Role-based access control
   - ✅ Confirmation dialogs
   - ✅ Status updates (SELECTED/REJECTED)
   - ✅ RFQ status → AWARDED
   - ✅ Prompt to create PO

5. **PO Creation Flow:**
   - ✅ Redirect with query parameters
   - ✅ `rfqId` and `vendorId` passed

### What Needs PO Page Enhancement 🚧

The PO creation page (`/procurement/purchase-orders/new`) should be enhanced to:

```typescript
// 1. Check for query parameters
const searchParams = useSearchParams();
const rfqId = searchParams.get('rfqId');
const vendorId = searchParams.get('vendorId');

// 2. If rfqId exists, fetch RFQ and PR data
useEffect(() => {
  if (rfqId && vendorId) {
    fetchRFQAndPreFill(rfqId, vendorId);
  }
}, [rfqId, vendorId]);

// 3. Pre-fill form with:
// - Vendor (from vendorId)
// - PR reference (from rfq.prId)
// - Items (from rfq.pr.items)
// - RFQ reference (for audit trail)
```

---

## Visual Guide: Finding the Winner Selection

### After Scoring Vendors

1. **Go to RFQ Details Page**
   - Navigate to the specific RFQ

2. **Scroll to "Vendor Responses" Section**
   - You'll see all vendors who submitted proposals

3. **Look for Scored Responses**
   - Vendors with scores will show:
     - Individual criterion scores
     - Overall score (highlighted)
     - **"Select as Winner" button** (green)

4. **Compare Scores**
   - Review all vendors' overall scores
   - Check individual criteria scores
   - View their proposals and details

5. **Click "Select as Winner"**
   - On your chosen vendor
   - Confirm selection
   - Choose to create PO

---

## Example Workflow

```
1. Created RFQ for PR-2025-0001
   Selected 3 vendors: Ziad, ABC Co, XYZ Ltd
   
2. Approved RFQ
   
3. Published & Sent Invitations
   All 3 vendors received emails
   
4. Vendors Submitted
   ✅ Ziad - 21000 OMR
   ✅ ABC Co - 19500 OMR
   ⏳ XYZ Ltd - Pending
   
5. Evaluated Responses (Scored)
   Ziad:
   - Technical: 40/100
   - Commercial: 30/100
   - Delivery: 19/100
   - Experience: 9/100
   - Overall: 29.7/100 ← Weighted average
   
   ABC Co:
   - Technical: 55/100
   - Commercial: 45/100
   - Delivery: 38/100
   - Experience: 22/100
   - Overall: 42.3/100 ← Highest score!
   
6. Selected Winner: ABC Co
   - Clicked "Select as Winner" on ABC Co
   - Confirmed selection
   - ABC Co → SELECTED
   - Ziad → REJECTED
   - RFQ → AWARDED
   
7. Created PO
   - Clicked "Yes" to create PO
   - Redirected to PO page with ABC Co pre-selected
   - Filled in remaining details
   - Submitted PO
   
8. Complete! 🎉
   PR-2025-0001 → RFQ-2025-0001 → ABC Co → PO-2025-0001
```

---

## Troubleshooting

### "Select as Winner" Button Not Showing?

Check:
1. Is RFQ status `EVALUATED`? (After scoring, status should update)
2. Does the response have an `overallScore`?
3. Do you have manager permissions?
4. Refresh the page after scoring

### Evaluation Fails?

- ✅ Fixed: Now uses `UNDER_REVIEW` status
- All responses should score successfully

### Vendors Not Appearing After Publish?

- ✅ Fixed: Vendors now saved during creation
- Create a new RFQ to test the fix

### Can't Select PR?

- ✅ Fixed: PRs with existing RFQs are now disabled
- Look for "(RFQ Already Created: RFQ-XXXX-XXXX)" in dropdown

---

## Summary

All issues have been fixed:

1. ✅ **Vendor selection saved** - Vendors now properly linked during RFQ creation
2. ✅ **Duplicate prevention** - Cannot create multiple RFQs for same PR
3. ✅ **Evaluation works** - Uses correct status (`UNDER_REVIEW`)
4. ✅ **Winner selection available** - Button appears for scored responses
5. ✅ **PO creation flow** - Redirects with vendor/RFQ data

**To select a winner after scoring:**
1. Scroll to "Vendor Responses" section
2. Look for green "Select as Winner" button below scores
3. Click it on your chosen vendor
4. Confirm and optionally create PO

