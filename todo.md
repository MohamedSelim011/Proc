# RBAC (Role-Based Access Control) Implementation Plan

## Overview
Implement enterprise-grade authentication and role-based access control system for the procurement module, following SAP/Oracle standards.

**Estimated Timeline**: 6-8 weeks
**Priority**: High
**Status**: Planning Phase

---

## System Architecture

### Two-Part Admin Configuration System:
1. **Role Management**: Define what each role CAN DO (Permissions Matrix)
2. **User Management**: Assign WHO gets which roles (User Assignment)

---

## Database Schema Changes

### 1. User Table (New)
```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password          String    // Hashed
  name              String
  employeeId        String?   @unique
  mobile            String?
  department        String?
  role              UserRole
  approvalLimit     Decimal?  // Max amount user can approve
  isActive          Boolean   @default(true)
  mustChangePassword Boolean  @default(true)
  passwordChangedAt DateTime?
  lastLoginAt       DateTime?
  lastLoginIP       String?
  failedLoginAttempts Int     @default(0)
  lockedUntil       DateTime?
  twoFactorEnabled  Boolean   @default(false)
  twoFactorSecret   String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  createdBy         String?

  // Relations
  createdPRs        PurchaseRequisition[] @relation("PRCreator")
  approvals         Approval[]
  auditLogs         AuditLog[]
}

enum UserRole {
  REQUESTOR              // Basic user - creates PRs
  DEPARTMENT_MANAGER     // Approves department PRs (L1)
  PROCUREMENT_OFFICER    // Creates POs, manages RFQs
  PROCUREMENT_MANAGER    // Approves POs (L2), manages procurement
  FINANCE_MANAGER        // Approves payments, budget oversight
  CPO                    // Chief Procurement Officer (L3)
  WAREHOUSE_MANAGER      // Goods receipts, inventory
  SERVICE_MANAGER        // Service contracts, milestones
  AUDITOR                // Read-only access for compliance
  ADMIN                  // System administrator
  VENDOR                 // External supplier (future)
}
```

### 2. Role Permissions Table (New)
```prisma
model RolePermission {
  id           String   @id @default(cuid())
  role         UserRole
  module       String   // e.g., "purchase_requisition"
  resource     String   // e.g., "create", "view_all", "approve"
  action       String   // e.g., "read", "write", "delete", "approve"
  conditions   Json?    // e.g., {"scope": "own", "maxAmount": 5000}
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([role, module, resource, action])
}
```

### 3. Audit Log Table (New)
```prisma
model AuditLog {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  action       String   // e.g., "user_created", "role_changed", "pr_approved"
  module       String   // e.g., "user_management", "purchase_requisition"
  resourceId   String?  // ID of affected resource
  resourceType String?  // Type of resource
  oldValue     Json?    // Before change
  newValue     Json?    // After change
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([module])
  @@index([createdAt])
}
```

### 4. Session Table (New)
```prisma
model Session {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}
```

### 5. Password History (New)
```prisma
model PasswordHistory {
  id           String   @id @default(cuid())
  userId       String
  passwordHash String
  createdAt    DateTime @default(now())

  @@index([userId])
}
```

---

## Phase 1: Core Authentication Setup (Week 1-2)

### Tasks:

#### 1.1 Database Setup
- [ ] Add User model to schema.prisma
- [ ] Add UserRole enum to schema.prisma
- [ ] Add Session model for session management
- [ ] Add PasswordHistory model
- [ ] Run `prisma db push` to update database
- [ ] Create seed script for default admin user

#### 1.2 Authentication Library Setup
- [ ] Install NextAuth.js: `npm install next-auth bcryptjs`
- [ ] Install types: `npm install -D @types/bcryptjs`
- [ ] Configure NextAuth.js in `/src/app/api/auth/[...nextauth]/route.ts`
- [ ] Set up credentials provider
- [ ] Configure session strategy (JWT)
- [ ] Set up environment variables in `.env`
  - `NEXTAUTH_URL=http://localhost:3000`
  - `NEXTAUTH_SECRET=<generate-random-secret>`

#### 1.3 Login Page
- [ ] Create `/src/app/login/page.tsx`
- [ ] Design login form (email + password)
- [ ] Add "Remember Me" checkbox
- [ ] Add "Forgot Password" link
- [ ] Handle login errors (invalid credentials, account locked)
- [ ] Show loading state during authentication

#### 1.4 Password Security
- [ ] Implement bcrypt password hashing
- [ ] Password validation rules:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character
- [ ] Password strength indicator on UI
- [ ] Store hashed passwords only

