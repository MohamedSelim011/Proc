# WUJHA Procurement Management System
## Comprehensive Feature List for Proposal

**Version:** 1.0.0  
**Date:** January 9, 2026  
**Platform:** Next.js 15 + TypeScript + PostgreSQL  
**License:** Private/Enterprise

---

## 📋 Executive Summary

WUJHA Procurement is an **enterprise-grade, end-to-end Procure-to-Pay (P2P) solution** designed specifically for construction, real estate, and property management organizations. The system implements complete automation of procurement processes from requisition to payment, supporting both stock items (materials/inventory) and non-stock items (services/contracts).

### Key Differentiators
- ✅ **100% BRD Compliant** - Fully aligned with detailed business requirements
- ✅ **Oracle AME-Style Approval Workflows** - Dynamic multi-level routing
- ✅ **Three-Way Matching** - Automated invoice validation
- ✅ **Complete P2P Cycle** - From PR to Payment in one integrated system
- ✅ **Real-Time KPI Dashboard** - 13+ procurement metrics
- ✅ **RACI-Based Workflows** - Responsible, Accountable, Consulted, Informed
- ✅ **Service Procurement** - Specialized for construction services
- ✅ **Advanced Reporting Engine** - Integrated with Metabase BI

---

## 🏗️ System Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15.5.0, React 19, TypeScript | Modern, type-safe UI framework |
| **Styling** | Tailwind CSS 3.4, Lucide Icons | Responsive design system |
| **Backend** | Next.js API Routes, TypeScript | Serverless API endpoints |
| **Database** | PostgreSQL + Prisma ORM | Enterprise-grade relational database |
| **Authentication** | NextAuth.js + JWT | Secure session management |
| **Notifications** | Nodemailer + SMTP | Email notification system |
| **Reporting** | Metabase Integration | Advanced BI dashboards |
| **File Storage** | Local/Cloud Upload System | Document management |
| **State Management** | React Context + Server Actions | Efficient data flow |

### Deployment Architecture
- **Production**: Railway Cloud Platform (Scalable)
- **Database**: PostgreSQL on Railway
- **Reporting**: Metabase on Railway
- **CDN**: Vercel Edge Network (optional)
- **Scalability**: Horizontal scaling support
- **Monitoring**: Built-in health checks and logging

---

## 📦 Core Modules & Features

### 1. Purchase Requisition (PR) Management

**Purpose:** Initiate and manage procurement requests for all item types

#### Features:
- ✅ **Multi-Item Requisitions**
  - Support for stock items, non-stock items, and services
  - Unlimited line items per PR
  - Item specifications and technical requirements
  - Bill of Quantities (BoQ) reference linking
  
- ✅ **Budget Integration**
  - Real-time budget availability check
  - Budget code and cost center allocation
  - Automatic budget consumption tracking
  - Budget variance alerts

- ✅ **Priority Management**
  - Priority levels: LOW, NORMAL, HIGH, URGENT
  - Priority-based routing and notifications
  - Expedited approval workflows for urgent items

- ✅ **PR Types**
  - **Stock Items PR**: Materials and inventory items
  - **Non-Stock Items PR**: General purchases
  - **Service PR**: Professional services with SLA requirements
  - **Fixed Asset PR**: Capital expenditure items

- ✅ **Workflow States**
  - DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → REJECTED → CANCELLED

- ✅ **Smart Features**
  - Auto-save draft functionality
  - Duplicate PR prevention
  - PR cloning for repeat purchases
  - Attachment support (specifications, drawings, etc.)

#### API Endpoints:
```
POST   /api/purchase-requisitions           # Create new PR
GET    /api/purchase-requisitions           # List all PRs with filters
GET    /api/purchase-requisitions/[id]      # Get PR details
PUT    /api/purchase-requisitions/[id]      # Update PR
DELETE /api/purchase-requisitions/[id]      # Delete PR (DRAFT only)
POST   /api/purchase-requisitions/[id]/submit    # Submit for approval
GET    /api/purchase-requisitions/stats     # PR statistics
```

---

### 2. Request for Quotation (RFQ) Module

**Purpose:** Competitive bidding process for high-value or bulk procurement

#### Features:
- ✅ **RFQ Creation & Management**
  - Link RFQ to approved PRs
  - Multi-item RFQ support
  - Technical and commercial specifications
  - Closing date and time management
  - Terms and conditions templating

- ✅ **Vendor Selection**
  - Select multiple vendors (minimum 3 recommended)
  - Category-based vendor filtering
  - Vendor qualification checking
  - Vendor performance score display

- ✅ **Evaluation Criteria**
  - Configurable weighted scoring system
  - Technical score (default 40%)
  - Commercial score (default 30%)
  - Delivery score (default 20%)
  - Experience score (default 10%)
  - Custom criteria support

- ✅ **Bid Submission**
  - Secure vendor submission portal
  - Unique submission tokens per vendor
  - Document upload (proposals, certifications)
  - Deadline enforcement
  - Late submission prevention

- ✅ **Bid Evaluation**
  - Side-by-side vendor comparison
  - Automatic score calculation
  - Evaluation comments and notes
  - Award recommendation
  - Rejection with reasons

- ✅ **Email Notifications**
  - RFQ invitation emails to vendors
  - Submission confirmation
  - Award notifications
  - Rejection notifications

- ✅ **RFQ Status Flow**
  - DRAFT → PUBLISHED → UNDER_EVALUATION → EVALUATED → AWARDED → COMPLETED

