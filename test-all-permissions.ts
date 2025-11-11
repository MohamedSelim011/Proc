import { getAllPermissions } from './src/lib/permissions'

async function testAllPermissions() {
  console.log('Testing getAllPermissions API...')
  const permissions = await getAllPermissions()
  console.log(`\n📊 Returned ${permissions.length} permissions`)

  if (permissions.length > 0) {
    console.log('\nFirst permission structure:')
    console.log(JSON.stringify(permissions[0], null, 2))
  }
}

testAllPermissions()