#### 1.5 Force Password Change on First Login
- [ ] Create `/src/app/change-password/page.tsx`
- [ ] Check `mustChangePassword` flag on login
- [ ] Redirect to password change if true
- [ ] Validate new password meets requirements
- [ ] Prevent reuse of old password
- [ ] Update `passwordChangedAt` timestamp
- [ ] Set `mustChangePassword` to false

#### 1.6 Session Management
- [ ] Implement JWT-based sessions
- [ ] Set session timeout (30 minutes inactivity)
- [ ] Auto-logout on timeout
- [ ] Single session per user (invalidate old sessions)
- [ ] Track last login time and IP

---

## Phase 2: User Management Interface (Week 2-3)

### Tasks:

#### 2.1 Users List Page
- [ ] Create `/src/app/procurement/settings/users/page.tsx`
- [ ] Fetch all users from database
- [ ] Display in table format:
  - Email
  - Full Name
  - Role
  - Department
  - Status (Active/Inactive)
  - Last Login
  - Actions (Edit, Reset Password, Deactivate)
- [ ] Add search functionality (by name or email)
- [ ] Add filter by role dropdown
- [ ] Add filter by status (Active/Inactive)
- [ ] Add pagination (20 users per page)
- [ ] Show total user count

#### 2.2 Add New User Page
- [ ] Create `/src/app/procurement/settings/users/new/page.tsx`
- [ ] Form fields:
  - Full Name (required)
  - Email Address (required, validate format)
  - Employee ID (optional)
  - Mobile Number (optional)
  - Department (dropdown)
  - Primary Role (dropdown)
  - Approval Limit (if applicable to role)
  - Status (Active/Inactive)
- [ ] Generate random password button
- [ ] Show/hide generated password
- [ ] Copy password to clipboard button
- [ ] "Send welcome email" checkbox
- [ ] Validate email uniqueness
- [ ] Validate employee ID uniqueness
- [ ] Save user to database
- [ ] Set `mustChangePassword` to true
- [ ] Log action in audit log

#### 2.3 Edit User Page
- [ ] Create `/src/app/procurement/settings/users/[id]/page.tsx`
- [ ] Pre-fill form with existing user data
- [ ] Allow editing all fields except email
- [ ] Change role dropdown
- [ ] Update approval limit
- [ ] Activate/Deactivate user
- [ ] Show last login information
- [ ] Show creation date and creator
- [ ] Log changes in audit log

#### 2.4 Reset Password Functionality
- [ ] Create API route `/api/users/[id]/reset-password`
- [ ] Generate new random password
- [ ] Hash and store password
- [ ] Set `mustChangePassword` to true
- [ ] Send email with new password
- [ ] Show success/error toast notification
- [ ] Log action in audit log

#### 2.5 Bulk User Import
- [ ] Create CSV template download
- [ ] CSV format: Name, Email, EmployeeID, Department, Role
- [ ] Upload CSV file
- [ ] Validate CSV data
- [ ] Show preview before import
- [ ] Import users in batch
- [ ] Generate passwords for all
- [ ] Send welcome emails
- [ ] Show import summary (success/failed)

#### 2.6 User API Endpoints
- [ ] `GET /api/users` - List all users
- [ ] `GET /api/users/[id]` - Get single user
- [ ] `POST /api/users` - Create new user
- [ ] `PATCH /api/users/[id]` - Update user
- [ ] `DELETE /api/users/[id]` - Deactivate user
- [ ] `POST /api/users/[id]/reset-password` - Reset password
- [ ] `POST /api/users/bulk-import` - Bulk import

---

## Phase 3: Role & Permissions Management (Week 3-4)

### Tasks:

#### 3.1 Roles List Page
- [ ] Create `/src/app/procurement/settings/roles/page.tsx`
- [ ] Display all roles with:
  - Role name
  - Number of users assigned
  - Description
  - Actions (Edit Permissions, View Users)
- [ ] Show system roles (cannot be deleted)
- [ ] Add custom role button (future feature)

#### 3.2 Edit Role Permissions Page
- [ ] Create `/src/app/procurement/settings/roles/[role]/permissions/page.tsx`
- [ ] Build permissions matrix UI
- [ ] Group by modules:
  - Purchase Requisitions
  - Purchase Orders
  - RFQs & Quotations
  - Vendors
  - Goods Receipts
  - Invoices
  - Service Contracts
  - Reports & Analytics
  - System Configuration
