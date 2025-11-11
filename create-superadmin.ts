import { prisma } from './src/lib/db'
import * as bcrypt from 'bcryptjs'

async function createSuperAdmin() {
  const email = 'superadmin@wujha.com'
  const password = 'SuperAdmin@123'

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email }
  })

  if (existing) {
    console.log('⚠️  Super Admin user already exists')
    console.log(`📧 Email: ${email}`)
    return
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Super Administrator',
      employeeId: 'SA001',
      department: 'IT',
      role: 'SUPER_ADMIN',
      isActive: true,
      mustChangePassword: false,
    }
  })

  console.log('✅ Super Admin user created successfully!')
  console.log(`📧 Email: ${email}`)
  console.log(`🔑 Password: ${password}`)
  console.log(`👤 User ID: ${user.id}`)
  console.log('\n⚠️  Please change the password after first login!')

  await prisma.$disconnect()
}

createSuperAdmin()
