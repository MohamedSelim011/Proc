# Material Requisition Creation Handoff (UI + API + Schema)

This is the implementation contract for cloning the **Material Requisition creation wizard** currently at:

- `src/app/procurement/requisitions/new/page.tsx`

It documents:
- Exact UI steps/options
- Field list and validation rules
- API calls and request bodies
- Decision logic (with request / without request, stock sufficient / not)
- Prisma schema models involved

---

## 1) Scope and Behavior

This screen is a 4-step wizard that supports two entry modes:

1. **Create for existing Material Request** (linked source request)
2. **Create without Material Request** (standalone)

It handles material requisitions using:
- `itemType = STOCK` or `NON_STOCK`
- Inventory integration for stock check + MR creation
- Procurement PR creation when stock is insufficient (or in forced PR mode)

---

## 2) Required `.env` Variables

### HR integration (for source requests + departments + source-request fulfillment update)
```env
HR_API_URL="https://..."
HR_API_KEY="..."         # optional
HR_API_TOKEN="..."       # optional fallback bearer
```

### Inventory integration (for item catalog, warehouses, projects, stock analysis, MR creation)
```env
INVENTORY_SYSTEM_BASE_URL="https://..."
INVENTORY_SYSTEM_API_KEY="..."
```

If inventory vars are missing, inventory-dependent APIs return 503.

### Which env drives which dropdown/API

- **Departments dropdown** uses HR integration env:
  - `HR_API_URL` (required)
  - `HR_API_KEY` (optional)
  - `HR_API_TOKEN` (optional fallback bearer)
- **Projects dropdown** uses Inventory integration env:
  - `INVENTORY_SYSTEM_BASE_URL` (required)
  - `INVENTORY_SYSTEM_API_KEY` (required)

---

## 3) UI Contract (Exact Wizard Structure)

## Step 0: Request Source

Section title: **Material Requisition Source**

User must choose one option:
- `WITH_REQUEST` = "Create For Material Request"
- `WITHOUT_REQUEST` = "Create Without Material Request"

If `WITH_REQUEST`:
- Show dropdown: **Select Material Request**
- Source list is approved material requests from internal DB (synced from HR).

Validation:
- `materialRequestMode` required
- if `WITH_REQUEST`, `selectedMaterialRequestId` required

## Step 1: Basic Information

Section title: **Basic Information**

Fields:
- `itemType` (required): `STOCK` or `NON_STOCK`
- `requestBasis` (required): `DEPARTMENT` or `PROJECT`
- if `DEPARTMENT`:
  - `departmentId` required, dropdown from HR departments API
- if `PROJECT`:
  - `projectId` required, dropdown from Inventory projects API
  - also mirrors to `inventoryProjectId`
- `priority` required: `LOW | NORMAL | HIGH | URGENT`
- `requiredByDate` required with date constraints:
  - valid date
  - not in the past
  - year >= 1900
  - max now + 10 years
- `deliveryWarehouseId` required for material flow (`STOCK`/`NON_STOCK`) unless `createPrMode = true`
- `justification` required

## Step 2: Add Items

Section title: **Add Items**

Dynamic line items with:
- `itemId` (required)
- `quantity` (required, > 0 integer)
- `estimatedPrice` (required, > 0)
- `specifications` (optional)

Item source API:
- Normal material mode: `/api/inventory-items?limit=100`
- Forced PR mode (`createPrMode=true`): `/api/items` (procurement local catalog)

UX details:
- searchable item picker
- line total per row
- total estimated cost summary

## Step 3: Review & Submit

Section title: **Review & Submit**

Shows summary cards:
- Department
- Project
- Source Request
- Priority
- Required By
- Total Items
- Total Estimated Cost

Stock analysis panel (material + non createPrMode):
- Button: **Stock Analysis**
- Calls `/api/material-requisition/check-availability`
- Displays recommendation:
  - `DIRECT_ISSUE_ALL`
  - `PROCUREMENT_REQUIRED`
  - `MIXED_FULFILLMENT`
- Shows summary and per-item availability breakdown table

Footer actions:
- Previous
- Next / Create Requisition

---

## 4) API Calls Used by the Screen

## 4.1 Step 0 source requests

1. `POST /api/hr/material-requests/sync`
2. `GET /api/hr/material-requests?status=approved&limit=100&page={n}` (looped)

Dropdown value currently uses **externalId**.

---

## 4.2 Step 1 support lists

