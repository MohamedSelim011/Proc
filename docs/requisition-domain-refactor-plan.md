# Requisition Domain Refactor Plan (Enterprise, Non-Breaking)

## Objective
Introduce a clear enterprise separation between:
- Material Requisitions
- Service Requisitions
- Mixed Requisitions

using the **existing requisition models** only, while **not changing Purchase Order schema or Purchase Order APIs**.

## Constraints
- Keep all existing PO models and endpoints unchanged.
- Do not keep parallel duplicate requisition models.
- Refactor around existing legacy requisition routes/models.

## Target Architecture
1. `PurchaseRequisition` + `PRItem` for material flow
- `itemType` in (`STOCK`, `NON_STOCK`) drives material-only behavior.

2. `PurchaseRequisition` + `ServicePR` + `ServicePRItem` for service flow
- `itemType = SERVICE` with required `ServicePR` details and service line items.

3. Mixed requisition in existing model
- Single `PurchaseRequisition` with `itemType = SERVICE`
- Service lines in `ServicePRItem`
- Material lines in `PRItem`
- One approval lifecycle, split downstream execution by line type.

## Implementation Phases
### Phase 1 (This implementation)
- Remove duplicate requisition models and APIs.
- Keep and harden:
  - `/api/purchase-requisitions` (material and shared header domain)
  - `/api/services/requisitions` (service domain behavior over existing models)
- Wire `Material Requests` list UI page to `/api/purchase-requisitions` (material-only view).

### Phase 2
- Standardize validation and status transitions for material/service/mixed in existing routes.
- Align list/detail/create UI with domain split while keeping one underlying PR header model.

### Phase 3
- Add stronger reporting views for material-only, service-only, and mixed using existing tables.
- Add data quality scripts for legacy data consistency.

## Data Governance
- All write APIs validate payloads with strict schemas.
- Enforce server-side status transitions.
- Keep current deterministic numbering conventions (`PR-*`, `SPR-*`) for compatibility.

## Non-Goals
- No modifications to `PurchaseOrder` model.
- No modifications to PO API contracts.
