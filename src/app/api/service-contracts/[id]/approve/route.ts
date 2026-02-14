import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { canUserApproveAtLevel, getApprovalStatus, getEligibleApproversForLevel } from '@/lib/approval-routing'
import { approveContractVersion } from '@/lib/contract-version-service'
import { createVendorResponseRequest } from '@/lib/vendor-response-service'
import {
  notifyApprovalLevelCompleted,
  notifyApprovalComplete,
} from '@/lib/notification-service'
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

    // Normalize approval.level from history so it never gets out of sync (e.g. after manual DB edit or REQUEST_EDIT)
    const approvedLevels = contract.approval.approvalHistory
      .filter((h) => h.action === 'APPROVED')
      .map((h) => h.level)
    const highestApprovedLevel = approvedLevels.length > 0 ? Math.max(...approvedLevels) : 0
    const correctLevel = highestApprovedLevel + 1

    if (contract.approval.level !== correctLevel) {
      await prisma.approval.update({
        where: { id: contract.approval.id },
        data: { level: correctLevel },
      })
    }

    const currentApprovalLevel = correctLevel

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

    // Create approval history entry for the level being approved
    await prisma.approvalHistory.create({
      data: {
        approvalId: contract.approval.id,
        level: currentApprovalLevel,
        action: 'APPROVED',
        approverId: userId,
        approverName: userName || 'Unknown',
        comments,
        timestamp: new Date(),
      },
    })

    // Determine total levels from the approval rule
    const rule = await prisma.approvalRule.findUnique({
      where: { id: contract.approval.routingRuleId || '' },
      include: {
        routings: {
          where: {
            raciType: 'ACCOUNTABLE',
          },
        },
      },
    })

    const totalLevels = rule?.routings.length || 0
    const isFinalApproval = currentApprovalLevel >= totalLevels
    const nextApprovalLevel = currentApprovalLevel + 1

    if (isFinalApproval) {
      // Final approval - update approval status
      await prisma.approval.update({
        where: { id: contract.approval.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      })

      // Update contract status to APPROVED (all levels completed)
      await prisma.serviceContract.update({
        where: { id },
        data: {
          status: 'APPROVED',
        },
      })

      // Approve the contract version
      await approveContractVersion(id, contract.versionNumber, userId)

      // Send contract to vendor for acceptance
      const vendorResponse = await createVendorResponseRequest({
        contractId: id,
        versionNumber: contract.versionNumber,
        vendorEmail: contract.vendor.email,
        vendorName: contract.vendor.nameEn || contract.vendor.nameAr,
        expiryDays: 30,
      })

      // Notify informed parties
      if (rule && rule.routings.length > 0) {
        // Get informed users
        const informedUsers = await prisma.user.findMany({
          where: {
            role: {
              in: rule.routings.map((r) => r.approverRole),
            },
            isActive: true,
          },
          select: { id: true },
        })

        await notifyApprovalComplete(
          'SERVICE_CONTRACT',
          id,
          informedUsers.map((u) => u.id),
          userName || 'Approver'
        )
      }

      return NextResponse.json({
        success: true,
        message:
          'Contract fully approved and sent to vendor for acceptance',
        approval: {
          status: 'APPROVED',
          level: currentApprovalLevel,
          isFinalApproval: true,
          vendorResponseSent: true,
          vendorResponseExpiresAt: vendorResponse.expiresAt,
        },
      })
    } else {
      // Intermediate approval - move to next level
      await prisma.approval.update({
        where: { id: contract.approval.id },
        data: {
          level: nextApprovalLevel,
        },
      })

      // Notify informed parties about level completion
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
          currentApprovalLevel,
          userName || 'Approver',
          'APPROVED'
        )
      }

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
