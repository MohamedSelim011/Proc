import { prisma } from '@/lib/db'
import { RACIType, ConsultationStatus, UserRole } from '@prisma/client'

/**
 * Consultation service for RACI Consulted parties
 */

export interface ConsultationRequest {
  documentType: string
  documentId: string
  approvalId?: string
  consultedUserId: string
  consultedRole?: UserRole
  message?: string
}

/**
 * Create a consultation request for a CONSULTED party
 */
export async function createConsultation(
  request: ConsultationRequest
): Promise<string> {
  const consultation = await prisma.approvalConsultation.create({
    data: {
      documentType: request.documentType,
      documentId: request.documentId,
      approvalId: request.approvalId,
      consultedUserId: request.consultedUserId,
      consultedRole: request.consultedRole,
      raciType: RACIType.CONSULTED,
      status: ConsultationStatus.PENDING,
    },
  })

  return consultation.id
}

/**
 * Create consultations for multiple users based on approval routing
 */
export async function requestConsultations(
  documentType: string,
  documentId: string,
  userIds: string[],
  approvalId?: string
): Promise<void> {
  const consultations = userIds.map((userId) => ({
    documentType,
    documentId,
    approvalId,
    consultedUserId: userId,
    raciType: RACIType.CONSULTED,
    status: ConsultationStatus.PENDING,
  }))

  await prisma.approvalConsultation.createMany({
    data: consultations,
    skipDuplicates: true,
  })
}

/**
 * Respond to a consultation request
 */
export async function respondToConsultation(
  consultationId: string,
  userId: string,
  comments: string,
  recommendation?: 'APPROVE' | 'REJECT' | 'NEUTRAL'
): Promise<void> {
  // Verify user is the consulted party
  const consultation = await prisma.approvalConsultation.findUnique({
    where: { id: consultationId },
  })

  if (!consultation) {
    throw new Error('Consultation not found')
  }

  if (consultation.consultedUserId !== userId) {
    throw new Error('Unauthorized: You are not the consulted party')
  }

  if (consultation.status !== ConsultationStatus.PENDING) {
    throw new Error('Consultation has already been responded to')
  }

  // Update consultation with response
  await prisma.approvalConsultation.update({
    where: { id: consultationId },
    data: {
      status: ConsultationStatus.RESPONDED,
      comments,
      respondedAt: new Date(),
    },
  })

  // Optionally log the recommendation in metadata
  if (recommendation) {
    await prisma.approvalConsultation.update({
      where: { id: consultationId },
      data: {
        comments: `${comments}\n\nRecommendation: ${recommendation}`,
      },
    })
  }
}

/**
 * Get pending consultations for a user
 */
export async function getPendingConsultations(userId: string) {
  return await prisma.approvalConsultation.findMany({
    where: {
      consultedUserId: userId,
      status: ConsultationStatus.PENDING,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * Get all consultations for a user
 */
export async function getUserConsultations(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return await prisma.approvalConsultation.findMany({
    where: {
      consultedUserId: userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  })
}

/**
 * Get consultations for a specific document
 */
export async function getDocumentConsultations(documentId: string) {
  return await prisma.approvalConsultation.findMany({
    where: {
      documentId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
}

/**
 * Check if all required consultations are complete
 */
export async function areConsultationsComplete(
  documentId: string,
  requiredOnly: boolean = false
): Promise<boolean> {
  const consultations = await prisma.approvalConsultation.findMany({
    where: {
      documentId,
    },
  })

  if (consultations.length === 0) {
    return true // No consultations required
  }

  // Check if all consultations have been responded to
  const allResponded = consultations.every(
    (c) => c.status === ConsultationStatus.RESPONDED
  )

  return allResponded
}

/**
 * Get pending consultation count for a user
 */
export async function getPendingConsultationCount(userId: string): Promise<number> {
  return await prisma.approvalConsultation.count({
    where: {
      consultedUserId: userId,
      status: ConsultationStatus.PENDING,
    },
  })
}

/**
 * Cancel consultation (if approval is rejected or cancelled)
 */
export async function cancelConsultations(documentId: string): Promise<void> {
  await prisma.approvalConsultation.updateMany({
    where: {
      documentId,
      status: ConsultationStatus.PENDING,
    },
    data: {
      status: ConsultationStatus.CANCELLED,
    },
  })
}

/**
 * Escalate overdue consultations
 */
export async function escalateOverdueConsultations(
  hoursOverdue: number = 72
): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setHours(cutoffDate.getHours() - hoursOverdue)

  const overdueConsultations = await prisma.approvalConsultation.findMany({
    where: {
      status: ConsultationStatus.PENDING,
      createdAt: {
        lt: cutoffDate,
      },
    },
  })

  // Mark as escalated (you could send notifications here)
  for (const consultation of overdueConsultations) {
    await prisma.approvalConsultation.update({
      where: { id: consultation.id },
      data: {
        comments: consultation.comments
          ? `${consultation.comments}\n\n[ESCALATED - No response after ${hoursOverdue} hours]`
          : `[ESCALATED - No response after ${hoursOverdue} hours]`,
      },
    })
  }
}

/**
 * Get consultation statistics for a user
 */
export async function getConsultationStats(userId: string) {
  const [total, pending, responded, cancelled] = await Promise.all([
    prisma.approvalConsultation.count({
      where: { consultedUserId: userId },
    }),
    prisma.approvalConsultation.count({
      where: { consultedUserId: userId, status: ConsultationStatus.PENDING },
    }),
    prisma.approvalConsultation.count({
      where: { consultedUserId: userId, status: ConsultationStatus.RESPONDED },
    }),
    prisma.approvalConsultation.count({
      where: { consultedUserId: userId, status: ConsultationStatus.CANCELLED },
    }),
  ])

  return {
    total,
    pending,
    responded,
    cancelled,
    responseRate: total > 0 ? (responded / total) * 100 : 0,
  }
}

/**
 * Helper: Request consultation when approval is submitted
 */
export async function requestConsultationForApproval(
  documentType: string,
  documentId: string,
  consultedUserIds: string[],
  submitterName: string,
  amount?: number
): Promise<void> {
  await requestConsultations(documentType, documentId, consultedUserIds)

  // You could also send email notifications here
  // using the notification service
}

/**
 * Helper: Get consultation summary for approver
 */
export async function getConsultationSummary(documentId: string) {
  const consultations = await getDocumentConsultations(documentId)

  const summary = {
    total: consultations.length,
    pending: consultations.filter((c) => c.status === ConsultationStatus.PENDING)
      .length,
    responded: consultations.filter(
      (c) => c.status === ConsultationStatus.RESPONDED
    ).length,
    responses: consultations
      .filter((c) => c.status === ConsultationStatus.RESPONDED)
      .map((c) => ({
        consultedUserId: c.consultedUserId,
        comments: c.comments,
        respondedAt: c.respondedAt,
      })),
  }

  return summary
}
