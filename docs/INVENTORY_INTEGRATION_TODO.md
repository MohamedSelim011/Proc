# Inventory Integration – Implementation Checklist

**Scope:** This integration applies **only to material requisitions** (STOCK / NON_STOCK). Service requisitions and service + material contracts are **not** included and do not call Inventory APIs.

**Goal:** When a user creates a material requisition in Procurement: load items from Inventory, check availability, then either create an MR in Inventory (stock sufficient) or a PR in Procurement (stock insufficient). **Inventory is the master** for item data: if an item does not exist in the Procurement catalog, Procurement creates it from Inventory (GET /api/items/:id) and assigns it to the "Inventory (synced)" category.

**Env variables (add to `.env`):**

| Variable | Description |
|----------|-------------|
| `INVENTORY_SYSTEM_BASE_URL` | Base URL of the Inventory app (e.g. `https://inventory.example.com`) |
| `INVENTORY_SYSTEM_API_KEY` | API key for server-to-server calls (Inventory team provides it) |

---

## Phase 0: Inventory contract ✅

- [x] Inventory provided: GET items, GET warehouses, GET projects, GET users, POST check-availability, POST requisitions (Create MR), GET requisitions/:id
- [x] User mapping: use **email** as unique identifier; resolve to Inventory `userId` via GET /api/users
- [x] Project mapping: use GET /api/projects; map by code or name to `projectId`

---

## Phase 1: Config and client ✅

- [x] **1.1** Env vars in `.env.example`: `INVENTORY_SYSTEM_BASE_URL`, `INVENTORY_SYSTEM_API_KEY`
- [x] **1.2** `src/lib/inventory-client.ts`: getInventoryItems, getInventoryWarehouses, getInventoryProjects, getInventoryUsers, getInventoryUserIdByEmail, checkAvailability, createMR, getRequisition, isInventoryConfigured

---

## Phase 2: Material requisition – items from Inventory

- [x] **2.1** API route: GET /api/inventory-items (proxies Inventory items; normalizes to shape expected by requisition form)
- [x] **2.2** Requisition new page: when `itemType` is STOCK or NON_STOCK, fetch from `/api/inventory-items`; otherwise keep `/api/items`
- [x] **2.3** Requisition new page: when using inventory items, show warehouse selector (from GET /api/inventory-warehouses) and project selector (GET /api/inventory-projects) in step 1

---

## Phase 3: Availability check + MR vs PR branch

- [x] **3.1** POST /api/material-requisition/check-availability – proxy to Inventory; body: `{ items: [{ itemId, quantity, warehouseId }] }`; returns `overallRecommendation`, per-line `canFulfillNow` / `needsProcurement`
- [x] **3.2** POST /api/material-requisition/create-mr – create MR in Inventory; requires auth (user email → Inventory userId); body: projectId, deliveryWarehouseId, requiredDate, purpose, priority, items; optional justification
- [x] **3.3** Frontend: on submit (material), call check-availability; if `DIRECT_ISSUE_ALL` call create-mr (with Bearer token) and show success; else show message that stock is insufficient (PR not auto-created from inventory items)
- [ ] **3.4** If `MIXED_FULFILLMENT`: create MR for lines with `canFulfillNow > 0`; create PR for lines with `needsProcurement > 0` (future)

---

## Phase 4: Optional – Record good receipt from Inventory

- [ ] **4.1** If Inventory will notify Procurement when GR is done: add POST /api/inventory/purchase-orders/:id/goods-receipt (inventory auth), update GoodsReceipt in Procurement

---

## Phase 5: Docs

- [ ] **5.1** Update INVENTORY_API_GUIDE.md: add “What Procurement calls on Inventory” (GET items, GET items/:id, warehouses, projects, users, check-availability, create MR). Inventory is master: missing items in Procurement are created from Inventory. with env var names and flow

---

## Debugging: when the requisition never creates

- **Server (terminal where `npm run dev` runs):** All material-requisition API routes log with prefix `[req]`:
  - `[req] check-availability` – request received, validation, call to Inventory, result (overallRecommendation) or error
  - `[req] create-mr` – request, user resolution (email → Inventory userId), call to Inventory, MR id/mrNumber or error
  - `[req] create-pr-and-mr` – request, user, validation, PR created, then whether MR will be created (inventoryConfigured, deliveryWarehouseId, inventoryProjectId, mrLines count), then Inventory create MR result or error
- **Browser:** Open DevTools (F12) → **Console**. Look for `[Requisition]` logs: submit started, check-availability response, create-pr-and-mr response (ok, prId, mrId, mrError, full response). On error, the red message on the form also tells you to check these two places.

Use these logs to see exactly where the flow stops (e.g. check-availability 502, user not found in Inventory, or Inventory API error when creating MR).

---

## Quick reference – order of implementation

| Order | Task | Status |
|-------|------|--------|
| 1 | Env + inventory client | Done |
| 2 | GET /api/inventory-items + requisition page use it for material | In progress |
| 3 | Warehouse/project/user resolution + availability check + MR vs PR | Pending |
| 4 | (Optional) POST goods-receipt from Inventory | Pending |
| 5 | Docs | Pending |
