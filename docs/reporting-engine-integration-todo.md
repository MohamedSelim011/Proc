## Reporting Engine Re‑Implementation Checklist

This document is a to‑do guide for integrating the Jasper/Reporting Engine into another system.

---

### 1. Prerequisites

**Backend stack**

- HTTP framework capable of:
  - Creating server‑side API endpoints.
  - Making outgoing HTTP requests.
  - Streaming binary responses.

**Database**

- PostgreSQL (or other engine supported by the Reporting Engine).

**External Reporting Engine**

- Running instance with defined endpoints for:
  - Listing tables / columns / relationships.
  - Generating PDF/Excel (with/without relations).

**Security**

- Ability to store env vars securely for:
  - `DATABASE_URL`
  - `REPORT_ENGINE_BASE_URL`

---

### 2. Environment and Configuration Tasks

- [ ] Define backend env variables
  - [ ] `REPORT_ENGINE_BASE_URL` pointing to the engine base URL.
  - [ ] `DATABASE_URL` (Postgres connection string) pointing to the app database.

- [ ] Implement a `parseDatabaseUrl` utility  
  **Input**: full DB URL.  
  **Output**:
  - `databaseEngine: 'postgresql'`
  - `host`
  - `port`
  - `databaseName`
  - `username`
  - `password`

- [ ] Decide security boundaries
  - [ ] Confirm the reporting engine is allowed to read from the production database.
  - [ ] If multi‑tenant, design either:
    - DB‑level isolation (schemas/databases per tenant), or
    - Views / RLS to restrict what the engine can see.

---

### 3. Backend API Routes to Implement

For another system, you can mirror these semantics, even if the path names differ.

#### 3.1 Health Check Route

- [ ] Create route: `POST /api/reports/test-connection`
- [ ] Read `REPORT_ENGINE_BASE_URL`.
- [ ] Call `${BASE}/api/reports/test-connection`.
- [ ] Return success/error status.

#### 3.2 Tables Metadata Route

- [ ] Create route: `POST /api/reports/tables`
- [ ] Parse `DATABASE_URL` → `connectionDto`.
- [ ] `POST connectionDto` to `${BASE}/api/v1/reports/tables`.
- [ ] Return the list of tables as JSON to the client.
- [ ] Handle and log errors gracefully.

#### 3.3 Columns Metadata Route

- [ ] Create route: `POST /api/reports/columns`
- [ ] Validate JSON body with `{ "tableName": string }`.
- [ ] Parse `DATABASE_URL` → `connectionDto`.
- [ ] `POST connectionDto` to `${BASE}/api/v1/reports/table-info?tableName={tableName}`.
- [ ] Return JSON with columns to client.
- [ ] Standardize error responses (status and message).

#### 3.4 Relationships Metadata Route

- [ ] Create route: `POST /api/reports/relationships`
- [ ] Validate body with `{ "tableName": string }`.
- [ ] Parse `DATABASE_URL` → `connectionDto`.
- [ ] `POST` to `${BASE}/api/v1/reports/table-relationships?tableName={tableName}`.
- [ ] Return array of relationships for UI to display.

---

### 4. Report Generation Routes

#### 4.1 Core Preview / Generate Route

- [ ] Create route: `POST /api/reports/preview`
- [ ] Define `ReportRequest` input schema:

```ts
primaryTable: string
reportType: 'pdf' | 'excel'
whereClause?: string
relatedTables?: string[]
primaryTableColumns?: string[]
relatedTableColumns?: Record<string, string[]>
```

- [ ] Validate incoming JSON (Zod/Joi/other).
- [ ] Parse `DATABASE_URL` → `connectionDto`.
- [ ] Decide engine endpoint:
  - If `relatedTables` and `relatedTableColumns` present → relational endpoints.
  - Otherwise → simple endpoints (`generate-with-columns` / `generate-excel-with-columns`).
- [ ] Build request body:

```json
{ "connectionDto": { ... }, "primaryTable": "...", "..." }
```

- [ ] Call Reporting Engine with:
  - `Content-Type: application/json`
  - `Accept` based on `reportType`.
- [ ] On success:
  - Stream binary response back to client.
  - Set `Content-Type` and `Content-Disposition` (filename with correct extension).
- [ ] On failure:
  - Read error text from engine.
  - Return with original status and normalized error body.

