## Reporting Engine Integration – Technical Explanation

### Purpose and Architecture

The reporting engine integration allows users to build ad‑hoc PDF/Excel reports against the application database using an external Reporting Engine service.

**High‑level flow**

Browser → Next.js API routes (`/api/reports/*`) → Reporting Engine (`REPORT_ENGINE_BASE_URL`) → response (PDF/Excel/JSON) → Browser.

**Data source**

The Reporting Engine connects directly to the same PostgreSQL database as the app, using a connection descriptor (`connectionDto`) derived from `DATABASE_URL`.

**Security model**

- The browser never sees `DATABASE_URL` or `REPORT_ENGINE_BASE_URL`.
- All sensitive values are only used in server‑side API routes.
- The Reporting Engine has DB‑level access; logical/tenant restrictions must be enforced at DB/schema/RLS level or in the reporting configuration.

---

### Environment Variables

#### `REPORT_ENGINE_BASE_URL`

- Example: `https://reporting-engine-production-a330.up.railway.app`
- Used only on the server to construct URLs like:
  - `/api/v1/reports/tables`
  - `/api/v1/reports/generate-with-columns`
  - `/api/reports/generate-excel`

Pattern in each route:

```ts
const REPORT_ENGINE_BASE_URL =
  process.env.REPORT_ENGINE_BASE_URL || 'http://localhost:8080';
```

#### `DATABASE_URL`

Standard Postgres connection string.

Parsed into a `connectionDto` object:

- **databaseEngine**: `'postgresql'`
- **host**
- **port**
- **databaseName**
- **username**
- **password**

This DTO is sent to the Reporting Engine so it can connect to the DB.

---

### Backend Routes Overview (`/api/reports/*`)

All integration with the Reporting Engine is encapsulated in Next.js API routes under `src/app/api/reports/`.

#### Test Connection

- **Route**: `POST /api/reports/test-connection`
- **Responsibility**: reachability check for the Reporting Engine.
- **Calls**: `${REPORT_ENGINE_BASE_URL}/api/reports/test-connection`.
- **Usage**: health checks, diagnostics.

#### Tables Metadata

- **Route**: `POST /api/reports/tables`
- **Upstream endpoint**: `${REPORT_ENGINE_BASE_URL}/api/v1/reports/tables`

**Flow**

1. Parse `DATABASE_URL` into `connectionDto`.
2. `POST { ...connectionDto }` to the engine.
3. Return list of tables to the client.

**Result**

JSON array of table names:

```json
["ar_invoices", "gl_journals", "ap_invoices", "..."]
```

#### Columns Metadata

- **Route**: `POST /api/reports/columns`

**Request**

```json
{ "tableName": "my_table" }
```

**Upstream endpoint**

`${REPORT_ENGINE_BASE_URL}/api/v1/reports/table-info?tableName={tableName}`

**Flow**

1. Validate `tableName` is provided.
2. Parse `DATABASE_URL` → `connectionDto`.
3. `POST connectionDto` to the engine.
4. Return column metadata (name, type, etc.) as JSON.

#### Relationships Metadata

- **Route**: `POST /api/reports/relationships`

**Request**

```json
{ "tableName": "my_table" }
```

**Upstream endpoint**

`${REPORT_ENGINE_BASE_URL}/api/v1/reports/table-relationships?tableName={tableName}`

**Flow**

1. Parse `DATABASE_URL` → `connectionDto`.
2. `POST` to the engine.
3. Return array of relationships like:

```json
{ "fromTable": "ap_invoices", "toTable": "ap_invoice_lines", "fromColumn": "id", "toColumn": "invoice_id" }
```

---

### Report Generation and Preview

#### Generic Preview / Generate (Core Integration)

- **Route**: `POST /api/reports/preview`

**Client request shape**

```ts
interface ReportRequest {
  primaryTable: string;
  reportType: 'pdf' | 'excel';
  whereClause?: string;
  relatedTables?: string[];
  primaryTableColumns?: string[];
  relatedTableColumns?: Record<string, string[]>;
}
```

**Server‑side steps**

1. Read `ReportRequest` from request body.
2. Parse `DATABASE_URL` to build `connectionDto`.
3. Decide engine endpoint:
   - If there are related tables + selected related columns:
     - PDF: `/api/v1/reports/generate-relational-with-columns`
     - Excel: `/api/v1/reports/generate-relational-excel-with-columns`
   - Otherwise:
     - PDF: `/api/v1/reports/generate-with-columns`
     - Excel: `/api/v1/reports/generate-excel-with-columns`
