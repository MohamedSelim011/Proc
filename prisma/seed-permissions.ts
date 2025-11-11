import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

// Define all permissions
const permissions = [
  // User Management
  { code: 'users.create', name: 'Create Users', description: 'Create new user accounts', module: 'user_management', action: 'create' },
  { code: 'users.read', name: 'View Users', description: 'View user information', module: 'user_management', action: 'read' },
  { code: 'users.update', name: 'Update Users', description: 'Update user information', module: 'user_management', action: 'update' },
  { code: 'users.delete', name: 'Delete Users', description: 'Deactivate user accounts', module: 'user_management', action: 'delete' },
  { code: 'users.reset_password', name: 'Reset Passwords', description: 'Reset user passwords', module: 'user_management', action: 'reset_password' },

  // Purchase Requisitions
  { code: 'pr.create', name: 'Create PR', description: 'Create purchase requisitions', module: 'purchase_requisition', action: 'create' },
  { code: 'pr.read', name: 'View PR', description: 'View purchase requisitions', module: 'purchase_requisition', action: 'read' },
  { code: 'pr.update', name: 'Update PR', description: 'Update purchase requisitions', module: 'purchase_requisition', action: 'update' },
  { code: 'pr.delete', name: 'Delete PR', description: 'Delete purchase requisitions', module: 'purchase_requisition', action: 'delete' },
  { code: 'pr.approve', name: 'Approve PR', description: 'Approve purchase requisitions', module: 'purchase_requisition', action: 'approve' },
  { code: 'pr.reject', name: 'Reject PR', description: 'Reject purchase requisitions', module: 'purchase_requisition', action: 'reject' },

  // Purchase Orders
  { code: 'po.create', name: 'Create PO', description: 'Create purchase orders', module: 'purchase_order', action: 'create' },
  { code: 'po.read', name: 'View PO', description: 'View purchase orders', module: 'purchase_order', action: 'read' },
  { code: 'po.update', name: 'Update PO', description: 'Update purchase orders', module: 'purchase_order', action: 'update' },
  { code: 'po.delete', name: 'Delete PO', description: 'Delete purchase orders', module: 'purchase_order', action: 'delete' },
  { code: 'po.approve', name: 'Approve PO', description: 'Approve purchase orders', module: 'purchase_order', action: 'approve' },
  { code: 'po.cancel', name: 'Cancel PO', description: 'Cancel purchase orders', module: 'purchase_order', action: 'cancel' },

  // RFQ
  { code: 'rfq.create', name: 'Create RFQ', description: 'Create RFQ documents', module: 'rfq', action: 'create' },
  { code: 'rfq.read', name: 'View RFQ', description: 'View RFQ documents', module: 'rfq', action: 'read' },
  { code: 'rfq.update', name: 'Update RFQ', description: 'Update RFQ documents', module: 'rfq', action: 'update' },
  { code: 'rfq.delete', name: 'Delete RFQ', description: 'Delete RFQ documents', module: 'rfq', action: 'delete' },
  { code: 'rfq.award', name: 'Award RFQ', description: 'Award contracts from RFQ', module: 'rfq', action: 'award' },

  // Invoices
  { code: 'invoice.create', name: 'Create Invoice', description: 'Create invoices', module: 'invoice', action: 'create' },
  { code: 'invoice.read', name: 'View Invoice', description: 'View invoices', module: 'invoice', action: 'read' },
  { code: 'invoice.update', name: 'Update Invoice', description: 'Update invoices', module: 'invoice', action: 'update' },
  { code: 'invoice.delete', name: 'Delete Invoice', description: 'Delete invoices', module: 'invoice', action: 'delete' },
  { code: 'invoice.approve', name: 'Approve Invoice', description: 'Approve invoices for payment', module: 'invoice', action: 'approve' },

  // Payments
  { code: 'payment.create', name: 'Create Payment', description: 'Create payment records', module: 'payment', action: 'create' },
  { code: 'payment.read', name: 'View Payment', description: 'View payment records', module: 'payment', action: 'read' },
  { code: 'payment.update', name: 'Update Payment', description: 'Update payment records', module: 'payment', action: 'update' },
  { code: 'payment.delete', name: 'Delete Payment', description: 'Delete payment records', module: 'payment', action: 'delete' },
  { code: 'payment.approve', name: 'Approve Payment', description: 'Approve payments', module: 'payment', action: 'approve' },
  { code: 'payment.execute', name: 'Execute Payment', description: 'Execute approved payments', module: 'payment', action: 'execute' },

  // Goods Receipt
  { code: 'gr.create', name: 'Create GRN', description: 'Create goods receipt notes', module: 'goods_receipt', action: 'create' },
  { code: 'gr.read', name: 'View GRN', description: 'View goods receipt notes', module: 'goods_receipt', action: 'read' },
  { code: 'gr.update', name: 'Update GRN', description: 'Update goods receipt notes', module: 'goods_receipt', action: 'update' },
  { code: 'gr.delete', name: 'Delete GRN', description: 'Delete goods receipt notes', module: 'goods_receipt', action: 'delete' },
  { code: 'gr.approve', name: 'Approve GRN', description: 'Approve goods receipt', module: 'goods_receipt', action: 'approve' },

  // Vendors
  { code: 'vendor.create', name: 'Create Vendor', description: 'Create vendor records', module: 'vendor', action: 'create' },
  { code: 'vendor.read', name: 'View Vendor', description: 'View vendor information', module: 'vendor', action: 'read' },
  { code: 'vendor.update', name: 'Update Vendor', description: 'Update vendor information', module: 'vendor', action: 'update' },
  { code: 'vendor.delete', name: 'Delete Vendor', description: 'Delete vendor records', module: 'vendor', action: 'delete' },
  { code: 'vendor.evaluate', name: 'Evaluate Vendor', description: 'Evaluate vendor performance', module: 'vendor', action: 'evaluate' },

  // Reports
  { code: 'reports.view', name: 'View Reports', description: 'View system reports', module: 'reports', action: 'read' },
  { code: 'reports.export', name: 'Export Reports', description: 'Export reports to various formats', module: 'reports', action: 'export' },

  // Settings
  { code: 'settings.view', name: 'View Settings', description: 'View system settings', module: 'settings', action: 'read' },
  { code: 'settings.update', name: 'Update Settings', description: 'Update system settings', module: 'settings', action: 'update' },

  // Audit Logs
  { code: 'audit.read', name: 'View Audit Logs', description: 'View audit trail', module: 'audit', action: 'read' },
]

