# RFQ Scoring and Award Improvements

## Summary

This document outlines the recent improvements to the RFQ evaluation and award process, addressing three main concerns:

1. **Accurate scoring based on evaluation criteria**
2. **Correct response status after scoring**
3. **Winner selection and Purchase Order creation**

---

## 1. Database Schema Updates

### Added Fields to `RFQResponse` Model

```prisma
model RFQResponse {
  // ... existing fields ...
  technicalScore  Float?
  commercialScore Float?
  deliveryScore   Float?      // NEW
  experienceScore Float?      // NEW
  overallScore    Float?      // NEW - Weighted total score
  // ... existing fields ...
}
```

**Purpose:**
- Store individual criterion scores separately
- Calculate and store the overall weighted score based on the RFQ's evaluation criteria

---

## 2. Scoring Process Improvements

### Frontend Changes (`src/app/procurement/rfq/[id]/page.tsx`)

#### Scoring Modal
- **Now shows only submitted vendors** (with `tokenUsed === true` and `proposalFileUrl` present)
- **Dynamically generates input fields** based on the RFQ's evaluation criteria (e.g., technical, commercial, delivery, experience)
- **Displays criteria weights** at the top of the modal for reference
- **Grid layout adapts** to the number of criteria (1-4 columns)

#### Evaluation Submission
When scores are submitted:
1. Validates all criteria have scores (0-100) for all submitted responses
2. Sends individual criterion scores to the API:
   ```json
   {
     "responseId": "...",
     "technicalScore": 35,
     "commercialScore": 23,
     "deliveryScore": 40,
     "experienceScore": 30
   }
   ```

### Backend Changes (`src/app/api/rfq/[id]/evaluate/route.ts`)

#### Weighted Score Calculation
The API now:
1. Parses the RFQ's `evaluationCriteria` (e.g., `{ technical: 40, commercial: 30, delivery: 20, experience: 10 }`)
2. Stores each individual criterion score in its own field
3. Calculates the `overallScore` as a weighted sum:
   ```
   overallScore = (technicalScore × 40% + commercialScore × 30% + deliveryScore × 20% + experienceScore × 10%)
   ```
4. Updates response status to **`EVALUATED`** (not `UNDER_REVIEW`)

---

## 3. Display Improvements

### Individual Scores Display

**In the vendor responses list:**
- Shows all individual criterion scores (Technical, Commercial, Delivery, Experience)
- Displays the **Overall Score** prominently in Wujha primary color
- Criteria are displayed in a responsive grid (up to 3 columns)

**In the proposal details modal:**
- Individual scores shown in separate cards
- Overall weighted score shown in a highlighted section at the bottom

### Status Colors
Added the `EVALUATED` status color:
```typescript
case 'EVALUATED': return 'bg-wujha-primary/10 text-wujha-primary';
```

---

## 4. Winner Selection Process

### "Select as Winner" Button

**Visibility:**
- Appears on each evaluated response when:
  - RFQ status is `EVALUATED`
  - Response status is `EVALUATED`
  - User has management permissions (Admin, Super Admin, Procurement Manager, Department Manager, Finance Manager)

**Functionality:**
1. Confirms selection with the user
2. Calls `/api/rfq/[id]/award` endpoint
3. Marks the selected response as `SELECTED`
4. Updates other responses to `REJECTED`
5. Updates RFQ status to `AWARDED`
6. Asks if the user wants to create a Purchase Order

### Purchase Order Creation

If the user chooses to create a PO after awarding:
- Redirects to `/procurement/purchase-orders/new?rfqId=[id]&vendorId=[vendorId]`
- The PO creation page can use these query parameters to:
  - Pre-fill vendor information
  - Link the PO to the original PR (from the RFQ)
  - Reference the RFQ for audit trail

---

## 5. API Endpoints

### POST `/api/rfq/[id]/evaluate`

**Request:**
```json
{
  "evaluations": [
    {
      "responseId": "...",
      "technicalScore": 35,
      "commercialScore": 23,
      "deliveryScore": 40,
      "experienceScore": 30
    }
  ],
  "evaluatedBy": "EMP12345"
}
```

**Response:**
```json
{
  "message": "RFQ evaluation completed successfully",
  "evaluationSummary": {
    "totalResponses": 2,
    "evaluatedBy": "EMP12345",
    "evaluatedAt": "2025-01-24T...",
    "topResponse": {...},
    "averageScores": {
      "technical": 40.5,
      "commercial": 35.0,
      "delivery": 42.0,
      "experience": 33.0,
      "overall": 38.65
    },
    "priceRange": {...}
  },
  "rankedResponses": [...]
}
```

### POST `/api/rfq/[id]/award`

