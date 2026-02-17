import { prisma } from '@/lib/db'
import { RACIType, NotificationType, UserRole } from '@prisma/client'

/**
 * Notification service for RACI Informed parties
 */

/** Get all active system admin user IDs (ADMIN + SUPER_ADMIN) so they always receive approval notifications */
async function getSystemAdminUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      isActive: true,
    },
    select: { id: true },
  })
  return users.map((u) => u.id)
}

export interface NotificationData {
  documentType: string
  documentId: string
  approvalId?: string
  userId: string
  subject: string
  body: string
  metadata?: any
}

/**
 * Create a notification for an INFORMED party
 */
export async function createInformedNotification(
  documentType: string,
  documentId: string,
  userId: string,
  approvalId?: string
): Promise<void> {
  await prisma.approvalNotification.create({
    data: {
      documentType,
      documentId,
      approvalId,
      userId,
      raciType: RACIType.INFORMED,
      notificationType: NotificationType.EMAIL,
      isRead: false,
    },
  })
}

/**
 * Create notifications for all INFORMED parties based on approval routing.
 * System admins (ADMIN + SUPER_ADMIN) are always included so they receive every approval notification.
 */
export async function notifyInformedParties(
  documentType: string,
  documentId: string,
  userIds: string[],
  approvalId?: string
): Promise<void> {
  const adminIds = await getSystemAdminUserIds()
  const allUserIds = [...new Set([...userIds, ...adminIds])]

  const notifications = allUserIds.map((userId) => ({
    documentType,
    documentId,
    approvalId,
    userId,
    raciType: RACIType.INFORMED,
    notificationType: NotificationType.EMAIL,
    isRead: false,
  }))

  await prisma.approvalNotification.createMany({
    data: notifications,
    skipDuplicates: true,
  })
}

/**
 * Queue email notification for INFORMED party
 */
export async function queueNotificationEmail(data: NotificationData): Promise<void> {
  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { email: true, name: true },
  })

  if (!user) {
    console.error(`User ${data.userId} not found for notification`)
    return
  }

  // Create notification queue entry
  await prisma.notificationQueue.create({
    data: {
      type: NotificationType.EMAIL,
      recipient: user.email,
      subject: data.subject,
      body: data.body,
      templateData: {
        userName: user.name,
        documentType: data.documentType,
        documentId: data.documentId,
        ...(data.metadata || {}),
      },
      status: 'PENDING',
      scheduledAt: new Date(),
    },
  })
}

/**
 * Send notification to all INFORMED parties with email queue.
 * System admins (ADMIN + SUPER_ADMIN) are always included.
 */
export async function sendInformedNotifications(
  documentType: string,
  documentId: string,
  userIds: string[],
  subject: string,
  message: string,
  metadata?: any
): Promise<void> {
  const adminIds = await getSystemAdminUserIds()
  const allUserIds = [...new Set([...userIds, ...adminIds])]

  // Create in-app notifications (notifyInformedParties adds admins internally)
  await notifyInformedParties(documentType, documentId, userIds)

  // Queue email notifications for everyone including system admins
  for (const userId of allUserIds) {
    await queueNotificationEmail({
      documentType,
      documentId,
      userId,
      subject,
      body: message,
      metadata,
    })
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await prisma.approvalNotification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await prisma.approvalNotification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  return await prisma.approvalNotification.findMany({
    where: {
      userId,
      isRead: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * Get all notifications for a user (paginated)
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return await prisma.approvalNotification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  })
}

/**
 * Get notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return await prisma.approvalNotification.count({
    where: {
      userId,
      isRead: false,
    },
  })
}

/**
 * Delete old read notifications (cleanup)
 */
export async function cleanupOldNotifications(daysOld: number = 30): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  await prisma.approvalNotification.deleteMany({
    where: {
      isRead: true,
      readAt: {
        lt: cutoffDate,
      },
    },
  })
}

/**
 * Helper: Send notification when approval is submitted
 */
export async function notifyApprovalSubmitted(
  documentType: string,
  documentId: string,
  informedUserIds: string[],
  submitterName: string,
  amount?: number
): Promise<void> {
  const subject = `New ${documentType} Submitted for Approval`
  const message = `${submitterName} has submitted a new ${documentType} (ID: ${documentId})${
    amount ? ` with amount ${amount}` : ''
  } for approval. You are being informed as part of the approval workflow.`

  await sendInformedNotifications(
    documentType,
    documentId,
    informedUserIds,
    subject,
    message,
    { submitterName, amount }
  )
}

/**
 * Helper: Send notification when approval level is completed
 */
export async function notifyApprovalLevelCompleted(
  documentType: string,
  documentId: string,
  informedUserIds: string[],
  level: number,
  approverName: string,
  action: 'APPROVED' | 'REJECTED'
): Promise<void> {
  const subject = `${documentType} ${action} at Level ${level}`
  const message = `${approverName} has ${action.toLowerCase()} ${documentType} (ID: ${documentId}) at approval level ${level}. You are being kept informed of this approval workflow.`

  await sendInformedNotifications(
    documentType,
    documentId,
    informedUserIds,
    subject,
    message,
    { level, approverName, action }
  )
}

/**
 * Helper: Send notification when final approval is complete
 */
export async function notifyApprovalComplete(
  documentType: string,
  documentId: string,
  informedUserIds: string[],
  finalApproverName: string
): Promise<void> {
  const subject = `${documentType} Fully Approved`
  const message = `${documentType} (ID: ${documentId}) has been fully approved by ${finalApproverName}. The approval workflow is now complete.`

  await sendInformedNotifications(
    documentType,
    documentId,
    informedUserIds,
    subject,
    message,
    { finalApproverName }
  )
}
