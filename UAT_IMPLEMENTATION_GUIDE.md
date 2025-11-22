# UAT Implementation Guide - Wujha Procurement System
## Actual System Implementation for UAT Testing

> **Purpose**: This document provides detailed implementation-specific instructions for executing UAT scenarios based on the actual Wujha Procurement system architecture and UI.

---

## 📋 Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Authentication & Navigation](#authentication--navigation)
3. [Stock Items Procurement - Detailed Flows](#stock-items-procurement---detailed-flows)
4. [Non-Stock/Service Procurement - Detailed Flows](#non-stockservice-procurement---detailed-flows)
5. [Common Processes - Detailed Flows](#common-processes---detailed-flows)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Database Schema Reference](#database-schema-reference)

---

## System Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15.5 + React 19 + TypeScript
- **Backend**: Next.js API Routes (REST)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js (JWT-based)
- **UI**: Tailwind CSS + Radix UI Components
- **State Management**: Zustand + TanStack React Query

### Key URLs
- **Application**: `http://localhost:3000`
- **Login**: `/login`
- **Dashboard**: `/procurement/dashboard`
- **Admin Panel**: `/admin/users`
- **Approvals**: `/approvals`

---

## Authentication & Navigation

### Login Flow (All UAT Scenarios Start Here)

**URL**: `http://localhost:3000/login`

**Steps**:
1. Open browser to `http://localhost:3000`
2. System redirects to `/login` (via middleware if not authenticated)
3. Login page displays:
   - Email input field
   - Password input field
   - "Sign In" button
   - Orange Wujha branding
4. Enter credentials
5. Click "Sign In"
6. NextAuth processes authentication
7. Session created with JWT token
8. Redirect to `/procurement/dashboard`

**Test Credentials** (from seed data):
```
Super Admin:
- Email: admin@wujha.om
- Password: Password@123

Finance Manager:
- Email: finance@wujha.com
- Password: password123

Procurement Manager:
- Email: procurement@wujha.com
- Password: password123

Site Engineer:
- Email: engineer@wujha.com
- Password: password123

Warehouse Keeper:
- Email: warehouse@wujha.com
- Password: password123
```

**First Login**: System forces password change (mustChangePassword flag)

### Dashboard Navigation

**Main Dashboard** (`/procurement/dashboard`):

**Layout**:
1. **Header** (top):
   - Logo and "WUJHA PROCUREMENT" title
   - Notification Bell (shows unread count)
   - User profile dropdown
2. **Sidebar** (left):
   - Dashboard
   - Requisitions
   - Purchase Orders
   - Goods Receipts
   - Invoices
   - Payments
   - RFQ
   - Services (with sub-menu)
   - Reports
   - KPIs
   - Settings
3. **Main Content Area**:
   - **Stats Cards** (6 cards in grid):
     * Total Requisitions
     * Pending Approvals (yellow)
     * Active Purchase Orders
     * Total Spend (YTD)
     * Budget Utilization
     * Cost Savings
   - **Recent Activity** (left column)
   - **Pending Approvals** (middle column)
   - **Performance Metrics** (right column)
   - **Quick Actions** (bottom):
     * Create PR
     * Create PO
     * Goods Receipt
     * Create RFQ
     * View Reports
     * Settings

---

## Stock Items Procurement - Detailed Flows

### ST-001: Review Project BOQ & Plans

**Implementation Note**: This is a **manual/preparatory step**. The system doesn't have a dedicated BOQ module yet, but references BOQ in PR justification field.

**Actual System Flow**:
1. Login as Project Manager
2. Navigate to Dashboard
3. Access project documents (external to system or via attachments)
4. Review material requirements
5. Prepare list for PR creation
6. Reference BOQ code in PR justification field

**Workaround for UAT**:
- Prepare test BOQ document externally (Excel/PDF)
- Use BOQ reference code in PR: "BOQ-2025-001"
- Attach BOQ document when creating PR (if upload feature available)

---

### ST-002: Check Inventory Levels

**Implementation Note**: System has Item master data but inventory tracking is basic.

**Actual System Flow**:
1. Navigate to `/procurement/items` (via sidebar or direct URL)
2. Items list page displays:
   - Item Code
   - Name (English/Arabic)
   - Category
   - Unit of Measure
   - Min/Max Stock Levels (if set)
   - Reorder Point
3. Filter/search for required items
4. Check stock levels (if inventory module is active)
5. Identify shortages

**API**: `GET /api/items` with pagination and filters

**For UAT Testing**:
- Pre-populate items via seed data
- Manually track inventory levels for testing
- Flag items that need procurement

---

### ST-003: Validate Budget Availability

**Implementation Note**: Budget validation is done via budget code field, but full budget management module is pending.

**Actual System Flow**:
1. PR creation includes budget code field
2. System validates budget code exists (basic validation)
3. Finance approver manually verifies budget during approval
4. Full automated budget checking pending integration

**For UAT**:
- Use predefined budget codes: "PROJ-2025-001", "DEPT-HR-2025"
- Finance approver manually confirms budget availability
- Document budget validation in approval comments

---

### ST-007: Create Purchase Requisition

**URL**: `/procurement/requisitions/new`

**Detailed UI Flow**:

1. **Access Form**:
   ```
   Dashboard → Click "Create PR" Quick Action
   OR
   Sidebar → Requisitions → Click "New Requisition" button
   ```

2. **PR Creation Form Structure**:

   **Section 1: Basic Information**
   - **Department**: Dropdown
     - Options: Construction, Maintenance, IT, HR, Finance, etc.
     - Required field
   - **Item Type**: Radio buttons
     - Options: STOCK / NON_STOCK / SERVICE
     - Determines form fields shown
   - **Priority**: Dropdown
     - Options: LOW / NORMAL / HIGH / URGENT
     - Default: NORMAL
   - **Budget Code**: Text input
     - Format: PROJ-YYYY-###
     - Required
     - Validates on blur
   - **Justification**: Textarea
     - Max 500 characters
     - Required for HIGH/URGENT priority

   **Section 2: Line Items** (Dynamic table)
   - **Add Item Button**: Opens item selection modal or inline form
   - **For each line item**:
     * Item: Dropdown (populated from Items table)
     * Quantity: Number input (min: 1)
     * Unit of Measure: Auto-filled from item master
     * Estimated Unit Price: Number input (OMR)
     * Total: Auto-calculated (Qty × Price)
     * Specifications: Textarea (optional)
     * Required Date: Date picker (optional)
     * Remove button (X icon)
   - **Total Estimated Cost**: Auto-calculated sum at bottom

   **Section 3: Additional Details**
   - **Delivery Location**: Dropdown or text
   - **Special Instructions**: Textarea (optional)
   - **Attachments**: File upload (optional)
     - Accepts: PDF, JPG, PNG, Excel
     - Max size: 10MB per file

3. **Form Actions** (Bottom buttons):
   - **Save as Draft**: Status = DRAFT
     - Form data saved
     - Can edit later
     - Not submitted for approval
   - **Submit for Approval**: Status = SUBMITTED
     - Validates all required fields
     - Triggers approval workflow
     - Cannot edit after submission
   - **Cancel**: Discards changes, returns to list

4. **Validation Rules** (Client-side + Server-side):
   ```typescript
   - Department: Required
   - Item Type: Required
   - Priority: Required
   - Budget Code: Required, format check
   - Line Items: At least 1 item required
   - Each Item: Item, Quantity, Price required
   - Total Cost: Must be > 0
   - Justification: Required if Priority = HIGH/URGENT
   ```

5. **API Call**:
   ```typescript
   POST /api/purchase-requisitions
   Headers: {
     Authorization: Bearer <token>,
     Content-Type: application/json
   }
   Body: {
     departmentId: "DEPT-001",
     itemType: "STOCK",
     priority: "NORMAL",
     budgetCode: "PROJ-2025-001",
     justification: "Materials for Building A construction",
     estimatedCost: 50000,
     items: [
       {
         itemId: "item-123-uuid",
         quantity: 100,
         estimatedPrice: 500,
         specifications: "Grade A cement, 50kg bags",
         requiredDate: "2025-02-15"
       },
       // ... more items
     ]
   }
   ```

6. **Success Response**:
   ```json
   {
     "success": true,
     "requisition": {
       "id": "pr-uuid",
       "prNumber": "PR-2025-0001",
       "status": "DRAFT",
       "estimatedCost": 50000,
       "items": [ /* array of items */ ],
       "createdAt": "2025-01-15T10:30:00Z"
     }
   }
   ```

7. **After Submission**:
   - Success toast notification appears
   - Redirect to PR details: `/procurement/requisitions/[id]`
   - OR redirect to PR list: `/procurement/requisitions`
   - PR appears in list with status badge

**Screenshots/UI Reference**:
- Form uses Tailwind CSS styling
- Orange accent color (Wujha brand)
- White cards with shadows
- Responsive grid layout
- Loading states with spinners
- Error messages in red under fields

---

### ST-008: PR Approval Workflow

**URL**: `/approvals` (for approvers) and `/procurement/requisitions` (for requester)

**Approval Flow Implementation**:

#### Part 1: Submit PR for Approval (Requester)

1. **Navigate to PR List**:
   - URL: `/procurement/requisitions`
   - Filter by status "DRAFT"

2. **PR List View**:
   ```
   Table Columns:
   - PR Details (Number, Date, Icon)
   - Requestor & Department
   - Amount & Priority (with colored badges)
   - Status (with colored badge)
   - Progress (PO/RFQ badges)
   - Actions (View, Edit, Submit icons)
   ```

3. **Submit Action** (2 Options):

   **Option A: Quick Submit from List**:
   - Locate DRAFT PR row
   - Click green checkmark icon (Submit button)
   - Confirmation modal appears:
     ```
     "Submit PR-2025-0001 for approval?"
     [Cancel] [Submit]
     ```
   - Click Submit
   - API: POST `/api/purchase-requisitions/[id]/submit`

   **Option B: Submit from Detail View**:
   - Click Eye icon on PR row
   - Navigate to `/procurement/requisitions/[id]`
   - PR Details page shows:
     * Header with PR info
     * Line items table
     * Budget info
     * "Submit for Approval" button (if DRAFT)
   - Click "Submit for Approval"
   - Same confirmation modal
   - Submit

4. **Backend Approval Routing** (Automatic):
   ```typescript
   // On PR submission, system:
   1. Fetches applicable ApprovalRules
      - Matches based on:
        * documentType = "PR"
        * conditions.minAmount <= PR.estimatedCost
        * conditions.departments includes PR.departmentId
        * conditions.itemType matches PR.itemType
   
   2. Selects highest priority rule
   
   3. Creates Approval chain from ApprovalRouting:
      Example Rule Result:
      - Level 1: SITE_ENGINEER (Technical Review)
      - Level 2: BUDGET_CONTROLLER (Budget Check)
      - Level 3: PROCUREMENT_MANAGER (Final Approval)
   
   4. Creates Approval records:
      - One record per level
      - Level 1 status: PENDING
      - Level 2-3 status: PENDING (waiting)
      - Links to PR via prId
   
   5. Determines approvers:
      - Queries users where role matches approverRole
      - First user assigned as approverId
   
   6. Creates notifications:
      - Level 1 approver: In-app + Email
      - INFORMED parties (RACI): Notifications only
      - CONSULTED parties: Consultation requests
   
   7. Inserts into NotificationQueue:
      - Email notifications queued
      - In-app notifications created
      - Subject: "New PR Awaiting Your Approval"
      - Body: PR details + approval link
   
   8. Updates PR status:
      - DRAFT → SUBMITTED
   
   9. Returns success response
   ```

#### Part 2: Approve PR (Approvers)

**Access Approvals** (3 Ways):

1. **Via Notification Bell**:
   - Click bell icon in header
   - Dropdown shows pending approvals
   - Click approval item
   - Routes to approval detail

2. **Via Approvals Page**:
   - Navigate to `/approvals`
   - Shows all pending approvals for current user

3. **Via Email Link**:
   - Click link in email notification
   - Authenticates user (if needed)
   - Routes to approval page

**Approvals Page Layout**:
```
/approvals Page Structure:

Header:
  "Pending Approvals"
  "You have X document(s) waiting for your approval"

Approval Cards (for each pending approval):
  ┌────────────────────────────────────────┐
  │ 📄 PR Approval                          │
  │ Document ID: abc123...                  │
  │ Level 1 • 2 hours ago                   │
  │                                         │
  │         [✓ Approve] [✗ Reject]          │
  └────────────────────────────────────────┘
```

**Approval Action Flow**:

1. **Click "Approve" Button**:
   - Modal opens:
     ```
     ┌─── Confirm Approval ────────┐
     │                              │
     │ Are you sure you want to     │
     │ approve this PR?             │
     │                              │
     │ Comments (Optional):         │
     │ ┌──────────────────────────┐ │
     │ │                          │ │
     │ │                          │ │
     │ └──────────────────────────┘ │
     │                              │
     │ [Confirm Approval] [Cancel]  │
     └──────────────────────────────┘
     ```

2. **Enter Comments** (optional):
   - Example: "Budget verified and allocated"
   - Character limit: 500

3. **Click "Confirm Approval"**:
   - API Call:
     ```typescript
     POST /api/approvals/[approvalId]/approve
     Body: {
       comments: "Budget verified and allocated"
     }
     ```

4. **Backend Processing**:
   ```typescript
   // Approval processing:
   1. Validates approver has permission
   2. Checks approval is in PENDING status
   3. Updates Approval record:
      - status: PENDING → APPROVED
      - approvedAt: current timestamp
      - comments: user comments
   
   4. Creates ApprovalHistory entry:
      - level: current level
      - action: "APPROVED"
      - performedBy: current user ID
      - previousStatus: "PENDING"
      - newStatus: "APPROVED"
      - comments: user comments
      - timestamp
   
   5. Checks if more levels exist:
      - If Yes: Update next level to PENDING
                 Send notification to next approver
      - If No: All levels approved, finalize PR
   
   6. If final approval:
      - Update PR.status: SUBMITTED → APPROVED
      - Send notification to PR creator
      - Send notifications to INFORMED parties
      - Enable "Convert to PO" functionality
   
   7. Audit logging:
      - Create ProcessAudit entry
      - Log approval action with details
   
   8. Return success response
   ```

5. **UI Updates**:
   - Approval card removed from list
   - Success toast: "Approval submitted successfully"
   - If approvals page empty: Shows "All caught up!" message
   - Notification bell count decreases

**Rejection Flow** (Similar but requires comments):

1. Click "Reject" button
2. Modal opens (comments REQUIRED)
3. Enter rejection reason: "Budget not available for this period"
4. Click "Confirm Rejection"
5. API: POST `/api/approvals/[id]/reject`
6. PR status: SUBMITTED → REJECTED
7. Notifications sent to:
   - PR creator (with rejection reason)
   - Previous approvers (FYI)
8. PR creator can edit and resubmit

**Multi-Level Approval Example**:

```
Scenario: PR Worth OMR 50,000

Level 1: Site Engineer
  - Receives notification immediately
  - Reviews technical specs
  - Approves with comments: "Technical requirements verified"
  - Next level notified

Level 2: Budget Controller
  - Receives notification after Level 1 approval
  - Reviews budget allocation
  - Checks budget code validity
  - Approves with comments: "Budget allocated - PROJ-2025-001"
  - Next level notified

Level 3: Procurement Manager
  - Receives notification after Level 2 approval
  - Final procurement policy review
  - Confirms vendor availability
  - Approves with comments: "Approved - proceed to vendor selection"
  - PR approved!

Result:
  - PR status: DRAFT → SUBMITTED → APPROVED
  - Total time: 3 hours (if all approve quickly)
  - All approvals logged in ApprovalHistory
  - PR ready for conversion to PO
  - "Convert to PO" button now visible
```

**Notification System**:

1. **In-App Notifications**:
   - Red badge on notification bell
   - Dropdown list of pending items
   - Click to navigate to approval

2. **Email Notifications** (if configured):
   - Subject: "Action Required: PR-2025-0001 Awaiting Approval"
   - Body includes:
     * PR number and details
     * Estimated cost
     * Requester name
     * Priority level
     * Link to approve directly
     * Link to view details

3. **RACI Notifications**:
   - **Responsible** (Requester): Created PR notification
   - **Accountable** (Approvers): Approval required notification
   - **Consulted** (Technical team): FYI with option to comment
   - **Informed** (Department head): Status update notifications

**Approval History Tracking**:

View on PR Detail Page:
```
Approval Timeline:
  ├─ Created: 2025-01-15 10:00 by requester@wujha.com
  ├─ Submitted: 2025-01-15 10:05 by requester@wujha.com
  ├─ Level 1 Approved: 2025-01-15 11:00 by engineer@wujha.com
  │   Comments: "Technical requirements verified"
  ├─ Level 2 Approved: 2025-01-15 12:30 by budget@wujha.com
  │   Comments: "Budget allocated - PROJ-2025-001"
  └─ Level 3 Approved: 2025-01-15 13:00 by procurement@wujha.com
      Comments: "Approved - proceed to vendor selection"
      ✓ APPROVED
```

**Database State After Full Approval**:

```sql
-- PurchaseRequisition
UPDATE PurchaseRequisition 
SET status = 'APPROVED', updatedAt = NOW()
WHERE id = 'pr-uuid';

-- Approval (3 records for 3 levels)
UPDATE Approval 
SET status = 'APPROVED', approvedAt = NOW(), comments = '...'
WHERE prId = 'pr-uuid';

-- ApprovalHistory (3+ records)
INSERT INTO ApprovalHistory (approvalId, level, action, performedBy, comments, ...)
VALUES (...);

-- Notifications (multiple records)
INSERT INTO ApprovalNotification (userId, documentType, documentId, isRead, ...)
VALUES (...);

-- ProcessAudit
INSERT INTO ProcessAudit (processType, documentId, action, performedBy, ...)
VALUES ('PR_APPROVAL', 'pr-uuid', 'APPROVED', 'user-id', ...);
```

---

### ST-009: Convert PR to PO

**URL**: `/procurement/purchase-orders/new?prId={id}`

**Detailed Flow**:

1. **Prerequisites**:
   - PR must have status = APPROVED
   - All approval levels completed
   - User has permission: `po.create`

2. **Initiate Conversion**:
   - Navigate to approved PR details: `/procurement/requisitions/[id]`
   - "Convert to PO" button visible (blue, top-right)
   - Click "Convert to PO"

3. **Route to PO Form**:
   - URL: `/procurement/purchase-orders/new?prId={pr-uuid}`
   - System fetches PR data via API
   - Pre-populates form

4. **PO Form Pre-Population**:
   ```typescript
   // Frontend logic on page load:
   useEffect(() => {
     const prId = router.query.prId;
     if (prId) {
       // Fetch PR data
       const pr = await fetch(`/api/purchase-requisitions/${prId}`);
       
       // Pre-fill form:
       formData = {
         prId: pr.id,
         vendorId: pr.awardedVendor?.id || '', // From RFQ if exists
         orderDate: new Date(),
         deliveryDate: addDays(new Date(), 30), // +30 days default
         deliveryAddress: pr.deliveryLocation || defaultAddress,
         paymentTerms: 'Net 30', // Default
         items: pr.items.map(item => ({
           itemId: item.itemId,
           item: item.item, // Populated for display
           quantity: item.quantity,
           unitPrice: item.estimatedPrice,
           totalPrice: item.quantity * item.estimatedPrice,
           deliveryDate: pr.deliveryDate || addDays(new Date(), 30)
         })),
         totalAmount: pr.estimatedCost,
         currency: 'OMR'
       };
     }
   }, [router.query.prId]);
   ```

5. **PO Form Structure**:

   **Section 1: PO Information**
   - **PR Reference**: Display only (PR-2025-0001)
   - **Vendor**: Dropdown (required)
     * Populated from Vendor table
     * Filter: status = ACTIVE
     * Shows: Vendor Name, Code, Performance Score
     * If from RFQ: Pre-selected
   - **Order Date**: Date picker (default: today)
   - **Expected Delivery Date**: Date picker (default: +30 days)
   - **Currency**: Dropdown (default: OMR)
   - **Payment Terms**: Dropdown
     * Options: Net 15, Net 30, Net 45, Net 60, Advance Payment, COD
     * Default: Net 30

   **Section 2: Delivery Information**
   - **Delivery Address**: JSON field / Structured input
     * Street Address
     * City
     * Country
     * Postal Code
     * Site Contact Name
     * Site Contact Phone
   - **Special Delivery Instructions**: Textarea

   **Section 3: Line Items** (Pre-populated from PR)
   - **Table View**:
     | Item Code | Name | Qty | Unit Price | Total | Delivery Date | Actions |
     |-----------|------|-----|------------|-------|---------------|---------|
     | (read-only from PR items) | (editable) | (editable) | (calculated) | (date) | (remove) |
   
   - **Edit Capabilities**:
     * Quantity: Can adjust (with validation)
     * Unit Price: Can adjust
     * Total: Auto-calculated
     * Delivery Date: Per-item delivery date
   
   - **Add More Items**: Button to add items not in PR (optional)

   **Section 4: Terms & Conditions** (Optional)
   - **Standard Terms**: Checkbox to include standard terms
   - **Custom Terms**: Textarea

   **Section 5: Attachments**
   - File upload for supporting documents

6. **Form Validation**:
   ```typescript
   const poSchema = z.object({
     prId: z.string().uuid(),
     vendorId: z.string().uuid(),
     orderDate: z.date(),
     deliveryDate: z.date().min(orderDate),
     deliveryAddress: z.object({
       street: z.string().min(1),
       city: z.string().min(1),
       country: z.string().min(1)
     }),
     paymentTerms: z.string(),
     items: z.array(z.object({
       itemId: z.string().uuid(),
       quantity: z.number().positive(),
       unitPrice: z.number().positive(),
       totalPrice: z.number().positive()
     })).min(1),
     totalAmount: z.number().positive(),
     currency: z.string()
   });
   ```

7. **Create PO Action**:
   - Click "Create Purchase Order" button
   - Client-side validation runs
   - If valid:
     ```typescript
     POST /api/purchase-orders
     Headers: {
       Authorization: Bearer <token>,
       Content-Type: application/json
     }
     Body: {
       prId: "pr-uuid",
       vendorId: "vendor-uuid",
       orderDate: "2025-01-15",
       deliveryDate: "2025-02-15",
       deliveryAddress: {
         street: "123 Construction Site",
         city: "Muscat",
         country: "Oman",
         postalCode: "100",
         contactName: "Site Supervisor",
         contactPhone: "+968 9999 9999"
       },
       paymentTerms: "Net 30",
       items: [
         {
           itemId: "item-uuid",
           quantity: 100,
           unitPrice: 500,
           totalPrice: 50000,
           deliveryDate: "2025-02-15"
         },
         // ... more items
       ],
       totalAmount: 50000,
       currency: "OMR"
     }
     ```

8. **Backend Processing** (Prisma Transaction):
   ```typescript
   async function createPO(data) {
     return await prisma.$transaction(async (tx) => {
       // 1. Generate PO Number
       const poNumber = await generatePONumber(); // Format: PO-2025-####
       
       // 2. Create PurchaseOrder
       const po = await tx.purchaseOrder.create({
         data: {
           poNumber,
           prId: data.prId,
           vendorId: data.vendorId,
           orderDate: data.orderDate,
           deliveryDate: data.deliveryDate,
           deliveryAddress: data.deliveryAddress,
           paymentTerms: data.paymentTerms,
           status: 'DRAFT', // Initial status
           totalAmount: data.totalAmount,
           currency: data.currency,
           items: {
             create: data.items.map(item => ({
               itemId: item.itemId,
               quantity: item.quantity,
               unitPrice: item.unitPrice,
               totalPrice: item.totalPrice,
               deliveryDate: item.deliveryDate
             }))
           }
         },
         include: {
           items: { include: { item: true } },
           vendor: true,
           pr: true
         }
       });
       
       // 3. Update PR status
       await tx.purchaseRequisition.update({
         where: { id: data.prId },
         data: { status: 'CONVERTED' }
       });
       
       // 4. Create ProcessAudit
       await tx.processAudit.create({
         data: {
           processType: 'PO_CREATION',
           documentId: po.id,
           documentType: 'PO',
           action: 'CREATED',
           performedBy: currentUser.id,
           details: { prId: data.prId }
         }
       });
       
       // 5. Create Notification
       await tx.notificationQueue.create({
         data: {
           type: 'EMAIL',
           recipient: po.vendor.email,
           subject: `New Purchase Order ${po.poNumber}`,
           body: `A new purchase order has been created for your review...`,
           templateData: { po: po },
           status: 'PENDING'
         }
       });
       
       return po;
     });
   }
   ```

9. **Success Response**:
   ```json
   {
     "success": true,
     "order": {
       "id": "po-uuid",
       "poNumber": "PO-2025-0001",
       "status": "DRAFT",
       "totalAmount": 50000,
       "vendor": {
         "nameEn": "ABC Suppliers",
         "email": "vendor@abc.com"
       },
       "pr": {
         "prNumber": "PR-2025-0001"
       },
       "items": [ /* array of items */ ],
       "createdAt": "2025-01-15T14:00:00Z"
     }
   }
   ```

10. **Post-Creation Actions**:
    - Success toast: "Purchase Order created successfully"
    - Redirect to PO details: `/procurement/purchase-orders/[po-uuid]`
    - PO appears in PO list with status "DRAFT"
    - Original PR shows:
      * Status: "CONVERTED" (blue badge)
      * "1 PO" badge in Progress column
      * Link to related PO

11. **Verify Changes**:
    ```
    Navigate to PR list:
    ✓ PR-2025-0001 status = CONVERTED
    ✓ Progress shows "1 PO" badge
    ✓ Clicking PR shows link to PO-2025-0001
    
    Navigate to PO list:
    ✓ PO-2025-0001 appears with status = DRAFT
    ✓ Shows vendor name and amount
    ✓ "From PR-2025-0001" reference visible
    ✓ Actions: View, Edit, Approve available
    ```

12. **Database State**:
    ```sql
    -- New PurchaseOrder record
    SELECT * FROM "PurchaseOrder" 
    WHERE "poNumber" = 'PO-2025-0001';
    -- status = 'DRAFT', prId is set
    
    -- POItem records (10 records)
    SELECT * FROM "POItem" WHERE "poId" = 'po-uuid';
    
    -- Updated PR
    SELECT * FROM "PurchaseRequisition" 
    WHERE "prNumber" = 'PR-2025-0001';
    -- status = 'CONVERTED'
    
    -- Audit log
    SELECT * FROM "ProcessAudit" 
    WHERE "documentId" = 'po-uuid' 
    AND "processType" = 'PO_CREATION';
    ```

---

## API Endpoints Reference

### Authentication
```
POST /api/auth/[...nextauth]     # NextAuth callback
POST /api/auth/change-password   # Change password
GET  /api/auth/permissions        # Get user permissions
```

### Purchase Requisitions
```
GET    /api/purchase-requisitions          # List PRs (with filters)
POST   /api/purchase-requisitions          # Create PR
GET    /api/purchase-requisitions/[id]     # Get PR details
PUT    /api/purchase-requisitions/[id]     # Update PR
POST   /api/purchase-requisitions/[id]/submit   # Submit for approval
POST   /api/purchase-requisitions/[id]/approve  # Approve/Reject PR
```

### Purchase Orders
```
GET    /api/purchase-orders               # List POs (with filters)
POST   /api/purchase-orders               # Create PO
GET    /api/purchase-orders/[id]          # Get PO details
PUT    /api/purchase-orders/[id]          # Update PO
PUT    /api/purchase-orders/[id]/status   # Update PO status
POST   /api/purchase-orders/[id]/amend    # Create amendment
```

### Goods Receipts
```
GET    /api/goods-receipts                # List GRNs
POST   /api/goods-receipts                # Create GRN
GET    /api/goods-receipts/[id]           # Get GRN details
PUT    /api/goods-receipts/[id]           # Update GRN
```

### Invoices
```
GET    /api/invoices                      # List invoices
POST   /api/invoices                      # Create invoice
GET    /api/invoices/[id]                 # Get invoice details
POST   /api/invoices/three-way-match     # Run three-way match
POST   /api/invoices/[id]/approve        # Approve invoice
PUT    /api/invoices/[id]/status         # Update status
```

### Approvals
```
GET    /api/approvals/pending             # Get pending approvals
POST   /api/approvals/[id]/approve       # Approve document
POST   /api/approvals/[id]/reject        # Reject document
```

### Notifications
```
GET    /api/notifications                 # Get notifications
GET    /api/notifications/unread-count    # Get unread count
PUT    /api/notifications/[id]/mark-read  # Mark as read
```

### Dashboard & KPIs
```
GET    /api/dashboard                     # Get dashboard stats
GET    /api/kpis                          # Get KPI metrics
```

### Reporting
```
GET    /api/reporting/tables              # List available tables
POST   /api/reporting/generate            # Generate report
POST   /api/reporting/generate-excel      # Export to Excel
```

---

## Database Schema Reference

### Key Tables

**User**
- id, email, password, name, role
- approvalLimit (max amount user can approve)
- mustChangePassword, lastLoginAt

**PurchaseRequisition**
- id, prNumber, requestDate, requesterId
- itemType (STOCK/NON_STOCK/SERVICE)
- priority (LOW/NORMAL/HIGH/URGENT)
- status (DRAFT/SUBMITTED/APPROVED/REJECTED/CONVERTED)
- estimatedCost, budgetCode, justification

**PRItem**
- id, prId, itemId, quantity
- estimatedPrice, specifications, requiredDate

**Approval**
- id, documentType, documentId, prId
- approverId, status, comments
- level (1, 2, 3...), routingRuleId

**ApprovalHistory**
- id, approvalId, level, action
- performedBy, previousStatus, newStatus
- comments, metadata, createdAt

**PurchaseOrder**
- id, poNumber, prId, vendorId
- orderDate, deliveryDate, deliveryAddress
- paymentTerms, status, totalAmount

**POItem**
- id, poId, itemId, quantity
- unitPrice, totalPrice, deliveryDate

**GoodsReceipt**
- id, grNumber, poId
- receivedDate, receivedBy, status
- qualityChecked, qualityComments

**GRItem**
- id, grId, itemId
- orderedQuantity, receivedQuantity
- acceptedQuantity, rejectedQuantity
- rejectionReason

**Invoice**
- id, invoiceNumber, vendorId, poId
- invoiceDate, dueDate, totalAmount
- threeWayMatched, matchingStatus
- paymentStatus

---

## Quick Reference: Status Flow

**Purchase Requisition Status Flow**:
```
DRAFT → SUBMITTED → APPROVED → CONVERTED
        ↓
      REJECTED (can edit and resubmit)
```

**Purchase Order Status Flow**:
```
DRAFT → APPROVED → SENT → ACKNOWLEDGED → PARTIAL → COMPLETED
        ↓                                    ↓
      CANCELLED                          CANCELLED
```

**Goods Receipt Status Flow**:
```
PENDING → COMPLETED (or REJECTED)
```

**Invoice Status Flow**:
```
DRAFT → SUBMITTED → APPROVED → PAID
        ↓
      REJECTED
```

---

## Testing Checklist

### For Each UAT Scenario:
- [ ] Login with appropriate user role
- [ ] Navigate to correct page URL
- [ ] Fill all required fields
- [ ] Upload attachments (if applicable)
- [ ] Submit/Save action
- [ ] Verify success toast notification
- [ ] Check redirect URL
- [ ] Verify data appears in list view
- [ ] Check status badges and colors
- [ ] Verify notifications sent
- [ ] Check database records
- [ ] Verify audit trail
- [ ] Test permissions (try as unauthorized user)
- [ ] Test validation errors
- [ ] Take screenshots for documentation

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-22  
**Author**: AI Assistant (based on actual system indexing)  
**Status**: ✅ Complete for Stock Items Procurement

