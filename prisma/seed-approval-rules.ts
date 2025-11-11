import { prisma } from '../src/lib/db'
import { UserRole, RACIType } from '@prisma/client'

async function seedApprovalRules() {
  console.log('🌱 Seeding approval rules...')

  // Clear existing rules
  await prisma.approvalRouting.deleteMany()
  await prisma.approvalRule.deleteMany()

  // ===================================
  // Purchase Requisition (PR) Rules
  // ===================================

  // Rule 1: Low value PR (<= 10,000)
  const prLowValue = await prisma.approvalRule.create({
    data: {
      name: 'PR Approval - Low Value (<= 10,000)',
      description: 'Simple approval for low-value purchase requisitions',
      documentType: 'PR',
      isActive: true,
      priority: 1,
      conditions: {
        maxAmount: 10000,
      },
      routings: {
        create: [
          {
            level: 1,
            approverRole: UserRole.PROCUREMENT_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 24,
          },
          {
            level: 100, // INFORMED - not part of approval chain
            approverRole: UserRole.FINANCE_MANAGER,
            raciType: RACIType.INFORMED,
            isOptional: true,
            timeoutHours: null,
          },
        ],
      },
    },
  })
  console.log(`✅ Created rule: ${prLowValue.name}`)

  // Rule 2: Medium value PR (10,001 - 50,000)
  const prMediumValue = await prisma.approvalRule.create({
    data: {
      name: 'PR Approval - Medium Value (10,001 - 50,000)',
      description: 'Two-level approval for medium-value PRs',
      documentType: 'PR',
      isActive: true,
      priority: 2,
      conditions: {
        minAmount: 10001,
        maxAmount: 50000,
      },
      routings: {
        create: [
          {
            level: 1,
            approverRole: UserRole.PROCUREMENT_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 24,
          },
          {
            level: 2,
            approverRole: UserRole.BUDGET_CONTROLLER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 48,
          },
          {
            level: 100,
            approverRole: UserRole.FINANCE_MANAGER,
            raciType: RACIType.INFORMED,
            isOptional: true,
            timeoutHours: null,
          },
        ],
      },
    },
  })
  console.log(`✅ Created rule: ${prMediumValue.name}`)

  // Rule 3: High value PR (> 50,000)
  const prHighValue = await prisma.approvalRule.create({
    data: {
      name: 'PR Approval - High Value (> 50,000)',
      description: 'Three-level approval for high-value PRs',
      documentType: 'PR',
      isActive: true,
      priority: 3,
      conditions: {
        minAmount: 50001,
      },
      routings: {
        create: [
          {
            level: 1,
            approverRole: UserRole.PROCUREMENT_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 24,
          },
          {
            level: 2,
            approverRole: UserRole.BUDGET_CONTROLLER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 48,
          },
          {
            level: 3,
            approverRole: UserRole.FINANCE_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 72,
          },
          {
            level: 100,
            approverRole: UserRole.ADMIN,
            raciType: RACIType.INFORMED,
            isOptional: true,
            timeoutHours: null,
          },
        ],
      },
    },
  })
  console.log(`✅ Created rule: ${prHighValue.name}`)

  // ===================================
  // Purchase Order (PO) Rules
  // ===================================

  // Rule 4: Low value PO (<= 20,000)
  const poLowValue = await prisma.approvalRule.create({
    data: {
      name: 'PO Approval - Low Value (<= 20,000)',
      description: 'Simple approval for low-value purchase orders',
      documentType: 'PO',
      isActive: true,
      priority: 1,
      conditions: {
        maxAmount: 20000,
      },
      routings: {
        create: [
          {
            level: 1,
            approverRole: UserRole.PROCUREMENT_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 24,
          },
          {
            level: 100,
            approverRole: UserRole.FINANCE_MANAGER,
            raciType: RACIType.INFORMED,
            isOptional: true,
            timeoutHours: null,
          },
          {
            level: 200, // CONSULTED
            approverRole: UserRole.BUDGET_CONTROLLER,
            raciType: RACIType.CONSULTED,
            isOptional: true,
            timeoutHours: 24,
          },
        ],
      },
    },
  })
  console.log(`✅ Created rule: ${poLowValue.name}`)

  // Rule 5: High value PO (> 20,000)
  const poHighValue = await prisma.approvalRule.create({
    data: {
      name: 'PO Approval - High Value (> 20,000)',
      description: 'Multi-level approval for high-value POs',
      documentType: 'PO',
      isActive: true,
      priority: 2,
      conditions: {
        minAmount: 20001,
      },
      routings: {
        create: [
          {
            level: 1,
            approverRole: UserRole.PROCUREMENT_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 24,
          },
          {
            level: 2,
            approverRole: UserRole.FINANCE_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 48,
          },
          {
            level: 100,
            approverRole: UserRole.ADMIN,
            raciType: RACIType.INFORMED,
            isOptional: true,
            timeoutHours: null,
          },
          {
            level: 200,
            approverRole: UserRole.BUDGET_CONTROLLER,
            raciType: RACIType.CONSULTED,
            isOptional: true,
            timeoutHours: 24,
          },
        ],
      },
    },
  })
  console.log(`✅ Created rule: ${poHighValue.name}`)

  // ===================================
  // Invoice Rules
  // ===================================

  // Rule 6: Invoice approval (all amounts)
  const invoice = await prisma.approvalRule.create({
    data: {
      name: 'Invoice Approval',
      description: 'Standard invoice approval workflow',
      documentType: 'INVOICE',
      isActive: true,
      priority: 1,
      conditions: {},
      routings: {
        create: [
          {
            level: 1,
            approverRole: UserRole.FINANCE_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 48,
          },
          {
            level: 100,
            approverRole: UserRole.PROCUREMENT_MANAGER,
            raciType: RACIType.INFORMED,
            isOptional: true,
            timeoutHours: null,
          },
        ],
      },
    },
  })
  console.log(`✅ Created rule: ${invoice.name}`)

  // ===================================
  // Payment Rules
  // ===================================

  // Rule 7: Low value payment (<= 30,000)
  const paymentLow = await prisma.approvalRule.create({
    data: {
      name: 'Payment Approval - Low Value (<= 30,000)',
      description: 'Simple payment approval',
      documentType: 'PAYMENT',
      isActive: true,
      priority: 1,
      conditions: {
        maxAmount: 30000,
      },
      routings: {
        create: [
          {
            level: 1,
            approverRole: UserRole.FINANCE_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 24,
          },
        ],
      },
    },
  })
  console.log(`✅ Created rule: ${paymentLow.name}`)

  // Rule 8: High value payment (> 30,000)
  const paymentHigh = await prisma.approvalRule.create({
    data: {
      name: 'Payment Approval - High Value (> 30,000)',
      description: 'Multi-level payment approval',
      documentType: 'PAYMENT',
      isActive: true,
      priority: 2,
      conditions: {
        minAmount: 30001,
      },
      routings: {
        create: [
          {
            level: 1,
            approverRole: UserRole.FINANCE_MANAGER,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 24,
          },
          {
            level: 2,
            approverRole: UserRole.ADMIN,
            raciType: RACIType.ACCOUNTABLE,
            isOptional: false,
            timeoutHours: 48,
          },
          {
            level: 100,
            approverRole: UserRole.SUPER_ADMIN,
            raciType: RACIType.INFORMED,
            isOptional: true,
            timeoutHours: null,
          },
        ],
      },
    },
  })
  console.log(`✅ Created rule: ${paymentHigh.name}`)

  // Summary
  const totalRules = await prisma.approvalRule.count()
  const totalRoutings = await prisma.approvalRouting.count()

  console.log('\n📊 Summary:')
  console.log(`   Total Rules: ${totalRules}`)
  console.log(`   Total Routing Steps: ${totalRoutings}`)
  console.log('\n✅ Approval rules seeded successfully!')

  await prisma.$disconnect()
}

seedApprovalRules().catch((error) => {
  console.error('❌ Error seeding approval rules:', error)
  process.exit(1)
})