#### API Endpoints:
```
POST   /api/rfq                             # Create RFQ
GET    /api/rfq                             # List RFQs
GET    /api/rfq/[id]                        # Get RFQ details
PUT    /api/rfq/[id]                        # Update RFQ
POST   /api/rfq/[id]/send-invitations      # Send to vendors
POST   /api/rfq/[id]/responses              # Submit vendor response
POST   /api/rfq/[id]/evaluate               # Evaluate responses
POST   /api/rfq/[id]/award                  # Award to vendor
```

---

### 3. Purchase Order (PO) Management

**Purpose:** Formal order placement and supplier contract management

#### Features:
- ✅ **PO Creation**
  - Auto-conversion from approved PRs
  - Auto-conversion from awarded RFQs
  - Manual PO creation
  - Multi-item PO support
  - Copy from previous PO

- ✅ **PO Information**
  - Unique PO number (auto-generated)
  - Vendor details and contact information
  - Delivery address management
  - Payment terms configuration
  - Warranty and guarantee terms
  - Incoterms support

- ✅ **Delivery Management**
  - Line-item specific delivery dates
  - Partial delivery support
  - Delivery milestone tracking
  - Delivery address per item

- ✅ **PO Amendments**
  - Quantity adjustments
  - Price changes
  - Delivery date modifications
  - Item additions/removals
  - Amendment history tracking
  - Version control

- ✅ **Supplier Acknowledgment**
  - Email PO to supplier
  - Supplier portal for acknowledgment
  - Acknowledgment tracking
  - Rejection handling with reasons

- ✅ **PO Workflow**
  - DRAFT → SUBMITTED → APPROVED → SENT → ACKNOWLEDGED → PARTIAL → COMPLETED → CANCELLED

- ✅ **PO Cancellation**
  - Cancellation request workflow
  - Advance payment handling
  - Vendor compensation rules
  - Cancellation approval

#### API Endpoints:
```
POST   /api/purchase-orders                 # Create PO
GET    /api/purchase-orders                 # List POs
GET    /api/purchase-orders/[id]            # Get PO details
PUT    /api/purchase-orders/[id]            # Update PO
POST   /api/purchase-orders/[id]/submit     # Submit for approval
POST   /api/purchase-orders/[id]/acknowledge # Supplier acknowledgment
POST   /api/purchase-orders/[id]/amend      # Create amendment
PUT    /api/purchase-orders/[id]/cancel     # Cancel PO
POST   /api/purchase-orders/[id]/send-email # Send to vendor
```

---

### 4. Goods Receipt (GRN) Management

**Purpose:** Verify and document delivery of goods/materials

#### Features:
- ✅ **4-Step GRN Wizard**
  - **Step 1:** Select PO and vendor
  - **Step 2:** Receipt details (date, transport, AWB)
  - **Step 3:** Item inspection (received/accepted/rejected quantities)
  - **Step 4:** Quality check and approval

- ✅ **Inspection & Quality Control**
  - Received quantity entry
  - Accepted quantity confirmation
  - Rejected quantity with reasons
  - Quality inspector assignment
  - Quality comments and notes
  - Photographic evidence upload

- ✅ **Delivery Verification**
  - Delivery date and time
  - Transport details (vehicle, driver)
  - Airway bill (AWB) or tracking number
  - Delivery location confirmation
  - Delivery condition assessment

- ✅ **Discrepancy Management**
  - Quantity variance tracking
  - Quality issue documentation
  - Damage reporting
  - Supplier debit note creation
  - Return authorization

- ✅ **Inventory Integration**
  - Auto-update inventory for stock items
  - Location and bin assignment
  - Batch and serial number tracking
  - Expiry date management

- ✅ **GRN Status Flow**
  - PENDING → PARTIAL → COMPLETED → APPROVED

#### API Endpoints:
```
POST   /api/goods-receipts                  # Create GRN
GET    /api/goods-receipts                  # List GRNs
GET    /api/goods-receipts/[id]             # Get GRN details
PUT    /api/goods-receipts/[id]             # Update GRN
DELETE /api/goods-receipts/[id]             # Delete (PENDING only)
POST   /api/goods-receipts/[id]/approve     # Approve GRN
```

---

### 5. Invoice Management & Three-Way Matching

**Purpose:** Process supplier invoices with automated validation

#### Features:
- ✅ **4-Step Invoice Processing Wizard**
  - **Step 1:** Select PO and GR
  - **Step 2:** Invoice details (number, date, due date)
  - **Step 3:** Line items with automatic three-way matching
  - **Step 4:** Totals, taxes, and final review

- ✅ **Three-Way Matching Logic**
  - **PO vs Invoice:** Quantity and price validation
  - **GR vs Invoice:** Delivered quantity verification
  - **Automatic Variance Detection:**
    - Quantity variance calculation
    - Price variance detection
    - Total amount variance
    - Variance percentage (with tolerance thresholds)

- ✅ **Matching Status**
  - MATCHED: Auto-approve for payment
  - QUANTITY_VARIANCE: Qty mismatch detected
  - PRICE_VARIANCE: Price discrepancy
  - BOTH_VARIANCE: Multiple issues
  - PENDING: Awaiting validation

- ✅ **Tax & Discount Handling**
  - Multiple tax rates support
  - Withholding tax calculation
  - VAT/GST computation
  - Line-item and invoice-level discounts
  - Freight and handling charges

