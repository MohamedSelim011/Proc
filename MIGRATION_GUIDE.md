# Contract Approval - Database Migration Guide

## 🚀 Quick Start

Follow these steps in order to apply the contract approval and negotiation features to your database.

---

## ⚠️ Prerequisites

1. **Backup your database** before running migrations
2. **Test in development first** before applying to production
3. Ensure you have the latest code pulled from the repository
4. Verify your `.env` file has all required variables

---

## 📝 Step-by-Step Migration

### Step 1: Review Schema Changes

```bash
# Review the updated schema
cat prisma/schema.prisma | grep -A 50 "ServiceContract {" 
cat prisma/schema.prisma | grep -A 30 "ServiceContractVersion"
cat prisma/schema.prisma | grep -A 20 "VendorContractResponse"
```

### Step 2: Create Migration

```bash
# Create the migration file
npx prisma migrate dev --name add_contract_approval_and_versioning
```

This will:
- Create migration SQL files in `prisma/migrations/`
- Apply the migration to your development database
- Regenerate the Prisma Client

### Step 3: Verify Migration

```bash
# Check migration status
npx prisma migrate status

# Should show:
# ✓ Your database is in sync with your Prisma schema
```

### Step 4: Generate Prisma Client

```bash
# Regenerate Prisma Client with new types
npx prisma generate
```

### Step 5: Seed Approval Rules

Create or update `prisma/seed.ts` to include contract approval rules:

```typescript
import { PrismaClient, UserRole, RACIType } from '@prisma/client'

const prisma = new PrismaClient()

async function seedContractApprovalRules() {
  console.log('🌱 Seeding contract approval rules...')

  // Check if rule already exists
  const existingRule = await prisma.approvalRule.findFirst({
    where: {
      documentType: 'SERVICE_CONTRACT',
      name: 'Service Contract Approval - Standard'
    }
  })

  if (existingRule) {
    console.log('✓ Contract approval rule already exists')
    return
  }

  // Create approval rule for service contracts
  await prisma.approvalRule.create({
    data: {
      name: 'Service Contract Approval - Standard',
      description: 'Standard approval workflow for service contracts: Head of Procurement → Billing Engineer',
      documentType: 'SERVICE_CONTRACT',
      isActive: true,
      priority: 1,
      conditions: {
        minAmount: 0,
        maxAmount: null
      },
      routings: {
        create: [
          {
            level: 1,
            approverRole: UserRole.HEAD_OF_PROCUREMENT,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 48
          },
          {
            level: 2,
            approverRole: UserRole.BILLING_ENGINEER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 24
          }
        ]
      }
    }
  })

  console.log('✓ Contract approval rule created')
}

async function main() {
  await seedContractApprovalRules()
  // ... other seed functions
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Run the seed:

```bash
npx prisma db seed
```

### Step 6: Update Environment Variables

Ensure your `.env` file has these variables:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@wujha.com
SMTP_FROM_NAME=Wujha Procurement

# Application URL (important for vendor response links)
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_BASE_URL=https://your-domain.com  # Production
```

### Step 7: Restart Development Server

```bash
# Stop the current server (Ctrl+C)

# Restart
npm run dev
```

---

## ✅ Verification Steps

### 1. Check Database Tables

```bash
npx prisma studio
```

Verify new tables exist:
- `ServiceContractVersion`
- `VendorContractResponse`

Verify new fields in `ServiceContract`:
- `versionNumber`
- `approvalId`
- `createdBy`

### 2. Test API Endpoints

**Create a test contract:**
```bash
curl -X POST http://localhost:3000/api/service-contracts \
  -H "Content-Type: application/json" \
  -d '{
    "prId": "your_pr_id",
    "vendorId": "your_vendor_id",
    "contractType": "SERVICE_AGREEMENT",
    "totalValue": 50000,
    "currency": "OMR",
    "startDate": "2026-03-01",
    "endDate": "2027-02-28",
    "paymentTerms": "Net 30",
    "createdBy": "test_user_id",
    "createdByName": "Test User"
  }'
```

**Check versions:**
```bash
curl http://localhost:3000/api/service-contracts/{contract_id}/versions
```

### 3. Test Approval Workflow

1. Create a contract in the UI
2. Click "Submit for Approval"
3. Check the approval workflow is triggered
4. Verify email is sent (check logs)

### 4. Test Vendor Response (Manual)

1. Approve a contract fully
2. Copy the vendor response link from email logs
3. Open the link in a browser
4. Test Accept/Reject buttons

---

## 🔄 Migration to Production

### Before Production Deployment:

1. **Backup production database:**
   ```bash
   # Your backup command here
   pg_dump -h your-host -U your-user your-db > backup-$(date +%Y%m%d).sql
   ```

2. **Test migration in staging:**
   ```bash
   # Apply migration to staging first
   DATABASE_URL="your-staging-url" npx prisma migrate deploy
   ```

3. **Verify in staging:**
   - Test complete contract workflow
   - Test vendor response links
   - Check email delivery
   - Verify version history

4. **Deploy to production:**
   ```bash
   # Apply migration to production
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```

5. **Run seed in production:**
   ```bash
   DATABASE_URL="your-production-url" npx prisma db seed
   ```

6. **Verify production:**
   - Create test contract
   - Verify approval workflow
   - Send test vendor email
   - Check version tracking

---

## 🐛 Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution:** Check if tables were partially created
```bash
# Reset database (⚠️ DEVELOPMENT ONLY)
npx prisma migrate reset
```

### Issue: "VendorResponseStatus is not defined"

**Solution:** Regenerate Prisma Client
```bash
npx prisma generate
```

### Issue: Vendor email links not working

**Solution:** Check `NEXT_PUBLIC_BASE_URL` environment variable
```bash
echo $NEXT_PUBLIC_BASE_URL
```

### Issue: Approval workflow not triggering

**Solution:** Verify approval rule exists
```bash
npx prisma studio
# Check ApprovalRule table for SERVICE_CONTRACT entry
```

### Issue: TypeScript errors after migration

**Solution:** Restart TypeScript server in your IDE
- VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

---

## 📊 Migration Checklist

- [ ] Backup database
- [ ] Review schema changes
- [ ] Create migration (`npx prisma migrate dev`)
- [ ] Verify migration status
- [ ] Generate Prisma Client
- [ ] Seed approval rules
- [ ] Update `.env` variables
- [ ] Restart dev server
- [ ] Test contract creation
- [ ] Test version creation
- [ ] Test approval workflow
- [ ] Test vendor response workflow
- [ ] Check email delivery
- [ ] Verify in Prisma Studio

---

## 📞 Need Help?

Refer to:
- **Main Implementation Doc:** `CONTRACT_APPROVAL_IMPLEMENTATION.md`
- **Schema:** `prisma/schema.prisma`
- **API Docs:** See implementation doc for all endpoints

---

**Good luck with your migration! 🚀**
