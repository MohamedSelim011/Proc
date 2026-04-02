import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getApprovalStatus, getEligibleApproversForLevel } from '@/lib/approval-routing'

/**
 * Get detailed approval status
 * GET /api/service-contracts/[id]/approval-status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        approval: {
          include: {
            approvalHistory: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      )
    }

    const approvalStatus = await getApprovalStatus(id)
    const nextLevel = approvalStatus.nextLevel ?? null
    const eligibleForNextLevel =
      nextLevel != null
        ? await getEligibleApproversForLevel(id, nextLevel)
        : null

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
      },
      approval: contract.approval ? {
        id: contract.approval.id,
        level: contract.approval.level,
        status: contract.approval.status,
        nextLevel,
        requiredRoleForNextLevel: eligibleForNextLevel?.requiredRole ?? null,
        eligibleApproversForNextLevel: eligibleForNextLevel?.eligibleApprovers ?? [],
        history: contract.approval.approvalHistory.map(h => ({
          level: h.level,
          action: h.action,
          approverName: h.approverName,
          approverId: h.approverId,
          timestamp: h.timestamp,
          comments: h.comments,
        })),
      } : null,
    })
  } catch (error) {
    console.error('Error fetching approval status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