- [ ] For each module, show resources with checkboxes:
  - ☑ None (No access)
  - ☑ View (Read-only)
  - ☑ View Own (Own records only)
  - ☑ View Department (Department records)
  - ☑ View All (All records)
  - ☑ Create (Create new)
  - ☑ Edit (Edit records)
  - ☑ Delete (Delete records)
  - ☑ Approve (Approval authority)
  - ☑ Export (Export data)
- [ ] Add approval limit field for approver roles
- [ ] Save permissions to RolePermission table
- [ ] Show permission inheritance (if applicable)

#### 3.3 Default Role Permissions
- [ ] Create seed data for default roles:

**REQUESTOR:**
- Purchase Requisitions: Create, View Own, Edit Own (Draft)
- Reports: View Own

**DEPARTMENT_MANAGER:**
- Purchase Requisitions: Create, View Department, Approve (L1, <5K OMR)
- Purchase Orders: View Department
- Reports: View Department, Export

**PROCUREMENT_OFFICER:**
- Purchase Requisitions: View All
- Purchase Orders: Create, View All, Edit
- RFQs: Create, View All, Edit
- Vendors: Create, View All, Edit
- Goods Receipts: Create, View All
- Invoices: Create, View All
- Reports: View All, Export

**PROCUREMENT_MANAGER:**
- Purchase Requisitions: Create, View All, Approve (L2, <50K OMR)
- Purchase Orders: Create, View All, Edit, Approve, Cancel
- RFQs: Create, View All, Edit, Approve
- Vendors: Create, View All, Edit, Approve
- Goods Receipts: View All
- Invoices: View All
- Service Contracts: Create, View All, Approve
- Reports: View All, Export

**FINANCE_MANAGER:**
- Purchase Requisitions: View All, Approve (Budget)
- Purchase Orders: View All
- Invoices: Create, View All, Approve, Process Payment
- Service Contracts: View All, Approve Payments
- Reports: View All, Export

**CPO:**
- All modules: Full access (Create, View All, Edit, Delete, Approve)
- Purchase Requisitions: Approve (L3, >50K OMR)
- Strategic decisions

**ADMIN:**
- All modules: Full access
- System Configuration: Full access
- User Management: Full access
- Role Management: Full access

#### 3.4 Permission Checking Utilities
- [ ] Create `/src/lib/permissions.ts`
- [ ] Function: `hasPermission(userId, module, action)`
- [ ] Function: `getUserPermissions(userId)`
- [ ] Function: `canApprove(userId, amount)`
- [ ] Function: `getDataScope(userId, module)` - returns "own", "department", "all"
- [ ] Cache permissions in session for performance

#### 3.5 Permissions API
- [ ] `GET /api/roles` - List all roles
- [ ] `GET /api/roles/[role]/permissions` - Get role permissions
- [ ] `PUT /api/roles/[role]/permissions` - Update role permissions
- [ ] `GET /api/users/[id]/permissions` - Get user's effective permissions

---

## Phase 4: Enforce Permissions Across System (Week 4-5)

### Tasks:

#### 4.1 Middleware Protection
- [ ] Create `/src/middleware.ts`
- [ ] Check authentication on all `/procurement/*` routes
- [ ] Redirect to login if not authenticated
- [ ] Check session validity
- [ ] Verify user is active
- [ ] Load user permissions into session

#### 4.2 API Route Protection
- [ ] Create `/src/lib/auth-guard.ts`
- [ ] Wrapper function: `requireAuth(handler)`
- [ ] Wrapper function: `requirePermission(module, action, handler)`
- [ ] Apply to all API routes:
  - `/api/purchase-requisitions/*`
  - `/api/purchase-orders/*`
  - `/api/vendors/*`
  - `/api/invoices/*`
  - `/api/payments/*`
  - etc.
- [ ] Return 401 if not authenticated
- [ ] Return 403 if no permission

#### 4.3 Navigation Menu Filtering
- [ ] Update `/src/components/Navigation.tsx`
- [ ] Hide menu items based on permissions
- [ ] Show only accessible modules
- [ ] Hide admin sections for non-admins

#### 4.4 Page-Level Access Control
- [ ] Add permission checks to each page
- [ ] Show 403 error if no access
- [ ] Redirect to dashboard if unauthorized

#### 4.5 Button/Action Filtering
- [ ] Hide "Create PR" button if no create permission
- [ ] Hide "Approve" button if no approve permission
- [ ] Hide "Edit" button if no edit permission
- [ ] Hide "Delete" button if no delete permission
- [ ] Disable buttons during loading

