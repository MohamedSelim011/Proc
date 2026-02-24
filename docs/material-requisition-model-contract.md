# Material Requisition Data Contract (Procurement -> Inventory)

This document defines the Procurement database models used when creating a **Material Requisition**.

## Core Models

### 1) `PurchaseRequisition` (Header)
Use this as the requisition header record.

Relevant fields:
- `id: String` (PK)
- `prNumber: String` (unique)
- `requestDate: DateTime`
- `requesterId: String?`
- `departmentId: String`
- `itemType: ItemType`  
  Allowed for material flow: `STOCK`, `NON_STOCK`
- `priority: Priority` (`LOW | NORMAL | HIGH | URGENT`)
- `status: PRStatus` (`DRAFT | PENDING_APPROVAL | SUBMITTED | APPROVED | REJECTED | CONVERTED | CANCELLED`)
- `estimatedCost: Decimal`
- `budgetCode: String`
- `justification: String?`
- `requiredByDate: DateTime?`
- `projectId: String?`
- `costCenter: String?`
- `sourceMaterialRequestId: String?`  
  Optional source request link (intended FK to `HrMaterialRequest.id`)
- `createdBy: String?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Relations:
- `items: PRItem[]`

### 2) `PRItem` (Line Items)
Use this as requisition line records under the header.

Relevant fields:
- `id: String` (PK)
- `prId: String` (FK to `PurchaseRequisition.id`)
- `itemId: String` (FK to `Item.id`)
- `quantity: Int`
- `estimatedPrice: Decimal`
- `specifications: String?`
- `requiredDate: DateTime?`

## Material Requisition Identification Rule

A requisition is considered **Material** when:
- `PurchaseRequisition.itemType IN ('STOCK', 'NON_STOCK')`

## Optional Source Request Link

If a requisition is created from an upstream material request, store:
- `PurchaseRequisition.sourceMaterialRequestId`

Recommended value:
- Local `HrMaterialRequest.id` (preferred)
- If receiving external IDs, resolve/map them before persisting.

## Minimal JSON Shape (Integration-Friendly)

```json
{
  "header": {
    "id": "cml...",
    "prNumber": "PR-2026-0006",
    "itemType": "STOCK",
    "departmentId": "dep-001",
    "projectId": "proj-001",
    "priority": "NORMAL",
    "status": "DRAFT",
    "requiredByDate": "2026-03-10T00:00:00.000Z",
    "justification": "Site material requirement",
    "estimatedCost": 1250.500,
    "sourceMaterialRequestId": "cmk..."
  },
  "items": [
    {
      "id": "cmi...",
      "prId": "cml...",
      "itemId": "itm-001",
      "quantity": 10,
      "estimatedPrice": 12.500,
      "specifications": "Grade A",
      "requiredDate": "2026-03-05T00:00:00.000Z"
    }
  ]
}
```

## Notes for Inventory App Team

- Treat `PurchaseRequisition` as header and `PRItem` as child lines.
- Filter material requisitions using `itemType` (`STOCK`, `NON_STOCK`).
- Use `status` to control workflow visibility (draft/pending/approved).
- Keep `sourceMaterialRequestId` nullable; not every PR has a source request.
