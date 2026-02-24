# Requests Tab Integration Handoff

This document describes the **Requests** module implemented in this app (`/procurement/requests`) so you can replicate it in another system with the same behavior.

## 1) Purpose

The Requests tab is a procurement-facing view of **Material Requests** coming from HR.

- Read source of truth externally from HR API.
- Persist and serve locally from DB (`HrMaterialRequest`) for fast UI and internal joins.
- Keep local DB synced from HR in the background.
- Allow procurement users to approve/reject/fulfill through internal APIs that forward updates to HR API.

---

## 2) Required/Optional `.env` Variables

These are the env vars used by the Requests APIs.

```env
# Required: HR system base URL
HR_API_URL=https://wujhahr-production.up.railway.app/api

# Optional: static API key sent to HR API as X-API-Key
HR_API_KEY=your-hr-api-key

# Optional: bearer fallback when no Authorization header/cookie token is present
HR_API_TOKEN=your-hr-api-token

```

### Auth notes

- `PUT /api/hr/material-requests/{id}` requires authenticated user (`getAuthenticatedUser`).
- It uses bearer from:
  1. incoming `Authorization` header, else
  2. `token` cookie, else
  3. `HR_API_TOKEN` fallback.

---

## 3) Data Model (Local DB)

Model: `HrMaterialRequest` in `prisma/schema.prisma`

```prisma
model HrMaterialRequest {
  id                  String   @id @default(cuid())
  externalId          String   @unique
  budgetExternalId    String?
  departmentExternalId String?
  categoryExternalId  String?
  status              String
  quantity            Int?
  description         String?
  notes               String?
  rejectionReason     String?
  approvedByExternal  String?
  departmentName      String?
  categoryName        String?
  categoryPriceLimit  Decimal?
  budgetCategoryBudgets Json?
  requesterName       String?
  requesterFirstName  String?
  requesterLastName   String?
  requesterExternalId String?
  requesterEmail      String?
  fiscalYear          Int?
  quarter             Int?
  externalVersion     Int?
  budgetTotalAmount   Decimal?
  externalCreatedAt   DateTime?
  externalUpdatedAt   DateTime?
  lastSyncedAt        DateTime @default(now())
  rawPayload          Json
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  purchaseRequisitions PurchaseRequisition[]

  @@index([status])
  @@index([departmentName])
  @@index([externalUpdatedAt])
}
```

### Link to Material Requisition (PR)

`PurchaseRequisition` has optional FK to this table:

```prisma
sourceMaterialRequestId String?
sourceMaterialRequest   HrMaterialRequest? @relation(fields: [sourceMaterialRequestId], references: [id], onDelete: SetNull)
```

---

## 4) API Contracts

## 4.1 List Requests (local DB)

- Method: `GET`
- URL: `/api/hr/material-requests`
- Query params:
  - `page` (default `1`)
  - `limit` (default `20`, max `100`)
  - `search` (matches externalId/requester/category/description)
  - `status`
  - `department`

Example:

```bash
curl "{{base_url}}/api/hr/material-requests?page=1&limit=20&status=pending&search=laptop"
```

Success response:

```json
{
  "success": true,
  "data": [
    {
      "id": "cml...",
      "externalId": "69957d5f4ccec013a14551c4",
      "status": "pending",
      "quantity": 4,
      "description": "fdf fdfd",
      "departmentName": "Marketing",
      "categoryName": "laptops",
      "requesterName": "Adnan Abdullah",
      "createdAt": "2026-02-18T08:50:39.738Z",
      "updatedAt": "2026-02-18T08:50:39.738Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 4.2 Sync Requests from HR API

- Method: `POST`
- URL: `/api/hr/material-requests/sync`
- Body: none

What it does:
- Calls external HR API `GET {HR_API_URL}/material-requests?page={n}&limit=100`
- Paginates until complete.
- Upserts each record by `externalId`.
- Stores full raw response in `rawPayload`.

Example:

```bash
curl -X POST "{{base_url}}/api/hr/material-requests/sync"
```

Success response:

```json
{
  "success": true,
  "synced": 120,
  "pagesSynced": 2
}
```

---

## 4.3 Get Request Details (local DB)

- Method: `GET`
- URL: `/api/hr/material-requests/{id}`
- `{id}` can be:
  - local `HrMaterialRequest.id`, or
  - external `externalId`

Example:

```bash
curl "{{base_url}}/api/hr/material-requests/cmlabc123..."
curl "{{base_url}}/api/hr/material-requests/69957d5f4ccec013a14551c4"
```

Success response:

```json
{
  "success": true,
  "data": {
    "id": "cml...",
    "externalId": "69957d5f4ccec013a14551c4",
    "status": "pending",
    "rawPayload": {}
  }
}
```

---

## 4.4 Update Status (approve / reject / fulfill)

- Method: `PUT`
- URL: `/api/hr/material-requests/{id}`
- Auth required: yes

Accepted body:

```json
{
  "status": "approved | rejected | fullfilled | fulfilled",
  "approved_by_external": "procurement-user-123",
  "rejection_reason": "required when status is rejected",
  "updatedAt": "2026-02-23T10:30:00.000Z",
  "updated_at": "2026-02-23T10:30:00.000Z"
}
```

Important behavior:
- If `status` is `"fulfilled"`, API normalizes to `"fullfilled"` (external contract compatibility).
- For `rejected`, `rejection_reason` is mandatory.
- API forwards update to:
  - `PUT {HR_API_URL}/material-requests/{externalId}`
- Body forwarded includes:
  - `status`
  - `approved_by_external`
  - `updated_at` and `updatedAt`
  - `rejection_reason` when rejected
- On success, local DB is updated/upserted from external response if available.

Approve example:

```bash
curl -X PUT "{{base_url}}/api/hr/material-requests/{{id}}" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"approved",
    "approved_by_external":"procurement-user-123",
    "updatedAt":"2026-02-23T10:30:00.000Z"
  }'
