# 🔍 Non-Stock Items Analysis

## **What are Non-Stock Items?**

Non-stock items are **one-time purchases** that don't require inventory management but follow the standard procurement workflow. They differ from both stock items and services:

### **Examples of Non-Stock Items:**
- Office furniture (desks, chairs, cabinets)
- Computer equipment (laptops, monitors, printers)
- Software licenses (one-time purchases)
- Marketing materials (brochures, banners)
- Event supplies (catering, decorations)
- Maintenance parts (specific to one repair)
- Consulting reports (deliverable-based, not ongoing)

## **Key Differences:**

| Aspect | Stock Items | Non-Stock Items | Services |
|--------|-------------|-----------------|----------|
| **Inventory** | ✅ Tracked | ❌ Not tracked | ❌ Not applicable |
| **Reorder Points** | ✅ Yes | ❌ No | ❌ No |
| **Workflow** | PR→RFQ→PO→GRN→Invoice→Payment | PR→RFQ→PO→GRN→Invoice→Payment | PR→Contract→Milestones→SRN→Payment |
| **Receipt** | Physical GRN with quality check | Physical GRN (simpler) | Service Receipt Note (SRN) |
| **Payment** | Full payment on delivery | Full payment on delivery | Milestone-based |
| **Catalog** | Permanent catalog items | Ad-hoc items | Service catalog |

## **Current Implementation Issues:**

### **❌ What's Wrong:**
1. Non-stock items use the same `Item` table with inventory fields
2. No distinction in business logic
3. Same validation rules as stock items
4. Inventory tracking fields are irrelevant

### **✅ What Should Be Different:**
1. **Simplified item creation** - no inventory fields required
2. **Ad-hoc item creation** - can create items on-the-fly during PR
3. **No reorder alerts** - these are one-time purchases
4. **Simplified receipt process** - focus on delivery confirmation, not inventory updates

## **Implementation Strategy:**

### **Option A: Enhanced Current Approach (Recommended)**
- Keep using `Item` table but with `itemType: NON_STOCK`
- Add business logic to ignore inventory fields for non-stock items
- Simplify UI for non-stock item creation
- Skip inventory-related validations and processes

### **Option B: Separate Schema (Overkill)**
- Create `NonStockItem` table
- Separate APIs and workflows
- More complex but cleaner separation

## **Recommended Implementation:**

### **1. Enhanced Item APIs**
- Modify `/api/items` to handle non-stock items differently
- Skip inventory validations for `itemType: NON_STOCK`
- Allow ad-hoc item creation during PR process

### **2. Enhanced PR Creation**
- Add "Create New Non-Stock Item" option in PR form
- Simplified item form (no inventory fields)
- Direct item creation during PR process

### **3. Enhanced Receipt Process**
- Simplified GRN for non-stock items
- Focus on delivery confirmation
- No inventory updates

### **4. Enhanced Reporting**
- Separate non-stock spending reports
- No inventory reports for non-stock items
- Focus on purchase history and vendor performance

## **Testing Scenarios:**

### **Non-Stock Item Examples to Test:**
1. **Office Furniture Purchase**
   - Create PR for 5 office desks
   - No inventory tracking needed
   - Simple delivery confirmation

2. **Software License Purchase**
   - One-time software license
   - Digital delivery
   - License key receipt confirmation

3. **Event Supplies**
   - Catering for company event
   - One-time purchase
   - Delivery and quality confirmation

## **Current Status:**
- ❌ Non-stock items not properly differentiated
- ❌ Same business logic as stock items
- ❌ Inventory fields required unnecessarily
- ✅ Basic framework exists (ItemType.NON_STOCK)

## **Next Steps:**
1. Enhance item APIs for non-stock handling
2. Modify PR creation for ad-hoc non-stock items
3. Simplify receipt process for non-stock items
4. Update reporting to exclude non-stock from inventory reports
