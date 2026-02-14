# Contract Approval - Quick Fix Guide

## Issues Fixed

1. ✅ **Fixed bug in contract-version-service.ts** - Changed `vendor.name` to `vendor.nameEn`
2. ✅ **Added missing roles to UserRole enum** - Added `HEAD_OF_PROCUREMENT` and `BILLING_ENGINEER`
3. ✅ **Generated Prisma Client** - Updated TypeScript types

## Steps to Complete Setup

### Step 1: Add Enum Values to Database

You have 3 options:

#### **Option A: Use Railway Dashboard (Recommended)**

1. Go to your Railway project
2. Click on your PostgreSQL database
3. Click "Data" or "Query" tab
4. Run this SQL:

```sql
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'HEAD_OF_PROCUREMENT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BILLING_ENGINEER';
```

#### **Option B: Use the SQL Script**

```bash
# Connect to your Railway database and run:
psql $DATABASE_URL -f add-contract-roles.sql
```

#### **Option C: Use Prisma Studio**

```bash
npx prisma studio
# Go to any table that uses UserRole
# The new values should appear in dropdowns
```

### Step 2: Seed Approval Rules

Run the seed script:

```bash
npx tsx seed-contract-approval.ts
```

Or manually run this in Prisma Studio or Railway:

```sql
INSERT INTO "ApprovalRule" (
  id, 
  name, 
  description, 
  "documentType", 
  "isActive", 
  priority, 
  conditions, 
  "createdAt", 
  "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'Service Contract Approval - Standard',
  'Standard approval workflow for service contracts: Head of Procurement → Billing Engineer',
  'SERVICE_CONTRACT',
  true,
  1,
  '{"minAmount": 0, "maxAmount": null}'::jsonb,
  NOW(),
  NOW()
);

-- Note: After creating the rule, you'll need to add routings manually
-- or run the seed script which handles it automatically
```

### Step 3: Create Test Users with New Roles

You need at least 2 users:

1. **User with HEAD_OF_PROCUREMENT role**
2. **User with BILLING_ENGINEER role**

#### Quick SQL to Update Existing Users:

```sql
-- Update an existing user to HEAD_OF_PROCUREMENT
UPDATE "User" 
SET role = 'HEAD_OF_PROCUREMENT' 
WHERE email = 'your-procurement-head@example.com';

-- Update an existing user to BILLING_ENGINEER
UPDATE "User" 
SET role = 'BILLING_ENGINEER' 
WHERE email = 'your-billing-engineer@example.com';
```

Or use Prisma Studio to change user roles.

### Step 4: Restart Your Development Server

```bash
# Kill the current server (Ctrl+C)
npm run dev
```

### Step 5: Test the Workflow

1. Go to your contract: http://localhost:3000/procurement/services/contracts/[your-contract-id]
2. You should now see the "Submit for Approval" button
3. Click it
4. Check the response - should succeed!

---

## Troubleshooting

### Error: "Unknown field `name` for select statement"
**Status:** ✅ FIXED
- Fixed in `contract-version-service.ts`
- Changed `vendor.name` to `vendor.nameEn`

### Error: "Invalid enum value. Expected 'SUPER_ADMIN' | 'ADMIN' | ..."
**Solution:** 
- Run Step 1 above to add enum values to database
- Make sure you ran `npx prisma generate` (already done)

### Error: "No approval workflow configured"
**Solution:**
- Run Step 2 above to seed approval rules
- Verify rule exists in database:
  ```sql
  SELECT * FROM "ApprovalRule" WHERE "documentType" = 'SERVICE_CONTRACT';
  ```

### Error: "User is not authorized to approve"
**Solution:**
- Run Step 3 above to create/update users with correct roles
- Verify user roles:
  ```sql
  SELECT id, email, role FROM "User" 
  WHERE role IN ('HEAD_OF_PROCUREMENT', 'BILLING_ENGINEER');
  ```

---

## Verification Checklist

After completing all steps, verify:

- [ ] Enum values added to database
- [ ] Approval rule exists for SERVICE_CONTRACT
- [ ] At least 2 users have correct roles
- [ ] Dev server restarted
- [ ] "Submit for Approval" button appears on contract page
- [ ] Clicking button doesn't show errors in terminal
- [ ] Contract status changes to APPROVED after submission

---

## Quick Database Checks

```sql
-- Check if enum values exist
SELECT enum_range(NULL::"UserRole");

-- Check if approval rule exists
SELECT * FROM "ApprovalRule" WHERE "documentType" = 'SERVICE_CONTRACT';

-- Check users with approval roles
SELECT id, name, email, role FROM "User" 
WHERE role IN ('HEAD_OF_PROCUREMENT', 'BILLING_ENGINEER');

-- Check if contract submission created approval record
SELECT * FROM "Approval" WHERE "serviceContractId" = 'your-contract-id';
```

---

## Need Help?

If you still encounter issues:

1. Check the terminal logs for detailed errors
2. Verify all database changes were applied
3. Make sure you restarted the dev server
4. Check that your contract is in DRAFT status

**Common issue:** If the enum migration won't run due to shadow database issues, you MUST run the SQL directly on your database using Railway's Query tab or psql.