// Define role-permission mappings
const rolePermissions = {
  [UserRole.SUPER_ADMIN]: permissions.map(p => p.code), // All permissions

  [UserRole.ADMIN]: [
    'users.create', 'users.read', 'users.update', 'users.delete', 'users.reset_password',
    'settings.view', 'settings.update',
    'audit.read',
    'pr.read', 'po.read', 'invoice.read', 'payment.read', 'vendor.read', 'rfq.read', 'gr.read',
    'reports.view', 'reports.export',
  ],

  [UserRole.FINANCE_MANAGER]: [
    'pr.read', 'pr.approve', 'pr.reject',
    'po.read', 'po.approve',
    'invoice.read', 'invoice.approve',
    'payment.create', 'payment.read', 'payment.update', 'payment.approve', 'payment.execute',
    'vendor.read',
    'reports.view', 'reports.export',
    'audit.read',
  ],

  [UserRole.PROCUREMENT_MANAGER]: [
    'pr.read', 'pr.approve', 'pr.reject',
    'po.create', 'po.read', 'po.update', 'po.delete', 'po.approve', 'po.cancel',
    'rfq.create', 'rfq.read', 'rfq.update', 'rfq.delete', 'rfq.award',
    'invoice.read',
    'payment.read',
    'vendor.create', 'vendor.read', 'vendor.update', 'vendor.evaluate',
    'gr.read',
    'reports.view', 'reports.export',
  ],

  [UserRole.BUDGET_CONTROLLER]: [
    'pr.read', 'pr.approve', 'pr.reject',
    'po.read',
    'invoice.read',
    'payment.read', 'payment.approve',
    'reports.view', 'reports.export',
  ],

  [UserRole.PROJECT_MANAGER]: [
    'pr.create', 'pr.read', 'pr.update', 'pr.approve',
    'po.read',
    'invoice.read',
    'payment.read',
    'vendor.read',
    'gr.read',
    'reports.view',
  ],

  [UserRole.SITE_ENGINEER]: [
    'pr.create', 'pr.read', 'pr.update',
    'po.read',
    'gr.create', 'gr.read', 'gr.update',
    'invoice.read',
    'reports.view',
  ],

  [UserRole.WAREHOUSE_KEEPER]: [
    'pr.read',
    'po.read',
    'gr.create', 'gr.read', 'gr.update', 'gr.approve',
    'invoice.read',
    'reports.view',
  ],

  [UserRole.PROCUREMENT_OFFICER]: [
    'pr.read',
    'po.create', 'po.read', 'po.update',
    'rfq.create', 'rfq.read', 'rfq.update',
    'invoice.read',
    'vendor.create', 'vendor.read', 'vendor.update',
    'gr.read',
    'reports.view',
  ],

  [UserRole.APPROVER]: [
    'pr.read', 'pr.approve', 'pr.reject',
    'po.read', 'po.approve',
    'invoice.read', 'invoice.approve',
    'payment.read', 'payment.approve',
    'reports.view',
  ],

  [UserRole.VIEWER]: [
    'pr.read',
    'po.read',
    'invoice.read',
    'payment.read',
    'vendor.read',
    'rfq.read',
    'gr.read',
    'reports.view',
  ],
}

async function main() {
  console.log('🌱 Seeding permissions...')

  // Clear existing permissions and role permissions
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()

  console.log('✅ Cleared existing permissions')

  // Create permissions
  for (const perm of permissions) {
    await prisma.permission.create({
      data: perm,
    })
  }

  console.log(`✅ Created ${permissions.length} permissions`)

  // Create role-permission mappings
  let mappingCount = 0
  for (const [role, permCodes] of Object.entries(rolePermissions)) {
    for (const permCode of permCodes) {
      const permission = await prisma.permission.findUnique({
        where: { code: permCode },
      })

      if (permission) {
        await prisma.rolePermission.create({
          data: {
            role: role as UserRole,
            permissionId: permission.id,
          },
        })
        mappingCount++
      }
    }
  }

  console.log(`✅ Created ${mappingCount} role-permission mappings`)
  console.log('🎉 Permissions seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding permissions:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