- Departments:
  - `GET /api/hr/departments`
  - internally calls: `{HR_API_URL}/organization/units?type=department`
  - auth forwarding behavior:
    - forwards incoming `Authorization: Bearer ...` if present
    - else uses `token` cookie if present
    - else uses `HR_API_TOKEN` if configured
    - also sends `X-API-Key` when `HR_API_KEY` exists
  - normalized response shape to UI:
    ```json
    {
      "success": true,
      "data": [
        { "id": "60f1...", "name": "Marketing", "code": "MKT" }
      ]
    }
    ```
  - UI binding:
    - value = `department.id`
    - label = `department.name` + optional `(${department.code})`

- Warehouses:
  - `GET /api/inventory-warehouses?limit=50`
  - depends on `INVENTORY_SYSTEM_BASE_URL` + `INVENTORY_SYSTEM_API_KEY`
  - response to UI:
    ```json
    {
      "warehouses": [
        { "id": "wh_1", "code": "MUS-WH", "name": "Muscat Main Warehouse" }
      ]
    }
    ```
  - UI binding:
    - value = `warehouse.id`
    - label = `warehouse.code - warehouse.name`

- Projects:
  - `GET /api/inventory-projects?limit=50`
  - depends on `INVENTORY_SYSTEM_BASE_URL` + `INVENTORY_SYSTEM_API_KEY`
  - response to UI:
    ```json
    {
      "projects": [
        { "id": "prj_1", "code": "PRJ-2026-001", "name": "Head Office Upgrade" }
      ]
    }
    ```
  - UI binding:
    - value = `project.id`
    - label = `project.code - project.name`
  - form behavior:
    - when request basis is `PROJECT`, selecting `projectId` also sets `inventoryProjectId`
    - `inventoryProjectId` is then used for MR creation payloads

---

## 4.3 Step 2 items source

- Inventory catalog:
  - `GET /api/inventory-items?limit=100`
  - normalized shape: `{ id, itemCode, nameEn, nameAr, unitOfMeasure, category: { nameEn } }`

- Procurement local catalog (PR mode):
  - `GET /api/items`

---

## 4.4 Step 3 stock analysis

- `POST /api/material-requisition/check-availability`

Body:
```json
{
  "items": [
    { "itemId": "inv_item_id", "quantity": 2, "warehouseId": "wh_id" }
  ]
}
```

Response contains:
- `overallRecommendation`
- `summary`
- `items[]` with per-line fulfillment details

---

## 4.5 Submit paths (core logic)

Decision branches in `handleSubmit()`:

### A) `createPrMode = true`

Calls:
- `POST /api/purchase-requisitions`

Body (important fields):
```json
{
  "itemType": "STOCK|NON_STOCK",
  "departmentId": "resolvedDepartmentOrProjectId",
  "projectId": "optional",
  "priority": "LOW|NORMAL|HIGH|URGENT",
  "requiredByDate": "YYYY-MM-DD",
  "justification": "text",
  "items": [
    {
      "itemId": "local_or_external_or_inventory_id",
      "itemCode": "optional",
      "quantity": 1,
      "estimatedPrice": 10.5,
      "specifications": "optional",
      "requiredDate": "optional"
    }
  ],
  "requesterId": "employeeOrUserId",
  "estimatedCost": 10.5,
  "autoSubmit": false,
  "sourceMaterialRequestId": "optional externalId or local id"
}
```

### B) Material flow + has warehouse + has project

1. Check stock:
   - `POST /api/material-requisition/check-availability`
2. If `DIRECT_ISSUE_ALL`:
   - `POST /api/material-requisition/create-mr`
3. Else:
   - `POST /api/material-requisition/create-pr-and-mr`

`create-mr` body:
```json
{
  "projectId": "inventory_project_id",
  "deliveryWarehouseId": "warehouse_id",
  "requiredDate": "YYYY-MM-DD",
  "purpose": "justification or fallback text",
  "priority": "LOW|NORMAL|HIGH|URGENT",
  "sourceMaterialRequestId": "optional",
  "items": [
    { "itemId": "inventory_item_id", "quantity": 1, "requiredDate": "YYYY-MM-DD" }
  ],
  "justification": "optional"
}
```

`create-pr-and-mr` body:
```json
{
  "departmentId": "resolvedDepartmentOrProjectId",
  "justification": "text",
  "requiredByDate": "YYYY-MM-DD",
  "priority": "LOW|NORMAL|HIGH|URGENT",
  "projectId": "optional source project",
  "deliveryWarehouseId": "warehouse_id",
  "inventoryProjectId": "inventory_project_id",
  "sourceMaterialRequestId": "optional",
  "items": [
    {
      "itemCode": "ITEM-001",
      "quantity": 1,
      "estimatedPrice": 10.5,
      "inventoryItemId": "inventory_item_id",
      "requiredDate": "YYYY-MM-DD"
    }
  ]
}
```

