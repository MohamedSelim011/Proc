# Inventory API for Procurement – Integration Contract

This document is for the **Procurement system** (or any agent integrating with the **Wujha Inventory** application). It describes the APIs exposed by Inventory, how to authenticate, request/response schemas, and suggested mapping.

---

## 1. Base URL and authentication

- **Base URL:** Provided by the Inventory team (e.g. `https://inventory.example.com` or `http://localhost:3000`).
- **Authentication:** Every request must include a valid **API key**.

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | For POST/PUT | `application/json` |
| `X-API-Key` **or** `Authorization: ApiKey <key>` | **Yes** | Shared API key (Inventory team provides it; stored in Inventory as `INVENTORY_API_KEY`). |

**Example (X-API-Key):**
```http
GET /api/items?status=ACTIVE&limit=100
X-API-Key: your-inventory-api-key
```

**Example (Authorization):**
```http
GET /api/items?status=ACTIVE&limit=100
Authorization: ApiKey your-inventory-api-key
```

- **401 Unauthorized:** Missing or invalid API key. Response body: `{ "success": false, "error": "Unauthorized. Provide X-API-Key or sign in." }`.

---

## 2. Endpoints overview

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | GET | `/api/items` | Item catalog (for selection and mapping to Inventory `itemId`) |
| 2 | GET | `/api/items/:id` | Single item by id (for syncing into Procurement) |
| 3 | GET | `/api/warehouses` | Warehouse list (for `deliveryWarehouseId` and availability checks) |
| 4 | POST | `/api/requisitions/check-availability` | Check stock for selected items; decide fulfill from stock vs PR |
| 5 | POST | `/api/requisitions` | Create Material Requisition (MR) when stock is sufficient |
| 6 | GET | `/api/requisitions/:id` | Get MR details and status (e.g. for issuance tracking) |
| 7 | GET | `/api/projects` | List projects (for `projectId`) |
| 8 | GET | `/api/users` | List users (for `userId` / requester) |

All of these accept **either** a valid API key **or** a valid user session (Bearer/cookie); for server-to-server calls from Procurement, use the API key.

---

## 3. GET /api/items – Item catalog

**Purpose:** Retrieve the Inventory item catalog. Use the returned `id` as `itemId` in Check Availability and Create MR.

### Request