#### 4.6 Data Filtering by Scope
- [ ] Purchase Requisitions:
  - Requestor: Show only own PRs
  - Department Manager: Show department PRs
  - Procurement: Show all PRs
- [ ] Purchase Orders:
  - Department Manager: Show department POs
  - Others: Based on permissions
- [ ] Apply to all modules

#### 4.7 Approval Workflow Integration
- [ ] Update `/api/purchase-requisitions/[id]/approve`
- [ ] Check user has approve permission
- [ ] Check approval amount within limit
- [ ] Determine approval level (L1, L2, L3)
- [ ] Route to next approver if needed
- [ ] Apply to all approval workflows

---

## Phase 5: Security Features (Week 5-6)

### Tasks:

#### 5.1 Account Lockout
- [ ] Track failed login attempts
- [ ] Lock account after 5 failed attempts
- [ ] Auto-unlock after 30 minutes
- [ ] Admin can manually unlock
- [ ] Send email notification on lockout

#### 5.2 Password Policies
- [ ] Enforce password complexity
- [ ] Password expiry (90 days)
- [ ] Show password expiry warning (7 days before)
- [ ] Force password change after expiry
- [ ] Store password history (last 5)
- [ ] Prevent password reuse
- [ ] Generate strong random passwords

#### 5.3 Session Security
- [ ] Implement CSRF protection
- [ ] Set secure HTTP-only cookies
- [ ] Implement session timeout (30 minutes)
- [ ] Refresh token on activity
- [ ] Invalidate session on logout
- [ ] Prevent concurrent sessions
- [ ] Track active sessions per user

#### 5.4 Audit Logging
- [ ] Log all user actions:
  - Login/Logout
  - Password changes
  - User creation/modification
  - Role changes
  - Permission changes
  - PR approvals
  - PO creation/approval
  - Payment processing
- [ ] Store: User, Action, Resource, Timestamp, IP, Old/New values
- [ ] Create audit log viewer page
- [ ] Filter by user, module, date range
- [ ] Export audit logs

#### 5.5 Two-Factor Authentication (2FA)
- [ ] Install `speakeasy` library for TOTP
- [ ] Add 2FA setup page
- [ ] Generate QR code for authenticator apps
- [ ] Verify 2FA token on login
- [ ] Store 2FA secret encrypted
- [ ] Backup codes generation
- [ ] 2FA recovery process
- [ ] Make 2FA mandatory for Admin and Finance roles

#### 5.6 Email Notifications
- [ ] Set up email service (Nodemailer or SendGrid)
- [ ] Welcome email template
- [ ] Password reset email template
- [ ] Account locked email template
- [ ] Password expiry warning email
- [ ] Send email on user creation
- [ ] Send email on password reset
- [ ] Send email on account lockout

---

## Phase 6: Admin Features (Week 6)

### Tasks:

#### 6.1 Dashboard for Admin
- [ ] Create `/src/app/procurement/settings/dashboard/page.tsx`
- [ ] Show statistics:
  - Total users
  - Active users
  - Users by role
  - Recent logins
  - Failed login attempts
  - Locked accounts
- [ ] Show recent audit logs
- [ ] Quick actions (Add User, Reset Password)

#### 6.2 User Activity Monitoring
- [ ] Create activity log page
- [ ] Show user login history
- [ ] Show user actions timeline
- [ ] Filter by user, date range
- [ ] Export activity reports

#### 6.3 Role Assignment Report
- [ ] Create role report page
- [ ] Show users per role
- [ ] Show permission matrix
- [ ] Export role assignments
- [ ] Show orphaned permissions

#### 6.4 Password Management
- [ ] Admin force password change
- [ ] Bulk password reset
- [ ] Unlock user accounts
- [ ] View password age
- [ ] View accounts with expired passwords

#### 6.5 System Settings
- [ ] Configure password policy
- [ ] Configure session timeout
- [ ] Configure lockout policy
- [ ] Configure 2FA requirements
- [ ] Configure email templates

---

## Integration Points

### Update Existing Modules:

#### Purchase Requisitions
- [ ] Add `requesterId` field (foreign key to User)
- [ ] Add `createdBy` tracking
- [ ] Filter by user scope (own/department/all)
- [ ] Check approve permission before showing approve button
- [ ] Verify approval amount limit

#### Purchase Orders
- [ ] Add `createdBy` field (foreign key to User)
- [ ] Filter by user scope
- [ ] Check permissions before actions
- [ ] Track approver in approval workflow

