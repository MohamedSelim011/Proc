import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Resetting admin user...')

  // Delete existing admin
  await prisma.user.deleteMany({
    where: { email: 'admin@wujha.om' }
  })
  console.log('✅ Deleted old admin user')

  // Create new admin with correct password hash
  const hashedPassword = await bcrypt.hash('Admin@123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@wujha.om',
      password: hashedPassword,
      name: 'System Administrator',
      employeeId: 'ADMIN-001',
      department: 'IT',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: true,
    },
  })
  console.log('✅ Created admin user:', admin.email)
  console.log('📧 Login with: admin@wujha.om / Admin@123')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
