# Notification & Approval System - Complete Integration Guide

## 🎉 System Overview

The complete RBAC + RACI notification and approval system has been implemented! This system provides:

1. **Role-Based Access Control (RBAC)** - 48 permissions across 11 modules
2. **Dynamic Approval Routing** - Multi-level approvals based on document type and amount
3. **RACI Matrix** - Responsible, Accountable, Consulted, Informed workflows
4. **Real-time Notifications** - Bell icon with unread count
5. **Approval Queue** - Dedicated page for pending approvals
6. **Consultation Workflow** - Request and respond to consultations
7. **Role-Based Navigation** - UI adapts to user permissions

---

## 📁 Files Created

### Backend APIs
- `/src/app/api/notifications/unread-count/route.ts` - Get unread notification count
- `/src/app/api/notifications/route.ts` - List & mark all notifications as read
- `/src/app/api/notifications/[id]/mark-read/route.ts` - Mark single notification as read
- `/src/app/api/consultations/pending/route.ts` - Get pending consultations
- `/src/app/api/consultations/[id]/respond/route.ts` - Respond to consultation
- `/src/app/api/approvals/pending/route.ts` - Get pending approvals
- `/src/app/api/approvals/[id]/approve/route.ts` - Approve document
- `/src/app/api/approvals/[id]/reject/route.ts` - Reject document

### Services
- `/src/lib/approval-routing.ts` - Dynamic approval routing engine
- `/src/lib/notification-service.ts` - Notification management for INFORMED parties
- `/src/lib/consultation-service.ts` - Consultation workflow for CONSULTED parties
- `/src/lib/approval-service.ts` - Approval actions (approve/reject)

### Frontend Components
- `/src/components/NotificationBell.tsx` - Bell icon with red badge
- `/src/components/NotificationDropdown.tsx` - Notification list dropdown
- `/src/components/AppHeader.tsx` - Main header with role-based navigation
- `/src/hooks/usePermissions.ts` - Client-side permission checking hook

### Pages
- `/src/app/approvals/page.tsx` - Approval queue with approve/reject actions
- `/src/app/consultations/page.tsx` - Consultation requests with response form

### Database Seeds
- `/prisma/seed-approval-rules.ts` - 8 approval rules with 22 routing steps

---

## 🚀 How to Use

### 1. Add AppHeader to Your Layout

Update your main layout to include the header:

```tsx
// src/app/layout.tsx
import { AppHeader } from '@/components/AppHeader'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          <AppHeader />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

### 2. Role-Based Rendering in Pages

Use the `usePermissions` hook to show/hide UI elements:

```tsx
'use client'

import { usePermissions } from '@/hooks/usePermissions'

export default function MyPage() {
  const { hasPermission, hasAnyPermission } = usePermissions()

  return (
    <div>
      {hasPermission('pr.create') && (
        <Button>Create Purchase Requisition</Button>
      )}

      {hasAnyPermission(['pr.approve', 'po.approve']) && (
        <Link href="/approvals">View Pending Approvals</Link>
      )}
    </div>
  )
}
```

### 3. Initialize Approval Workflow

When a user creates a PR/PO/Invoice, initialize the approval workflow:

```typescript
import {
  initializeApprovalWorkflow,
  buildApprovalRoutingPlan,
} from '@/lib/approval-routing'
import {
  sendInformedNotifications,
  notifyApprovalSubmitted,
} from '@/lib/notification-service'
import { requestConsultations } from '@/lib/consultation-service'

// Step 1: Create the document (PR, PO, Invoice)
const purchaseRequisition = await prisma.purchaseRequisition.create({
  data: {
    prNumber: 'PR-001',
    estimatedCost: 75000,
    department: 'IT',
    // ... other fields
  },
})

// Step 2: Initialize approval workflow
const routingPlan = await initializeApprovalWorkflow({
  documentType: 'PR',
  amount: 75000,
  departmentId: 'IT',
  createdBy: session.user.id,
})

