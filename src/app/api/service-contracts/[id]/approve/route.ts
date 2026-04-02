import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { canUserApproveAtLevel, getApprovalStatus, getEligibleApproversForLevel } from '@/lib/approval-routing'
import { approveContractVersion } from '@/lib/contract-version-service'
import { requireAuth } from '@/lib/jwt'

/**
 * Approve Service Contract
 * POST /api/service-contracts/[id]/approve
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
        { success: false, error: 'Comments are required when approving a contract' },
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
        vendor: true,
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

    const currentApprovalLevel = contract.approval.level

    // Check if already fully approved
    const approvalStatus = await getApprovalStatus(id)
    if (approvalStatus.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Contract is already fully approved' },
        { status: 400 }
      )
    }

    if (approvalStatus.status === 'REJECTED') {
      return NextResponse.json(
        { success: false, error: 'Contract has been rejected' },
        { status: 400 }
      )
    }

    const canApprove = await canUserApproveAtLevel(userId, id, currentApprovalLevel, {
      approvalId: contract.approval.id,
    })

    if (!canApprove) {
      const eligible = await getEligibleApproversForLevel(id, currentApprovalLevel)
      const currentUserRole = await prisma.user
        .findUnique({ where: { id: userId }, select: { role: true } })
        .then((u) => u?.role ?? null)
      return NextResponse.json(
        {
          success: false,
          error: `You are not authorized to approve at level ${currentApprovalLevel}`,
          requiredRole: eligible?.requiredRole ?? null,
          yourRole: currentUserRole,
          eligibleApprovers: eligible?.eligibleApprovers ?? [],
        },
        { status: 403 }
      )
    }

    await prisma.approvalHistory.create({
      data: {
        approvalId: contract.approval.id,
        serviceContractId: id,
        contractVersionNumber: contract.versionNumber,
        level: currentApprovalLevel,
        action: 'APPROVED',
        approverId: userId,
        approverName: userName || 'Unknown',
        comments,
        timestamp: new Date(),
      },
    })

    const totalLevels = 2
    const isFinalApproval = currentApprovalLevel >= totalLevels
    const nextApprovalLevel = currentApprovalLevel + 1

    if (isFinalApproval) {
      await prisma.$transaction(async (tx) => {
        await tx.approval.update({
          where: { id: contract.approval.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
          },
        })

        await tx.serviceContract.update({
          where: { id },
          data: {
            status: 'APPROVED',
          },
        })
      })

      // Approve the contract version
      await approveContractVersion(id, contract.versionNumber, userId)

      return NextResponse.json({
        success: true,
        message: 'Contract fully approved',
        approval: {
          status: 'APPROVED',
          level: currentApprovalLevel,
          isFinalApproval: true,
        },
      })
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.approval.update({
          where: { id: contract.approval.id },
          data: {
            level: nextApprovalLevel,
          },
        })

        await tx.serviceContract.update({
          where: { id },
          data: {
            status: 'PENDING_APPROVAL',
          },
        })
      })

      return NextResponse.json({
        success: true,
        message: `Approved at level ${currentApprovalLevel}. Awaiting approval at level ${nextApprovalLevel}`,
        approval: {
          status: 'PENDING',
          level: nextApprovalLevel,
          nextLevel: nextApprovalLevel < totalLevels ? nextApprovalLevel + 1 : null,
          isFinalApproval: false,
        },
      })
    }
  } catch (error) {
    console.error('Error approving contract:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to approve contract',
      },
      { status: 500 }
    )
  }
}
