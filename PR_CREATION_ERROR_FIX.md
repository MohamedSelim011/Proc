# Fix: Purchase Requisition Creation Error

## Issue
When creating a purchase requisition, the following error occurred:

```
Unknown argument `requiredByDate`. Available options are marked with ?.
```

## Root Cause
The `PurchaseRequisition` model in the Prisma schema was missing several fields that were being used in the UI:
- `requiredByDate`
- `projectId`
- `boqReference`
- `costCenter`
- `createdBy`

## Solution

### 1. Updated Prisma Schema
Added missing fields to the `PurchaseRequisition` model in `prisma/schema.prisma`:

```prisma
model PurchaseRequisition {
  // ... existing fields ...
  
  // Additional fields
  requiredByDate DateTime?
  projectId      String?
  boqReference   String?
  costCenter     String?
  createdBy      String?
  
  // ... rest of model ...
}
```

### 2. Updated API Route
Modified `src/app/api/purchase-requisitions/route.ts` to include the new fields when creating a PR:

```typescript
const requisition = await prisma.purchaseRequisition.create({
  data: {
    // ... existing fields ...
    requiredByDate: body.requiredByDate ? new Date(body.requiredByDate) : null,
    projectId: body.projectId || null,
    boqReference: body.boqReference || null,
    costCenter: body.costCenter || null,
    createdBy: requesterId,
    // ... items ...
  }
});
```

### 3. Database Migration
Ran `npx prisma db push` to sync the database with the updated schema.

## Next Steps

**IMPORTANT**: You need to restart your development server for the Prisma Client changes to take effect:

1. Stop the current dev server (Ctrl+C)
2. Run `npx prisma generate` to regenerate the Prisma Client
3. Start the dev server again: `npm run dev`

## Fields Description

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requiredByDate` | DateTime | No | Date by which the items are required |
| `projectId` | String | No | Project ID reference (e.g., "P001") |
| `boqReference` | String | No | Bill of Quantities reference number |
| `costCenter` | String | No | Cost center code for accounting |
| `createdBy` | String | No | ID of the user who created the PR |

## Testing Checklist

After restarting the server:
- [ ] Create a new purchase requisition
- [ ] Fill in all fields including optional ones
- [ ] Verify PR is created successfully
- [ ] Check that all fields are saved correctly
- [ ] Verify PR details page shows all fields

## Files Modified
1. `prisma/schema.prisma` - Added fields to PurchaseRequisition model
2. `src/app/api/purchase-requisitions/route.ts` - Updated create logic to include new fields

## Note
The `requiredDate` field still exists in the `PRItem` model for individual item-level required dates, while `requiredByDate` is for the overall PR.

