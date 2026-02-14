import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { canUserApproveAtLevel, getApprovalStatus } from '@/lib/approval-routing'
import { rejectContractVersion } from '@/lib/contract-version-service'
import { notifyApprovalLevelCompleted } from '@/lib/notification-service'
import { requireAuth } from '@/lib/jwt'

/**
 * Reject Service Contract
 * POST /api/service-contracts/[id]/reject
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    let user;
    try {
      user = requireAuth(request);
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { comments } = body
    const userId = user.id;
    const userName = user.name || user.email || 'Unknown User';

    if (!comments) {
      return NextResponse.json(
        { success: false, error: 'Comments are required when rejecting a contract' },
        { status: 400 }
      )
    }

    // Get the contract with approval details
    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        approval: {
          include: {
            approvalHistory: true,
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

    if (!contract.approval) {
      return NextResponse.json(
        { success: false, error: 'Contract has no approval workflow' },
        { status: 400 }
      )
    }

    // Get current approval status
    const approvalStatus = await getApprovalStatus(id)

    if (approvalStatus.status === 'REJECTED') {
      return NextResponse.json(
        { success: false, error: 'Contract has already been rejected' },
        { status: 400 }
      )
    }

    if (approvalStatus.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Cannot reject an approved contract' },
        { status: 400 }
      )
    }

    const currentLevel = approvalStatus.currentLevel
    const nextLevel = approvalStatus.nextLevel || currentLevel + 1

    // Check if user can reject at current level
    const canReject = await canUserApproveAtLevel(userId, id, nextLevel)

    if (!canReject) {
      return NextResponse.json(
        {
          success: false,
          error: `You are not authorized to reject at level ${nextLevel}`,
        },
        { status: 403 }
      )
    }

    // Create approval history entry for rejection
    await prisma.approvalHistory.create({
      data: {
        approvalId: contract.approval.id,
        level: nextLevel,
        action: 'REJECTED',
        approverId: userId,
        approverName: userName || 'Unknown',
        comments,
        timestamp: new Date(),
      },
    })

    // Update approval status to REJECTED
    await prisma.approval.update({
      where: { id: contract.approval.id },
      data: {
        status: 'REJECTED',
        comments,
      },
    })

    // Update contract status back to DRAFT for revision
    await prisma.serviceContract.update({
      where: { id },
      data: {
        status: 'DRAFT',
        approvalId: null, // Clear approval reference
      },
    })

    // Reject the contract version
    await rejectContractVersion(id, contract.versionNumber, userId)

    // Notify informed parties about rejection
    const rule = await prisma.approvalRule.findUnique({
      where: { id: contract.approval.routingRuleId || '' },
      include: {
        routings: {
          where: { raciType: 'INFORMED' },
        },
      },
    })

    if (rule && rule.routings.length > 0) {
      const informedUsers = await prisma.user.findMany({
        where: {
          role: {
            in: rule.routings.map((r) => r.approverRole),
          },
          isActive: true,
        },
        select: { id: true },
      })

      await notifyApprovalLevelCompleted(
        'SERVICE_CONTRACT',
        id,
        informedUsers.map((u) => u.id),
        nextLevel,
        userName || 'Approver',
        'REJECTED'
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Contract rejected and returned to DRAFT status',
      rejection: {
        level: nextLevel,
        rejectedBy: userName || 'Approver',
        comments,
        status: 'DRAFT',
      },
    })
  } catch (error) {
    console.error('Error rejecting contract:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reject contract',
      },
      { status: 500 }
    )
  }
}
