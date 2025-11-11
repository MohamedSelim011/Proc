import { prisma } from '@/lib/db'
import { ApprovalStatus, UserRole } from '@prisma/client'
import { canUserApproveAtLevel } from './approval-routing'

/**
 * Approval action service
 */

export interface PendingApproval {
  id: string
  documentType: string
  documentId: string
  purchaseRequisitionId?: string | null
  purchaseOrderId?: string | null
  invoiceId?: string | null
  level: number
  status: ApprovalStatus
  createdAt: Date
  // Document details (will be joined)
  document?: any
}

/**
 * Get all pending approvals for a user
 */
export async function getPendingApprovalsForUser(
  userId: string,
  userRole: UserRole
): Promise<PendingApproval[]> {
  // Get all PENDING approvals where the user's role matches the required role for the current level
  const pendingApprovals = await prisma.approval.findMany({
    where: {
      status: ApprovalStatus.PENDING,
    },
    include: {
      approvalHistory: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Filter approvals where user can approve at the current level
  const userApprovals: PendingApproval[] = []

  for (const approval of pendingApprovals) {
    const canApprove = await canUserApproveAtLevel(
      userId,
      approval.purchaseRequisitionId || approval.purchaseOrderId || approval.invoiceId || '',
      approval.level
    )

    if (canApprove) {
      userApprovals.push({
        id: approval.id,
        documentType: approval.documentType,
        documentId: approval.documentId,
        purchaseRequisitionId: approval.purchaseRequisitionId,
        purchaseOrderId: approval.purchaseOrderId,
        invoiceId: approval.invoiceId,
        level: approval.level,
        status: approval.status,
        createdAt: approval.createdAt,
      })
    }
  }

  return userApprovals
}

/**
 * Get pending approval count for a user
 */
export async function getPendingApprovalCount(
  userId: string,
  userRole: UserRole
): Promise<number> {
  const approvals = await getPendingApprovalsForUser(userId, userRole)
  return approvals.length
}

/**
 * Approve a document at a specific level
 */
export async function approveDocument(
  approvalId: string,
  userId: string,
  comments?: string
): Promise<void> {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: {
      approvalHistory: true,
    },
  })

  if (!approval) {
    throw new Error('Approval not found')
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error('Approval is not pending')
  }

  // Verify user can approve at this level
  const documentId =
    approval.purchaseRequisitionId ||
    approval.purchaseOrderId ||
    approval.invoiceId ||
    ''

  const canApprove = await canUserApproveAtLevel(
    userId,
    documentId,
    approval.level
  )

  if (!canApprove) {
    throw new Error('Unauthorized: You cannot approve at this level')
  }

  // Update approval status
  await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: ApprovalStatus.APPROVED,
      approvedAt: new Date(),
      comments,
    },
  })

  // Create approval history record
  await prisma.approvalHistory.create({
    data: {
      approvalId,
      level: approval.level,
      action: 'APPROVED',
      performedBy: userId,
      previousStatus: ApprovalStatus.PENDING,
      newStatus: ApprovalStatus.APPROVED,
      comments,
    },
  })

  // TODO: Check if this was the final approval level
  // TODO: If yes, update document status to APPROVED
  // TODO: Send notifications to INFORMED parties
}

/**
 * Reject a document at a specific level
 */
export async function rejectDocument(
  approvalId: string,
  userId: string,
  comments: string
): Promise<void> {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: {
      approvalHistory: true,
    },
  })

  if (!approval) {
    throw new Error('Approval not found')
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new Error('Approval is not pending')
  }

  // Verify user can approve at this level
  const documentId =
    approval.purchaseRequisitionId ||
    approval.purchaseOrderId ||
    approval.invoiceId ||
    ''

  const canApprove = await canUserApproveAtLevel(
    userId,
    documentId,
    approval.level
  )

  if (!canApprove) {
    throw new Error('Unauthorized: You cannot reject at this level')
  }

  if (!comments) {
    throw new Error('Comments are required when rejecting')
  }

  // Update approval status
  await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: ApprovalStatus.REJECTED,
      comments,
    },
  })

  // Create approval history record
  await prisma.approvalHistory.create({
    data: {
      approvalId,
      level: approval.level,
      action: 'REJECTED',
      performedBy: userId,
      previousStatus: ApprovalStatus.PENDING,
      newStatus: ApprovalStatus.REJECTED,
      comments,
    },
  })

  // TODO: Update document status to REJECTED
  // TODO: Cancel any pending consultations
  // TODO: Send notifications to INFORMED parties
}

/**
 * Get approval history for a document
 */
export async function getApprovalHistory(documentId: string) {
  const approval = await prisma.approval.findFirst({
    where: {
      OR: [
        { purchaseRequisitionId: documentId },
        { purchaseOrderId: documentId },
        { invoiceId: documentId },
      ],
    },
    include: {
      approvalHistory: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  })

  return approval?.approvalHistory || []
}

/**
 * Get approval statistics for a user
 */
export async function getUserApprovalStats(userId: string) {
  const [total, approved, rejected] = await Promise.all([
    prisma.approvalHistory.count({
      where: { performedBy: userId },
    }),
    prisma.approvalHistory.count({
      where: { performedBy: userId, action: 'APPROVED' },
    }),
    prisma.approvalHistory.count({
      where: { performedBy: userId, action: 'REJECTED' },
    }),
  ])

  return {
    total,
    approved,
    rejected,
    approvalRate: total > 0 ? (approved / total) * 100 : 0,
  }
}
