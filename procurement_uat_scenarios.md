# Procurement Management UAT Scenarios

## Executive Summary - Complete Business Process Coverage

| Business Process Category | Sub-Processes Covered | Number of UAT Scenarios | UAT ID Range |
|--------------------------|----------------------|------------------------|--------------|
| **Stock Items Procurement** | | | |
| 1. Planning & Needs Identification | • Review Project BOQ & Plans<br>• Check Inventory Levels<br>• Validate Budget Availability | 3 | ST-001 to ST-003 |
| 2. Tendering & Supplier Selection | • Initiate Tender Process<br>• Evaluate Bids<br>• Award Contract & Onboard | 3 | ST-004 to ST-006 |
| 3. Purchase Requisition & Approval | • Create PR with Specifications<br>• PR Approval Workflow | 2 | ST-007 to ST-008 |
| 4. Purchase Order Management | • Convert PR to PO<br>• Issue PO to Supplier<br>• Supplier Acknowledgment | 2 | ST-009 to ST-010 |
| 5. Delivery & Inspection | • Delivery Coordination<br>• Quality & Quantity Inspection<br>• GRN Creation | 3 | ST-011 to ST-013 |
| 6. Invoice Processing & Three-Way Match | • Supplier Invoice Submission<br>• Three-Way Match Process<br>• Discrepancy Resolution | 3 | ST-014 to ST-016 |
| 7. Payment Settlement | • Payment Processing & Approval | 1 | ST-017 |
| 8. Reporting & Analytics | • Dashboard Updates & KPIs | 1 | ST-018 |
| **Non-Stock Items/Services** | | | |
| 1. Planning & Needs Identification | • Identify Service Needs<br>• Validate Service Budget | 2 | NS-001 to NS-002 |
| 2. Supplier Selection | • Prepare Service RFP<br>• Evaluate Proposals | 2 | NS-003 to NS-004 |
| 3. Purchase Requisition & Approval | • Create Service PR<br>• Multi-level Approval | 2 | NS-005 to NS-006 |
| 4. PO & Contract Management | • Convert PR to Contract<br>• Contract Lifecycle Management | 2 | NS-007 to NS-008 |
| 5. Service Delivery & Performance | • Performance Verification<br>• Create Service Receipt Note | 2 | NS-009 to NS-010 |
| 6. Invoice Processing | • Service Invoice Three-Way Match | 1 | NS-011 |
| **Common Processes** | | | |
| 1. System Integration & Automation | • Automated PR Creation<br>• Email Notifications | 2 | CM-001 to CM-002 |
| 2. Emergency & Special Scenarios | • Emergency Purchase<br>• Petty Cash Purchase | 2 | CM-003 to CM-004 |
| 3. Vendor Management | • Performance Evaluation<br>• Contract Renewal | 2 | CM-005 to CM-006 |
| 4. Reporting & Compliance | • KPI Dashboard<br>• Audit Trail | 2 | CM-007 to CM-008 |
| **Total UAT Scenarios** | **All processes from BRD covered** | **37** | |

## Table of Contents
1. Stock Items Procurement UAT Scenarios
2. Non-Stock Items/Services Procurement UAT Scenarios
3. Common Process UAT Scenarios

---

## 1. Stock Items Procurement UAT Scenarios

### 1.1 Planning & Needs Identification

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| ST-001 | Review Project BOQ & Plans | Validate material identification from BOQ | Project Manager → Site Engineer → Procurement Manager | BOQ data → Material requirements → Procurement plan | 1. Login as Project Manager<br>2. Access BOQ & project plans<br>3. Review material requirements<br>4. Cross-reference with project scope<br>5. Update procurement plan<br>6. Link materials to WBS/CBS | - Latest BOQ version accessible<br>- Materials correctly identified<br>- Quantities match project needs<br>- WBS/CBS linkage established | - Sample BOQ with 10 items<br>- Project plans<br>- WBS structure |
| ST-002 | Check Inventory Levels | Verify inventory checking and shortage identification | Inventory Manager → Procurement Manager | Current stock levels → Material needs comparison → Shortage flags | 1. Login as Inventory Manager<br>2. Access inventory system<br>3. Review stock levels for required materials<br>4. Compare with material needs<br>5. Flag understocked items<br>6. Generate shortage report | - Inventory system accessible<br>- Stock levels displayed accurately<br>- Shortages flagged correctly<br>- Report generated | - 5 materials in stock<br>- 3 materials understocked<br>- 2 materials overstocked |
| ST-003 | Validate Budget Availability | Confirm budget allocation for materials | Finance Manager → Project Manager | Budget data → CBS/WBS → Material costs → Budget approval | 1. Login as Finance Manager<br>2. Access project budget module<br>3. Review material budget in CBS<br>4. Compare costs with available budget<br>5. Identify discrepancies<br>6. Approve/reject budget | - Budget module accessible<br>- CBS correctly displays allocations<br>- Cost comparisons accurate<br>- Approval workflow functions | - Project budget: $500,000<br>- Material budget: $150,000<br>- Requested materials: $145,000 |

