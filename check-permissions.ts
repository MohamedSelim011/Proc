import { prisma } from './src/lib/db'

async function checkPermissions() {
  const permissionCount = await prisma.permission.count()
  const rolePermissionCount = await prisma.rolePermission.count()

  console.log(`📊 Permissions in database: ${permissionCount}`)
  console.log(`📊 Role-Permission mappings: ${rolePermissionCount}`)

  // Check a specific role
  const superAdminPerms = await prisma.rolePermission.findMany({
    where: { role: 'SUPER_ADMIN' },
    include: { permission: true }
  })

  console.log(`\n✅ SUPER_ADMIN has ${superAdminPerms.length} permissions`)

  await prisma.$disconnect()
}

checkPermissions()
