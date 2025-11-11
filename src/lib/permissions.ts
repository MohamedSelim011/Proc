import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

// Permission cache to avoid repeated database queries
const permissionCache: Map<UserRole, Set<string>> = new Map()

/**
 * Get all permissions for a specific role
 * @param role User role
 * @returns Set of permission codes
 */
export async function getRolePermissions(role: UserRole): Promise<Set<string>> {
  // Check cache first
  if (permissionCache.has(role)) {
    return permissionCache.get(role)!
  }

  // Fetch from database
  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      role,
      isActive: true,
    },
    include: {
      permission: true,
    },
  })

  // Extract permission codes
  const permissionCodes = new Set(
    rolePermissions.map((rp) => rp.permission.code)
  )

  // Cache the result
  permissionCache.set(role, permissionCodes)

  return permissionCodes
}

/**
 * Check if a role has a specific permission
 * @param role User role
 * @param permissionCode Permission code (e.g., 'pr.create')
 * @returns Boolean indicating if role has permission
 */
export async function hasPermission(
  role: UserRole,
  permissionCode: string
): Promise<boolean> {
  const permissions = await getRolePermissions(role)
  return permissions.has(permissionCode)
}

/**
 * Check if a role has any of the specified permissions
 * @param role User role
 * @param permissionCodes Array of permission codes
 * @returns Boolean indicating if role has any of the permissions
 */
export async function hasAnyPermission(
  role: UserRole,
  permissionCodes: string[]
): Promise<boolean> {
  const permissions = await getRolePermissions(role)
  return permissionCodes.some((code) => permissions.has(code))
}

/**
 * Check if a role has all of the specified permissions
 * @param role User role
 * @param permissionCodes Array of permission codes
 * @returns Boolean indicating if role has all permissions
 */
export async function hasAllPermissions(
  role: UserRole,
  permissionCodes: string[]
): Promise<boolean> {
  const permissions = await getRolePermissions(role)
  return permissionCodes.every((code) => permissions.has(code))
}

/**
 * Clear permission cache (call after permission changes)
 */
export function clearPermissionCache(): void {
  permissionCache.clear()
}

/**
 * Get all permissions grouped by module
 */
export async function getAllPermissions() {
  const permissions = await prisma.permission.findMany({
    where: { isActive: true },
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  })

  return permissions
}

/**
 * Get permissions for a specific role with details
 */
export async function getRolePermissionsDetailed(role: UserRole) {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      role,
      isActive: true,
    },
    include: {
      permission: true,
    },
  })

  return rolePermissions.map((rp) => ({
    id: rp.id,
    code: rp.permission.code,
    name: rp.permission.name,
    description: rp.permission.description,
    module: rp.permission.module,
    action: rp.permission.action,
    conditions: rp.conditions,
  }))
}

// Permission constants for easy reference
export const PERMISSIONS = {
  // Users
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_RESET_PASSWORD: 'users.reset_password',

  // Purchase Requisitions
  PR_CREATE: 'pr.create',
  PR_READ: 'pr.read',
  PR_UPDATE: 'pr.update',
  PR_DELETE: 'pr.delete',
  PR_APPROVE: 'pr.approve',
  PR_REJECT: 'pr.reject',

  // Purchase Orders
  PO_CREATE: 'po.create',
  PO_READ: 'po.read',
  PO_UPDATE: 'po.update',
  PO_DELETE: 'po.delete',
  PO_APPROVE: 'po.approve',
  PO_CANCEL: 'po.cancel',

  // RFQ
  RFQ_CREATE: 'rfq.create',
  RFQ_READ: 'rfq.read',
  RFQ_UPDATE: 'rfq.update',
  RFQ_DELETE: 'rfq.delete',
  RFQ_AWARD: 'rfq.award',

  // Invoices
  INVOICE_CREATE: 'invoice.create',
  INVOICE_READ: 'invoice.read',
  INVOICE_UPDATE: 'invoice.update',
  INVOICE_DELETE: 'invoice.delete',
  INVOICE_APPROVE: 'invoice.approve',

  // Payments
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_READ: 'payment.read',
  PAYMENT_UPDATE: 'payment.update',
  PAYMENT_DELETE: 'payment.delete',
  PAYMENT_APPROVE: 'payment.approve',
  PAYMENT_EXECUTE: 'payment.execute',

  // Goods Receipt
  GR_CREATE: 'gr.create',
  GR_READ: 'gr.read',
  GR_UPDATE: 'gr.update',
  GR_DELETE: 'gr.delete',
  GR_APPROVE: 'gr.approve',

  // Vendors
  VENDOR_CREATE: 'vendor.create',
  VENDOR_READ: 'vendor.read',
  VENDOR_UPDATE: 'vendor.update',
  VENDOR_DELETE: 'vendor.delete',
  VENDOR_EVALUATE: 'vendor.evaluate',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',

  // Audit
  AUDIT_READ: 'audit.read',
} as const