### 1.2 Tendering & Supplier Selection

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| ST-004 | Initiate Tender Process | Create and issue tender for bulk procurement | Procurement Manager → Tender Committee | Material requirements → Tender documents → Supplier invitations | 1. Login as Procurement Manager<br>2. Identify bulk procurement need<br>3. Prepare tender documentation<br>4. Set submission deadline<br>5. Send invitations to suppliers<br>6. Acknowledge tender receipts | - Tender documents created<br>- Deadlines set correctly<br>- Invitations sent successfully<br>- Receipts acknowledged | - Material quantity > threshold<br>- 5 qualified suppliers<br>- 14-day submission period |
| ST-005 | Evaluate Bids | Assess technical and commercial proposals | Procurement Manager → Tender Committee → Legal Team | Bid submissions → Evaluation criteria → Shortlist → Contract terms | 1. Review received bids<br>2. Evaluate against criteria<br>3. Score technical compliance<br>4. Assess commercial terms<br>5. Create shortlist<br>6. Negotiate final terms | - All bids evaluated systematically<br>- Scoring transparent<br>- Shortlist justified<br>- Terms negotiated successfully | - 5 bid submissions<br>- Evaluation matrix<br>- Price, quality, delivery criteria |
| ST-006 | Award Contract | Select supplier and onboard | Procurement Manager → Legal Team | Evaluation results → Contract award → Supplier onboarding | 1. Notify successful bidder<br>2. Finalize contract agreement<br>3. Complete compliance checks<br>4. Register supplier in system<br>5. Activate supplier account | - Notification sent<br>- Contract signed<br>- Compliance verified<br>- Supplier onboarded | - Winner notification template<br>- Contract template<br>- Compliance checklist |

### 1.3 Purchase Requisition & Approval

