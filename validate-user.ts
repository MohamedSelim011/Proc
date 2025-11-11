import { prisma } from './src/lib/db'

async function validateUser() {
  const email = 'helshamy@wujha.com'

  console.log(`🔍 Checking for user: ${email}`)

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (user) {
    console.log('\n✅ User found in database!')
    console.log('\n📋 User Details:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Employee ID: ${user.employeeId}`)
    console.log(`   Department: ${user.department}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Active: ${user.isActive}`)
    console.log(`   Must Change Password: ${user.mustChangePassword}`)
    console.log(`   Created At: ${user.createdAt}`)
  } else {
    console.log('\n❌ User NOT found in database!')
  }

  await prisma.$disconnect()
}

validateUser()
