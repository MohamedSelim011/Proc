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

seedContractApprovalRules()
  .then(() => {
    console.log('✅ Seeding completed!')
    process.exit(0)
  })
  .catch((e) => {
    console.error('❌ Error seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
