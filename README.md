# WUJHA Procurement Management System

> Enterprise-grade Procure-to-Pay (P2P) solution for construction and real estate organizations

![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.5.0-black.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [System Architecture](#system-architecture)
- [Core Modules](#core-modules)
- [Business Process Flows](#business-process-flows)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Automation & Workflows](#automation--workflows)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [Support](#support)

---

## 🌟 Overview

**WUJHA Procurement** is a comprehensive procurement management system designed for construction, real estate, and property management organizations. Built on Next.js 15 with TypeScript, this system implements a complete Procure-to-Pay (P2P) workflow that covers everything from purchase requisitions to payment settlement.

The system is based on a detailed **Business Requirements Document (BRD)** that defines enterprise-grade procurement processes for both **Stock Items** (materials & inventory) and **Non-Stock Items** (services & contracts).

### Business Objectives

- **Cost Optimization**: Centralized procurement strategy with bulk purchasing and automated budget tracking
- **Process Efficiency**: Automated PO generation, approvals, and payment processing
- **Vendor Management**: Performance-based evaluations with comprehensive KPIs
- **Quality Control**: Standardized procurement guidelines and quality assurance
- **Contract Management**: Complete lifecycle management with automated renewals
- **Inventory Management**: Real-time tracking with JIT procurement capabilities
- **Transparency**: Full audit trail and stakeholder visibility

---

## 🚀 Key Features

### 📦 Procurement Management
- **Purchase Requisitions (PR)**: Create and manage requisitions for stock, non-stock, and service items
- **Purchase Orders (PO)**: Auto-conversion from PRs with supplier acknowledgment tracking
- **RFQ/Tendering**: Complete Request for Quotation process with bid evaluation
- **Goods Receipts (GRN)**: Quality and quantity inspection with acceptance/rejection workflows
- **Service Receipts (SRN)**: Service delivery verification with milestone tracking

### 💰 Financial Management
- **Invoice Processing**: Three-way matching (PO-GRN-Invoice) with automated validation
- **Payment Settlement**: Multi-level approval workflows with payment batch processing
- **Budget Control**: Real-time budget tracking and allocation management
- **Cost Analysis**: Comprehensive spend analytics and forecasting

### 👥 Vendor Management
- **Vendor Onboarding**: Complete registration with document management
- **Performance Tracking**: KPI-based vendor evaluation and scoring
- **Contract Management**: Service contracts with SLA monitoring
- **Vendor Documents**: CR, Tax ID, Insurance, and Certification tracking

### 🔄 Workflow Automation
- **Smart Approval Routing**: Oracle AME-style approval chains based on rules
- **RACI Matrix Implementation**: Responsible, Accountable, Consulted, Informed workflows
- **Automated Notifications**: Email alerts for approvals, rejections, and escalations
- **Consultation Workflow**: Multi-party input collection before approvals
- **Escalation Management**: Time-based auto-escalation for pending approvals

### 📊 Analytics & Reporting
- **KPI Dashboard**: Real-time procurement metrics and performance indicators
- **Dynamic Reports**: Customizable report generation with Excel export
- **Metabase Integration**: Advanced BI dashboards for executive insights
- **Audit Trails**: Complete transaction history and compliance tracking

### 🔐 Security & Access Control
- **Role-Based Permissions**: Granular permission system with 15+ user roles
- **Approval Limits**: User-specific approval thresholds
- **Session Management**: Secure JWT-based authentication with NextAuth
- **Password Policies**: Mandatory password changes and history tracking
- **Two-Factor Authentication**: Optional 2FA for enhanced security
- **IP Tracking**: Login and action tracking for audit compliance

### 🏗️ Service Procurement
- **Service Categories**: Specialized categories for construction services
- **Service Contracts**: Complete contract lifecycle with milestones
- **Performance Bonds**: Insurance and bond tracking
- **SLA Management**: Service Level Agreement monitoring
- **Penalty Clauses**: Automated penalty and bonus calculations
- **Retention Management**: Retention amount and release tracking

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.5.0 (App Router with Turbopack)
- **Language**: TypeScript 5.x
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS 4.x with PostCSS
- **UI Components**: Radix UI (Dialog, Select, Label, Slot, Tabs)
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **State Management**: Zustand 5.x
- **Data Fetching**: TanStack React Query 5.x
- **Notifications**: React Hot Toast

### Backend
- **API**: Next.js API Routes (REST)
- **Authentication**: NextAuth.js 4.24
- **Database ORM**: Prisma 6.14.0
- **Database**: PostgreSQL
- **Password Hashing**: bcryptjs
- **Validation**: Zod 4.x

### DevOps & Tools
- **Package Manager**: npm
- **Linting**: ESLint 9
- **Type Checking**: TypeScript strict mode
- **Database Migrations**: Prisma Migrate
- **Seed Scripts**: Custom TypeScript seed scripts

---

## 📁 Project Structure

```
wujha_procurement/
├── prisma/                          # Database schema and migrations
│   ├── schema.prisma                # Complete database schema (1131 lines)
│   ├── migrations/                  # Database migrations
│   ├── seed.ts                      # Main seed script
│   ├── seed-permissions.ts          # RBAC permissions seed
│   ├── seed-approval-rules.ts       # Approval routing rules seed
│   ├── service-seed.ts              # Service category seed
│   └── automation-seed.ts           # Workflow automation seed
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── api/                     # API Routes (100+ endpoints)
│   │   │   ├── admin/               # User and permission management
│   │   │   ├── approvals/           # Approval workflow APIs
│   │   │   ├── auth/                # Authentication APIs
│   │   │   ├── automation/          # Workflow automation APIs
│   │   │   ├── purchase-requisitions/   # PR APIs
│   │   │   ├── purchase-orders/     # PO APIs
│   │   │   ├── invoices/            # Invoice APIs
│   │   │   ├── goods-receipts/      # GRN APIs
│   │   │   ├── service-*/           # Service procurement APIs
│   │   │   ├── vendors/             # Vendor management APIs
│   │   │   ├── reporting/           # Dynamic report generation
│   │   │   └── kpis/                # KPI calculation APIs
│   │   │
│   │   ├── procurement/             # Main procurement UI
│   │   │   ├── dashboard/           # Main dashboard
│   │   │   ├── requisitions/        # PR management pages
│   │   │   ├── purchase-orders/     # PO management pages
│   │   │   ├── invoices/            # Invoice pages
│   │   │   ├── receipts/            # GRN pages
│   │   │   ├── rfq/                 # RFQ/Tender pages
│   │   │   ├── services/            # Service procurement
│   │   │   │   ├── contracts/       # Service contracts
│   │   │   │   ├── requisitions/    # Service PRs
│   │   │   │   ├── receipts/        # Service receipts
│   │   │   │   ├── performance/     # Performance evaluation
│   │   │   │   └── analytics/       # Service analytics
│   │   │   ├── payments/            # Payment management
│   │   │   ├── reports/             # Reporting interface
│   │   │   ├── kpis/                # KPI dashboard
│   │   │   ├── automation/          # Workflow management
│   │   │   └── settings/            # System settings
│   │   │
│   │   ├── admin/                   # Admin panel
│   │   │   ├── users/               # User management
│   │   │   └── permissions/         # Permission management
│   │   │
│   │   ├── approvals/               # Approval interface
│   │   ├── consultations/           # Consultation workflow
│   │   ├── change-password/         # Password management
│   │   ├── login/                   # Login page
│   │   └── layout.tsx               # Root layout
│   │
│   ├── components/                  # React components
│   │   ├── layout/                  # Layout components
│   │   │   ├── header.tsx           # App header
│   │   │   ├── sidebar.tsx          # Navigation sidebar
│   │   │   └── nav-menu.tsx         # Navigation menu
│   │   ├── ui/                      # Reusable UI components
│   │   ├── purchase-orders/         # PO-specific components
│   │   ├── requisitions/            # PR-specific components
│   │   ├── invoices/                # Invoice components
│   │   ├── vendors/                 # Vendor components
│   │   ├── shared/                  # Shared components
│   │   ├── NotificationBell.tsx     # Notification system
│   │   └── ReportingEngine*.tsx     # Report generation UI
│   │
│   ├── lib/                         # Core libraries
│   │   ├── auth.ts                  # NextAuth configuration
│   │   ├── db.ts                    # Prisma client
│   │   ├── permissions.ts           # Permission checking utilities
│   │   ├── approval-routing.ts      # Approval rule engine
│   │   ├── approval-service.ts      # Approval workflow service
│   │   ├── automation-engine.ts     # Workflow automation engine
│   │   ├── notification-service.ts  # Notification service
│   │   ├── consultation-service.ts  # Consultation workflow
│   │   ├── api-client.ts            # API client utilities
│   │   ├── utils.ts                 # General utilities
│   │   ├── utils/                   # Utility modules
│   │   └── validations/             # Validation schemas
│   │
│   ├── services/                    # Business logic services
│   │   ├── requisition.service.ts   # PR business logic
│   │   ├── purchase-order.service.ts # PO business logic
│   │   ├── vendor.service.ts        # Vendor management
│   │   ├── workflow.service.ts      # Workflow engine
│   │   └── reportingEngine.ts       # Dynamic report engine
│   │
│   ├── store/                       # Zustand state stores
│   │   ├── app.store.ts             # Global app state
│   │   ├── requisition.store.ts     # PR state
│   │   └── vendor.store.ts          # Vendor state
│   │
│   ├── types/                       # TypeScript types
│   │   ├── index.ts                 # Main type definitions
│   │   ├── next-auth.d.ts           # NextAuth type extensions
│   │   ├── purchase-order.ts        # PO types
│   │   ├── requisition.ts           # PR types
│   │   └── vendor.ts                # Vendor types
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── use-requisitions.ts      # PR data hooks
│   │   ├── use-purchase-orders.ts   # PO data hooks
│   │   ├── use-vendors.ts           # Vendor data hooks
│   │   ├── usePermissions.ts        # Permission hooks
│   │   └── use-toast.ts             # Toast notifications
│   │
│   └── middleware.ts                # Next.js middleware (auth & RBAC)
│
├── scripts/                         # Utility scripts
│   └── update-invoice-statuses.js   # Invoice status migration
│
├── tasks/                           # Project documentation
│   ├── todo.md                      # Task tracking
│   └── rbac-implementation.md       # RBAC implementation guide
│
├── docs/                            # Comprehensive documentation
│   ├── BRD.md                       # Business Requirements (965 lines)
│   ├── DATABASE_SETUP.md            # Database setup guide
│   ├── TESTING_GUIDE.md             # Testing procedures
│   ├── AUTOMATION_*.md              # Automation documentation
│   ├── KPI_IMPLEMENTATION_*.md      # KPI documentation
│   ├── NON_STOCK_*.md               # Service procurement docs
│   ├── REPORTING_*.md               # Reporting system docs
│   ├── NOTIFICATION_*.md            # Notification system
│   └── *.md                         # Various technical docs
│
├── public/                          # Static assets
├── package.json                     # Project dependencies
├── tsconfig.json                    # TypeScript configuration
├── next.config.ts                   # Next.js configuration
├── postcss.config.mjs               # PostCSS configuration
├── eslint.config.mjs                # ESLint configuration
└── README.md                        # This file
```

---

## 🚦 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **PostgreSQL**: v14.x or higher
- **Git**: Latest version

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wujha_procurement
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Configure the following variables in `.env`:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/wujha_procurement"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"

   # Optional: Metabase Integration
   METABASE_SITE_URL="http://localhost:3001"
   METABASE_SECRET_KEY="your-metabase-secret"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Run migrations
   npx prisma migrate deploy

   # Seed the database
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

After seeding, you can log in with:
- **Email**: `admin@wujha.com`
- **Password**: `Admin@123`
- **Role**: SUPER_ADMIN

⚠️ **Important**: You will be prompted to change your password on first login.

---

## 🏗️ System Architecture

### Architecture Overview

The system follows a **modern full-stack architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                   │
│  React Components + TanStack Query + Zustand + Tailwind     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────▼──────────────────────────────────────┐
│                   Next.js Application Layer                  │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  App Router   │  │  Middleware    │  │  API Routes    │ │
│  │  (Pages)      │  │  (Auth/RBAC)   │  │  (REST APIs)   │ │
│  └───────────────┘  └────────────────┘  └────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Services  │  │  Validation  │  │  Approval Engine  │   │
│  └────────────┘  └──────────────┘  └───────────────────┘   │
│  ┌──────────────────────┐  ┌────────────────────────────┐  │
│  │  Workflow Engine     │  │  Notification Service      │  │
│  └──────────────────────┘  └────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼──────────────────────────────────────┐
│                   Data Access Layer                          │
│                   Prisma Client + Migrations                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Database Layer                             │
│              PostgreSQL 14+ (Relational DB)                  │
│   35+ Tables | Complex Relations | Audit Trails             │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

1. **Repository Pattern**: Prisma ORM acts as repository layer
2. **Service Layer**: Business logic separated from API routes
3. **Middleware Chain**: Authentication → Authorization → Request Processing
4. **Event-Driven**: Notification and workflow triggers
5. **Rule Engine**: Dynamic approval routing based on conditions

---

## 📦 Core Modules

### 1. Purchase Requisition (PR) Module

**Purpose**: Initiate procurement requests for stock items, non-stock items, or services

**Key Features**:
- Multi-item requisition creation
- Budget validation and allocation
- Department and project association
- Priority levels (LOW, NORMAL, HIGH, URGENT)
- Auto-conversion to PO upon approval
- Support for stock, non-stock, and service items
- Bill of Quantities (BoQ) reference

**Workflow**:
1. Requester creates PR with specifications
2. System validates budget availability
3. PR routed through approval chain (Engineering → Budget → Procurement)
4. Approved PRs converted to PO or RFQ
5. Rejected PRs returned to requester with feedback

**API Endpoints**:
- `POST /api/purchase-requisitions` - Create PR
- `GET /api/purchase-requisitions` - List PRs
- `GET /api/purchase-requisitions/[id]` - Get PR details
- `PUT /api/purchase-requisitions/[id]` - Update PR
- `POST /api/purchase-requisitions/[id]/submit` - Submit for approval
- `POST /api/purchase-requisitions/[id]/approve` - Approve/Reject PR

---

### 2. Request for Quotation (RFQ) Module

**Purpose**: Competitive bidding process for high-value or bulk procurement

**Key Features**:
- Multi-vendor RFQ issuance
- Bid submission and tracking
- Technical and commercial evaluation
- Comparative bid analysis
- Award notification
- Terms and conditions management
- Evaluation criteria definition

**Workflow**:
1. Procurement prepares tender documentation
2. RFQ published to qualified vendors
3. Vendors submit bids before closing date
4. Technical evaluation committee reviews
5. Financial evaluation committee reviews
6. Best vendor awarded contract
7. Losing vendors notified

**API Endpoints**:
- `POST /api/rfq` - Create RFQ
- `GET /api/rfq` - List RFQs
- `POST /api/rfq/[id]/responses` - Submit vendor response
- `POST /api/rfq/[id]/evaluate` - Evaluate responses
- `POST /api/rfq/[id]/award` - Award contract
- `PUT /api/rfq/[id]/status` - Update RFQ status

---

### 3. Purchase Order (PO) Module

**Purpose**: Formal order placement with suppliers

**Key Features**:
- Auto-conversion from approved PR
- Multi-item PO with delivery schedules
- Supplier acknowledgment tracking
- PO amendments and modifications
- Delivery address management
- Payment terms configuration
- PO cancellation workflow

**Statuses**: DRAFT → APPROVED → SENT → ACKNOWLEDGED → PARTIAL → COMPLETED / CANCELLED

**Workflow**:
1. System auto-generates PO from approved PR
2. Procurement reviews and finalizes PO
3. PO sent to supplier
4. Supplier acknowledges PO
5. Goods/services delivered
6. GRN/SRN created
7. Invoice processed
8. Payment settled

**API Endpoints**:
- `POST /api/purchase-orders` - Create PO
- `GET /api/purchase-orders` - List POs
- `GET /api/purchase-orders/[id]` - Get PO details
- `PUT /api/purchase-orders/[id]` - Update PO
- `POST /api/purchase-orders/[id]/amend` - Create amendment
- `PUT /api/purchase-orders/[id]/status` - Update status

---

### 4. Goods Receipt (GRN) Module

**Purpose**: Record and verify receipt of goods

**Key Features**:
- Quality and quantity inspection
- Partial receipt handling
- Acceptance/rejection workflow
- Batch tracking
- Storage location assignment
- Discrepancy reporting
- Quality comments

**Workflow**:
1. Warehouse receives goods
2. Goods inspected for quality and quantity
3. GRN created with accepted/rejected quantities
4. Discrepancies reported to procurement
5. GRN approved by site engineer/warehouse manager
6. Inventory updated
7. Three-way match triggered

**API Endpoints**:
- `POST /api/goods-receipts` - Create GRN
- `GET /api/goods-receipts` - List GRNs
- `GET /api/goods-receipts/[id]` - Get GRN details
- `PUT /api/goods-receipts/[id]` - Update GRN

---

### 5. Invoice Management Module

**Purpose**: Process supplier invoices with three-way matching

**Key Features**:
- Invoice registration and tracking
- **Three-way matching**: PO ↔ GRN ↔ Invoice
- Discrepancy detection and resolution
- Tax calculation
- Payment status tracking
- Credit note handling
- Invoice approval workflow

**Matching Logic**:
```
✓ Invoice Line Item = PO Line Item = GRN Line Item
✓ Quantities match (with tolerance)
✓ Prices match (with tolerance)
✓ Terms and conditions match
→ Auto-approve for payment
```

**API Endpoints**:
- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - List invoices
- `GET /api/invoices/[id]` - Get invoice details
- `POST /api/invoices/three-way-match` - Perform matching
- `POST /api/invoices/[id]/approve` - Approve invoice
- `PUT /api/invoices/[id]/status` - Update status

---

### 6. Payment Management Module

**Purpose**: Process payments to suppliers

**Key Features**:
- Payment batch processing
- Multi-level payment approval
- Payment term enforcement
- Bank transfer integration ready
- Payment history tracking
- Advance payment handling
- Partial payment support

**Workflow**:
1. Invoice approved (three-way matched)
2. Payment request generated
3. Finance validates budget
4. Payment routed for approval (based on DoA)
5. Approved payment executed
6. Payment confirmation sent to vendor
7. Accounts updated

**API Endpoints**:
- `POST /api/payments` - Create payment
- `GET /api/payments` - List payments
- `POST /api/payment-batches` - Create batch
- `GET /api/payment-batches/[id]` - Get batch details

---

### 7. Service Procurement Module

**Purpose**: Complete service contract lifecycle management

**Key Features**:
- Service requisitions with SoW
- Service contracts with milestones
- SLA management
- Performance tracking
- Milestone-based payments
- Insurance and bond tracking
- Retention management
- Penalty and bonus calculations

**Service-Specific Models**:
- **ServiceCategory**: Classification of services
- **ServiceItem**: Individual service types
- **ServicePR**: Service requisition with specifications
- **ServiceContract**: Contract with terms and milestones
- **ServiceMilestone**: Payment and delivery milestones
- **ServiceReceipt**: Service completion verification
- **ServicePerformance**: KPI-based performance evaluation

**Workflow**:
1. Service PR created with SoW
2. RFP issued to service providers
3. Proposals evaluated
4. Service contract awarded
5. Milestones defined with payment schedule
6. Services delivered
7. Service receipts created
8. Performance evaluated
9. Milestone payments processed
10. Contract completed/terminated

**API Endpoints**:
- `POST /api/services/requisitions` - Create service PR
- `POST /api/service-contracts` - Create contract
- `POST /api/service-milestones` - Create milestone
- `POST /api/service-receipts` - Create SRN
- `POST /api/service-performance` - Record performance

---

### 8. Vendor Management Module

**Purpose**: Comprehensive vendor lifecycle management

**Key Features**:
- Vendor registration and onboarding
- Multi-category vendor classification
- Document management (CR, Tax ID, Insurance, Certificates)
- Performance scoring and evaluation
- Vendor qualification tracking
- Blacklisting capability
- Vendor portal (future)

**Vendor Statuses**: DRAFT → PENDING → APPROVED → ACTIVE / INACTIVE / BLACKLISTED

**Documents Required**:
- Commercial Registration (CR)
- Tax ID / VAT Number
- Insurance certificates
- Certifications (ISO, etc.)
- Bank details
- Authorized signatory documents

**API Endpoints**:
- `POST /api/vendors` - Register vendor
- `GET /api/vendors` - List vendors
- `GET /api/vendors/[id]` - Get vendor details
- `PUT /api/vendors/[id]` - Update vendor
- `POST /api/vendors/[id]/documents` - Upload documents
- `POST /api/vendors/[id]/evaluations` - Create evaluation

---

### 9. Approval Workflow Engine

**Purpose**: Oracle AME-style dynamic approval routing

**Key Features**:
- **Rule-based routing**: Conditions determine approval chain
- **Multi-level approvals**: Sequential approval hierarchy
- **RACI implementation**: Responsible, Accountable, Consulted, Informed
- **Consultation workflow**: Collect input before approval
- **Escalation management**: Time-based auto-escalation
- **Delegation**: Forward approvals to delegates
- **Approval history**: Complete audit trail

**Approval Rules**:
```typescript
{
  documentType: "PR",
  conditions: {
    minAmount: 50000,
    maxAmount: null,
    departments: ["Construction", "Maintenance"],
    itemType: "STOCK"
  },
  routings: [
    { level: 1, approverRole: "SITE_ENGINEER", raciType: "RESPONSIBLE" },
    { level: 2, approverRole: "PROJECT_MANAGER", raciType: "ACCOUNTABLE" },
    { level: 3, approverRole: "BUDGET_CONTROLLER", raciType: "ACCOUNTABLE" },
    { level: 4, approverRole: "PROCUREMENT_MANAGER", raciType: "ACCOUNTABLE" }
  ]
}
```

**API Endpoints**:
- `GET /api/approvals/pending` - Get pending approvals
- `POST /api/approvals/[id]/approve` - Approve document
- `POST /api/approvals/[id]/reject` - Reject document
- `GET /api/consultations/pending` - Get consultations
- `POST /api/consultations/[id]/respond` - Respond to consultation

---

### 10. Notification System

**Purpose**: Real-time alerts and notifications

**Key Features**:
- **In-app notifications**: Notification bell with unread count
- **Email notifications**: Automated email alerts
- **RACI-based notifications**: Inform stakeholders based on RACI
- **Approval reminders**: Escalation reminders
- **Status updates**: Document status change notifications
- **Batch notifications**: Daily/weekly digests

**Notification Types**:
- PR submitted / approved / rejected
- PO created / acknowledged
- GRN created / approved
- Invoice received / matched / approved
- Payment processed
- Approval pending / escalated
- Consultation requested

**API Endpoints**:
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/[id]/mark-read` - Mark as read

---

### 11. KPI & Analytics Module

**Purpose**: Real-time procurement metrics and performance tracking

**Key KPIs**:
1. **PR-to-PO Cycle Time**: Average days from PR submission to PO issuance
2. **PO-to-Delivery Time**: Average delivery lead time
3. **Three-Way Match Success Rate**: Percentage of invoices auto-matched
4. **Budget Utilization**: Actual spend vs. allocated budget
5. **Vendor Performance Score**: Average vendor rating
6. **Invoice Processing Time**: Days from invoice receipt to approval
7. **Payment Processing Time**: Days from approval to payment execution
8. **Purchase Order Value**: Total PO value by period
9. **Cost Savings**: Savings achieved through negotiations
10. **On-Time Delivery Rate**: Percentage of on-time deliveries
11. **Quality Rejection Rate**: Percentage of rejected goods
12. **Approval Efficiency**: Average approval time by level

**Dashboard Features**:
- Real-time metric cards
- Trend charts
- Department-wise analytics
- Vendor comparison charts
- Budget vs. actual graphs
- Drill-down capabilities

**API Endpoints**:
- `GET /api/kpis` - Get all KPIs
- `GET /api/dashboard` - Get dashboard data

---

### 12. Reporting Engine

**Purpose**: Dynamic report generation with customizable outputs

**Key Features**:
- **Dynamic table selection**: Choose any database table
- **Column selection**: Pick specific columns
- **Relationship traversal**: Include related tables
- **Filter support**: Apply custom filters
- **Export formats**: Excel, CSV, PDF-ready
- **Scheduled reports**: Future automation capability
- **Custom queries**: Advanced users can create custom reports

**Report Types**:
1. Purchase Requisition Report
2. Purchase Order Report
3. Goods Receipt Report
4. Invoice Report
5. Payment Report
6. Vendor Performance Report
7. Budget Utilization Report
8. Service Contract Report
9. Milestone Completion Report
10. Procurement Cycle Time Report

**API Endpoints**:
- `GET /api/reporting/tables` - List available tables
- `GET /api/reporting/table-info` - Get table schema
- `POST /api/reporting/preview` - Preview report
- `POST /api/reporting/generate` - Generate report
- `POST /api/reporting/generate-excel` - Export to Excel

---

### 13. Automation & Workflow Module

**Purpose**: Process automation and workflow orchestration

**Automated Processes**:
1. **Auto-PR Creation**: Based on inventory levels
2. **Auto-PO Generation**: From approved PRs
3. **Auto-approval**: For small-value purchases
4. **Three-way Matching**: Automated validation
5. **Approval Routing**: Dynamic approver assignment
6. **Escalation**: Time-based escalation
7. **Notifications**: Automated email/system alerts
8. **Budget Checks**: Real-time budget validation

**Trigger Types**:
- **Inventory Level**: Create PR when stock below reorder point
- **Budget Threshold**: Alert when budget utilization exceeds threshold
- **Time-Based**: Scheduled tasks (e.g., daily reports)
- **Status Change**: Trigger on document status change
- **Document Creation**: Trigger on new document

**API Endpoints**:
- `GET /api/automation/workflows` - List workflows
- `POST /api/automation/workflows` - Create workflow
- `POST /api/automation/workflows/[id]/start` - Start workflow
- `GET /api/automation/triggers` - List triggers

---

## 🔐 Role-Based Access Control (RBAC)

### User Roles

The system implements **15 user roles** with granular permissions:

| Role | Code | Description | Access Level |
|------|------|-------------|--------------|
| Super Administrator | `SUPER_ADMIN` | Full system access, user management | Complete |
| System Administrator | `ADMIN` | System configuration, user management | High |
| Finance Manager | `FINANCE_MANAGER` | Payment approvals, budget oversight | High |
| Procurement Manager | `PROCUREMENT_MANAGER` | PO approvals, vendor management | High |
| Budget Controller | `BUDGET_CONTROLLER` | Budget monitoring and control | Medium-High |
| Project Manager | `PROJECT_MANAGER` | Project-level approvals | Medium |
| Site Engineer | `SITE_ENGINEER` | Site inspections, GRN creation | Medium |
| Warehouse Keeper | `WAREHOUSE_KEEPER` | Goods receipt, inventory management | Medium |
| Procurement Officer | `PROCUREMENT_OFFICER` | PR/PO creation, vendor coordination | Medium |
| Approver | `APPROVER` | General approval authority | Medium |
| Viewer | `VIEWER` | Read-only access | Low |

**Legacy Roles** (for backward compatibility):
- `REQUESTOR` → Maps to VIEWER
- `DEPARTMENT_MANAGER` → Maps to APPROVER
- `CPO` → Maps to SUPER_ADMIN
- `WAREHOUSE_MANAGER` → Maps to WAREHOUSE_KEEPER
- `SERVICE_MANAGER` → Maps to PROJECT_MANAGER
- `AUDITOR` → Maps to VIEWER
- `VENDOR` → External supplier (limited access)

### Permission System

The system uses a **fine-grained permission model**:

**Permission Structure**:
```
module.action
Example: pr.create, po.approve, invoice.view
```

**Permission Modules**:
- `pr` - Purchase Requisitions
- `po` - Purchase Orders
- `rfq` - Request for Quotation
- `grn` - Goods Receipt
- `invoice` - Invoices
- `payment` - Payments
- `vendor` - Vendors
- `service` - Services
- `user` - User Management
- `report` - Reporting
- `dashboard` - Dashboards

**Permission Actions**:
- `create` - Create new records
- `read` - View records
- `update` - Edit records
- `delete` - Delete records
- `approve` - Approve documents
- `reject` - Reject documents
- `export` - Export data

**Conditional Permissions**:
```typescript
{
  role: "PROJECT_MANAGER",
  permission: "pr.approve",
  conditions: {
    scope: "own_department",
    maxAmount: 50000
  }
}
```

### Approval Limits

Each user has an **approval limit** that determines the maximum amount they can approve:

```typescript
user.approvalLimit = 50000  // Can approve up to OMR 50,000
```

### RACI Matrix

The system implements **RACI matrix** for approval workflows:

- **R (Responsible)**: Person who executes the task
- **A (Accountable)**: Person who approves/is ultimately responsible
- **C (Consulted)**: Person who provides input before decision
- **I (Informed)**: Person who is notified after action

**Example RACI for PR Approval**:
- **Responsible**: Requester (creates PR)
- **Accountable**: Department Manager (approves)
- **Consulted**: Finance (budget check)
- **Informed**: Procurement (notification)

---

## 🔄 Business Process Flows

### Stock Items Procurement Flow

```
1. Planning & Needs Identification
   ├─ Review BOQ and project plans
   ├─ Check inventory levels
   └─ Validate budget availability
   
2. Tendering (if required)
   ├─ Initiate tendering process
   ├─ Evaluate bids
   └─ Award contract
   
3. Purchase Requisition
   ├─ Create PR with specifications
   └─ Approval workflow (Engineering → Budget → Procurement)
   
4. Purchase Order
   ├─ Auto-convert PR to PO
   ├─ Issue PO to supplier
   └─ Supplier acknowledgment
   
5. Delivery & Inspection
   ├─ Delivery to site/warehouse
   ├─ Quality & quantity inspection
   └─ Create GRN
   
6. Invoice Processing
   ├─ Supplier submits invoice
   ├─ Three-way match (PO-GRN-Invoice)
   └─ Resolve discrepancies
   
7. Payment Settlement
   ├─ Approval workflow
   └─ Execute payment
   
8. Reporting & Analytics
   └─ Update dashboards and KPIs
```

### Service/Non-Stock Procurement Flow

```
1. Planning & Needs Identification
   ├─ Identify service needs
   └─ Validate budget
   
2. Supplier Selection
   ├─ Prepare RFP with SoW
   └─ Award contract
   
3. Service PR & Approval
   ├─ Create service PR with specifications
   └─ Multi-level approval
   
4. Service Contract
   ├─ Convert to service contract
   ├─ Define milestones
   └─ Sign contract
   
5. Service Delivery
   ├─ Service performance
   ├─ Milestone completion
   └─ Create SRN
   
6. Invoice & Payment
   ├─ Milestone-based invoicing
   ├─ Performance verification
   └─ Payment settlement
   
7. Performance Evaluation
   └─ KPI-based evaluation
```

---

## 🎯 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/wujha_procurement"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"

# Application Configuration
NODE_ENV="development"
PORT=3000

# Email Configuration (Optional)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="noreply@wujha.com"
SMTP_PASS="your-email-password"
SMTP_FROM="Wujha Procurement <noreply@wujha.com>"

# Metabase Integration (Optional)
METABASE_SITE_URL="http://localhost:3001"
METABASE_SECRET_KEY="your-metabase-secret-key"

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH="./uploads"

# Security
SESSION_MAX_AGE=86400  # 24 hours
PASSWORD_MIN_LENGTH=8
PASSWORD_HISTORY_COUNT=5
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=1800  # 30 minutes
```

### Database Configuration

The system uses **PostgreSQL** with Prisma ORM. The schema is defined in `prisma/schema.prisma`.

**Key Database Features**:
- 35+ tables with complex relationships
- Full audit trail
- Soft deletes (where applicable)
- Indexing for performance
- Constraints for data integrity

**Run Migrations**:
```bash
# Deploy migrations
npx prisma migrate deploy

# Reset database (development only)
npm run db:reset
```

### Seed Data

The system includes comprehensive seed scripts:

```bash
# Run all seed scripts
npm run db:seed

# Individual seed scripts
npx tsx prisma/seed-permissions.ts
npx tsx prisma/seed-approval-rules.ts
npx tsx prisma/service-seed.ts
npx tsx prisma/automation-seed.ts
```

**Seed Data Includes**:
- Default admin user (SUPER_ADMIN)
- All permission definitions
- Role-permission mappings
- Default approval rules
- Service categories
- Workflow definitions
- Sample vendors (optional)
- Sample items (optional)

---

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Deployment Platforms

#### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Environment Variables**: Configure all `.env` variables in Vercel dashboard.

#### Docker

```dockerfile
# Dockerfile (example)
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t wujha-procurement .
docker run -p 3000:3000 wujha-procurement
```

#### Traditional Server (Node.js)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "wujha-procurement" -- start

# Monitor
pm2 monit

# Logs
pm2 logs wujha-procurement
```

### Database Migration in Production

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## 🧪 Testing

### Available Test Scripts

```bash
# Test API endpoints
npx tsx test-api.ts

# Test permissions
npx tsx test-all-permissions.ts

# Validate user
npx tsx validate-user.ts

# Check permissions
npx tsx check-permissions.ts

# Create superadmin
npx tsx create-superadmin.ts

# Reset admin password
npx tsx reset-admin.ts

# Migrate user roles
npx tsx migrate-user-roles.ts
```

### Manual Testing Guide

Refer to `TESTING_GUIDE.md` for comprehensive testing procedures covering:
- Authentication flows
- Approval workflows
- Three-way matching
- Service procurement
- Reporting engine
- KPI calculations

### Testing Credentials

**Roles Available in Seed**:
- Super Admin: `admin@wujha.com` / `Admin@123`
- Finance Manager: `finance@wujha.com` / `Finance@123`
- Procurement Manager: `procurement@wujha.com` / `Procurement@123`
- Project Manager: `project@wujha.com` / `Project@123`

---

## 📚 API Documentation

### API Overview

The system provides **100+ REST API endpoints** organized by module.

**Base URL**: `/api`

**Authentication**: All endpoints require Bearer token (JWT) except `/api/auth/*`

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Main API Modules

1. **Authentication**: `/api/auth/*`
2. **Admin & Users**: `/api/admin/*`
3. **Purchase Requisitions**: `/api/purchase-requisitions/*`
4. **Purchase Orders**: `/api/purchase-orders/*`
5. **RFQ**: `/api/rfq/*`
6. **Goods Receipts**: `/api/goods-receipts/*`
7. **Invoices**: `/api/invoices/*`
8. **Payments**: `/api/payments/*`
9. **Vendors**: `/api/vendors/*`
10. **Services**: `/api/services/*`, `/api/service-*/*`
11. **Approvals**: `/api/approvals/*`
12. **Notifications**: `/api/notifications/*`
13. **Reporting**: `/api/reporting/*`
14. **KPIs**: `/api/kpis/*`
15. **Dashboard**: `/api/dashboard/*`
16. **Automation**: `/api/automation/*`

### Sample API Calls

**Create Purchase Requisition**:
```bash
POST /api/purchase-requisitions
Content-Type: application/json
Authorization: Bearer <token>

{
  "departmentId": "dept-001",
  "itemType": "STOCK",
  "priority": "NORMAL",
  "estimatedCost": 25000,
  "budgetCode": "PROJ-2025-001",
  "justification": "Construction materials for Building A",
  "items": [
    {
      "itemId": "item-123",
      "quantity": 100,
      "estimatedPrice": 250,
      "specifications": "Grade A cement, 50kg bags"
    }
  ]
}
```

**Approve Purchase Requisition**:
```bash
POST /api/purchase-requisitions/{id}/approve
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "approve",
  "comments": "Approved - budget available"
}
```

**Get Pending Approvals**:
```bash
GET /api/approvals/pending
Authorization: Bearer <token>
```

**Generate Report**:
```bash
POST /api/reporting/generate-excel
Content-Type: application/json
Authorization: Bearer <token>

{
  "tableName": "PurchaseRequisition",
  "columns": ["prNumber", "requestDate", "status", "estimatedCost"],
  "filters": {
    "status": "APPROVED",
    "requestDate": { "gte": "2025-01-01" }
  }
}
```

For complete API documentation, run the development server and visit the API routes directly.

---

## 🗄️ Database Schema

The system uses a comprehensive PostgreSQL schema with **35+ tables** and complex relationships.

### Key Tables

**Core Procurement**:
- `User` - User accounts and authentication
- `PurchaseRequisition` - Purchase requests
- `PRItem` - PR line items
- `PurchaseOrder` - Purchase orders
- `POItem` - PO line items
- `GoodsReceipt` - Goods receipts
- `GRItem` - GRN line items
- `Invoice` - Supplier invoices
- `InvoiceItem` - Invoice line items

**Vendor Management**:
- `Vendor` - Vendor master data
- `VendorCategory` - Vendor categories
- `VendorDocument` - Vendor documents
- `VendorEvaluation` - Performance evaluations

**RFQ/Tendering**:
- `RFQ` - Request for quotation
- `RFQResponse` - Vendor responses

**Service Procurement**:
- `ServiceCategory` - Service classifications
- `ServiceItem` - Service types
- `ServicePR` - Service requisitions
- `ServicePRItem` - Service PR items
- `ServiceContract` - Service contracts
- `ServiceMilestone` - Contract milestones
- `ServiceReceipt` - Service delivery receipts
- `ServicePerformance` - Performance evaluations

**Approval & Workflow**:
- `Approval` - Approval records
- `ApprovalRule` - Approval routing rules
- `ApprovalRouting` - Approval chain levels
- `ApprovalHistory` - Approval audit trail
- `ApprovalNotification` - RACI notifications
- `ApprovalConsultation` - Consultation requests
- `WorkflowDefinition` - Workflow templates
- `WorkflowInstance` - Workflow executions
- `WorkflowStep` - Workflow steps

**System**:
- `Session` - User sessions
- `Permission` - Permission definitions
- `RolePermission` - Role-permission mappings
- `AuditLog` - System audit trail
- `PasswordHistory` - Password history
- `NotificationQueue` - Notification queue
- `AutomationTrigger` - Automation triggers
- `ProcessAudit` - Process audit trail

### Schema Diagram

```
┌─────────┐       ┌──────────────────┐       ┌──────────┐
│  User   │──────▶│ PurchaseRequisition│──────▶│   PRItem  │
└─────────┘       └──────────────────┘       └──────────┘
     │                     │                        │
     │                     ▼                        │
     │            ┌────────────────┐                │
     │            │   Approval     │                │
     │            └────────────────┘                │
     │                     │                        │
     ▼                     ▼                        ▼
┌─────────┐       ┌──────────────┐         ┌────────────┐
│ Session │       │ PurchaseOrder│◀────────│  Vendor    │
└─────────┘       └──────────────┘         └────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │ GoodsReceipt │
                  └──────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │   Invoice    │
                  └──────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │   Payment    │
                  └──────────────┘
```

---

## 📖 Documentation

The project includes extensive documentation:

### Business Documentation
- **BRD.md** (965 lines): Complete Business Requirements Document
- **BRD_IMPLEMENTATION_ANALYSIS.md**: BRD compliance analysis
- **AUTOMATION_IMPLEMENTATION_PLAN.md**: Automation strategy
- **NON_STOCK_ANALYSIS.md**: Service procurement design

### Technical Documentation
- **DATABASE_SETUP.md**: Database configuration guide
- **TESTING_GUIDE.md**: Comprehensive testing procedures
- **API_COMPLETION_SUMMARY.md**: API implementation status
- **REPORTING_*.md**: Reporting engine documentation
- **KPI_IMPLEMENTATION_COMPLETE.md**: KPI system documentation
- **NOTIFICATION_APPROVAL_SYSTEM.md**: Notification system design

### Implementation Documentation
- **AUTOMATION_IMPLEMENTATION_COMPLETE.md**: Automation features
- **BUILD_SUCCESS_SUMMARY.md**: Build and deployment notes
- **EXTERNAL_REPORTING_*.md**: External reporting integration
- **REAL_SERVICE_*.md**: Service procurement implementation

### Design Documentation
- **WUJHA_DESIGN_UPDATE.md**: UI/UX design guidelines
- **DYNAMIC_DASHBOARD_README.md**: Dashboard features

---

## 🤝 Contributing

This is a private enterprise project. For internal development:

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Push to the repository**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request** for review

### Coding Standards

- **TypeScript**: Use strict mode, avoid `any`
- **Components**: Follow React best practices
- **API Routes**: Use proper error handling and validation
- **Database**: Use Prisma for all database operations
- **Security**: Never commit secrets or API keys
- **Comments**: Document complex logic
- **Naming**: Use descriptive variable and function names

---

## 🛡️ Security

### Security Features

- **Authentication**: JWT-based with NextAuth.js
- **Authorization**: Role-based with granular permissions
- **Password Policy**: Min 8 chars, uppercase, lowercase, number, special char
- **Password History**: Prevent reuse of last 5 passwords
- **Session Management**: Secure token-based sessions
- **Login Protection**: Account lockout after 5 failed attempts
- **Audit Logging**: Complete audit trail of all actions
- **Input Validation**: Zod schema validation on all inputs
- **SQL Injection Protection**: Parameterized queries via Prisma
- **XSS Protection**: React's built-in XSS protection
- **CSRF Protection**: NextAuth CSRF tokens

### Security Best Practices

1. **Never commit `.env` files**
2. **Use environment variables** for all secrets
3. **Rotate passwords** regularly
4. **Enable 2FA** for admin accounts
5. **Review audit logs** regularly
6. **Keep dependencies updated**
7. **Use HTTPS** in production
8. **Implement rate limiting** on API endpoints
9. **Regular security audits**
10. **Backup database** regularly

---

## 📊 Performance

### Optimization Techniques

1. **Server Components**: Use React Server Components where possible
2. **Code Splitting**: Automatic with Next.js
3. **Image Optimization**: Next.js Image component
4. **Database Indexing**: Strategic indexes on Prisma schema
5. **Caching**: React Query caching for API calls
6. **Lazy Loading**: Dynamic imports for heavy components
7. **Pagination**: Implement pagination on large datasets
8. **Connection Pooling**: Prisma connection pooling

### Performance Monitoring

- Monitor API response times
- Track database query performance
- Use Next.js built-in analytics
- Implement error tracking (e.g., Sentry)

---

## 🔧 Troubleshooting

### Common Issues

**Issue: Database connection error**
```
Solution: Check DATABASE_URL in .env file
Verify PostgreSQL is running: pg_isready
```

**Issue: Prisma client not generated**
```
Solution: Run npx prisma generate
```

**Issue: Authentication not working**
```
Solution: Verify NEXTAUTH_SECRET is set
Check NEXTAUTH_URL matches your deployment URL
```

**Issue: Permission denied on API routes**
```
Solution: Check user role and permissions
Verify JWT token is valid
Run seed-permissions.ts to reset permissions
```

**Issue: Build fails**
```
Solution: Clear .next folder: rm -rf .next
Delete node_modules and reinstall: rm -rf node_modules && npm install
Check for TypeScript errors: npm run lint
```

---

## 📞 Support

For support and inquiries:

- **Project Lead**: [Your Name]
- **Email**: support@wujha.com
- **Internal Wiki**: [Wiki URL]
- **Issue Tracker**: [GitHub Issues or Internal System]

### Getting Help

1. Check the documentation in `/docs`
2. Review the `TESTING_GUIDE.md`
3. Search existing issues
4. Contact the development team

---

## 📝 License

**Private & Proprietary**

This software is the property of Wujha. All rights reserved. Unauthorized copying, distribution, or modification is prohibited.

---

## 🙏 Acknowledgments

- **Next.js Team**: For the amazing framework
- **Prisma Team**: For the excellent ORM
- **Radix UI**: For accessible UI components
- **Tailwind CSS**: For utility-first styling
- **Development Team**: For their hard work and dedication

---

## 📅 Version History

### Version 1.0.0 (Current)
- ✅ Complete P2P workflow implementation
- ✅ Stock and non-stock procurement
- ✅ Service contract management
- ✅ Oracle AME-style approval routing
- ✅ Three-way matching
- ✅ KPI dashboard
- ✅ Dynamic reporting engine
- ✅ RBAC with 15+ roles
- ✅ Notification system
- ✅ Workflow automation
- ✅ Vendor management
- ✅ RFQ/Tendering
- ✅ Metabase integration ready

### Upcoming Features (v1.1.0)
- 🔜 Vendor portal
- 🔜 Mobile app
- 🔜 Advanced analytics
- 🔜 Integration with accounting systems
- 🔜 E-signature support
- 🔜 Multi-currency support
- 🔜 Multi-language support (Arabic)

---

## 🎯 Quick Reference

### Important Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm start                      # Start production server
npm run lint                   # Run linter

# Database
npx prisma migrate dev         # Create migration
npx prisma migrate deploy      # Deploy migrations
npx prisma generate            # Generate client
npm run db:seed                # Seed database
npm run db:reset               # Reset database

# Testing
npx tsx test-api.ts            # Test APIs
npx tsx test-all-permissions.ts # Test permissions

# Utilities
npx tsx create-superadmin.ts   # Create admin
npx tsx reset-admin.ts         # Reset admin password
```

### Important URLs

- **Application**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/procurement/dashboard
- **Admin Panel**: http://localhost:3000/admin/users

---

**Built with ❤️ by the Wujha Development Team**

For the latest updates and documentation, please refer to the `/docs` folder and internal wiki.
