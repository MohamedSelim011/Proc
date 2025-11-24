# PO Status Enum Fix

## Problem
Error when clicking "Request Approval" button:
```
Invalid value for argument `status`. Expected POStatus.
Invalid `prisma.purchaseOrder.update()` invocation
status: "PENDING_APPROVAL"
```

## Root Cause
The Prisma client was generated before `PENDING_APPROVAL` was added to the `POStatus` enum. The client doesn't recognize this new enum value.

## Solution Applied

### 1. Updated Submit Route (`src/app/api/purchase-orders/[id]/submit/route.ts`)
- ✅ Imported `POStatus` enum from `@prisma/client`
- ✅ Changed `status: 'PENDING_APPROVAL'` to `status: POStatus.PENDING_APPROVAL`

### 2. Updated Approve Route (`src/app/api/purchase-orders/[id]/approve/route.ts`)
- ✅ Imported `POStatus` enum from `@prisma/client`
- ✅ Used enum values for status updates

## Required Action: Regenerate Prisma Client

**The Prisma client MUST be regenerated for the enum changes to take effect.**

### Steps:

1. **Stop the development server** (Ctrl+C in the terminal where it's running)

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **If you get a file lock error:**
   - Make sure the dev server is completely stopped
   - Close any other processes that might be using the Prisma client
   - Try again: `npx prisma generate`

4. **Restart the development server:**
   ```bash
   npm run dev
   ```

## Alternative: Use SUBMITTED Status (Temporary Workaround)

If you can't regenerate right now, you can temporarily use `SUBMITTED` instead of `PENDING_APPROVAL`:

```typescript
// In submit route, change:
status: POStatus.PENDING_APPROVAL,
// To:
status: POStatus.SUBMITTED,
```

Then update all references to `PENDING_APPROVAL` to use `SUBMITTED` instead.

## Verification

After regenerating, test:
1. Click "Request Approval" on a DRAFT PO
2. Should successfully change status to PENDING_APPROVAL
3. Check database to verify status was updated
4. Verify approval records were created

## Files Modified

1. ✅ `src/app/api/purchase-orders/[id]/submit/route.ts` - Uses POStatus enum
2. ✅ `src/app/api/purchase-orders/[id]/approve/route.ts` - Uses POStatus enum

## Note

The enum values in `prisma/schema.prisma` are correct:
```prisma
enum POStatus {
  DRAFT
  SUBMITTED
  PENDING_APPROVAL  // ✅ This exists in schema
  APPROVED
  SENT
  ACKNOWLEDGED
  PARTIAL
  COMPLETED
  CANCELLED
  REJECTED
}
```

The issue is only that the Prisma client needs to be regenerated to include this new value.