| UAT ID | Business Process | Test Scenario | User Flow (Actual Implementation) | Data Flow (System Architecture) | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------------------------------|----------------------------------|------------|------------------|-----------|
| ST-007 | Create Purchase Requisition | Generate PR with specifications | 1. Login via `/login`<br>2. Navigate to Dashboard `/procurement/dashboard`<br>3. Click "Create PR" Quick Action or "New Requisition" button<br>4. Route to `/procurement/requisitions/new`<br>5. Fill PR Form (React Hook Form + Zod validation)<br>6. Select Item Type (STOCK/NON_STOCK/SERVICE)<br>7. Add line items via dynamic form<br>8. System auto-validates budget via API<br>9. Save as DRAFT status | **Frontend**: React Form → State Management (Zustand/React Query)<br>**API Call**: POST `/api/purchase-requisitions`<br>**Backend**: Next.js API Route → Validation (Zod) → Prisma ORM<br>**Database**: Insert into `PurchaseRequisition` + `PRItem` tables<br>**Response**: Created PR with unique `prNumber` | 1. Navigate to http://localhost:3000/login<br>2. Enter credentials and authenticate (NextAuth)<br>3. Click Dashboard > "Create PR" button<br>4. On `/procurement/requisitions/new` page:<br>   - Select Department dropdown<br>   - Select Item Type: STOCK<br>   - Set Priority: NORMAL<br>   - Enter Budget Code<br>   - Enter Justification<br>   - Click "Add Item" button<br>   - For each item: Select from dropdown, enter qty, unit price, specs<br>   - Enter estimated delivery date<br>5. Click "Save as Draft"<br>6. System validates form (client-side Zod)<br>7. API calls `/api/purchase-requisitions` with form data<br>8. View success toast notification<br>9. Redirect to PR list `/procurement/requisitions` | - PR appears in list with status "DRAFT"<br>- PR Number auto-generated (format: PR-YYYY-####)<br>- All line items saved<br>- Created timestamp recorded<br>- Budget validation passed<br>- Toast notification displays success<br>- List shows PR with green/gray status badge | - Department: "Construction"<br>- Item Type: STOCK<br>- Priority: NORMAL<br>- 10 line items<br>- BoQ reference: BOQ-2024-001<br>- Budget Code: PROJ-2025-001<br>- Estimated Cost: OMR 50,000<br>- Delivery location: Site A |
| ST-008 | PR Approval Workflow | Route PR through approval hierarchy | 1. PR Creator submits via "Submit for Approval" button<br>2. System routes to `/approvals` page for Approvers<br>3. **Approval Engine** determines routing via `ApprovalRule` + `ApprovalRouting`<br>4. Each approver receives:<br>   - In-app notification (NotificationBell component)<br>   - Email notification (NotificationQueue)<br>   - Entry in `/approvals` page<br>5. Approver clicks "Review" or notification bell<br>6. Views PR details + Approve/Reject modal<br>7. Enters comments (optional for approve, required for reject)<br>8. System moves to next approval level | **Submission Flow**:<br>POST `/api/purchase-requisitions/[id]/submit`<br>→ Approval Service determines routing<br>→ Creates `Approval` records at each level<br>→ Triggers `NotificationService`<br><br>**Approval Flow**:<br>1. Approver accesses `/approvals`<br>2. Frontend fetches GET `/api/approvals/pending`<br>3. Click Approve → Modal → POST `/api/approvals/[id]/approve`<br>4. Backend updates `Approval.status` to APPROVED<br>5. Creates `ApprovalHistory` entry<br>6. Routes to next level or completes workflow<br>7. Updates PR status to APPROVED when complete<br>8. Sends notifications to INFORMED parties (RACI)<br><br>**Database Changes**:<br>- `Approval` table: status changes PENDING → APPROVED<br>- `ApprovalHistory`: logs each action<br>- `PurchaseRequisition.status`: SUBMITTED → APPROVED<br>- `NotificationQueue`: creates email notifications | **As PR Creator:**<br>1. Login and navigate to `/procurement/requisitions`<br>2. Filter by status "DRAFT"<br>3. Click green checkmark icon on draft PR row<br>4. Confirm submission in dialog<br>5. System calls POST `/api/purchase-requisitions/{id}/submit`<br>6. PR status changes to "SUBMITTED"<br>7. View yellow "SUBMITTED" badge<br><br>**As Level 1 Approver (Site Engineer):**<br>8. Login with Site Engineer credentials<br>9. Notice notification bell shows red badge count<br>10. Click bell or navigate to `/approvals`<br>11. See pending approval card with PR details<br>12. Click "Approve" button<br>13. Modal opens with comment field<br>14. Enter comments: "Technical specs verified"<br>15. Click "Confirm Approval"<br>16. System calls POST `/api/approvals/{id}/approve`<br>17. Approval removed from list<br><br>**As Level 2 Approver (Budget Controller):**<br>18. Repeat steps 8-17 with Budget Controller login<br>19. Comments: "Budget allocated and available"<br><br>**As Level 3 Approver (Procurement Manager):**<br>20. Final approval with comments<br>21. System changes PR status to "APPROVED"<br>22. Creator receives notification<br>23. PR can now be converted to PO | - Approval workflow triggers on submit<br>- Each level receives notification<br>- Notifications show in bell dropdown<br>- `/approvals` page lists pending items<br>- Approval modal shows PR details<br>- Comments saved in ApprovalHistory<br>- Each approval advances workflow<br>- Email notifications sent (if configured)<br>- PR status changes: DRAFT → SUBMITTED → APPROVED<br>- Status badges update in real-time<br>- Audit trail complete in ApprovalHistory<br>- Final notification sent to creator<br>- "Convert to PO" button appears after approval | - PR Number: PR-2025-0001<br>- PR Value: OMR 50,000<br>- Approval Levels: 3<br>   - Level 1: SITE_ENGINEER<br>   - Level 2: BUDGET_CONTROLLER<br>   - Level 3: PROCUREMENT_MANAGER<br>- SLA per level: 48 hours<br>- Test Users:<br>   - Creator: requester@wujha.com<br>   - L1: engineer@wujha.com<br>   - L2: budget@wujha.com<br>   - L3: procurement@wujha.com |

### 1.4 Purchase Order Management

