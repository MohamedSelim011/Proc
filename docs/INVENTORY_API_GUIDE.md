# Inventory API – Integration Guide

Guide for the **inventory application** integrating with the **Procurement** system: read Purchase Orders (POs) and **create material Purchase Requisitions (PRs)** that follow the normal procurement flow.

**Procurement → Inventory (calling Inventory from Procurement):** See **`docs/INVENTORY_API_CONTRACT.md`** for the full Inventory API contract (auth, GET items/warehouses/projects/users, POST check-availability, POST requisitions Create MR, GET requisitions/:id). Procurement uses that contract for material requisition flows.

---

## Procurement → Inventory (material requisition only)

When a user creates a **material** requisition in Procurement, the app may call the **Wujha Inventory** system for: item catalog, check availability, and create Material Requisition (MR). This applies **only to material requisitions**; service and service+material flows are unchanged.

**Env variables (Procurement `.env`):**

| Variable | Description |
|----------|-------------|
| `INVENTORY_SYSTEM_BASE_URL` | Base URL of the Inventory app (e.g. `https://inventory.example.com`) |
| `INVENTORY_SYSTEM_API_KEY` | API key for server-to-server calls (Inventory team provides it) |

**Implementation checklist:** See **`docs/INVENTORY_INTEGRATION_TODO.md`** for step-by-step tasks and API routes (e.g. GET /api/inventory-items, POST /api/material-requisition/check-availability, POST /api/material-requisition/create-mr). User mapping: Procurement uses **email** to resolve the requester to Inventory’s `userId` (GET /api/users).

---

## Base URL and authentication (Inventory → Procurement)

- **Base URL:** e.g. `https://wujhaprocurement-staging.up.railway.app` (or your deployment).
- **Authentication:** Every request must include one of:
  - **API key:** header `X-API-Key: <your-api-key>` (recommended for system-to-system), or
  - **Bearer token:** header `Authorization: Bearer <jwt>` (for SSO later).

Missing or invalid auth returns **401 Unauthorized**.

---

## 1. Read APIs (POs)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory/purchase-orders` | List POs. Query: `page`, `limit`, **`status`**, `vendorId`. |
| GET | `/api/inventory/purchase-orders/:id` | One PO with full details. |

Use the query parameter **`status`** (not `po_status`) to filter, e.g. `?status=APPROVED` or `?status=SENT,COMPLETED`.

---

## 2. Create material PR (POST)

**Endpoint:** `POST /api/inventory/purchase-requisitions`

Creates a **material** Purchase Requisition (STOCK or NON_STOCK) in Procurement. The PR is created in **DRAFT** and goes through the normal flow (submit → approval → RFQ/PO as configured). Optionally you can auto-submit for approval in the same call.

### Headers

| Header | Required | Value |
|--------|----------|--------|
| `Content-Type` | Yes | `application/json` |
| `X-API-Key` **or** `Authorization: Bearer <token>` | Yes | Your inventory API key or JWT |

### Request body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `departmentId` | string | **Yes** | Department ID (non-empty). |
| `budgetCode` | string | **Yes** | Budget code. |
| `items` | array | **Yes** | At least one line item (see below). |
| `itemType` | string | No | `STOCK` or `NON_STOCK`. Default: `STOCK`. Material PRs only. |
| `priority` | string | No | `LOW`, `NORMAL`, `HIGH`, `URGENT`. Default: `NORMAL`. |
| `requesterId` | string | No | Requester identifier. Default: `inventory-system`. |
| `justification` | string | No | Reason for the requisition. |
| `requiredByDate` | string | No | ISO 8601 date (e.g. `2025-03-01`). |
| `projectId` | string | No | Project ID. |
| `costCenter` | string | No | Cost center. |
| `autoSubmit` | boolean | No | If `true`, PR is submitted for approval in the same call. Default: `false`. |
| `firstApproverId` | string | No | Used only when `autoSubmit` is `true`. Default: `manager001`. |