### C) Fallback direct PR

If inventory path not met, falls back to:
- `POST /api/purchase-requisitions` (same body style as A)

---

## 4.6 Source request status update after successful creation

If a source material request was selected, screen calls:

- `PUT /api/hr/material-requests/{selectedMaterialRequestId}`

Body:
```json
{
  "status": "fullfilled",
  "approved_by_external": "currentEmployeeOrUserId",
  "updatedAt": "2026-02-23T10:30:00.000Z"
}
```

Notes:
- Status string is intentionally `fullfilled` (current contract).
- API also accepts `fulfilled` and normalizes internally.

---

## 5) Schema Models Used

From `prisma/schema.prisma`.

## 5.1 `PurchaseRequisition` (main PR record)

```prisma
model PurchaseRequisition {
  id                      String   @id @default(cuid())
  prNumber                String   @unique
  requestDate             DateTime @default(now())
  requesterId             String?
  departmentId            String
  itemType                ItemType
  priority                Priority @default(NORMAL)
  status                  PRStatus @default(DRAFT)
  estimatedCost           Decimal
  budgetCode              String
  justification           String?
  requiredByDate          DateTime?
  projectId               String?
  costCenter              String?
  sourceMaterialRequestId String?
  sourceMaterialRequest   HrMaterialRequest? @relation(fields: [sourceMaterialRequestId], references: [id], onDelete: SetNull)
  createdBy               String?
  items                   PRItem[]
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

## 5.2 `PRItem` (line items)

```prisma
model PRItem {
  id             String              @id @default(cuid())
  prId           String
  pr             PurchaseRequisition @relation(fields: [prId], references: [id])
  itemId         String
  item           Item                @relation(fields: [itemId], references: [id])
  quantity       Int
  estimatedPrice Decimal
  specifications String?
  requiredDate   DateTime?
}
```

## 5.3 `Item` (catalog item)

```prisma
model Item {
  id            String   @id @default(cuid())
  itemCode      String   @unique
  nameEn        String
  nameAr        String
  description   String?
  categoryId    String
  unitOfMeasure String
}
```

## 5.4 `HrMaterialRequest` (external request cache / source link)

Used as optional source FK and for status transitions.

Key fields: `id`, `externalId`, `status`, requester/category/budget metadata, timestamps, `rawPayload`.

---

## 6) Enum Contracts

```prisma
enum ItemType {
  STOCK
  NON_STOCK
  SERVICE
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum PRStatus {
  DRAFT
  PENDING_APPROVAL
  SUBMITTED
  APPROVED
  REJECTED
  CONVERTED
  CANCELLED
}
```

Current UI for this screen allows `STOCK` and `NON_STOCK` only.

---

## 7) Server-side Data/Mapping Rules You Must Keep

`POST /api/purchase-requisitions` mapping behavior:
- Accepts incoming lines that may have external/inventory IDs.
- Tries to resolve to local `Item.id`.
- If item code does not exist locally, auto-creates local item under category code `INVENTORY`.
- If only external inventory ID exists, fetches item from inventory and creates local item.
- If still unresolved, returns `400` with `unresolvedItemIndexes`.

Source request link behavior:
- `sourceMaterialRequestId` may be local ID or external ID.
- API resolves to local `HrMaterialRequest.id` before storing FK.

---

## 8) End-to-End Flow Matrix

1. User chooses source mode (with/without request).
2. User fills Step 1 basics and Step 2 items.
3. On submit:
   - If `createPrMode` -> create PR only.
   - Else if material + warehouse + project:
     - check availability
     - all in stock -> create MR only
     - not all in stock -> create PR + MR(needs PO)
   - Else fallback -> create PR only.
4. If source request exists, mark source request status to `fullfilled`.

---

## 9) Clone Checklist for Inventory App

1. Implement 4-step wizard with same steps and validations.
2. Implement source mode selection (`WITH_REQUEST`/`WITHOUT_REQUEST`).
3. Implement request basis switch (`DEPARTMENT`/`PROJECT`) with conditional fields.
4. Wire all APIs listed above with same payload fields.
5. Preserve submit branching logic exactly.
6. Store optional source link (`sourceMaterialRequestId`) as FK to `HrMaterialRequest`.
7. Preserve post-create source request status update (`fullfilled`).
8. Keep item mapping auto-create behavior in PR API to avoid unresolved foreign keys.