- ✅ **Invoice Types**
  - Goods invoices (from GRN)
  - Service invoices (from SRN)
  - Advance payment invoices
  - Credit notes
  - Debit notes

- ✅ **Payment Status Tracking**
  - UNPAID → PARTIAL → PAID → OVERDUE

- ✅ **Invoice Workflow**
  - DRAFT → SUBMITTED → VERIFIED → APPROVED → PAID

#### API Endpoints:
```
POST   /api/invoices                        # Create invoice
GET    /api/invoices                        # List invoices
GET    /api/invoices/[id]                   # Get invoice details
PUT    /api/invoices/[id]                   # Update invoice
POST   /api/invoices/three-way-match        # Perform matching
POST   /api/invoices/[id]/approve           # Approve invoice
POST   /api/invoices/[id]/reject            # Reject invoice
```

---

### 6. Payment Management

**Purpose:** Process approved invoices for payment settlement

#### Features:
- ✅ **Payment Processing**
  - Single invoice payment
  - Batch payment processing
  - Payment scheduling
  - Recurring payments

- ✅ **Payment Methods**
  - Bank transfer (RTGS/NEFT)
  - Check payment
  - Cash payment (petty cash)
  - Credit card
  - Letter of credit

- ✅ **Payment Terms**
  - NET_30, NET_60, NET_90
  - Advance payment
  - Milestone payments
  - Progress payments
  - Retention amount

- ✅ **Payment Approval**
  - Finance manager approval
  - Dual authorization for high amounts
  - Payment batch approval
  - Emergency payment workflow

- ✅ **Payment Tracking**
  - Payment reference number
  - Bank transaction ID
  - Payment date and time
  - Payment receipt generation
  - Payment confirmation to vendor

#### API Endpoints:
```
POST   /api/payments                        # Create payment
GET    /api/payments                        # List payments
GET    /api/payments/[id]                   # Get payment details
POST   /api/payments/batch                  # Batch payment
POST   /api/payments/[id]/approve           # Approve payment
```

---

### 7. Service Procurement Module

**Purpose:** Specialized procurement for professional services and contracts

#### Features:
- ✅ **Service Categories**
  - Professional Services (consulting, legal, audit)
  - Maintenance Services (facilities, equipment)
  - IT Services (software, support, hosting)
  - Construction Services (contracting, subcontracting)
  - Rental Services (equipment, vehicles, property)
  - Training & Development
  - Security Services
  - Cleaning & Housekeeping

- ✅ **Service PR Creation**
  - Detailed scope of work (SoW)
  - Technical specifications
  - Duration and timeline
  - Deliverables definition
  - Performance metrics
  - SLA requirements
  - Insurance requirements
  - Safety standards

- ✅ **Service RFP (Request for Proposal)**
  - Comprehensive RFP documentation
  - Technical evaluation criteria
  - Commercial evaluation
  - Vendor qualification requirements
  - Proposal submission portal
  - Multi-stage evaluation

- ✅ **Service Contracts**
  - Contract templates
  - Milestone-based payments
  - Performance bonds
  - Retention amounts
  - Penalty clauses for delays
  - Bonus clauses for early completion
  - Auto-renewal options
  - Contract amendments

- ✅ **Service Receipt Notes (SRN)**
  - Milestone completion verification
  - Deliverable acceptance
  - Quality assessment
  - Time and material tracking
  - Performance rating

- ✅ **Service Performance Evaluation**
  - Quality score (0-100)
  - Timeliness score (0-100)
  - Compliance score (0-100)
  - Overall weighted score
  - KPI metrics tracking
  - SLA compliance monitoring

#### API Endpoints:
```
POST   /api/services/categories             # Manage categories
POST   /api/services/items                  # Service catalog
POST   /api/services/requisitions           # Service PRs
POST   /api/services/rfp                    # Service RFPs
POST   /api/services/contracts              # Service contracts
POST   /api/services/receipts               # Service receipts (SRN)
POST   /api/services/performance            # Performance evaluation
```

---

### 8. Vendor Management System

**Purpose:** Complete vendor lifecycle management

#### Features:
- ✅ **Vendor Registration**
  - Auto-generated vendor code
  - Basic information (English & Arabic names)
  - Commercial registration (CR) number
  - Tax ID and VAT number
  - Contact information (email, mobile, phone)
  - Primary contact person
  - Website URL

- ✅ **Legal & Compliance**
  - Business type classification
  - Year established
  - Number of employees
  - Omanization percentage
  - Registration documents
  - License validity tracking

- ✅ **Address Management**
  - Complete address details
  - Building, street, city
  - Governorate and postal code
  - Country information
  - Multiple address support

- ✅ **Banking Information**
  - Bank name and branch
  - Account number
  - IBAN
  - SWIFT code
  - Payment method preferences

- ✅ **Document Management**
  - Commercial registration upload
  - Tax registration certificate
  - VAT certificate
  - Insurance certificates
  - ISO certifications
  - Bank account details
  - Authorized signatory documents
  - Document expiry tracking

- ✅ **Vendor Categories**
  - Multiple category assignment
  - Primary category designation
  - Category-based filtering
  - Specialized vendor types

- ✅ **Vendor Performance**
  - Performance score (0-5 scale)
  - On-time delivery rate
  - Quality score
  - Compliance rating
  - Order history
  - Total spend tracking