#### Vendors
- [ ] Add `createdBy` field
- [ ] Check permissions for vendor management
- [ ] Track vendor approval by user

#### Invoices & Payments
- [ ] Add `processedBy` field
- [ ] Add `approvedBy` field
- [ ] Check finance permissions
- [ ] Track payment processor

#### Service Contracts
- [ ] Add `createdBy` field
- [ ] Check service manager permissions
- [ ] Track milestone approvals by user

#### Reports
- [ ] Filter data based on user scope
- [ ] Show only authorized reports
- [ ] Track report exports in audit log

---

## Testing Checklist

### Authentication Tests
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Login with inactive account
- [ ] Login with locked account
- [ ] Logout functionality
- [ ] Session timeout
- [ ] Password change on first login
- [ ] Password complexity validation
- [ ] Password history check

### Authorization Tests
- [ ] Test each role's permissions
- [ ] Verify menu items show/hide correctly
- [ ] Verify buttons show/hide correctly
- [ ] Verify data filtering by scope
- [ ] Test approval workflows with different roles
- [ ] Test API route protection
- [ ] Test page access control

### User Management Tests
- [ ] Create new user
- [ ] Edit existing user
- [ ] Change user role
- [ ] Reset user password
- [ ] Deactivate user
- [ ] Bulk import users
- [ ] Search and filter users

### Security Tests
- [ ] Account lockout after failed attempts
- [ ] Session expiry
- [ ] CSRF protection
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Password encryption
- [ ] 2FA functionality

### Audit Tests
- [ ] All actions logged correctly
- [ ] Audit log searchable
- [ ] Audit log exportable
- [ ] Old/new values captured

---

## Performance Considerations

### Optimizations:
- [ ] Cache user permissions in session
- [ ] Index database columns (userId, role, email)
- [ ] Pagination on user lists
- [ ] Lazy loading for large datasets
- [ ] Optimize permission checks (avoid N+1 queries)

---

## Security Best Practices

### Must Implement:
- [ ] Never store passwords in plain text
- [ ] Use bcrypt with salt rounds >= 10
- [ ] Use HTTPS in production
- [ ] Set secure HTTP-only cookies
- [ ] Implement CSRF tokens
- [ ] Validate all inputs
- [ ] Sanitize all outputs
- [ ] Use parameterized queries (Prisma handles this)
- [ ] Implement rate limiting on login
- [ ] Log security events
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## Deployment Checklist

### Before Production:
- [ ] Change `NEXTAUTH_SECRET` to production value
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Enable HTTPS
- [ ] Set up production email service
- [ ] Configure production database
- [ ] Set up monitoring and alerts
- [ ] Create default admin user
- [ ] Seed role permissions
- [ ] Test all authentication flows
- [ ] Test all authorization scenarios
- [ ] Performance testing
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Documentation for admins
- [ ] Training materials

---

## Documentation Required

### Admin Documentation:
- [ ] How to create users
- [ ] How to assign roles
- [ ] How to configure permissions
- [ ] How to reset passwords
- [ ] How to unlock accounts
- [ ] How to view audit logs
- [ ] How to export reports

### User Documentation:
- [ ] How to login
- [ ] How to change password
- [ ] How to set up 2FA
- [ ] Role-specific guides
- [ ] FAQ

---

## Success Metrics

### Measure:
- [ ] All users have unique accounts
- [ ] No shared credentials
- [ ] All actions tracked in audit log
- [ ] Zero unauthorized access incidents
- [ ] Password policy compliance 100%
- [ ] User adoption rate
- [ ] Time to provision new user < 5 minutes
- [ ] Time to change user role < 2 minutes

---

## Future Enhancements

### Post-MVP:
- [ ] Single Sign-On (SSO) integration
- [ ] LDAP/Active Directory integration
- [ ] Custom role creation (not just predefined)
- [ ] Fine-grained permissions (field-level)
- [ ] Delegation (temporary role assignment)
- [ ] Approval delegation during absence
- [ ] Mobile app authentication
- [ ] Biometric authentication
- [ ] Advanced analytics on user behavior
- [ ] AI-powered anomaly detection

---

## Contact & Support

**Implementation Lead**: Development Team
**Security Review**: Security Team
**User Acceptance**: Procurement Team
**Final Approval**: IT Director + Procurement Director

---

**Status Legend:**
- [ ] Not Started
- [🔄] In Progress
- [✅] Completed
- [⚠️] Blocked
- [❌] Cancelled

---

**Last Updated**: 2025-11-11
**Next Review**: After Phase 1 completion
