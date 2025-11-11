import { getRolePermissionsDetailed } from './src/lib/permissions'
import { UserRole } from '@prisma/client'

async function testAPI() {
  console.log('Testing API for SUPER_ADMIN...')

  const permissions = await getRolePermissionsDetailed('SUPER_ADMIN' as UserRole)

  console.log(`\n📊 Returned ${permissions.length} permissions`)
  console.log('\nFirst 3 permissions:')
  permissions.slice(0, 3).forEach(p => {
    console.log(`  - ${p.code}: ${p.name}`)
  })
}

testAPI()