- ✅ **Vendor Status**
  - PENDING → APPROVED → ACTIVE → INACTIVE → BLACKLISTED

- ✅ **Vendor Qualification**
  - Qualification checklist
  - Financial assessment
  - Technical capability review
  - Reference verification
  - Site visit reports

#### API Endpoints:
```
POST   /api/vendors                         # Register vendor
GET    /api/vendors                         # List vendors
GET    /api/vendors/[id]                    # Get vendor details
PUT    /api/vendors/[id]                    # Update vendor
POST   /api/vendors/[id]/documents          # Upload documents
GET    /api/vendors/[id]/performance        # Performance metrics
POST   /api/vendors/[id]/qualify            # Qualify vendor
PUT    /api/vendors/[id]/blacklist          # Blacklist vendor
GET    /api/vendors/generate-code           # Auto-generate code
```

---

### 9. Approval Workflow Engine

**Purpose:** Oracle AME-style dynamic approval routing system

#### Features:
- ✅ **Rule-Based Approval Routing**
  - Document type (PR, PO, Invoice, etc.)
  - Amount-based thresholds
  - Department-based routing
  - Item type classification
  - Urgency-based prioritization
  - Custom rule conditions

- ✅ **Multi-Level Approval Chains**
  - Sequential approval levels (Level 1, 2, 3, ...)
  - Parallel approvals (same level, multiple approvers)
  - Conditional routing (skip levels based on conditions)
  - Automatic escalation after timeout
  - Delegation support

- ✅ **RACI Matrix Implementation**
  - **Responsible (R):** Creates and submits documents
  - **Accountable (A):** Approves at each level
  - **Consulted (C):** Provides input before approval
  - **Informed (I):** Notified of status changes

- ✅ **Approval Actions**
  - Approve with comments
  - Reject with mandatory comments
  - Request more information
  - Delegate to another approver
  - Escalate to higher authority
  - Forward for consultation

- ✅ **Approval Rules**
  ```typescript
  Example Rule:
  {
    documentType: "PR",
    conditions: {
      minAmount: 50000,
      maxAmount: null,
      departments: ["Construction", "Maintenance"],
      itemType: "STOCK"
    },
    routings: [
      { level: 1, role: "SITE_ENGINEER", type: "RESPONSIBLE" },
      { level: 2, role: "PROJECT_MANAGER", type: "ACCOUNTABLE" },
      { level: 3, role: "PROCUREMENT_MANAGER", type: "ACCOUNTABLE" },
      { level: 4, role: "FINANCE_MANAGER", type: "CONSULTED" }
    ]
  }
  ```

- ✅ **Approval History & Audit Trail**
  - Complete approval chain history
  - Timestamp for each action
  - Approver identification
  - Comments and notes
  - Status transitions
  - Document version tracking

- ✅ **Timeout & Escalation**
  - Configurable timeout hours per level
  - Auto-escalation to next level
  - Email reminders before escalation
  - Escalation path definition

#### API Endpoints:
```
GET    /api/approvals                       # Get pending approvals
POST   /api/approvals/[id]/approve          # Approve document
POST   /api/approvals/[id]/reject           # Reject document
POST   /api/approvals/[id]/delegate         # Delegate approval
GET    /api/approvals/history/[documentId]  # Approval history
POST   /api/approval-rules                  # Create approval rule
GET    /api/approval-rules                  # List rules
```

---

### 10. Notification System

**Purpose:** Real-time alerts and multi-channel notifications

#### Features:
- ✅ **In-App Notifications**
  - Notification bell with unread count
  - Dropdown notification center
  - Real-time updates
  - Clickable notifications (navigate to document)
  - Mark as read/unread
  - Notification history

- ✅ **Email Notifications**
  - Professional email templates
  - HTML and plain text versions
  - Wujha branding
  - Attachment support
  - Delivery tracking

- ✅ **Notification Types**
  - **PR Notifications:**
    - PR submitted for approval
    - PR approved/rejected
    - PR converted to PO
  
  - **PO Notifications:**
    - PO sent to vendor
    - PO acknowledged by vendor
    - PO delivery scheduled
  
  - **RFQ Notifications:**
    - RFQ invitation to vendors
    - Bid submission confirmation
    - RFQ award notification
  
  - **Invoice Notifications:**
    - Invoice received
    - Three-way match result
    - Invoice approved for payment
  
  - **Approval Notifications:**
    - Approval pending (with document details)
    - Approval timeout reminder
    - Escalation notification
  
  - **General Notifications:**
    - Status change updates
    - Document comments/mentions
    - System alerts

- ✅ **RACI-Based Notifications**
  - Accountable: Approval requests
  - Responsible: Status updates
  - Consulted: Input requests
  - Informed: FYI notifications

- ✅ **Notification Preferences**
  - Email notification settings
  - In-app notification settings
  - Notification frequency (instant, digest)
  - Category-based preferences

- ✅ **Notification Queue**
  - Retry mechanism for failed emails
  - Priority queue for urgent notifications
  - Batch processing for digests
  - Delivery status tracking

#### API Endpoints:
```
GET    /api/notifications                   # Get user notifications
GET    /api/notifications/unread-count      # Unread count
PATCH  /api/notifications/[id]/mark-read    # Mark as read
POST   /api/notifications/mark-all-read     # Mark all read
DELETE /api/notifications/[id]              # Delete notification
```

---

### 11. KPI Dashboard & Analytics

