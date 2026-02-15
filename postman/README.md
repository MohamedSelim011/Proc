# Procurement External APIs – Postman

Collections for **Finance API** and **Inventory API**. Both support **Bearer token** (for SSO) and **API key** (X-API-Key or Authorization: ApiKey).

## Setup

1. **Import**  
   In Postman: Import → `Finance-API.postman_collection.json` and/or `Inventory-API.postman_collection.json`.

2. **Variables** (per collection or in an environment):
   - `base_url` – e.g. `http://localhost:3000` or your app URL.
   - `token` – JWT from sign-in (for “Auth: Bearer Token” requests; use with SSO later).
   - `api_key` – For Finance: `FINANCE_API_KEY`; for Inventory: `INVENTORY_API_KEY` (set on server).
   - `request_id` – (optional) Send as `X-Request-Id` to match server logs when debugging.

3. **Auth**
   - **Bearer token:** Use the **“Auth: Bearer Token”** folder in each collection. Set `token` to your JWT.
   - **API key:** Use the **“Auth: API Key”** folder. Set `api_key` to the same value as the server env var for that API.

---

## Finance API

**Collection:** `Finance-API.postman_collection.json`  
**Env:** `FINANCE_API_KEY`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/finance/purchase-orders` | List POs (query: `page`, `limit`, `status`, `vendorId`) |
| GET | `/api/finance/purchase-orders/:id` | One PO with full details |
| GET | `/api/finance/contracts` | List contracts (query: `page`, `limit`, `status`, `contractType`, `vendor`, `search`) |
| GET | `/api/finance/contracts/:id` | One contract with full details |

---

## Inventory API

**Collection:** `Inventory-API.postman_collection.json`  
**Env:** `INVENTORY_API_KEY`  
**Scope:** POs only.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory/purchase-orders` | List POs (query: `page`, `limit`, `status`, `vendorId`) |
| GET | `/api/inventory/purchase-orders/:id` | One PO with full details |

---

## Response shape (both APIs)

- **Success:** `{ "success": true, "data": { ... }, "meta": { ... }, "requestId": "..." }`
- **Error:** `{ "success": false, "error": "...", "requestId": "..." }`

When debugging, send `X-Request-Id`; the API echoes it in the response.