**Request:**
```json
{
  "selectedResponseId": "...",
  "awardedBy": "EMP12345",
  "comments": "Selected through evaluation process",
  "createPO": false
}
```

**Response:**
```json
{
  "message": "RFQ awarded successfully",
  "awardSummary": {
    "rfqNumber": "RFQ-2025-0001",
    "awardedTo": {
      "vendor": {...},
      "amount": 21000,
      "technicalScore": 35,
      "commercialScore": 23,
      "deliveryScore": 40,
      "experienceScore": 30
    },
    "awardedBy": "EMP12345",
    "awardedAt": "2025-01-24T...",
    "comments": "...",
    "purchaseOrderCreated": false
  },
  "rfq": {...}
}
```

---

## 6. Workflow Summary

1. **Create RFQ** → Define evaluation criteria (Technical 40%, Commercial 30%, Delivery 20%, Experience 10%)
2. **Invite Vendors** → Send email invitations with submission links
3. **Vendors Submit** → Upload proposals and fill in details
4. **Evaluate** → Score each vendor on all criteria
   - Individual scores stored separately
   - Overall weighted score calculated automatically
   - Response status changes to `EVALUATED`
   - RFQ status changes to `EVALUATED`
5. **Select Winner** → Click "Select as Winner" on the best-scored vendor
   - Response status → `SELECTED`
   - Other responses → `REJECTED`
   - RFQ status → `AWARDED`
6. **Create PO** (Optional) → Create a Purchase Order linked to the winning vendor and original PR

---

## 7. Benefits

- **Transparency:** All individual criterion scores are visible
- **Accuracy:** Weighted scoring matches the RFQ's evaluation criteria exactly
- **Flexibility:** Criteria can be customized per RFQ
- **Audit Trail:** All scores and decisions are tracked
- **Streamlined Workflow:** Direct path from RFQ evaluation to PO creation

---

## Notes for Future Implementation

### Purchase Order Creation from RFQ

The PO creation page (`/procurement/purchase-orders/new`) should be updated to:

1. **Check for query parameters:**
   ```typescript
   const searchParams = useSearchParams();
   const rfqId = searchParams.get('rfqId');
   const vendorId = searchParams.get('vendorId');
   ```

2. **If `rfqId` is present:**
   - Fetch the RFQ and its associated PR
   - Pre-fill the form with:
     - Vendor (from `vendorId`)
     - PR reference (from `rfq.prId`)
     - Items (from `rfq.pr.items`)
     - Estimated costs
   - Auto-link the PO to the PR

3. **Store RFQ reference:**
   - Add `rfqId` field to the `PurchaseOrder` model (if not already present)
   - This creates a full audit trail: PR → RFQ → Vendor Selection → PO

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| **Database** | Added `deliveryScore`, `experienceScore`, `overallScore` to `RFQResponse` | Individual criterion scores stored |
| **Evaluate API** | Calculate weighted score based on RFQ criteria | Accurate scoring |
| **Evaluate API** | Set response status to `EVALUATED` | Correct status display |
| **Frontend** | Dynamic scoring modal based on criteria | Flexible evaluation |
| **Frontend** | Display all individual scores + overall score | Transparency |
| **Frontend** | "Select as Winner" button | Easy vendor selection |
| **Award API** | Award vendor and update statuses | Streamlined workflow |
| **Frontend** | Redirect to PO creation with vendor data | Quick PO creation |

---

## Testing Checklist

- [ ] Create RFQ with custom evaluation criteria (e.g., 30% technical, 40% commercial, 20% delivery, 10% experience)
- [ ] Invite vendors and have them submit proposals
- [ ] Click "Evaluate" and verify:
  - [ ] Only submitted vendors appear
  - [ ] Criteria weights are displayed
  - [ ] Input fields match the criteria
- [ ] Score all responses and verify:
  - [ ] Individual scores are saved
  - [ ] Overall score is calculated correctly
  - [ ] Response status changes to `EVALUATED`
  - [ ] RFQ status changes to `EVALUATED`
- [ ] View vendor responses and verify:
  - [ ] All individual scores are displayed
  - [ ] Overall score is prominently shown
  - [ ] "Select as Winner" button appears for managers
- [ ] Click "Select as Winner" and verify:
  - [ ] Confirmation prompt appears
  - [ ] Winner is selected (status → `SELECTED`)
  - [ ] Other responses are rejected (status → `REJECTED`)
  - [ ] RFQ status changes to `AWARDED`
  - [ ] Option to create PO appears
- [ ] If creating PO, verify:
  - [ ] Vendor and PR data are pre-filled
  - [ ] PO is linked to the PR and RFQ