```

Reject example:

```bash
curl -X PUT "{{base_url}}/api/hr/material-requests/{{id}}" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"rejected",
    "approved_by_external":"procurement-user-123",
    "rejection_reason":"Budget not available",
    "updatedAt":"2026-02-23T10:30:00.000Z"
  }'
```

Fulfill example:

```bash
curl -X PUT "{{base_url}}/api/hr/material-requests/{{id}}" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"fullfilled",
    "approved_by_external":"procurement-user-123",
    "updatedAt":"2026-02-23T10:30:00.000Z"
  }'
```

---

## 5) Synchronization Lifecycle

## 5.1 On Requests list open (`/procurement/requests`)

1. UI calls `GET /api/hr/material-requests` (local DB).
2. UI immediately renders local records.
3. UI triggers `POST /api/hr/material-requests/sync` in background.
4. If sync succeeds, UI re-fetches `GET /api/hr/material-requests`.

Result:
- Fast perceived load (local DB first)
- Eventual consistency with HR API (background sync)

## 5.2 On approve/reject/fulfill

1. UI calls internal `PUT /api/hr/material-requests/{id}`.
2. Internal API forwards to HR external API.
3. Internal API writes updated state locally.
4. User revisits Requests list -> sync runs again and reconciles latest remote data.

---

## 6) UI Contract (for another app)

Primary screens:
- Requests list: `src/app/procurement/requests/page.tsx`
- Request details: `src/app/procurement/requests/[id]/page.tsx`

## 6.1 Navigation

- Sidebar item:
  - Label: `Requests`
  - Route: `/procurement/requests`
  - Description: `Requests from HR`

## 6.2 List Screen

Structure:
1. Header (`Requests`)
2. Filters card (search, status, department)
3. Data table
4. Status/action controls per row

Columns:
- Request (externalId + created date)
- Requester
- Department
- Category
- Quantity
- Status badge
- Actions

Actions:
- `View` icon always
- For `status = pending`:
  - Approve icon button
  - Reject icon button (opens reason modal)

Status badge styles:
- pending: primary tint
- approved: green
- rejected: red
- other: gray

## 6.3 Details Screen

Top area:
- Back button to list
- Header with `Material Request {externalId}`
- Status badge
- Pending actions: Approve / Reject

Content sections:
- Requester block
- Budget & category block
- Request content block
- Timeline block
- Raw payload block

Reject flow:
- Modal with textarea `Rejection Reason`
- Confirm triggers PUT with `status=rejected`

---

## 7) Mapping from External HR Response

Mapper file: `src/lib/hr-material-requests.ts`

Mapped keys from external payload:
- `_id` -> `externalId`
- `status` -> `status`
- `quantity` -> `quantity`
- `description` -> `description`
- `notes` -> `notes`
- `rejection_reason` -> `rejectionReason`
- `approved_by_external` -> `approvedByExternal`
- `budget_id._id` -> `budgetExternalId`
- `budget_id.department_id._id` -> `departmentExternalId`
- `budget_id.department_id.name` -> `departmentName`
- `category._id` -> `categoryExternalId`
- `category.name` -> `categoryName`
- `category.price_limit` -> `categoryPriceLimit`
- `budget_id.category_budgets` -> `budgetCategoryBudgets`
- `requested_by._id` -> `requesterExternalId`
- `requested_by.first_name` -> `requesterFirstName`
- `requested_by.last_name` -> `requesterLastName`
- `{first,last}` -> `requesterName`
- `requested_by.email` -> `requesterEmail`
- `budget_id.fiscal_year` -> `fiscalYear`
- `budget_id.quarter` -> `quarter`
- `__v` -> `externalVersion`
- `budget_id.total_amount` -> `budgetTotalAmount`
- `created_at/createdAt` -> `externalCreatedAt`
- `updated_at/updatedAt` -> `externalUpdatedAt`
- entire record -> `rawPayload`

---

## 8) Integration Checklist (Other App)

1. Add env vars (`HR_API_URL`, optional `HR_API_KEY`, `HR_API_TOKEN`).
2. Create `HrMaterialRequest` table exactly as above.
3. Implement these APIs:
   - `GET /api/hr/material-requests`
   - `POST /api/hr/material-requests/sync`
   - `GET /api/hr/material-requests/{id}`
   - `PUT /api/hr/material-requests/{id}`
4. Implement list screen with background sync behavior.
5. Implement details screen with approve/reject actions.
6. Keep status contracts exactly: `approved`, `rejected`, `fullfilled` (accept `fulfilled` alias if needed).
7. Store full external payload in `rawPayload` for audit/debug.
