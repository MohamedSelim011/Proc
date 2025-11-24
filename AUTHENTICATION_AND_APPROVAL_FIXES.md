# Authentication and Approval Fixes

## Summary of Changes

This document outlines the changes made to fix authentication, requisition creation, and approval button visibility issues.

## Issues Fixed

### 1. JWT Token Creation and Local Storage ✅

**Problem**: JWT token was not being created on signin and saved to localStorage with user role.

**Solution**:
- Created a new API route `/api/auth/signin/route.ts` that handles authentication
- The route validates credentials, creates a JWT token with user data, and returns it
- Updated `signin.tsx` to save the JWT token and user data to localStorage:
  - `token`: JWT token for API authentication
  - `role`: User role for permission checks
  - `user`: Complete user object (id, email, name, role, department, employeeId)

**Files Changed**:
- `src/app/api/auth/signin/route.ts` (NEW)
- `signin.tsx` (UPDATED)

### 2. Purchase Requisition Creation - requesterId and requiredByDate ✅

**Problem**: After requisition creation, "Created By" and "Required By" fields were not set correctly.

**Solution**:
- Updated the PR creation API to:
  - Get `requesterId` from the request body or default to the authenticated user
  - Properly set `requiredByDate` from `formData.requiredByDate`
  - Set `createdBy` field to match the `requesterId`
  - Set `requestDate` to current date
- Updated the PR creation form to:
  - Read user data from localStorage
  - Pass the correct `requesterId` (using employeeId or user id)

**Files Changed**:
- `src/app/api/purchase-requisitions/route.ts` (UPDATED)
- `src/app/procurement/requisitions/new/page.tsx` (UPDATED)

### 3. Approval Button Visibility ✅

**Problem**: Can't see the request approval button in details and list screens for any roles.

**Solution**:
- Updated the PR details page to:
  - Get user data from both session and localStorage (fallback)
  - Expand roles that can request approval: `REQUESTOR`, `DEPARTMENT_MANAGER`, `PROCUREMENT_MANAGER`, `ADMIN`
  - Expand roles that can approve: `DEPARTMENT_MANAGER`, `PROCUREMENT_MANAGER`, `FINANCE_MANAGER`, `ADMIN`
  - Check if user is the requester by comparing with both `requesterId` and `createdBy`
  - Show "Review & Approve" button for PENDING_APPROVAL and SUBMITTED status

**Files Changed**:
- `src/app/procurement/requisitions/[id]/page.tsx` (UPDATED)

### 4. Approval Button Status Filter ✅

**Problem**: The approve button should only appear for Pending Approvals Requisition and for the roles mentioned above.

**Solution**:
- The approval button now only appears when:
  - PR status is `PENDING_APPROVAL` or `SUBMITTED`
  - User has approval permissions (DEPARTMENT_MANAGER, PROCUREMENT_MANAGER, FINANCE_MANAGER, ADMIN)
  - User is NOT the requester (to prevent self-approval)

**Files Changed**:
- `src/app/procurement/requisitions/[id]/page.tsx` (ALREADY FIXED)
- `src/app/procurement/requisitions/page.tsx` (ALREADY CORRECT)

## Technical Details

### JWT Token Structure

The JWT token includes:
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "DEPARTMENT_MANAGER",
  "department": "IT",
  "employeeId": "EMP001"
}
```

### Permission Roles

**Can Request Approval**:
- REQUESTOR
- DEPARTMENT_MANAGER
- PROCUREMENT_MANAGER
- ADMIN

**Can Approve PRs**:
- DEPARTMENT_MANAGER
- PROCUREMENT_MANAGER
- FINANCE_MANAGER
- ADMIN

### PR Status Flow

1. **DRAFT** - Initial creation, requester can edit and submit
2. **SUBMITTED/PENDING_APPROVAL** - Waiting for approval, approvers can review
3. **APPROVED** - Approved by authorized person
4. **REJECTED** - Rejected, can be edited and resubmitted

## Testing Checklist

- [x] Login creates JWT token and saves to localStorage
- [x] User data is saved to localStorage (role, user object)
- [x] PR creation sets requesterId from logged-in user
- [x] PR creation sets requiredByDate correctly
- [x] PR creation sets createdBy field
- [x] Approval button appears for PENDING_APPROVAL status
- [x] Approval button appears for SUBMITTED status
- [x] Approval button only shows for authorized roles
- [x] Approval button hides for requesters (no self-approval)
- [x] Request Approval button shows for DRAFT status

## Dependencies Added

- `jsonwebtoken`: For JWT token creation
- `@types/jsonwebtoken`: TypeScript types for jsonwebtoken

## Environment Variables Required

Ensure the following environment variable is set:
- `NEXTAUTH_SECRET`: Used for JWT signing

## Notes

- The system now supports both NextAuth session-based auth and localStorage-based auth
- This provides flexibility for different authentication scenarios
- The localStorage approach allows for easier token management in client-side code
- Users must have appropriate roles to see approval buttons
- Self-approval is prevented by checking if the user is the requester

