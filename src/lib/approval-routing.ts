import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

/**
 * Simplified approval routing (role-based).
 * ApprovalRule/ApprovalRouting tables have been removed.
 */

export type DocumentType = 'PR' | 'PO' | 'INVOICE' | 'PAYMENT' | 'SERVICE_CONTRACT'

export interface ApprovalContext {
  documentType: DocumentType
  amount?: number
  departmentId?: string
  projectId?: string
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  createdBy: string
}

export interface ApprovalRoutingPlan {
  steps: Array<{ level: number; role: UserRole }>
  totalLevels: number
  notifyUsers: string[]
}

const SERVICE_CONTRACT_LEVEL_ONE_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_MANAGER'])
const SERVICE_CONTRACT_LEVEL_TWO_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'BILLING_ENGINEER'])

export async function initializeApprovalWorkflow(
  _context: ApprovalContext
): Promise<ApprovalRoutingPlan | null> {
  // Approval rules removed; keep as no-op to preserve API compatibility.
  return null
}

export interface CanApproveAtLevelOptions {
  approvalId?: string
}

export async function canUserApproveAtLevel(
  userId: string,
  documentId: string,
  level: number,
  options?: CanApproveAtLevelOptions
): Promise<boolean> {
  const approval = options?.approvalId
    ? await prisma.approval.findUnique({
        where: { id: options.approvalId },
        include: { approvalHistory: true },
      })
    : await prisma.approval.findFirst({
        where: {
          OR: [
            { purchaseRequisitionId: documentId },
            { purchaseOrderId: documentId },
            { invoiceId: documentId },
            { serviceContractId: documentId },
          ],
        },
        include: { approvalHistory: true },
      })

  if (!approval) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) return false

  const role = String(user.role)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true

  // Ensure prior levels approved
  const completedLevels = new Set(
    approval.approvalHistory
      .filter((h) => h.action === 'APPROVED')
      .map((h) => h.level)
  )
  for (let i = 1; i < level; i++) {
    if (!completedLevels.has(i)) return false
  }

  if (approval.serviceContractId) {
    if (level === 1) return SERVICE_CONTRACT_LEVEL_ONE_ROLES.has(role)
    if (level === 2) return SERVICE_CONTRACT_LEVEL_TWO_ROLES.has(role)
    return false
  }

  // Generic: approvals that store role in approverId (e.g. PO flow)
  if (approval.approverId && approval.approverId.toUpperCase) {
    return role === String(approval.approverId)
  }

  return false
}

export async function getEligibleApproversForLevel(
  documentId: string,
  level: number
): Promise<{
  requiredRole: UserRole
  eligibleApprovers: { id: string; name: string | null; email: string }[]
} | null> {
  const approval = await prisma.approval.findFirst({
    where: {
      OR: [
        { purchaseRequisitionId: documentId },
        { purchaseOrderId: documentId },
        { invoiceId: documentId },
        { serviceContractId: documentId },
      ],
    },
  })

  if (!approval) return null

  if (approval.serviceContractId) {
    const requiredRole =
      level === 1 ? UserRole.PROCUREMENT_MANAGER : UserRole.BILLING_ENGINEER

    const users = await prisma.user.findMany({
      where: {
        role: {
          in:
            level === 1
              ? [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROCUREMENT_MANAGER]
              : [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BILLING_ENGINEER],
        },
        isActive: true,
      },
      select: { id: true, name: true, email: true },
    })

    return {
      requiredRole,
      eligibleApprovers: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      })),
    }
  }

  if (approval.approverId) {
    const role = String(approval.approverId) as UserRole
    const users = await prisma.user.findMany({
      where: { role, isActive: true },
      select: { id: true, name: true, email: true },
    })
    return {
      requiredRole: role,
      eligibleApprovers: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      })),
    }
  }

  return null
}

export async function getApprovalStatus(documentId: string) {
  const approval = await prisma.approval.findFirst({
    where: {
      OR: [
        { purchaseRequisitionId: documentId },
        { purchaseOrderId: documentId },
        { invoiceId: documentId },
        { serviceContractId: documentId },
      ],
    },
    include: {
      approvalHistory: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!approval) {
    return { status: 'NOT_FOUND', currentLevel: 0, nextLevel: null, canProceed: false }
  }

  const completedLevels = approval.approvalHistory
    .filter((h) => h.action === 'APPROVED')
    .map((h) => h.level)
  const currentLevel = completedLevels.length > 0 ? Math.max(...completedLevels) : 0
  const hasRejection = approval.approvalHistory.some((h) => h.action === 'REJECTED')

  if (hasRejection) {
    return { status: 'REJECTED', currentLevel, nextLevel: null, canProceed: false }
  }

  const totalLevels = approval.serviceContractId ? 2 : Math.max(approval.level || 1, currentLevel)
  const nextLevel = currentLevel + 1

  if (currentLevel >= totalLevels) {
    return { status: 'APPROVED', currentLevel, nextLevel: null, canProceed: true }
  }

  return { status: 'PENDING', currentLevel, nextLevel, canProceed: true }
}