#### 4.2 Simple PDF Generation Route

- [ ] Implement `POST /api/reports/generate`
- [ ] Accept flexible JSON body for table/columns/options.
- [ ] Parse `DATABASE_URL` → `connectionDto`.
- [ ] Call `${BASE}/api/v1/reports/generate-with-columns` with `{ connectionDto, ...body }`.
- [ ] Stream PDF back.

#### 4.3 Simple Excel Generation Route

- [ ] Implement `POST /api/reports/generate-excel`
- [ ] Accept relevant JSON body for Excel.
- [ ] Call `${BASE}/api/reports/generate-excel`.
- [ ] Stream Excel back with correct content type.

#### 4.4 Custom Report Route

- [ ] Implement `POST /api/reports/generate-custom`
- [ ] Define input: table name, selected columns, custom `WHERE` clause (or other custom parameters).
- [ ] Forward body to `${BASE}/api/reports/generate-custom` (adding `connectionDto` if required by your engine).
- [ ] Stream resulting PDF back.

---

### 5. Frontend Reporting Screen Tasks

Assuming your new system has some frontend (React, etc.):

#### 5.1 Base Screen

- [ ] Create a client page/component (e.g. `/reports`).
- [ ] Maintain state:
  - `tables`, `columns`, `relationships`, `relatedTableColumns`.
  - User selections (`selectedTable`, `selectedColumns`, `selectedRelatedTables`, `selectedRelatedColumns`, `whereClause`).
  - UI state (`isLoading`, `isGenerating`, `error`, `successMessage`, `currentStep`).

#### 5.2 Load Tables

- [ ] On mount:
  - [ ] Call `POST /api/reports/tables`.
  - [ ] Store returned list in `tables`.
  - [ ] Implement search/filter text box over that list.

#### 5.3 Configure Columns

- [ ] When user selects a primary table:
  - [ ] Call `POST /api/reports/columns` with `{ tableName }`.
  - [ ] Call `POST /api/reports/relationships` with `{ tableName }`.
  - [ ] Initialize `selectedColumns`, `selectedRelatedTables`, `selectedRelatedColumns` to empty.

- [ ] Display:
  - Primary table columns with checkboxes.
  - Related tables suggested from relationships.

- [ ] When user toggles a related table on:
  - [ ] Call `POST /api/reports/columns` for that related table.
  - [ ] Store columns under `relatedTableColumns[tableName]`.
  - [ ] Allow user to pick columns per related table.

- [ ] Provide input for `whereClause`:
  - [ ] Save string as part of request.
  - [ ] Optionally validate / restrict allowed format.

#### 5.4 Generate and Download Reports

- [ ] Add “Generate PDF” and “Generate Excel” buttons.
- [ ] On click:
  - [ ] Validate:
    - A primary table has been selected.
    - At least one primary column is selected.
  - [ ] Build `ReportRequest`.
  - [ ] Call `POST /api/reports/preview` with JSON body.
  - [ ] Handle binary response:
    - Convert to `Blob`.
    - Create `URL.createObjectURL`.
    - Programmatically click an `<a>` tag with `download` attribute.
  - [ ] Update success/error message states.

---

### 6. Security and Governance Tasks

- [ ] Decide which DB objects should be visible in tables/columns lists
  - [ ] Option 1: filter tables at the Reporting Engine level.
  - [ ] Option 2: filter returned table/column lists before sending to UI.

- [ ] Decide how to enforce tenant isolation
  - [ ] Use DB schemas/RLS/views.
  - [ ] Or inject tenant filters into `whereClause` / base queries.

- [ ] Add audit logging
  - [ ] Log report generation requests and responsible user.
  - [ ] Log any errors from the Reporting Engine.

---

### 7. Validation and Testing

- [ ] Unit‑test the DB URL parsing → `connectionDto`.
- [ ] Integration‑test each route:
  - [ ] `test-connection`
  - [ ] `tables`
  - [ ] `columns`
  - [ ] `relationships`
  - [ ] `preview`, `generate`, `generate-excel`, `generate-custom`

- [ ] End‑to‑end test:
  - [ ] From frontend screen, walk through:
    - Table selection.
    - Column selection.
    - Related tables & columns.
    - `WHERE` clause.
    - PDF and Excel download.
  - [ ] Validate that generated reports reflect the correct data and tenant isolation rules.



