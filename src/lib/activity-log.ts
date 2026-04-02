import { prisma } from '@/lib/db'

type ActivityInput = {
  type: string
  entityType: string
  entityId?: string | null
  title: string
  status?: string | null
  amount?: number | null
  currency?: string | null
  createdBy?: string | null
  createdByName?: string | null
}

export async function createActivityLog(input: ActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId || null,
        title: input.title,
        status: input.status || null,
        amount: input.amount ?? null,
        currency: input.currency || null,
        createdBy: input.createdBy || null,
        createdByName: input.createdByName || null,
      },
    })
  } catch (error) {
    console.warn('[activity-log] Failed to write activity log', error)
  }
}
