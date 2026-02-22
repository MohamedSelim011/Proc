# Purchase Orders PUT API

This document covers all existing `PUT` endpoints for Purchase Orders and all supported request body fields.

## 1) Update PO Header/Items

`PUT /api/purchase-orders/{id}`

### Purpose
Update editable PO data (vendor, delivery/payment/currency, and optionally replace items).

### Edit Rules
- PO must exist.
- PO status must be `DRAFT` or `APPROVED`.
- If PO status is anything else, API returns:
  - `400 { "error": "Cannot edit PO in current status" }`

### Request Body (all optional)
```json
{
  "vendorId": "string",
  "deliveryDate": "2026-03-15T00:00:00.000Z",
  "deliveryAddress": {
    "building": "A",
    "street": "Main Road",
    "city": "Muscat",
    "country": "Oman"
  },
  "paymentTerms": "Net 30",
  "currency": "OMR",
  "items": [
    {
      "itemId": "string",
      "quantity": 5,
      "unitPrice": 12.5,
      "deliveryDate": "2026-03-20T00:00:00.000Z"
    }
  ]
}
```

### Field Notes
- `vendorId`: replaces vendor.
- `deliveryDate`: converted to `Date`.
- `deliveryAddress`: JSON object/string accepted (stored as JSON).
- `paymentTerms`: string.
- `currency`: string (example: `OMR`).
- `items`: if provided, existing PO items are deleted and replaced with new list.
- `totalAmount`: auto-recalculated from `items` when `items` is provided.

### Success Response
- `200` with updated PO including:
  - `vendor`
  - `items` (with nested `item`)

### Example (from app)
```ts
await fetch(`${baseUrl}/api/purchase-orders/${poId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    paymentTerms: "Net 45",
    currency: "OMR",
    deliveryDate: "2026-03-15T00:00:00.000Z",
    items: [
      { itemId: "cmj123", quantity: 10, unitPrice: 8.25 }
    ]
  })
})
```

---

## 2) Update PO Status

`PUT /api/purchase-orders/{id}/status`

### Purpose
Change PO workflow status.

### Request Body
```json
{
  "status": "ACKNOWLEDGED",
  "comments": "Optional comment",
  "updatedBy": "user-id-or-email"
}
```

### Fields
- `status` (required): one of
  - `DRAFT`
  - `SUBMITTED`
  - `PENDING_APPROVAL`
  - `APPROVED`
  - `SENT`
  - `ACKNOWLEDGED`
  - `PARTIALLY_INVOICED`
  - `INVOICED`
  - `PAID`
  - `PARTIAL`
  - `COMPLETED`
  - `CANCELLED`
  - `REJECTED`
- `comments` (optional): audit notes.
- `updatedBy` (optional): audit actor (`SYSTEM` fallback).

### Transition Rules (current -> allowed next)
- `DRAFT` -> `SUBMITTED`, `PENDING_APPROVAL`, `APPROVED`, `CANCELLED`
- `SUBMITTED` -> `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CANCELLED`
- `PENDING_APPROVAL` -> `APPROVED`, `REJECTED`, `CANCELLED`
- `APPROVED` -> `SENT`, `CANCELLED`
- `SENT` -> `ACKNOWLEDGED`, `CANCELLED`
- `ACKNOWLEDGED` -> `PARTIAL`, `PARTIALLY_INVOICED`, `INVOICED`, `COMPLETED`, `CANCELLED`
- `PARTIAL` -> `PARTIALLY_INVOICED`, `INVOICED`, `COMPLETED`, `CANCELLED`
- `PARTIALLY_INVOICED` -> `INVOICED`, `PAID`, `CANCELLED`
- `INVOICED` -> `PAID`, `COMPLETED`, `CANCELLED`
- `PAID` -> `COMPLETED`
- `COMPLETED` -> `INVOICED`, `PAID`
- `CANCELLED` -> _(none)_
- `REJECTED` -> _(none)_

### Behavior
- If `status = SENT`, system generates `acknowledgmentToken` and attempts vendor email send.
- Status update still succeeds even if email sending fails.
- Creates `processAudit` record.

### Example (from app)
```ts
await fetch(`${baseUrl}/api/purchase-orders/${poId}/status`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    status: "ACKNOWLEDGED",
    comments: "Vendor confirmed receipt",
    updatedBy: "finance@company.com"
  })
})
```

---

## Common Error Responses

- `404 { "error": "Purchase order not found" }`
- `400 { "error": "Cannot edit PO in current status" }`
- `400 { "error": "Invalid status. Must be one of: ..." }`
- `400 { "error": "Cannot transition from X to Y" }`
- `500 { "error": "Failed to update purchase order" }`
- `500 { "error": "Failed to update PO status" }`

---

## 3) Finance API-Key PO Update (No Status Transition Restriction)

`PUT /api/finance/purchase-orders/{id}`

### Auth
Use either:
- `X-API-Key: <FINANCE_API_KEY>`
- `Authorization: ApiKey <FINANCE_API_KEY>`
- or `Authorization: Bearer <jwt>`

### Purpose
- Finance-facing update endpoint (API-key compatible).
- Accepts same editable payload style as PO update.
- Status can be set to any valid PO status regardless of current status.

### Identifier
`{id}` can be:
- PO `id`, or
- PO number (example: `PO-2026-00012`)

### Request Body (all optional)
```json
{
  "vendorId": "string",
  "deliveryDate": "2026-03-15T00:00:00.000Z",
  "deliveryAddress": {
    "building": "A",
    "street": "Main Road",
    "city": "Muscat",
    "country": "Oman"
  },
  "paymentTerms": "Net 30",
  "currency": "OMR",
  "status": "ACKNOWLEDGED",
  "invoicedAmount": 250.5,
  "acknowledgedAt": "2026-03-16T08:30:00.000Z",
  "acknowledgedBy": "vendor@example.com",
  "items": [
    {
      "itemId": "string",
      "quantity": 5,
      "unitPrice": 12.5,
      "deliveryDate": "2026-03-20T00:00:00.000Z"
    }
  ]
}
```

### Field Notes
- `status`: validated against PO status enum, but no current-state transition check.
- `items`: when provided, existing PO items are replaced and `totalAmount` is recalculated.
- `invoicedAmount`: can be updated directly by finance app.
- `acknowledgedAt`: set ISO date or `null`.
- `acknowledgedBy`: set identifier/email or `null`.

### Example (API Key)
```bash
curl -X PUT "{{base_url}}/api/finance/purchase-orders/{{poIdOrNumber}}" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: {{finance_api_key}}" \
  -d '{
    "status": "INVOICED",
    "invoicedAmount": 975.25
  }'
```
