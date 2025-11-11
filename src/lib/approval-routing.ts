import { prisma } from '@/lib/db'
import { UserRole, RACIType } from '@prisma/client'

/**
 * Document types that support approval routing
 */
export type DocumentType = 'PR' | 'PO' | 'INVOICE' | 'PAYMENT'

/**
 * Approval routing context - information about the document being approved
 */
export interface ApprovalContext {
  documentType: DocumentType
  amount?: number
  departmentId?: string
  projectId?: string
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  createdBy: string
}

/**
 * Approval step in the routing chain
 */
export interface ApprovalStep {
  level: number
  approverRole: UserRole
  raciType: RACIType
  isOptional: boolean
  timeoutHours: number | null
  eligibleApprovers: string[] // User IDs who can approve at this level
}

/**
 * Complete approval routing plan
 */
export interface ApprovalRoutingPlan {
  ruleId: string
  ruleName: string
  steps: ApprovalStep[]
  totalLevels: number
  estimatedDuration: number // hours
  notifyUsers: string[] // Users with INFORMED RACI type
  consultUsers: string[] // Users with CONSULTED RACI type
}

/**
 * Evaluate approval rules and determine the matching rule
 * Rules are evaluated in priority order
 */
export async function determineApprovalRule(
  context: ApprovalContext
): Promise<string | null> {
  const rules = await prisma.approvalRule.findMany({
    where: {
      documentType: context.documentType,
      isActive: true,
    },
    orderBy: {
      priority: 'asc', // Lower priority number = higher priority
    },
  })

  for (const rule of rules) {
    const conditions = rule.conditions as any

    // Check amount condition
    if (conditions.minAmount !== undefined) {
      if (!context.amount || context.amount < conditions.minAmount) {
        continue
      }
    }

    if (conditions.maxAmount !== undefined) {
      if (!context.amount || context.amount > conditions.maxAmount) {
        continue
      }
    }

    // Check department condition
    if (conditions.departments && Array.isArray(conditions.departments)) {
      if (
        !context.departmentId ||
        !conditions.departments.includes(context.departmentId)
      ) {
        continue
      }
    }

    // Check urgency condition
    if (conditions.urgency && Array.isArray(conditions.urgency)) {
      if (!context.urgency || !conditions.urgency.includes(context.urgency)) {
        continue
      }
    }

    // Rule matches all conditions
    return rule.id
  }

  // No rule matched
  return null
}

/**
 * Get users with specific role and optional filters
 */
async function getUsersByRole(
  role: UserRole,
  departmentId?: string
): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      role,
      isActive: true,
      ...(departmentId && { department: departmentId }),
    },
    select: {
      id: true,
    },
  })

  return users.map((u) => u.id)
}

/**
 * Build complete approval routing plan based on matched rule
 */
