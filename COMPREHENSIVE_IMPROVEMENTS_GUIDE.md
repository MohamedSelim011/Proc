# Implementation Guide: 4 Major Improvements

## Overview
This guide covers the implementation of:
1. Approval cycle for Purchase Orders
2. Success/Failure toasts for PR/PO operations
3. Wujha color palette for PO screens
4. Display employee names instead of IDs

---

## Task 1: Add Approval Cycle to Purchase Orders

### Database Schema Changes
The PurchaseOrder model needs approval-related fields. Add to `prisma/schema.prisma`:

```prisma
model PurchaseOrder {
  // ... existing fields ...
  
  approvalStatus POApprovalStatus @default(PENDING)
  submittedForApprovalAt DateTime?
  submittedBy String?
  
  // ... existing fields ...
}

enum POApprovalStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
}
```

Run: `npx prisma db push` and restart server

### API Routes

#### 1. Create `src/app/api/purchase-orders/[id]/submit/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { firstApproverId } = body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id }
    });

    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (po.approvalStatus !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft purchase orders can be submitted for approval' },
        { status: 400 }
      );
    }

    // Get user data from request or body
    const userData = JSON.parse(body.userData || '{}');
    const submittedBy = userData.employeeId || userData.id || 'unknown';

    // Update PO status
    const updatedPO = await prisma.$transaction([
      prisma.purchaseOrder.update({
        where: { id: params.id },
        data: {
          approvalStatus: 'PENDING_APPROVAL',
          submittedForApprovalAt: new Date(),
          submittedBy
        }
      }),
      prisma.approval.create({
        data: {
          documentType: 'PURCHASE_ORDER',
          documentId: params.id,
          poId: params.id,
          approverId: firstApproverId || 'manager001',
          status: 'PENDING',
          level: 1
        }
      })
    ]);

    return NextResponse.json({ success: true, po: updatedPO[0] });
  } catch (error) {
    console.error('Error submitting PO for approval:', error);
    return NextResponse.json(
      { error: 'Failed to submit purchase order for approval' },
      { status: 500 }
    );
  }
}
```

#### 2. Create `src/app/api/purchase-orders/[id]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, approverId, comments, level } = body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        approvals: true
      }
    });

    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Find the pending approval at the specified level
    const pendingApproval = po.approvals?.find(
      a => a.status === 'PENDING' && a.level === level
    );

    if (!pendingApproval) {
      return NextResponse.json(
        { error: 'No pending approval found at this level' },
        { status: 400 }
      );
    }

    // Update the approval
    await prisma.approval.update({
      where: { id: pendingApproval.id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approverId,
        comments,
        approvedAt: new Date()
      }
    });

    // Update PO status based on action
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        approvalStatus: newStatus
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing PO approval:', error);
    return NextResponse.json(
      { error: 'Failed to process purchase order approval' },
      { status: 500 }
    );
  }
}
```

### UI Changes

#### Update `src/app/procurement/purchase-orders/[id]/page.tsx`

Add approval buttons and request approval functionality (similar to PR details page):

```typescript
// Add to component
const [submitting, setSubmitting] = useState(false);
const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') || '' : '';
const userData = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
const userId = userData.id || '';
const canApprove = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN'].includes(userRole);