**Each element of `items`:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemId` | string | **Yes** | Item ID from the Procurement item catalog (must exist). |
| `quantity` | number | **Yes** | Positive integer. |
| `estimatedPrice` | number | **Yes** | Unit price (≥ 0). |
| `specifications` | string | No | Line-level specifications. |
| `requiredDate` | string | No | ISO 8601 date for this line. |

**Validation rules:**

- `itemId` must exist in the Procurement **Item** table; otherwise the API returns **400** with a message listing invalid IDs.
- `quantity` must be a positive integer; `estimatedPrice` must be ≥ 0.
- Dates must be valid ISO strings if provided.

### Example request body (minimal)

```json
{
  "departmentId": "DEPT-001",
  "budgetCode": "BUDGET-2025-01",
  "items": [
    {
      "itemId": "<valid-item-cuid-from-procurement-catalog>",
      "quantity": 10,
      "estimatedPrice": 25.5
    },
    {
      "itemId": "<another-valid-item-id>",
      "quantity": 2,
      "estimatedPrice": 100,
      "specifications": "Grade A",
      "requiredDate": "2025-03-15"
    }
  ]
}
```

### Example request body (full, with optional fields)

```json
{
  "departmentId": "DEPT-001",
  "budgetCode": "BUDGET-2025-01",
  "itemType": "STOCK",
  "priority": "NORMAL",
  "requesterId": "inventory-system",
  "justification": "Stock replenishment from inventory system",
  "requiredByDate": "2025-03-20",
  "projectId": "PROJ-101",
  "costCenter": "CC-WAREHOUSE",
  "items": [
    {
      "itemId": "clxx1234567890abcdefghij",
      "quantity": 10,
      "estimatedPrice": 25.5,
      "specifications": null,
      "requiredDate": "2025-03-15"
    }
  ],
  "autoSubmit": false
}
```

### Example cURL (API key)

Replace `BASE_URL`, `YOUR_API_KEY`, and at least one real `itemId` from your Procurement item catalog.

```bash
curl -X POST 'https://BASE_URL/api/inventory/purchase-requisitions' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: YOUR_API_KEY' \
  -d '{
  "departmentId": "DEPT-001",
  "budgetCode": "BUDGET-2025-01",
  "items": [
    {
      "itemId": "REPLACE_WITH_REAL_ITEM_ID",
      "quantity": 10,
      "estimatedPrice": 25.5
    }
  ]
}'
```

### Example cURL (Bearer token)

```bash
curl -X POST 'https://BASE_URL/api/inventory/purchase-requisitions' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d '{
  "departmentId": "DEPT-001",
  "budgetCode": "BUDGET-2025-01",
  "items": [
    {
      "itemId": "REPLACE_WITH_REAL_ITEM_ID",
      "quantity": 10,
      "estimatedPrice": 25.5
    }
  ]
}'
```

### Success response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clxx...",
    "prNumber": "PR-2025-0001",
    "requesterId": "inventory-system",
    "departmentId": "DEPT-001",
    "itemType": "STOCK",
    "priority": "NORMAL",
    "status": "DRAFT",
    "estimatedCost": "255",
    "budgetCode": "BUDGET-2025-01",
    "items": [
      {
        "id": "...",
        "itemId": "...",
        "quantity": 10,
        "estimatedPrice": "25.5",
        "item": { ... }
      }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  },
  "requestId": "optional-if-you-sent-x-request-id"
}
```

If you sent `autoSubmit: true`, the PR is updated to **SUBMITTED** and an approval record is created; the response body still returns the created PR object.

### Error responses

| Status | Meaning |
|--------|--------|
| **400** | Validation error. Body has `success: false`, `error`: message (e.g. missing field, invalid itemId, invalid type). |
| **401** | Unauthorized. Wrong or missing API key / token. |
| **500** | Server error. Use `requestId` when reporting. |

Example 400 body:

```json
{
  "success": false,
  "error": "The following itemIds do not exist in the catalog: abc123.",
  "requestId": "..."
}
```

---

## Mapping from your system to this API

For your agent, map as follows:

| Your system | This API field | Notes |
|-------------|----------------|-------|
| Department / cost center code | `departmentId` | Required, non-empty string. |
| Budget / account code | `budgetCode` | Required. |
| Requester (user or system id) | `requesterId` | Optional; default `inventory-system`. |
| Material / product ID | **Must be mapped to Procurement `itemId`** | Get item IDs from Procurement item catalog (e.g. GET items or master data). Each `itemId` must exist. |
| Quantity needed | `items[].quantity` | Positive integer. |
| Unit price / estimate | `items[].estimatedPrice` | Number ≥ 0. |
| Line notes / specs | `items[].specifications` | Optional string. |
| Required date (line) | `items[].requiredDate` | Optional, ISO date. |
| Required date (header) | `requiredByDate` | Optional, ISO date. |
| Stock vs non-stock | `itemType` | `STOCK` or `NON_STOCK` only. |
| Urgency | `priority` | `LOW`, `NORMAL`, `HIGH`, `URGENT`. |

**Important:** Do not send `itemType: "SERVICE"`; this endpoint is for **material PRs only** (STOCK or NON_STOCK). Invalid or non-existent `itemId` values will result in a **400** listing the bad IDs.

---

## Debugging

- Send header **`X-Request-Id`** (e.g. a UUID or correlation ID); the API echoes it in the response so support can match logs.
- For 400 on create, check the `error` message for the exact field or itemIds that failed.
- For 401, confirm the API key matches the Procurement `INVENTORY_API_KEY` (or that the Bearer token is valid).
