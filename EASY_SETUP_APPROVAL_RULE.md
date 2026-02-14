# Easy Setup - Create Approval Rule via Prisma Studio

Since you already migrated the database, you just need to add the approval rule DATA.

## 🎯 Simple Method: Use Prisma Studio

### **Step 1: Open Prisma Studio**

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555`

### **Step 2: Create the Approval Rule**

1. In Prisma Studio, click **"ApprovalRule"** table on the left
2. Click **"Add record"** button (top right)
3. Fill in these fields:

**Field Values:**
```
id: (auto-generated, leave as is)
name: Service Contract Approval - Standard
description: Standard approval workflow for service contracts
documentType: SERVICE_CONTRACT
isActive: true (check the box)
priority: 1
conditions: {"minAmount": 0, "maxAmount": null}
createdAt: (auto-generated)
updatedAt: (auto-generated)
createdBy: (leave empty/null)
```

4. Click **"Save 1 change"**
5. **Copy the generated `id`** (you'll need it for the next step)

### **Step 3: Create Routing Level 1 (Head of Procurement)**

1. In Prisma Studio, click **"ApprovalRouting"** table
2. Click **"Add record"**
3. Fill in:

```
id: (auto-generated)
ruleId: [PASTE THE ID FROM STEP 2]
level: 1
approverRole: HEAD_OF_PROCUREMENT (select from dropdown)
raciType: ACCOUNTABLE (select from dropdown)
isOptional: false (uncheck the box)
timeoutHours: 48
createdAt: (auto-generated)
updatedAt: (auto-generated)
```

4. Click **"Save 1 change"**

### **Step 4: Create Routing Level 2 (Billing Engineer)**

1. Still in **"ApprovalRouting"** table
2. Click **"Add record"** again
3. Fill in:

```
id: (auto-generated)
ruleId: [PASTE THE SAME ID FROM STEP 2]
level: 2
approverRole: BILLING_ENGINEER (select from dropdown)
raciType: ACCOUNTABLE (select from dropdown)
isOptional: false (uncheck the box)
timeoutHours: 24
createdAt: (auto-generated)
updatedAt: (auto-generated)
```

4. Click **"Save 1 change"**

### **Step 5: Verify**

In Prisma Studio:
- **ApprovalRule** table should have 1 record for SERVICE_CONTRACT
- **ApprovalRouting** table should have 2 records (level 1 and 2) with the same ruleId

---

## ✅ Then Test!

1. Close Prisma Studio (or leave it open)
2. **Refresh your contract page** in the browser
3. Click **"Submit for Approval"**
4. Should work now! ✅

---

## 🎯 Alternative: One-Line SQL (If You Prefer)

If you prefer SQL, just run this **one command** in Railway:

```sql
WITH new_rule AS (
  INSERT INTO "ApprovalRule" (id, name, description, "documentType", "isActive", priority, conditions, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, 'Service Contract Approval - Standard', 'Standard approval workflow', 'SERVICE_CONTRACT', true, 1, '{"minAmount": 0, "maxAmount": null}'::jsonb, NOW(), NOW())
  RETURNING id
)
INSERT INTO "ApprovalRouting" (id, "ruleId", level, "approverRole", "raciType", "isOptional", "timeoutHours", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, id, 1, 'HEAD_OF_PROCUREMENT', 'ACCOUNTABLE', false, 48, NOW(), NOW() FROM new_rule
UNION ALL
SELECT gen_random_uuid()::text, id, 2, 'BILLING_ENGINEER', 'ACCOUNTABLE', false, 24, NOW(), NOW() FROM new_rule;
```

This creates everything in one go!

---

## 🤔 Which Method?

- **Prisma Studio** → Visual, easy, no SQL knowledge needed
- **SQL Query** → Fast, one command

Choose whichever you prefer!

After either method, just **refresh your browser** and test the "Submit for Approval" button! 🚀