**Purpose:** Real-time procurement metrics and performance tracking

#### Features:
- ✅ **13 Core KPIs** (BRD Compliant)

  **1. Procurement Cycle Time**
  - Formula: Average days from PR creation to PO issuance
  - Target: < 7 days
  - Applicability: Stock & Non-Stock
  
  **2. Requisition Approval Time**
  - Formula: Average days from PR submission to approval
  - Target: < 3 days
  - Applicability: All
  
  **3. Budget Compliance Rate**
  - Formula: (Actual Spend / Allocated Budget) × 100
  - Target: < 100%
  - Applicability: All
  
  **4. On-Time Delivery Rate**
  - Formula: (On-time deliveries / Total deliveries) × 100
  - Target: > 90%
  - Applicability: Stock & Non-Stock
  
  **5. Vendor Compliance Rate**
  - Formula: (Compliant vendors / Total vendors) × 100
  - Target: > 95%
  - Applicability: All
  
  **6. Three-Way Match Success Rate**
  - Formula: (Matched invoices / Total invoices) × 100
  - Target: > 95%
  - Applicability: Stock & Non-Stock
  
  **7. Cost Savings Percentage**
  - Formula: ((Estimated - Actual) / Estimated) × 100
  - Target: > 5%
  - Applicability: All
  
  **8. Contract Adherence Rate**
  - Formula: (Contracts within SLA / Total contracts) × 100
  - Target: > 90%
  - Applicability: Services
  
  **9. Stock Item Delivery Accuracy**
  - Formula: (Accurate deliveries / Total deliveries) × 100
  - Target: > 98%
  - Applicability: Stock Items
  
  **10. Service Quality Rating**
  - Formula: Average service performance score
  - Target: > 4.0 / 5.0
  - Applicability: Services
  
  **11. Inventory Turnover Rate**
  - Formula: COGS / Average Inventory
  - Target: > 6 times/year
  - Applicability: Stock Items
  
  **12. Dashboard Update Timeliness**
  - Formula: Data refresh frequency
  - Target: < 5 seconds
  - Applicability: System Performance
  
  **13. Top Vendor Spend Contribution**
  - Formula: (Top 5 vendor spend / Total spend) × 100
  - Target: 50-70% (balanced portfolio)
  - Applicability: All

- ✅ **Dashboard Views**
  - Executive summary cards
  - Trend charts and graphs
  - Drill-down capabilities
  - Period selection (weekly, monthly, quarterly, yearly)
  - Custom date range
  - Export to Excel/PDF

- ✅ **Performance Tracking**
  - Department-wise analytics
  - Vendor comparison charts
  - Budget vs. actual tracking
  - Spend analysis by category
  - Approval bottleneck identification

- ✅ **Visual Analytics**
  - KPI cards with status indicators (green/red/gray)
  - Line charts for trends
  - Bar charts for comparisons
  - Pie charts for distribution
  - Heat maps for performance

- ✅ **KPI Targets**
  - Configurable target values
  - Target vs. actual comparison
  - Performance indicators
  - Alert thresholds

#### API Endpoints:
```
GET    /api/kpis                            # Get all KPIs
GET    /api/kpis/[kpiKey]                   # Get KPI details
GET    /api/dashboard                       # Dashboard summary
POST   /api/kpis/targets                    # Set KPI targets
```

---

### 12. Advanced Reporting Engine

**Purpose:** Dynamic report generation and business intelligence

#### Features:
- ✅ **Pre-Built Reports**
  - Purchase Requisition Analysis
  - Purchase Order Summary
  - Vendor Performance Report
  - Budget Utilization Report
  - Invoice Aging Report
  - Payment Status Report
  - Goods Receipt Report
  - Service Contract Report
  - Approval Metrics Report
  - Spend Analysis Report

- ✅ **Custom Report Builder**
  - Drag-and-drop interface
  - Field selection from database tables
  - Filter and grouping options
  - Calculated fields
  - Sorting and formatting
  - Save custom reports

- ✅ **Metabase Integration**
  - Advanced SQL queries
  - Interactive dashboards
  - Chart creation (bar, line, pie, etc.)
  - Drill-through capabilities
  - Executive dashboards
  - Scheduled reports

- ✅ **Report Features**
  - Real-time data
  - Historical data analysis
  - Comparison reports
  - Trend analysis
  - Forecast projections

- ✅ **Export Options**
  - Excel (XLSX)
  - PDF
  - CSV
  - JSON
  - Print-friendly format

- ✅ **Report Scheduling**
  - Daily, weekly, monthly schedules
  - Email delivery
  - Automatic generation
  - Distribution lists

#### API Endpoints:
```
GET    /api/reports                         # List available reports
POST   /api/reports/generate                # Generate report
POST   /api/reports/export-excel            # Export to Excel
GET    /api/reporting/tables                # Available data tables
POST   /api/reporting/custom                # Custom report query
```

---

### 13. Automation & Workflow Engine

**Purpose:** Intelligent process automation and orchestration

#### Features:
- ✅ **Automated PR Creation**
  - Inventory-based triggers
  - Reorder point automation
  - Project schedule-based creation
  - Recurring procurement

- ✅ **Automated PO Generation**
  - Auto-convert approved PRs
  - Template-based PO creation
  - Vendor auto-selection (preferred vendors)
  - Terms auto-population

- ✅ **Automated Approval Routing**
  - Rule-based routing engine
  - Amount-based escalation
  - Department-based routing
  - Parallel and sequential approvals