const handleRequestApproval = async () => {
  setSubmitting(true);
  try {
    const response = await fetch(`/api/purchase-orders/${po.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstApproverId: 'manager001',
        userData: localStorage.getItem('user')
      }),
    });

    if (response.ok) {
      showToast('success', 'Purchase order submitted for approval successfully!');
      fetchPO(); // Refresh
    } else {
      const data = await response.json();
      showToast('error', data.error || 'Failed to submit for approval');
    }
  } catch (error) {
    showToast('error', 'An error occurred');
  } finally {
    setSubmitting(false);
  }
};

// Add buttons in the Actions section
{po.approvalStatus === 'DRAFT' && (
  <button
    onClick={handleRequestApproval}
    disabled={submitting}
    className="inline-flex items-center px-4 py-2 bg-wujha-primary text-white rounded-md hover:bg-wujha-primary-hover"
  >
    <Send className="h-4 w-4 mr-2" />
    Request Approval
  </button>
)}

{(po.approvalStatus === 'PENDING_APPROVAL') && canApprove && (
  <Link
    href={`/procurement/purchase-orders/${po.id}/approve`}
    className="inline-flex items-center px-4 py-2 bg-wujha-primary text-white rounded-md hover:bg-wujha-primary-hover"
  >
    <CheckCircle className="h-4 w-4 mr-2" />
    Review & Approve
  </Link>
)}
```

---

## Task 2: Add Success/Failure Toasts

### Update PR Creation (`src/app/procurement/requisitions/new/page.tsx`)

```typescript
// Line ~210-220, replace console.error with toast
if (response.ok) {
  showToast('success', 'Purchase requisition created successfully!');
  router.push(`/procurement/requisitions/${data.id}`);
} else {
  showToast('error', data.error || 'Failed to create purchase requisition');
  setErrors({ submit: data.error || 'Failed to create purchase requisition' });
}
```

### Update PR Edit (`src/app/procurement/requisitions/[id]/edit/page.tsx`)

```typescript
// Add after successful update
showToast('success', 'Purchase requisition updated successfully!');
router.push(`/procurement/requisitions/${pr.id}`);
```

### Update PR Approval (`src/app/procurement/requisitions/[id]/approve/page.tsx`)

```typescript
// Line ~136-143, add toasts
if (response.ok) {
  showToast('success', `Purchase requisition ${action.toLowerCase()}d successfully!`);
  await fetchPR();
  setTimeout(() => {
    router.push('/procurement/requisitions');
  }, 2000);
} else {
  showToast('error', data.error || `Failed to ${action.toLowerCase()} purchase requisition`);
  setError(data.error || `Failed to ${action.toLowerCase()} purchase requisition`);
}
```

### Update PR Submit (`src/app/procurement/requisitions/[id]/page.tsx`)

```typescript
// Line ~164-170, already has toast - good!
if (response.ok) {
  showToast('success', 'Requisition submitted for approval successfully!');
  fetchPR();
}
```

### Update PO Creation (`src/app/procurement/purchase-orders/new/page.tsx`)

```typescript
// Line ~339-344
if (response.ok) {
  showToast('success', 'Purchase order created successfully!');
  router.push(`/procurement/purchase-orders/${data.id}`);
} else {
  showToast('error', data.error || 'Failed to create purchase order');
  setErrors({ submit: data.error || 'Failed to create purchase order' });
}
```

### Update PO Edit (`src/app/procurement/purchase-orders/[id]/edit/page.tsx`)

```typescript
// Add after successful save
showToast('success', 'Purchase order updated successfully!');
router.push(`/procurement/purchase-orders/${po.id}`);
```

---

## Task 3: Wujha Color Palette for PO Screens

### Update PO Creation (`src/app/procurement/purchase-orders/new/page.tsx`)

Replace all blue colors with wujha-primary:

```typescript
// Progress steps (around line 263)
className="bg-wujha-primary w-full" // instead of bg-blue-600

// Step indicators (around line 270-280)
className="bg-wujha-primary border-wujha-primary" // instead of blue-600
className="border-wujha-primary bg-white ring-wujha-primary/20" // instead of blue-600/blue-100
className="text-wujha-primary" // instead of text-blue-600

// Input focus states (throughout file)
className="focus:border-wujha-primary focus:ring-wujha-primary" // instead of blue-500

// Buttons
className="bg-wujha-primary hover:bg-wujha-primary-hover" // instead of blue-600/blue-500
className="focus:ring-wujha-primary" // instead of blue-500

// Status badges
className="bg-wujha-primary/10 text-wujha-primary" // instead of blue-100/blue-600

// Navigation dots
className="bg-wujha-primary" // instead of bg-blue-600
```

### Update PO Edit (`src/app/procurement/purchase-orders/[id]/edit/page.tsx`)

Same replacements as creation page.

---

## Task 4: Display Employee Name Instead of ID

### Option 1: Quick Fix - Store Employee Name on Creation

Update PR creation to store employee name:

```typescript
// src/app/procurement/requisitions/new/page.tsx
const userData = JSON.parse(localStorage.getItem('user') || '{}');
const requesterId = userData.employeeId || userData.id || 'emp001';
const requesterName = userData.name || 'Unknown User';

const submitData = {
  ...formData,
  requesterId,
  requesterName, // Add this field
  // ...
};
```

Add `requesterName` field to schema:

```prisma
model PurchaseRequisition {
  //...
  requesterId String?
  requesterName String? // Add this
  //...
}
```

### Option 2: Lookup on Display (Better but requires user mapping)

Create a user lookup service:

```typescript
// src/lib/userService.ts
export async function getUserName(userId: string): Promise<string> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (response.ok) {
      const user = await response.json();
      return user.name || userId;
    }
  } catch (error) {
    console.error('Error fetching user:', error);
  }
  return userId;
}
```

Use in displays:

```typescript
// Component
const [creatorName, setCreatorName] = useState<string>('');

useEffect(() => {
  if (pr.createdBy) {
    getUserName(pr.createdBy).then(setCreatorName);
  }
}, [pr.createdBy]);

// Display
<dd className="mt-1 text-sm text-gray-900">{creatorName || pr.createdBy}</dd>
```

### Option 3: Join with User Table (Best Practice)

Update API to include user data:

```typescript
// src/app/api/purchase-requisitions/[id]/route.ts
const requisition = await prisma.purchaseRequisition.findUnique({
  where: { id: params.id },
  include: {
    items: { include: { item: true } },
    approvals: true,
    creator: true, // If relation is enabled
  }
});
```

---

## Priority Implementation Order

1. **Task 2 (Toasts)** - Quickest, immediate UX improvement
2. **Task 3 (Colors)** - Visual consistency, find & replace
3. **Task 4 (Employee Names)** - Schema change needed
4. **Task 1 (PO Approval)** - Most complex, requires schema + API + UI changes

---

## Testing Checklist

- [ ] PO can be submitted for approval
- [ ] PO approval page shows for authorized users
- [ ] PO approval/rejection works
- [ ] Success toast appears on PR create
- [ ] Success toast appears on PR edit
- [ ] Success toast appears on PR approval
- [ ] Success toast appears on PO create
- [ ] Success toast appears on PO edit
- [ ] Error toasts appear on failures
- [ ] PO create screen uses Wujha colors
- [ ] PO edit screen uses Wujha colors
- [ ] Employee names show instead of IDs in PR list
- [ ] Employee names show instead of IDs in PO list
- [ ] Employee names show in details pages