| UAT ID | Business Process | Test Scenario | User Flow (Actual Implementation) | Data Flow (System Architecture) | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------------------------------|----------------------------------|------------|------------------|-----------|
| ST-009 | Convert PR to PO | Auto-generate PO from approved PR | 1. PR reaches APPROVED status after all approvals<br>2. Procurement Manager navigates to `/procurement/requisitions`<br>3. Clicks on approved PR row (Eye icon)<br>4. Views PR details at `/procurement/requisitions/[id]`<br>5. Clicks "Convert to PO" button (visible only for APPROVED PRs)<br>6. System routes to `/procurement/purchase-orders/new?prId={id}`<br>7. PO form pre-populated with PR data<br>8. System auto-selects vendor if from RFQ<br>9. Procurement reviews and modifies if needed<br>10. Clicks "Create Purchase Order"<br>11. PO saved with status DRAFT | **Conversion Flow**:<br>1. Frontend checks PR status === APPROVED<br>2. "Convert to PO" button renders conditionally<br>3. Navigate to PO form with `prId` query param<br>4. Component fetches PR data: GET `/api/purchase-requisitions/[id]`<br>5. Form pre-populates:<br>   - Vendor from PR or RFQ award<br>   - Line items from PRItem table<br>   - Delivery details from PR<br>   - Payment terms from vendor master<br><br>**API Flow**:<br>POST `/api/purchase-orders`<br>Body: { prId, vendorId, items[], deliveryDate, paymentTerms, deliveryAddress }<br>→ Prisma transaction:<br>   - Create PurchaseOrder record<br>   - Create POItem records (linked to PRItem)<br>   - Update PR.status to CONVERTED<br>   - Auto-generate poNumber (format: PO-YYYY-####)<br>→ Return PO object with all relations | 1. As Procurement Manager, login to system<br>2. Navigate to `/procurement/requisitions`<br>3. Use filter dropdown: Status = "APPROVED"<br>4. List shows approved PRs with green badge<br>5. Click Eye icon on row for PR-2025-0001<br>6. System routes to `/procurement/requisitions/{id}`<br>7. PR details page displays:<br>   - Header with PR number and status<br>   - Line items table<br>   - Approval history timeline<br>   - Budget information<br>8. Locate "Convert to PO" button (blue, top-right)<br>9. Click "Convert to PO"<br>10. Redirect to `/procurement/purchase-orders/new?prId={id}`<br>11. PO form loads with pre-filled data:<br>   - PR reference shown<br>   - Vendor dropdown (with recommended vendor)<br>   - Items table populated<br>   - Delivery date auto-calculated (+30 days)<br>12. Review pre-filled data<br>13. Modify delivery address if needed<br>14. Confirm payment terms: "Net 30"<br>15. Click "Create Purchase Order" button<br>16. System validates via Zod schema<br>17. API call POST `/api/purchase-orders`<br>18. Success toast notification<br>19. Redirect to `/procurement/purchase-orders/[newPoId]`<br>20. Navigate back to PR list<br>21. Original PR now shows "CONVERTED" status with blue badge<br>22. PR details shows linked PO number | - PO automatically generated<br>- PO Number format: PO-2025-####<br>- All PR line items transferred to PO<br>- Quantities and prices match PR<br>- Vendor correctly linked<br>- Delivery address populated<br>- Payment terms set<br>- PO status: DRAFT<br>- PR status updated: APPROVED → CONVERTED<br>- PR shows "1 PO" badge on list view<br>- PO references PR number<br>- Database relations established:<br>  * PurchaseOrder.prId → PurchaseRequisition.id<br>  * POItem rows created<br>- Currency defaulted to OMR<br>- Total amount calculated correctly<br>- Created timestamp recorded<br>- Audit log entry created | - Approved PR #: PR-2025-0001<br>- PR Value: OMR 50,000<br>- Line Items: 10<br>- Vendor: VEN-001 (ABC Suppliers)<br>- Auto-generated PO #: PO-2025-0001<br>- Delivery: +30 days from creation<br>- Payment Terms: Net 30<br>- Currency: OMR |
| ST-010 | Issue PO to Supplier | Send PO and obtain acknowledgment | 1. Procurement Manager views PO at `/procurement/purchase-orders/[id]`<br>2. PO status shows DRAFT (gray badge)<br>3. Clicks "Edit" icon or "Approve" button<br>4. Reviews PO details (items, amounts, terms)<br>5. Clicks "Quick Approve" icon (checkmark) on list view OR<br>6. Opens detail view and clicks "Approve & Send" button<br>7. Modal opens for confirmation<br>8. Enters approval comments<br>9. System updates PO status: DRAFT → APPROVED<br>10. Email notification prepared in NotificationQueue<br>11. PO PDF generated (if configured)<br>12. Manual step: Send PO via email to vendor<br>13. Vendor acknowledges receipt<br>14. Procurement updates status: APPROVED → SENT → ACKNOWLEDGED | **Approval API Flow**:<br>PUT `/api/purchase-orders/[id]/status`<br>Body: { status: "APPROVED", comments, updatedBy }<br>→ Backend validation:<br>   - Check user has approval permission<br>   - Verify PO is in valid state<br>→ Prisma update:<br>   - PurchaseOrder.status = APPROVED<br>   - Create POAmendment record (audit)<br>→ Notification flow:<br>   - Insert into NotificationQueue<br>   - Email template: "PO Approved"<br>   - Recipient: Vendor.email<br>   - Attachments: PO summary<br>→ Return updated PO<br><br>**Status Updates**:<br>1. DRAFT → APPROVED (Procurement approval)<br>2. APPROVED → SENT (via email/portal)<br>3. SENT → ACKNOWLEDGED (vendor confirms)<br><br>**Database Updates**:<br>- PurchaseOrder.status changes tracked<br>- POAmendment: logs each status change<br>- ProcessAudit: system-wide audit trail<br>- NotificationQueue: email scheduled<br>- Vendor notification logged | 1. Login as Procurement Manager<br>2. Navigate to `/procurement/purchase-orders`<br>3. Use Quick Actions filter: Status = "DRAFT"<br>4. Orange alert box shows "X POs pending approval"<br>5. Locate PO-2025-0001 in table<br>6. Row displays:<br>   - PO number and date<br>   - Vendor name and email<br>   - Total amount (OMR formatted)<br>   - Status badge (gray "DRAFT")<br>   - Delivery date and countdown<br>7. Click Eye icon to view details<br>8. Route to `/procurement/purchase-orders/{id}`<br>9. PO detail page shows:<br>   - Header with PO info<br>   - Vendor details with performance score<br>   - Line items table<br>   - Delivery information<br>   - Payment terms<br>   - Linked PR reference<br>10. Option 1 - Quick Approve from list:<br>   - Go back to list view<br>   - Click green checkmark icon<br>   - Confirm dialog appears<br>   - Click "Yes, Approve"<br>11. Option 2 - Detailed Approval:<br>   - From detail view, click "Approve PO" button<br>   - Modal opens<br>   - Enter comments: "Approved - proceed with order"<br>   - Click "Confirm Approval"<br>12. System calls PUT `/api/purchase-orders/{id}/status`<br>13. Success toast: "PO approved successfully"<br>14. Status badge changes: DRAFT → APPROVED (blue)<br>15. Notification email queued for vendor<br>16. Click "Mark as Sent" button<br>17. Status changes: APPROVED → SENT (purple)<br>18. Enter vendor acknowledgment:<br>   - Click "Update Status" → "Acknowledged"<br>   - Status: SENT → ACKNOWLEDGED (indigo)<br>19. View history timeline showing all status changes<br>20. Download PO report if needed | - PO approved successfully<br>- Status progression: DRAFT → APPROVED → SENT → ACKNOWLEDGED<br>- Status badges update with correct colors<br>- Email notification created in queue<br>- Vendor receives PO email (if email configured)<br>- Approval comments saved<br>- POAmendment record created for audit<br>- ProcessAudit log updated<br>- Timestamp for each status change<br>- History timeline shows:<br>  * Created date<br>  * Approved date and approver<br>  * Sent date<br>  * Acknowledged date<br>- "Create GRN" button appears after ACKNOWLEDGED<br>- PO locked for editing after SENT<br>- Delivery countdown updates<br>- Vendor performance tracking initiated | - PO Number: PO-2025-0001<br>- Vendor: ABC Suppliers<br>- Vendor Email: vendor@abc.com<br>- Total Amount: OMR 50,000<br>- Delivery Date: 30 days from approval<br>- Payment Terms: Net 30<br>- Approver: procurement@wujha.com<br>- Comments: "Approved - proceed"<br>- Status Timeline:<br>  * Created: Day 0<br>  * Approved: Day 1<br>  * Sent: Day 1<br>  * Acknowledged: Day 2 |

### 1.5 Delivery & Inspection

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| ST-011 | Coordinate Delivery | Manage material delivery to site | Procurement Manager → Logistics → Site Team | Delivery schedule → Site notification → Receipt confirmation | 1. Coordinate with supplier<br>2. Confirm logistics arrangements<br>3. Notify site team<br>4. Monitor delivery status<br>5. Confirm receipt at site | - Schedule coordinated<br>- Site team notified<br>- Delivery tracked<br>- Receipt confirmed | - Delivery date: DD/MM/YYYY<br>- Site location: Warehouse A<br>- Materials: As per PO |
| ST-012 | Quality Inspection | Inspect delivered materials | Site Team → Compliance Officer | Delivery receipt → Inspection checklist → Quality report | 1. Inspect materials against PO<br>2. Check quantity and quality<br>3. Document inspection results<br>4. Report discrepancies<br>5. Verify compliance standards | - Inspection completed<br>- Results documented<br>- Discrepancies reported<br>- Compliance verified | - PO quantity: 100 units<br>- Received: 98 units<br>- Quality issues: 2 units |
| ST-013 | Create GRN | Generate Goods Receipt Note | Site Team → Procurement Team | Inspection results → GRN creation → System update | 1. Create GRN post-inspection<br>2. Log GRN in system<br>3. Update with discrepancies<br>4. Notify procurement/finance<br>5. Trigger 3-way match<br>6. Verify against delivery docs | - GRN created accurately<br>- System updated<br>- Notifications sent<br>- 3-way match triggered | - GRN #: GRN-2024-001<br>- Accepted: 96 units<br>- Rejected: 2 units |

### 1.6 Invoice Processing & Three-Way Matching

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| ST-014 | Submit Invoice | Supplier invoice submission | Supplier → Procurement Admin → Finance | Invoice details → System entry → Initial review | 1. Supplier prepares invoice<br>2. Submit through system<br>3. Include supporting docs<br>4. Initial review by procurement<br>5. Forward to finance | - Invoice submitted<br>- Supporting docs attached<br>- Initial review completed | - Invoice #: INV-2024-001<br>- Amount: $48,000<br>- PO ref: PO-2024-001 |
| ST-015 | Three-Way Match | Automatic matching of PO-GRN-Invoice | System → Finance Manager | PO data + GRN data + Invoice data → Match results | 1. System triggers auto-match<br>2. Compare quantities/prices<br>3. Identify variances<br>4. Flag discrepancies<br>5. Route matched invoices<br>6. Generate match report | - Auto-match completed<br>- Variances identified<br>- Matched invoices routed<br>- Reports generated | - PO: 100 units @ $500<br>- GRN: 96 units received<br>- Invoice: 96 units @ $500 |
| ST-016 | Resolve Discrepancies | Handle mismatches in 3-way match | Procurement Officer → Supplier → Finance | Mismatch details → Investigation → Resolution → Re-match | 1. Review mismatch details<br>2. Investigate with site team<br>3. Contact supplier<br>4. Process credit note<br>5. Update records<br>6. Re-run match | - Discrepancies investigated<br>- Credit note processed<br>- Records updated<br>- Match successful | - Original invoice: $50,000<br>- Credit note: $2,000<br>- Final amount: $48,000 |

### 1.7 Payment Settlement

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| ST-017 | Payment Processing | Process approved payment | AP → Finance Officer → CFO | Approved invoice → Payment workflow → Payment execution | 1. Trigger payment workflow<br>2. Verify invoice/documents<br>3. Check budget availability<br>4. Route for approval (DoA)<br>5. Execute payment<br>6. Update payment status | - Workflow triggered<br>- Documents verified<br>- Budget confirmed<br>- Approvals obtained<br>- Payment executed | - Payment amount: $48,000<br>- Payment terms: Net 30<br>- Payment method: Bank transfer |

### 1.8 Reporting & Analytics

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| ST-018 | Update Dashboards | Real-time procurement dashboard updates | System → Procurement Analyst | Transaction data → Dashboard metrics → Visual displays | 1. Complete procurement cycle<br>2. Verify dashboard updates<br>3. Check PR/PO metrics<br>4. Review spend analytics<br>5. Validate KPI calculations | - Dashboard updated in real-time<br>- Metrics accurate<br>- KPIs calculated correctly | - 10 PRs processed<br>- 8 POs issued<br>- Total spend: $500,000 |

## 2. Non-Stock Items/Services Procurement UAT Scenarios

### 2.1 Planning & Needs Identification

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| NS-001 | Identify Service Needs | Define department service requirements | Department Head → Procurement Coordinator | Service requirements → Consolidated list → Budget mapping | 1. Login as Department Head<br>2. Identify service needs<br>3. Specify requirements<br>4. Submit to procurement<br>5. Consolidate all needs<br>6. Map to cost codes | - Service needs identified<br>- Requirements documented<br>- Consolidation complete<br>- Cost codes assigned | - IT services: Laptops (10)<br>- Facility: Cleaning services<br>- Equipment: Crane rental |
| NS-002 | Validate Service Budget | Check budget for services | Finance Controller → Department Head | Cost codes → Budget allocation → Approval/rejection | 1. Access budget system<br>2. Check service allocations<br>3. Compare with requests<br>4. Identify shortfalls<br>5. Approve/escalate<br>6. Update forecast | - Budget checked accurately<br>- Shortfalls identified<br>- Approvals processed<br>- Forecast updated | - Service budget: $200,000<br>- Requested: $180,000<br>- Available: $190,000 |

### 2.2 Supplier Selection

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| NS-003 | Prepare Service RFP | Create RFP for services | Department Head → Procurement Team | Service requirements → RFP document → Vendor distribution | 1. Define service scope (SoW)<br>2. Specify terms/conditions<br>3. Prepare RFP document<br>4. Set submission deadline<br>5. Identify vendor list<br>6. Issue RFP | - SoW clearly defined<br>- RFP document complete<br>- Vendors notified<br>- Deadlines set | - Service: Annual IT support<br>- Duration: 12 months<br>- Budget: $100,000 |
| NS-004 | Evaluate Service Proposals | Assess technical and commercial proposals | Technical Team → Finance → Procurement Committee | Vendor proposals → Evaluation scores → Selection decision | 1. Review technical proposals<br>2. Score against criteria<br>3. Evaluate pricing<br>4. Compare total scores<br>5. Select preferred vendor<br>6. Negotiate terms | - Proposals evaluated fairly<br>- Scoring transparent<br>- Selection justified<br>- Terms negotiated | - 4 vendor proposals<br>- Technical weight: 60%<br>- Commercial weight: 40% |

### 2.3 Service Purchase Requisition & Approval

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| NS-005 | Create Service PR | Generate PR for services/rentals | Department Head → Procurement | Service details → PR creation → System entry | 1. Gather service requirements<br>2. Specify duration/location<br>3. Create PR in system<br>4. Tag with cost codes<br>5. Include all specifications<br>6. Submit for approval | - PR created with full details<br>- Cost codes correct<br>- Specifications complete | - Service: Office cleaning<br>- Duration: 6 months<br>- Location: Building A<br>- Frequency: Daily |
| NS-006 | Multi-level Service PR Approval | Route service PR through approval hierarchy | Technical Team → Finance → Procurement → Executive | Service PR → Technical review → Budget check → Policy compliance → Executive approval | 1. Technical review of PR<br>2. Verify specifications<br>3. Budget availability check<br>4. Procurement policy review<br>5. Executive approval (if needed)<br>6. Final PR release | - All approval levels completed<br>- Reviews documented<br>- Approvals tracked<br>- PR released | - PR value: $150,000<br>- Requires executive approval<br>- 4-level approval process |

### 2.4 Service PO & Contract Management

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| NS-007 | Convert Service PR to Contract | Create service contract from PR | Procurement → Legal Team | Approved PR → Contract draft → Legal review → Final contract | 1. Review approved service PR<br>2. Draft service contract<br>3. Include milestones/SLAs<br>4. Legal review<br>5. Internal approvals<br>6. Issue to vendor | - Contract drafted accurately<br>- Terms comprehensive<br>- Legal review completed<br>- Contract issued | - Contract type: Service<br>- Duration: 12 months<br>- SLAs defined<br>- Payment milestones: Quarterly |
| NS-008 | Contract Lifecycle Management | Monitor and manage service contract | Project Manager → Procurement → Legal | Contract performance → Amendments → Extensions → Closure | 1. Monitor vendor performance<br>2. Track milestones<br>3. Process amendments<br>4. Handle extensions<br>5. Ensure compliance<br>6. Close contract | - Performance tracked<br>- Amendments processed<br>- Extensions managed<br>- Compliance verified | - Monthly performance reviews<br>- 2 amendments processed<br>- 6-month extension |

### 2.5 Service Delivery & Performance

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| NS-009 | Service Performance Verification | Monitor and verify service delivery | Project Manager → Site Supervisor | Service delivery → Performance data → Verification → SRN creation | 1. Monitor service progress<br>2. Verify against milestones<br>3. Confirm completion<br>4. Collect performance data<br>5. Site confirmation<br>6. Document results | - Progress monitored<br>- Milestones verified<br>- Performance documented<br>- Completion confirmed | - Service: IT support<br>- Milestone: Month 3<br>- Performance: 95% SLA met |
| NS-010 | Create Service Receipt Note | Generate SRN for completed services | Project Manager → Finance | Service completion → SRN details → System entry → Approval | 1. Confirm service completion<br>2. Create SRN with details<br>3. Include delivery dates<br>4. Note any variations<br>5. Approve SRN<br>6. Submit for invoicing | - SRN created accurately<br>- Details complete<br>- Variations documented<br>- Submitted for payment | - SRN #: SRN-2024-001<br>- Service period: Month 3<br>- Variations: None |

### 2.6 Service Invoice Processing

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| NS-011 | Service Invoice Three-Way Match | Match service PO-SRN-Invoice | Accounts Payable → Finance | Service invoice + PO + SRN → Match results → Approval/rejection | 1. Receive service invoice<br>2. Include timesheets/reports<br>3. Trigger 3-way match<br>4. Verify against contract<br>5. Check SRN details<br>6. Process for payment | - Invoice matched successfully<br>- Supporting docs verified<br>- Contract terms validated<br>- Payment approved | - Invoice: $25,000<br>- Contract value: $25,000/month<br>- SRN confirmed |

## 3. Common Process UAT Scenarios

### 3.1 System Integration & Automation

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| CM-001 | Automated PR Creation | Test automatic PR generation triggers | System → Planning Department | Inventory levels → Trigger → PR creation → Notification | 1. Set inventory threshold<br>2. Reduce stock below threshold<br>3. Verify PR auto-generation<br>4. Check PR details<br>5. Confirm notifications sent | - PR generated automatically<br>- Details accurate<br>- Notifications sent | - Material: Steel bars<br>- Threshold: 100 units<br>- Current: 95 units |
| CM-002 | Email Notifications | Test notification system across workflow | System → All stakeholders | Workflow events → Email triggers → Delivery confirmation | 1. Submit PR for approval<br>2. Verify approver notification<br>3. Approve PR<br>4. Check next level notification<br>5. Complete workflow<br>6. Verify all notifications | - All notifications sent<br>- Correct recipients<br>- Timely delivery<br>- Content accurate | - Test all approval levels<br>- Multiple email addresses<br>- Various workflow stages |

### 3.2 Emergency & Special Scenarios

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| CM-003 | Emergency Purchase | Process urgent procurement request | User Dept → Management → Procurement | Emergency request → Justification → Fast-track approval → Expedited PO | 1. Initiate emergency request<br>2. Provide justification<br>3. Get management approval<br>4. Fast-track procurement<br>5. Issue expedited PO<br>6. Follow up delivery | - Emergency process triggered<br>- Approvals expedited<br>- PO issued quickly<br>- Delivery tracked | - Reason: Equipment failure<br>- Required: Within 24 hours<br>- Value: $10,000 |
| CM-004 | Petty Cash Purchase | Small value procurement via petty cash | User → Department Head → Petty Cash Custodian | Purchase request → Approval → Cash disbursement → Receipt submission | 1. Request petty cash purchase<br>2. Get department approval<br>3. Receive cash<br>4. Make purchase<br>5. Submit receipts<br>6. Reconcile petty cash | - Approval obtained<br>- Cash disbursed<br>- Purchase completed<br>- Receipts submitted<br>- Reconciliation done | - Amount: $50<br>- Item: Office supplies<br>- Petty cash limit: $100 |

### 3.3 Vendor Management

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| CM-005 | Vendor Performance Evaluation | Assess and rate vendor performance | Procurement → Stakeholders → System | Performance data → Evaluation criteria → Scores → Vendor rating | 1. Collect performance data<br>2. Apply evaluation criteria<br>3. Score each parameter<br>4. Calculate overall rating<br>5. Update vendor record<br>6. Generate report | - Data collected completely<br>- Scoring accurate<br>- Rating calculated<br>- Records updated | - Delivery: 90%<br>- Quality: 95%<br>- Support: 85%<br>- Overall: 90% |
| CM-006 | Contract Renewal | Process vendor contract renewal | Procurement → Legal → Management | Current contract → Performance review → Renewal decision → New contract | 1. Review contract status<br>2. Assess vendor performance<br>3. Decide renewal/cancellation<br>4. Negotiate new terms<br>5. Process new contract<br>6. Update system | - Contract status reviewed<br>- Decision documented<br>- New terms agreed<br>- Contract processed | - Current contract end: MM/YYYY<br>- Performance: Satisfactory<br>- Renewal period: 12 months |

### 3.4 Reporting & Compliance

| UAT ID | Business Process | Test Scenario | User Flow | Data Flow | Test Steps | Expected Results | Test Data |
|--------|-----------------|---------------|-----------|-----------|------------|------------------|-----------|
| CM-007 | KPI Dashboard | Validate KPI calculations and displays | System → Procurement Analyst | Transaction data → KPI calculations → Dashboard display | 1. Complete multiple transactions<br>2. Check KPI calculations<br>3. Verify dashboard updates<br>4. Test different time periods<br>5. Export reports<br>6. Validate accuracy | - KPIs calculated correctly<br>- Dashboard accurate<br>- Reports exportable<br>- Data consistent | - 50 POs processed<br>- 95% on-time delivery<br>- $2M total spend |
| CM-008 | Audit Trail | Verify complete audit trail maintenance | System → Auditors | All transactions → Audit logs → Compliance verification | 1. Process complete cycle<br>2. Check audit logs<br>3. Verify user actions<br>4. Review timestamps<br>5. Test data integrity<br>6. Generate audit report | - All actions logged<br>- Timestamps accurate<br>- User trails complete<br>- Reports comprehensive | - Test all processes<br>- Multiple users<br>- Various transactions |

---

## UAT Execution Guidelines

### Pre-requisites:
1. Test environment setup with sample data
2. User accounts created for all roles
3. Integration points configured
4. Email notifications enabled

### Test Execution Order:
1. Master data setup (suppliers, materials, services)
2. Stock procurement scenarios (ST-001 to ST-018)
3. Non-stock/service scenarios (NS-001 to NS-011)
4. Common processes (CM-001 to CM-008)
5. Integration testing
6. End-to-end scenarios

### Success Criteria:
- All test scenarios pass
- No critical defects
- Performance within acceptable limits
- User acceptance sign-off obtained

### Risk Mitigation:
- Maintain test data backup
- Document all defects
- Prioritize critical path testing
- Ensure rollback procedures
