import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'

/**
 * Submit Service Contract for Approval
 * POST /api/service-contracts/[id]/submit-approval
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
    const userId = user.id;
    const userName = user.name || user.email || 'Unknown User';

    // Get the contract
    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        vendor: true,
        servicePR: true,
      },
    })

    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Check if contract is in DRAFT status
    if (contract.status !== 'DRAFT') {
      return NextResponse.json(
        {
          success: false,
          error: `Contract must be in DRAFT status. Current status: ${contract.status}`,
        },
        { status: 400 }
      )
    }

    const levelOneRoles = ['SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_MANAGER'] as const
    const eligibleApprovers = await prisma.user.findMany({
      where: {
        role: { in: levelOneRoles },
        isActive: true,
      },
      select: { id: true },
    })
    const primaryApproverId = eligibleApprovers[0]?.id || userId

    const approval = await prisma.$transaction(async (tx) => {
      const created = await tx.approval.create({
        data: {
          documentType: 'SERVICE_CONTRACT',
          documentId: id,
          serviceContractId: id,
          approverId: primaryApproverId,
          status: 'PENDING',
          level: 1,
        },
      })

      await tx.approvalHistory.create({
        data: {
          approvalId: created.id,
          serviceContractId: id,
          contractVersionNumber: contract.versionNumber,
          level: 1,
          action: 'SUBMITTED',
          approverId: userId,
          approverName: userName || 'Unknown',
          comments: 'Submitted for approval',
          timestamp: new Date(),
        },
      })

      await tx.serviceContract.update({
        where: { id },
        data: {
          approvalId: created.id,
          status: 'PENDING_APPROVAL',
        },
      })

      return created
    })

    return NextResponse.json({
      success: true,
      message: 'Contract submitted for approval',
      approval: {
        id: approval.id,
        status: approval.status,
        level: approval.level,
        totalLevels: 2,
      },
      approvalPlan: {
        steps: [
          { level: 1, role: 'PROCUREMENT_MANAGER', isOptional: false },
          { level: 2, role: 'BILLING_ENGINEER', isOptional: false },
        ],
      },
    })
  } catch (error) {
    console.error('Error submitting contract for approval:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to submit contract for approval',
      },
      { status: 500 }
    )
  }
}