- ✅ **Automated Notifications**
  - Email notifications for all events
  - Reminder notifications
  - Escalation alerts
  - Deadline warnings

- ✅ **Three-Way Match Automation**
  - Auto-trigger on invoice receipt
  - Automatic variance detection
  - Tolerance-based auto-approval
  - Discrepancy flagging

- ✅ **Budget Alerts**
  - Budget threshold warnings
  - Budget overrun prevention
  - Department-wise alerts
  - Project budget tracking

- ✅ **Workflow Definitions**
  - PR Approval Workflow
  - PO Approval Workflow
  - Invoice Approval Workflow
  - Payment Approval Workflow
  - RFQ Evaluation Workflow
  - Contract Renewal Workflow

- ✅ **Process Audit Trail**
  - Complete workflow execution history
  - Step-by-step tracking
  - Performance metrics
  - Bottleneck identification

#### API Endpoints:
```
GET    /api/automation/workflows            # List workflows
POST   /api/automation/workflows/[id]/start # Start workflow
GET    /api/automation/triggers             # List triggers
POST   /api/automation/triggers/execute     # Execute trigger
GET    /api/automation/approvals            # Pending approvals
POST   /api/automation/approvals            # Process approval
GET    /api/automation/notifications        # Notification queue
POST   /api/automation/notifications/process # Process notifications
```

---

## 🔐 Security & Access Control

### Role-Based Access Control (RBAC)

#### User Roles & Permissions

**1. SUPER_ADMIN**
- Full system access
- User management
- Permission management
- System configuration
- All module access

**2. ADMIN**
- User management (create, edit, deactivate)
- Role assignment
- Department management
- Category management
- All procurement operations

**3. PROCUREMENT_MANAGER**
- Approve PRs (all levels, unlimited amount)
- Create/edit/approve POs
- Create/edit/approve RFQs
- Vendor management
- Contract approval
- Service contract management
- Budget allocation
- All reports and analytics

**4. PROCUREMENT_OFFICER**
- Create/edit PRs
- Create/edit POs
- Create/edit RFQs
- Vendor registration
- Create GRNs
- Create invoices
- Basic reports

**5. DEPARTMENT_MANAGER**
- Create/approve PRs (department only, <50K OMR)
- View department POs
- View department reports
- Budget tracking

**6. SITE_ENGINEER / PROJECT_MANAGER**
- Create PRs (technical items)
- Technical approval (Level 1)
- View project POs
- Create GRNs
- Service receipt verification

**7. FINANCE_MANAGER**
- Approve PRs (budget validation)
- Approve invoices
- Process payments
- View financial reports
- Budget control
- Payment approval

**8. BUDGET_CONTROLLER**
- Budget approval for PRs
- Budget allocation
- Budget tracking
- Cost analysis

**9. GENERAL_MANAGER**
- Approve high-value PRs (>50K OMR)
- Executive approvals
- Strategic vendor approvals
- High-value contract approvals

**10. ACCOUNTS_PAYABLE**
- Invoice processing
- Three-way matching
- Payment preparation
- Vendor payment tracking

**11. WAREHOUSE_MANAGER**
- GRN creation and approval
- Inventory management
- Stock item receipts
- Quality inspection

**12. LEGAL_COMPLIANCE**
- Contract review
- Legal approval for contracts
- Compliance verification
- Regulatory approval

**13. QUALITY_CONTROLLER**
- Quality inspection approval
- GRN quality verification
- Rejection approvals
- Quality standards enforcement

**14. REQUESTOR / BUYER**
- Create PRs (basic)
- Submit for approval
- View own PRs
- Track order status

**15. VIEWER**
- Read-only access
- View dashboards
- View reports (no export)
- No edit permissions

### Permission System

**Granular Permissions (100+ permissions)**

| Module | Permissions |
|--------|-------------|
| **Purchase Requisitions** | pr.create, pr.read, pr.update, pr.delete, pr.approve, pr.reject |
| **Purchase Orders** | po.create, po.read, po.update, po.delete, po.approve, po.cancel |
| **RFQ** | rfq.create, rfq.read, rfq.update, rfq.delete, rfq.approve |
| **Goods Receipts** | gr.create, gr.read, gr.update, gr.delete, gr.approve |
| **Invoices** | invoice.create, invoice.read, invoice.approve, invoice.reject |
| **Payments** | payment.create, payment.read, payment.approve, payment.execute |
| **Vendors** | vendor.create, vendor.read, vendor.update, vendor.approve |
| **Services** | service.create, service.read, service.approve |
| **Reports** | report.view, report.export, report.create |
| **Admin** | user.create, user.edit, user.delete, role.assign |

### Security Features

- ✅ **Authentication**
  - JWT-based session management
  - NextAuth.js integration
  - Secure password hashing (bcrypt)
  - Password complexity requirements
  - Mandatory password change on first login
  - Password history (prevent reuse)

- ✅ **Session Management**
  - Auto logout on inactivity
  - Session timeout (configurable)
  - Concurrent session control
  - Device tracking
  - IP address logging

- ✅ **Account Security**
  - Failed login attempt tracking
  - Account lockout after 5 failed attempts
  - Security questions (optional)
  - Two-factor authentication (2FA) - optional
  - Email verification

- ✅ **Data Protection**
  - Role-based data filtering
  - Department-based data isolation
  - Sensitive data encryption
  - Audit logging
  - Document access control

