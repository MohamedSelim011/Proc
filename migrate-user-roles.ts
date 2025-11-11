import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Migrating user roles...')

  // Map old roles to new roles
  const roleMapping: Record<string, string> = {
    'REQUESTOR': 'VIEWER',
    'DEPARTMENT_MANAGER': 'APPROVER',
    'PROCUREMENT_OFFICER': 'PROCUREMENT_OFFICER', // Keep as is
    'PROCUREMENT_MANAGER': 'PROCUREMENT_MANAGER', // Keep as is
    'FINANCE_MANAGER': 'FINANCE_MANAGER', // Keep as is
    'CPO': 'SUPER_ADMIN',
    'WAREHOUSE_MANAGER': 'WAREHOUSE_KEEPER',
    'SERVICE_MANAGER': 'PROJECT_MANAGER',
    'AUDITOR': 'VIEWER',
    'ADMIN': 'ADMIN', // Keep as is
    'VENDOR': 'VIEWER',
  }

  // Get all users
  const users = await prisma.$queryRaw`SELECT id, role FROM "User"`
  console.log(`Found ${Array.isArray(users) ? users.length : 0} users`)

  // Update each user's role using raw SQL
  for (const user of users as any[]) {
    const newRole = roleMapping[user.role] || 'VIEWER'
    console.log(`Updating user ${user.id}: ${user.role} → ${newRole}`)

    await prisma.$executeRaw`UPDATE "User" SET role = ${newRole}::"UserRole" WHERE id = ${user.id}`
  }

  console.log('✅ Migration complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
