# Finance API – Postman

Use this collection to call the **Finance API** (POs and service contracts) with either a **JWT** or an **API key**.

## Setup

1. **Import**  
   In Postman: Import → `Finance-API.postman_collection.json`.

2. **Variables** (collection or environment):
   - `base_url` – e.g. `http://localhost:3000` or your app URL.
   - `token` – JWT from sign-in (for “Auth: Bearer Token” requests).
   - `api_key` – Value of `FINANCE_API_KEY` from server env (for “Auth: API Key” requests).
   - `request_id` – (optional) UUID or string; send as `X-Request-Id` to match server logs when debugging.

3. **Auth**
   - **Bearer token:** Use the folder **“Auth: Bearer Token”**. Set `token` to your JWT.
   - **API key:** Use the folder **“Auth: API Key”**. Set `api_key` to the same value as `FINANCE_API_KEY` on the server.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/finance/purchase-orders` | List POs (query: `page`, `limit`, `status`, `vendorId`) |
| GET | `/api/finance/purchase-orders/:id` | One PO with full details |
| GET | `/api/finance/contracts` | List contracts (query: `page`, `limit`, `status`, `contractType`, `vendor`, `search`) |
| GET | `/api/finance/contracts/:id` | One contract with full details |

## Response shape

- **Success:** `{ "success": true, "data": { ... }, "meta": { ... }, "requestId": "..." }`
- **Error:** `{ "success": false, "error": "...", "requestId": "..." }`

When debugging, send `X-Request-Id` and use the same value in your logs; the API echoes it in the response.