if (routingPlan) {
  // Step 3: Create approval records for each level
  for (const step of routingPlan.steps) {
    await prisma.approval.create({
      data: {
        documentType: 'PR',
        documentId: purchaseRequisition.id,
        purchaseRequisitionId: purchaseRequisition.id,
        level: step.level,
        approverId: step.eligibleApprovers[0], // Assign to first eligible approver
        status: 'PENDING',
        routingRuleId: routingPlan.ruleId,
      },
    })
  }

  // Step 4: Send notifications to INFORMED parties
  await notifyApprovalSubmitted(
    'PR',
    purchaseRequisition.id,
    routingPlan.notifyUsers,
    session.user.name || 'User',
    75000
  )

  // Step 5: Request consultations from CONSULTED parties
  await requestConsultations(
    'PR',
    purchaseRequisition.id,
    routingPlan.consultUsers
  )
}
```

### 4. Approval Workflow

The system automatically handles multi-level approvals:

1. **User creates PR for $75,000**
   - System matches "PR Approval - High Value" rule
   - Creates 3 approval levels:
     - Level 1: Procurement Manager (24h timeout)
     - Level 2: Budget Controller (48h timeout)
     - Level 3: Finance Manager (72h timeout)
   - Notifies ADMIN (INFORMED)

2. **Procurement Manager logs in**
   - Sees notification bell with red badge: "1"
   - Clicks bell, sees "PR #abc... awaiting approval"
   - Goes to `/approvals` page
   - Sees PR card with "Approve" and "Reject" buttons
   - Clicks "Approve" → Level 1 complete

3. **Budget Controller logs in**
   - Now sees the PR in their approval queue
   - Approves → Level 2 complete

4. **Finance Manager logs in**
   - Sees PR in approval queue
   - Approves → Level 3 complete → **PR fully approved!**

5. **INFORMED parties**
   - ADMIN user receives notifications at each stage
   - Can click to view progress

---

## 📊 Approval Rules (Seeded)

The system comes with 8 pre-configured approval rules:

### Purchase Requisitions
- **Low (<$10K)**: 1 level - Procurement Manager
- **Medium ($10-50K)**: 2 levels - Procurement Manager → Budget Controller
- **High (>$50K)**: 3 levels - Procurement Manager → Budget Controller → Finance Manager

### Purchase Orders
- **Low (<$20K)**: 1 level - Procurement Manager
- **High (>$20K)**: 2 levels - Procurement Manager → Finance Manager

### Invoices
- **Standard**: 1 level - Finance Manager

### Payments
- **Low (<$30K)**: 1 level - Finance Manager
- **High (>$30K)**: 2 levels - Finance Manager → Admin

---

## 🔔 Notification Features

### Bell Icon
- Shows unread notification count in red badge
- Auto-refreshes every 30 seconds
- Click to open dropdown

### Notification Dropdown
- Last 20 notifications
- Unread notifications highlighted in blue
- Click to mark as read
- "Mark all as read" button
- Shows time elapsed ("2 hours ago")

### Notification Types
- **Approval Submitted** - New document awaiting approval
- **Approval Level Completed** - Someone approved/rejected
- **Approval Complete** - All levels approved
- **Consultation Requested** - Your input needed

---

## 👥 Role-Based Navigation

The `AppHeader` component automatically shows/hides menu items based on permissions:

```typescript
// Example: Finance Manager sees:
- Dashboard ✓
- Approvals ✓ (has invoice.approve, payment.approve)
- Purchase Requisitions ✓ (has pr.read)
- Purchase Orders ✓ (has po.read)
- Invoices ✓ (has invoice.read)
- Payments ✓ (has payment.read)
- Reports ✓ (has reports.view)
// Hidden: Users, Permissions, Settings

// Example: Site Engineer sees:
- Dashboard ✓
- Consultations ✓
- Purchase Requisitions ✓ (has pr.create, pr.read)
// Hidden: Everything else
```

---

## 🎨 UI Components

### Approval Queue Page (`/approvals`)
- Lists all pending approvals for current user
- Shows document type, ID, level, time ago
- Green "Approve" button
- Red "Reject" button
- Modal for confirmation with comments field
- Real-time removal from list after action

### Consultations Page (`/consultations`)
- Lists all pending consultation requests
- Purple "Respond" button
- Modal with:
  - Recommendation selector (Approve / Neutral / Reject)
  - Comments textarea
  - Submit button

---

## 🔐 Permission Codes

All 48 permissions are organized by module:

### Users
- `users.create`, `users.read`, `users.update`, `users.delete`, `users.reset_password`

### Purchase Requisitions
- `pr.create`, `pr.read`, `pr.update`, `pr.approve`, `pr.reject`

### Purchase Orders
- `po.create`, `po.read`, `po.update`, `po.approve`, `po.cancel`

### Invoices
- `invoice.create`, `invoice.read`, `invoice.update`, `invoice.approve`, `invoice.reject`

### Payments
- `payment.create`, `payment.read`, `payment.update`, `payment.approve`, `payment.execute`

And 5 more modules: RFQ, Goods Receipt, Vendors, Reports, Settings, Audit

---

## 🧪 Testing the System

1. **Create test users with different roles:**
   ```bash
   npx tsx create-test-users.ts
   ```

2. **Login as Site Engineer** → Create PR for $75,000

3. **Login as Procurement Manager** → See notification, approve in `/approvals`

4. **Login as Budget Controller** → See notification, approve

5. **Login as Finance Manager** → See notification, final approval

6. **Login as ADMIN** → See all notifications as INFORMED party

---

## 🎯 Next Steps

To fully integrate with your procurement workflow:

1. **Update PR creation page** to call `initializeApprovalWorkflow()`
2. **Update PO creation page** to call `initializeApprovalWorkflow()`
3. **Update Invoice creation page** to call `initializeApprovalWorkflow()`
4. **Add approval status badges** to document list pages
5. **Show approval history** on document detail pages
6. **Add email notifications** (system already queues them in NotificationQueue table)
7. **Add real-time updates** with WebSockets or polling

---

## 📞 Support

For questions or issues with the notification/approval system, refer to:
- `/src/lib/approval-routing.ts` - Core routing logic
- `/src/lib/notification-service.ts` - Notification helpers
- `/src/lib/consultation-service.ts` - Consultation helpers
- `/src/lib/approval-service.ts` - Approval actions

All systems are ready to use! 🚀
