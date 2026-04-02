import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { canUserApproveAtLevel, getApprovalStatus } from '@/lib/approval-routing'
import { createContractVersion, rejectContractVersion } from '@/lib/contract-version-service'
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

    if (!comments || String(comments).trim() === '') {
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

    const currentVersionNumber = contract.versionNumber

    await prisma.$transaction(async (tx) => {
      await tx.approvalHistory.create({
        data: {
          approvalId: contract.approval.id,
          serviceContractId: id,
          contractVersionNumber: currentVersionNumber,
          level: nextLevel,
          action: 'REJECTED',
          approverId: userId,
          approverName: userName || 'Unknown',
          comments,
          timestamp: new Date(),
        },
      })

      await tx.approval.update({
        where: { id: contract.approval.id },
        data: {
          status: 'REJECTED',
          comments,
        },
      })

      await tx.serviceContract.update({
        where: { id },
        data: {
          status: 'DRAFT',
          approvalId: null,
        },
      })
    })

    // Mark the current version as rejected (no new version here)
    await rejectContractVersion(id, currentVersionNumber, userId)

    // Create a new version with the rejection comment as change reason
    await createContractVersion({
      contractId: id,
      changeReason: comments,
      changeDescription: `Rejected at approval level ${nextLevel}`,
      createdBy: userId,
      createdByName: userName || 'Unknown',
    })

    return NextResponse.json({
      success: true,
      message: 'Contract rejected',
      rejection: {
        level: nextLevel,
        rejectedBy: userName || 'Approver',
        comments,
        status: 'REJECTED',
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