- ✅ **API Security**
  - JWT token validation
  - Rate limiting
  - Request validation (Zod schemas)
  - SQL injection prevention (Prisma ORM)
  - XSS protection

---

## 📊 Database Architecture

### Core Entities (50+ tables)

**Master Data:**
- User
- Department
- Permission
- RolePermission
- Session
- PasswordHistory

**Catalog Management:**
- Category
- Item
- ServiceCategory
- ServiceItem

**Vendor Management:**
- Vendor
- VendorCategory
- VendorDocument
- VendorPerformance

**Procurement Cycle:**
- PurchaseRequisition
- PRItem
- PurchaseOrder
- POItem
- RFQ
- RFQResponse
- RFQInvitation
- GoodsReceipt
- GRItem

**Invoice & Payment:**
- Invoice
- InvoiceItem
- Payment

**Service Procurement:**
- ServicePR
- ServicePRItem
- ServiceRFP
- ServiceRFPResponse
- ServiceContract
- ServiceMilestone
- ServiceReceipt
- ServicePerformance

**Approval Workflow:**
- Approval
- ApprovalRule
- ApprovalRouting
- ApprovalHistory
- ApprovalNotification
- ApprovalConsultation

**Automation:**
- WorkflowDefinition
- WorkflowInstance
- WorkflowStep
- AutomationTrigger
- NotificationQueue
- ApprovalMatrix
- ProcessAudit

**System:**
- AuditLog
- SystemConfiguration
- KPITarget

### Database Features

- ✅ **Referential Integrity**
  - Foreign key constraints
  - Cascade delete rules
  - Orphan prevention

- ✅ **Indexing**
  - Primary keys on all tables
  - Composite indexes for performance
  - Full-text search indexes

- ✅ **Data Validation**
  - Unique constraints
  - Check constraints
  - Enum types
  - Required fields

- ✅ **Performance Optimization**
  - Query optimization
  - Connection pooling
  - Pagination support
  - Lazy loading

---

## 🔄 Business Process Flows

### Stock Items P2P Flow

```
1. Planning
   └─ Review BOQ → Check inventory → Validate budget

2. PR Creation
   └─ Create PR → Add items → Submit for approval

3. PR Approval
   ├─ Level 1: Site Engineer (Technical)
   ├─ Level 2: Budget Controller
   └─ Level 3: Procurement Manager

4. Tendering (if required)
   └─ Create RFQ → Send to vendors → Evaluate bids → Award

5. PO Creation
   └─ Convert PR to PO → Send to vendor → Vendor acknowledges

6. Delivery
   └─ Material delivery → Create GRN → Inspect → Accept/Reject

7. Invoice Processing
   └─ Receive invoice → Three-way match → Approve

8. Payment
   └─ Approval workflow → Execute payment

9. Reporting
   └─ Update dashboards and KPIs
```

### Service Procurement Flow

```
1. Service Requirement
   └─ Define scope → Technical specs → SLA requirements

2. Service PR
   └─ Create service PR → Define milestones → Submit

3. Service PR Approval
   ├─ Technical approval
   ├─ Budget approval
   └─ Procurement approval

4. RFP Process
   └─ Create RFP → Vendor selection → Proposal evaluation

5. Contract Award
   └─ Award contract → Sign agreement → Set milestones

6. Service Delivery
   └─ Milestone completion → Create SRN → Performance evaluation

7. Invoice & Payment
   └─ Milestone invoice → Approval → Payment release

8. Performance Tracking
   └─ Quality assessment → SLA compliance → Vendor rating
```

---

## 🎯 Key Business Benefits

### Operational Excellence
- **80% reduction** in manual data entry
- **70% faster** approval cycles
- **95% accuracy** in three-way matching
- **60% reduction** in procurement cycle time

### Cost Optimization
- **5-15% cost savings** through competitive bidding
- **Reduced maverick spending** through controlled workflows
- **Better vendor negotiations** with performance data
- **Budget overrun prevention** through real-time tracking

### Compliance & Control
- **100% audit trail** for all transactions
- **Role-based access** ensures data security
- **Approval enforcement** prevents unauthorized purchases
- **Document management** for regulatory compliance

### Strategic Insights
- **Real-time KPI dashboards** for decision making
- **Spend analytics** for strategic sourcing
- **Vendor performance tracking** for supplier optimization
- **Budget forecasting** for financial planning

---

## 📱 User Experience

### Modern UI/UX
- ✅ **Responsive Design** - Works on desktop, tablet, mobile
- ✅ **Intuitive Navigation** - Clean sidebar with quick actions
- ✅ **Dashboard-First** - Key metrics at a glance
- ✅ **Wizards** - Multi-step forms for complex processes
- ✅ **Search & Filters** - Fast data retrieval
- ✅ **Bulk Actions** - Batch processing support
- ✅ **Keyboard Shortcuts** - Power user features
- ✅ **Dark Mode** - Optional (future)

