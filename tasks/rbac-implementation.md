# RBAC Implementation Plan

## Phase 1: Core Authentication Setup ✅ COMPLETE

- [x] Database schema with User, Session, AuditLog, PasswordHistory models
- [x] NextAuth.js with CredentialsProvider
- [x] Login page with improved UI (blue/indigo gradient theme)
- [x] Password change functionality with validation
- [x] Password history tracking (prevent reuse of last 5 passwords)
- [x] Account lockout after failed login attempts
- [x] Audit logging for authentication events
- [x] Success alerts and proper redirects
- [x] 6 seeded users with different roles

**Admin Credentials:** admin@wujha.om / Admin@123

---

## Phase 2: User Management Interface (NEXT)

### Overview
Create admin interface to manage users, roles, and permissions

### Tasks

#### [ ] 2.1: User List Page
- [ ] Create `/src/app/admin/users/page.tsx`
- [ ] Display all users in a table with:
  - Name, Email, Role, Department, Status (Active/Inactive)
  - Last Login timestamp
  - Actions: View, Edit, Deactivate/Activate, Reset Password
- [ ] Add search/filter by role, department, status
- [ ] Add pagination

#### [ ] 2.2: Add User Page
- [ ] Create `/src/app/admin/users/new/page.tsx`
- [ ] Form fields:
  - Email, Name, Employee ID, Mobile
  - Department, Role (dropdown with all 11 roles)
  - Approval Limit (for applicable roles)
  - Must Change Password (checkbox)
- [ ] Generate random temporary password
- [ ] Send email with credentials (optional for now)

#### [ ] 2.3: Edit User Page
- [ ] Create `/src/app/admin/users/[id]/edit/page.tsx`
- [ ] Allow editing all user fields except:
  - Email (readonly)
  - Password (use separate reset function)
- [ ] Update audit log on changes

#### [ ] 2.4: User Details Page
- [ ] Create `/src/app/admin/users/[id]/page.tsx`
- [ ] Show complete user information
- [ ] Show recent login history
- [ ] Show audit log of user actions
- [ ] Show password change history
- [ ] Quick actions: Edit, Reset Password, Deactivate/Activate

#### [ ] 2.5: User Management APIs
- [ ] Create `/src/app/api/admin/users/route.ts`
  - GET: List all users (with filters)
  - POST: Create new user
- [ ] Create `/src/app/api/admin/users/[id]/route.ts`
  - GET: Get user details
  - PUT: Update user
  - DELETE: Soft delete (set isActive = false)
- [ ] Create `/src/app/api/admin/users/[id]/reset-password/route.ts`
  - POST: Reset user password, set mustChangePassword = true

#### [ ] 2.6: Role-Based Access Control
- [ ] Create middleware to check user roles
- [ ] Protect admin routes (only ADMIN, SUPER_ADMIN)
- [ ] Add role check before rendering admin UI

#### [ ] 2.7: UI Components
- [ ] Create reusable user table component
- [ ] Create role badge component (colored by role)
- [ ] Create status badge component (active/inactive)
- [ ] Create user action menu component

---

## Phase 3: Permission Management (FUTURE)

### Tasks

#### [ ] 3.1: Define Permissions
- [ ] Create Permission model in Prisma schema
- [ ] Seed permissions for each module:
  - Purchase Requisitions: create, read, update, delete, approve
  - Purchase Orders: create, read, update, delete, approve
  - Invoices: create, read, update, delete, approve
  - Payments: create, read, update, delete, approve
  - Vendors: create, read, update, delete
  - Reports: view
  - Settings: manage

#### [ ] 3.2: Role-Permission Mapping
- [ ] Create RolePermission junction table
- [ ] Assign default permissions to each role
- [ ] Create API to manage role permissions

#### [ ] 3.3: Permission Checking
- [ ] Create permission middleware
- [ ] Add permission checks to API endpoints
- [ ] Add permission checks to UI components

---

## Phase 4: Approval Workflows (FUTURE)

### Tasks

#### [ ] 4.1: Approval Hierarchy
- [ ] Define approval hierarchy per role
- [ ] Support multi-level approvals based on amount
- [ ] Implement approval delegation

#### [ ] 4.2: Approval UI
- [ ] Create "My Approvals" dashboard
- [ ] Show pending approvals
- [ ] Quick approve/reject actions
- [ ] Approval history

---

## Current Status

**Completed:** Phase 1 - Core Authentication Setup
**Next:** Phase 2 - User Management Interface (8 tasks)
**Blocked:** None

---

## Notes

- All admin pages should be under `/admin` route
- Only users with ADMIN or SUPER_ADMIN role can access admin pages
- All user changes must be logged in audit log
- Password resets should send email notification (can be added later)
- Consider adding bulk actions (activate/deactivate multiple users)