- **Method:** GET  
- **Query parameters:** `page`, `limit`, `status`, `stockType`, `search`, `categoryId` (all optional).

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "clxx...",
      "code": "ITEM-001",
      "name": "Widget A",
      "arabicName": "قطعة أ",
      "description": null,
      "status": "ACTIVE",
      "stockType": "STOCK",
      "category": { "id": "...", "name": "...", "code": "..." },
      "itemGroup": { "id": "...", "name": "...", "code": "..." },
      "baseUom": { "id": "...", "name": "Unit", "abbreviation": "EA", "type": "COUNT" }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 100
}
```

---

## 4. GET /api/warehouses – Warehouse list

**Purpose:** Get warehouses for delivery and for availability checks.

### Request

- **Method:** GET  
- **Query parameters:** `page`, `limit`, `search`, `type`, `status`, `companyId` (all optional).

### Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "wh1...",
      "code": "WH-MAIN",
      "name": "Main Warehouse",
      "type": "CENTRAL",
      "status": "ACTIVE",
      "address": "...",
      "city": "...",
      "region": "...",
      "country": "..."
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

## 4a. GET /api/users – response shape (for requester → `userId`)

**Purpose:** Map your “current procurement user” (e.g. email) to Inventory’s user; use that object’s **`id`** as **`userId`** in the Create MR body.

**Request:** `GET /api/users?page=1&limit=20` (optional: `search`, `role`, `isActive`).

**Fields to use:** `id` → use as `userId` in POST /api/requisitions; `email` → map your procurement user by email.

---

## 4b. GET /api/projects – response shape (for project → `projectId`)

**Purpose:** Map your department/project to an Inventory project; use that object’s **`id`** as **`projectId`** in the Create MR body.

**Request:** `GET /api/projects?page=1&limit=20` (optional: `search`).

**Fields to use:** `id` → use as `projectId` in POST /api/requisitions; `code`, `name` for mapping.

---

## 5. POST /api/requisitions/check-availability – Stock check

**Purpose:** For a set of items and quantities at a warehouse, get available stock and a suggested fulfillment.

### Request body (JSON)

| Field | Type | Required |
|-------|------|----------|
| `items` | array | **Yes** |

**Each element of `items`:** `itemId` (string), `quantity` (number), `warehouseId` (string).

### Response (200)

`data.overallRecommendation`: `DIRECT_ISSUE_ALL`, `PROCUREMENT_REQUIRED`, `MIXED_FULFILLMENT`.  
`data.items[].canFulfillNow`, `needsProcurement`, `suggestedFulfillment`.

---

## 6. POST /api/requisitions – Create Material Requisition (MR)

**Purpose:** Create an MR in Inventory (e.g. when stock is sufficient for direct issue, or when stock is insufficient and PR is created in Procurement so Inventory has a matching MR).

### Request body (JSON) – only these fields are supported

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | **Yes** | Inventory project ID |
| `priority` | string | **Yes** | `LOW`, `NORMAL`, `HIGH`, `URGENT`, `CRITICAL` |
| `requiredDate` | string | **Yes** | ISO date (e.g. `2026-02-25`) |
| `deliveryWarehouseId` | string | **Yes** | Inventory warehouse ID |
| `purpose` | string | **Yes** | Short description |
| `items` | array | **Yes** | At least one line (see below) |
| `userId` | string | **Yes** when using API key | Inventory User ID of the requester |
| `justification` | string | No | Required if priority is HIGH/URGENT/CRITICAL (min 50 chars) |
| `wbsCodeId` | string | No | Optional WBS code |

**Each element of `items`:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemId` | string | **Yes** | Inventory item ID |
| `quantity` | number | **Yes** | Quantity to request |
| `requiredDate` | string | No | ISO date for line |
| `specification` | string | No | Line-level spec |
| `uomId` | string | No | UOM ID (defaults to item base UOM) |

**Example body:**
```json
{
  "projectId": "proj1...",
  "priority": "NORMAL",
  "requiredDate": "2026-02-25",
  "deliveryWarehouseId": "wh1...",
  "purpose": "Created from Procurement requisition – stock available",
  "justification": "Stock check indicated full availability; requester will receive via Stock Issuance.",
  "userId": "user-inventory-requester-id",
  "items": [
    { "itemId": "clxx...", "quantity": 10, "requiredDate": "2026-02-25" }
  ]
}
```

### Response (201)

```json
{
  "success": true,
  "message": "Material requisition created successfully",
  "data": {
    "id": "mr-id...",
    "mrNumber": "MR-2026-000001",
    "status": "SUBMITTED",
    "projectId": "...",
    "deliveryWarehouseId": "...",
    "requestedById": "...",
    "purpose": "...",
    "requiredDate": "...",
    "items": []
  }
}
```

### Error responses

- **400** – Missing required fields, invalid project/warehouse/item, or justification too short for HIGH/URGENT/CRITICAL.
- **401** – No API key or invalid; or API key present but `userId` missing in body. Body may say: `"userId is required in body when using API key; or sign in."`
- **500** – Server error.

---

## 7. GET /api/requisitions/:id – Get MR details

**Purpose:** Retrieve MR status and details.

**Response:** `data.id`, `data.mrNumber`, `data.status`, `data.items`, etc.  
**MR status values:** `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `IN_PROCUREMENT`, `PARTIALLY_FULFILLED`, `FULFILLED`, `CANCELLED`, `CLOSED`.

---

## 8. Summary

- **Auth:** All endpoints accept **X-API-Key** (or **Authorization: ApiKey <key>**). 401 if missing or invalid.
- **IDs:** Use **Inventory’s IDs** for `itemId`, `warehouseId`, `projectId`, `userId` in requests.
- **Create MR:** Send only the documented fields; `userId` is **required** when using API key.
- **Errors:** JSON body with `success: false` and `error: "message"`.