4. Build engine request payload:

```json
{ "connectionDto": { ... }, "...restOfRequest": "..." }
```

5. Call Reporting Engine with:
   - `Content-Type: application/json`
   - `Accept`: `application/pdf` or Excel MIME type.
6. Handle response:
   - On success: stream binary PDF/Excel back to client with correct `Content-Type` and `Content-Disposition`.
   - On error: read error text and return with same HTTP status.

#### Simple PDF Generation

- **Route**: `POST /api/reports/generate`
- **Upstream endpoint**: `${REPORT_ENGINE_BASE_URL}/api/v1/reports/generate-with-columns`

**Usage**

Programmatic generation where caller provides body (e.g. table/column spec); server adds `connectionDto`.

**Response**

Binary PDF stream.

#### Simple Excel Generation

- **Route**: `POST /api/reports/generate-excel`
- **Upstream endpoint**: `${REPORT_ENGINE_BASE_URL}/api/reports/generate-excel`

**Usage**

Generate Excel based on engine’s contract.

**Response**

Binary `.xlsx` stream.

#### Column‑Helper Routes

Routes:

- `POST /api/reports/generate-columns`
- `POST /api/reports/generate-excel-columns`

**Purpose**

Utility routes to call matching engine helpers (e.g. return column configs with generated output).

#### Custom Report with WHERE clause

- **Route**: `POST /api/reports/generate-custom`
- **Upstream endpoint**: `${REPORT_ENGINE_BASE_URL}/api/reports/generate-custom`

**Usage**

Caller sends table, selected columns and a custom `WHERE` clause.

**Response**

Binary PDF, typically named `..._custom.pdf`.

---

### Reporting Engine UI Screen (`/finance/reports`)

**Component**

- File: `src/app/finance/reports/page.tsx`
- Type: Client component (`'use client'`).

**Responsibility**

- Provide a generic “report builder” for technical/operational users.
- Orchestrate calls to `/api/reports/*`.
- Trigger file downloads for final reports.

#### Internal State

**Metadata state**

- `tables: string[]`
- `columns: Column[]` (columnName, dataType)
- `relationships: Relationship[]` (fromTable, toTable, fromColumn, toColumn)
- `relatedTableColumns: Record<string, Column[]>`

**User selection state**

- `selectedTable: string | null`
- `selectedColumns: string[]`
- `selectedRelatedTables: string[]`
- `selectedRelatedColumns: Record<string, string[]>`
- `whereClause: string`
- `searchTerm: string`

**UI state**

- `isLoading`, `isGenerating`
- `error`, `successMessage`
- `currentStep: 'select-table' | 'configure-columns' | 'generate'`

---

### Screen Workflow

#### Step 1 – Load and Select Table

- On mount, call `POST /api/reports/tables`.
- Display list of tables, filterable via `searchTerm`.
- When user selects a table:
  - `selectedTable` set.
  - Move to step `configure-columns`.

#### Step 2 – Configure Columns and Relationships

On table selection:

- Request columns: `POST /api/reports/columns` with `{ tableName }`.
- Request relationships: `POST /api/reports/relationships` with `{ tableName }`.

UI:

- Column list with checkboxes.
- Derived list of related tables (from relationships).

Toggling a related table:

- Adds/removes it from `selectedRelatedTables`.
- On add, fetches its columns via `/api/reports/columns`.
- Allows user to choose which columns from each related table to include.

User can also type a raw `whereClause` string.

#### Step 3 – Generate Report

User clicks “Generate PDF” or “Generate Excel”.

`generateReport(reportType)`:

1. Validates:
   - `selectedTable` defined.
   - At least one primary column selected.
2. Builds `ReportRequest`.
3. Calls `POST /api/reports/preview` with JSON body.
4. Receives binary response.
5. Turns response into `Blob` and triggers browser download (`<a>` element with `download`).
6. Updates `successMessage` or `error`.

---

### Separation From Core Financial Reports

**Reporting Engine integration**

- Generic, DB‑schema driven.
- Implemented via `/api/reports/*` and `/finance/reports`.
- Externalized to `REPORT_ENGINE_BASE_URL`.

**Core financial reporting (`FinancialReportsPage`, `/api/reports/financial`)**

- Uses Prisma and internal business logic.
- Does not rely on the external engine.
- Produces domain‑specific reports (BS, IS, TB, aging, etc.) from application‑level concepts.