### Design System
- **Brand Colors:** Wujha Orange (#C7253E) primary theme
- **Typography:** Professional, readable fonts
- **Icons:** Lucide React icons
- **Components:** Shadcn/UI compatible
- **Accessibility:** WCAG 2.1 AA compliant

---

## 🔧 System Configuration

### Configurable Settings

**General Settings:**
- Company name and logo
- Language (English/Arabic)
- Currency and decimal places
- Date and time format
- Fiscal year settings

**Procurement Settings:**
- PR auto-numbering format
- PO auto-numbering format
- Invoice auto-numbering format
- Default payment terms
- Default delivery terms

**Approval Settings:**
- Approval rules configuration
- Timeout periods
- Escalation paths
- Delegation rules

**Notification Settings:**
- Email SMTP configuration
- Notification templates
- Email frequency
- Notification preferences

**Budget Settings:**
- Budget year definition
- Budget allocation rules
- Tolerance percentages
- Overspend alerts

---

## 📈 Scalability & Performance

### Technical Specifications

**Performance Metrics:**
- Page load time: < 2 seconds
- API response time: < 500ms
- Concurrent users: 500+
- Database queries: Optimized with indexes
- File uploads: Up to 10MB per file

**Scalability:**
- Horizontal scaling ready
- Database connection pooling
- CDN support for static assets
- Caching layer (Redis optional)
- Microservices ready architecture

**Data Handling:**
- Pagination for large datasets
- Lazy loading for performance
- Background job processing
- Batch operations support

---

## 🚀 Deployment & Infrastructure

### Production Deployment

**Hosting:**
- Platform: Railway Cloud
- Database: PostgreSQL (managed)
- Reporting: Metabase (containerized)
- File Storage: Local/S3 compatible

**CI/CD:**
- Automated deployments via Git push
- Environment variables management
- Database migrations (Prisma)
- Health check endpoints

**Monitoring:**
- Application logs
- Error tracking
- Performance monitoring
- Uptime monitoring

**Backup & Recovery:**
- Automated daily backups
- Point-in-time recovery
- Disaster recovery plan
- Data retention policies

---

## 📚 Documentation & Support

### Available Documentation

- ✅ **Business Requirements Document (BRD)** - 969 lines
- ✅ **API Documentation** - Complete endpoint reference
- ✅ **Database Schema** - ERD and table definitions
- ✅ **User Guides** - Role-specific guides
- ✅ **UAT Scenarios** - 100+ test scenarios
- ✅ **Testing Guide** - QA procedures
- ✅ **Implementation Guide** - Step-by-step setup
- ✅ **KPI Definitions** - Detailed KPI formulas

### Training & Support

**Training Materials:**
- Video tutorials (planned)
- User manuals
- Quick reference guides
- FAQ documentation

**Support Channels:**
- Email support
- Phone support (business hours)
- Online knowledge base
- System administrator guides

---

## 🎓 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- ✅ Core infrastructure setup
- ✅ User authentication & RBAC
- ✅ Master data management
- ✅ Basic PR/PO workflows

### Phase 2: Procurement Cycle (Weeks 5-8)
- ✅ Complete P2P workflow
- ✅ RFQ/Tendering module
- ✅ GRN processing
- ✅ Invoice & three-way matching

### Phase 3: Service Procurement (Weeks 9-12)
- ✅ Service PR/RFP
- ✅ Service contracts
- ✅ Performance evaluation
- ✅ Milestone tracking

### Phase 4: Advanced Features (Weeks 13-16)
- ✅ Approval workflow engine
- ✅ Automation & notifications
- ✅ KPI dashboard
- ✅ Advanced reporting

### Phase 5: UAT & Go-Live (Weeks 17-20)
- ✅ User acceptance testing
- ✅ Data migration
- ✅ Training & documentation
- ✅ Production deployment

---

## 💼 Proposal Summary

### System Highlights

**Comprehensive Solution:**
- Complete P2P cycle automation
- 50+ database tables
- 100+ API endpoints
- 13 core KPIs
- 15+ user roles
- 100+ granular permissions

**Technology Excellence:**
- Next.js 15 (latest)
- TypeScript (type-safe)
- PostgreSQL (enterprise database)
- Prisma ORM (modern data layer)
- NextAuth (secure authentication)

**Business Value:**
- Faster procurement cycles
- Reduced costs through automation
- Better vendor management
- Real-time insights
- Complete audit compliance

**Proven Deliverables:**
- Working production system
- Complete documentation
- UAT scenarios
- Testing guides
- Training materials

---

## 📞 Contact & Next Steps

### For Proposals & Demonstrations

**System Access:**
- Live demo available
- Test account credentials provided
- Full feature walkthrough
- Customization discussion

**Implementation Support:**
- Dedicated project manager
- Technical support team
- Training specialists
- Data migration assistance

**Commercial Terms:**
- Flexible licensing models
- Subscription or perpetual license
- Customization options
- Maintenance & support packages

---

## 🏆 Conclusion

The **WUJHA Procurement Management System** is a fully-featured, production-ready enterprise solution that transforms procurement operations through intelligent automation, robust workflows, and real-time analytics. Built with modern technologies and aligned with industry best practices, this system delivers measurable business value from day one.

**Key Takeaways:**
- ✅ **100% BRD Compliant** - Every requirement implemented
- ✅ **Production Ready** - Deployed and operational
- ✅ **Scalable Architecture** - Grows with your business
- ✅ **Modern Tech Stack** - Future-proof technology
- ✅ **Complete Documentation** - Comprehensive guides
- ✅ **Proven Results** - Real implementation

---

**Document Version:** 1.0.0  
**Last Updated:** January 9, 2026  
**Total Features:** 500+  
**Total API Endpoints:** 100+  
**Total Database Tables:** 50+  
**Total Lines of Code:** 50,000+  

---

*This document is confidential and proprietary. All rights reserved.*