export async function buildApprovalRoutingPlan(
  ruleId: string,
  context: ApprovalContext
): Promise<ApprovalRoutingPlan> {
  const rule = await prisma.approvalRule.findUnique({
    where: { id: ruleId },
    include: {
      routings: {
        orderBy: {
          level: 'asc',
        },
      },
    },
  })

  if (!rule) {
    throw new Error(`Approval rule ${ruleId} not found`)
  }

  const steps: ApprovalStep[] = []
  const notifyUsers: Set<string> = new Set()
  const consultUsers: Set<string> = new Set()
  let totalDuration = 0

  for (const routing of rule.routings) {
    // Get eligible approvers for this step
    const eligibleApprovers = await getUsersByRole(
      routing.approverRole,
      context.departmentId
    )

    // If no eligible approvers found and step is not optional, use all users with that role
    if (eligibleApprovers.length === 0 && !routing.isOptional) {
      const allRoleUsers = await getUsersByRole(routing.approverRole)
      eligibleApprovers.push(...allRoleUsers)
    }

    const step: ApprovalStep = {
      level: routing.level,
      approverRole: routing.approverRole,
      raciType: routing.raciType,
      isOptional: routing.isOptional,
      timeoutHours: routing.timeoutHours,
      eligibleApprovers,
    }

    // Add to appropriate collection based on RACI type
    if (routing.raciType === RACIType.ACCOUNTABLE) {
      steps.push(step)
      if (routing.timeoutHours) {
        totalDuration += routing.timeoutHours
      }
    } else if (routing.raciType === RACIType.INFORMED) {
      eligibleApprovers.forEach((id) => notifyUsers.add(id))
    } else if (routing.raciType === RACIType.CONSULTED) {
      consultUsers.add(...eligibleApprovers)
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    steps,
    totalLevels: steps.length,
    estimatedDuration: totalDuration,
    notifyUsers: Array.from(notifyUsers),
    consultUsers: Array.from(consultUsers),
  }
}

/**
 * Initialize approval workflow for a document
 * This is the main entry point for starting an approval process
 */
export async function initializeApprovalWorkflow(
  context: ApprovalContext
): Promise<ApprovalRoutingPlan | null> {
  // Step 1: Determine which rule applies
  const ruleId = await determineApprovalRule(context)

  if (!ruleId) {
    // No rule matches - document may not require approval
    return null
  }

  // Step 2: Build the routing plan
  const plan = await buildApprovalRoutingPlan(ruleId, context)

  return plan
}

/**
 * Check if a user can approve at a specific level
 */
export async function canUserApproveAtLevel(
  userId: string,
  documentId: string,
  level: number
): Promise<boolean> {
  // Get the document's approval record
  const approval = await prisma.approval.findFirst({
    where: {
      OR: [
        { purchaseRequisitionId: documentId },
        { purchaseOrderId: documentId },
        { invoiceId: documentId },
      ],
    },
    include: {
      approvalHistory: true,
    },
  })

  if (!approval) {
    return false
  }

  // Check if previous levels are completed
  const completedLevels = new Set(
    approval.approvalHistory
      .filter((h) => h.action === 'APPROVED')
      .map((h) => h.level)
  )

  // Must approve levels in order
  for (let i = 1; i < level; i++) {
    if (!completedLevels.has(i)) {
      return false
    }
  }

  // Check if user is eligible for this level
  const rule = await prisma.approvalRule.findUnique({
    where: { id: approval.routingRuleId || '' },
    include: {
      routings: {
        where: { level },
      },
    },
  })

  if (!rule || rule.routings.length === 0) {
    return false
  }

  const routing = rule.routings[0]

  // Get user's role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) {
    return false
  }

  // Check if user's role matches the required role for this level
  return user.role === routing.approverRole
}

/**
 * Get current approval status and next required action
 */
export async function getApprovalStatus(documentId: string) {
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
          createdAt: 'desc',
        },
      },
    },
  })

  if (!approval) {
    return {
      status: 'NOT_FOUND',
      currentLevel: 0,
      nextLevel: null,
      canProceed: false,
    }
  }

  // Find the highest completed level
  const completedLevels = approval.approvalHistory
    .filter((h) => h.action === 'APPROVED')
    .map((h) => h.level)

  const currentLevel = completedLevels.length > 0 ? Math.max(...completedLevels) : 0

  // Check if there's a rejection
  const hasRejection = approval.approvalHistory.some((h) => h.action === 'REJECTED')

  if (hasRejection) {
    return {
      status: 'REJECTED',
      currentLevel,
      nextLevel: null,
      canProceed: false,
    }
  }

  // Get rule to determine total levels
  const rule = await prisma.approvalRule.findUnique({
    where: { id: approval.routingRuleId || '' },
    include: {
      routings: {
        where: {
          raciType: RACIType.ACCOUNTABLE,
        },
      },
    },
  })

  const totalLevels = rule?.routings.length || 0
  const nextLevel = currentLevel + 1

  if (currentLevel >= totalLevels) {
    return {
      status: 'APPROVED',
      currentLevel,
      nextLevel: null,
      canProceed: true,
    }
  }

  return {
    status: 'PENDING',
    currentLevel,
    nextLevel,
    canProceed: true,
  }
}
