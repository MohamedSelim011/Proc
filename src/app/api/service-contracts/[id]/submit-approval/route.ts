import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { initializeApprovalWorkflow } from '@/lib/approval-routing'
import { createContractVersion } from '@/lib/contract-version-service'
import { notifyApprovalSubmitted } from '@/lib/notification-service'
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
        pr: true,
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

    // Create initial version snapshot
    await createContractVersion({
      contractId: id,
      changeReason: 'Initial submission for approval',
      changeDescription: 'Contract submitted for approval workflow',
      createdBy: userId,
      createdByName: userName,
    })

    // Initialize approval workflow
    const approvalPlan = await initializeApprovalWorkflow({
      documentType: 'SERVICE_CONTRACT',
      amount: Number(contract.totalValue),
      createdBy: userId,
    })

    if (!approvalPlan) {
      return NextResponse.json(
        {
          success: false,
          error: 'No approval workflow configured for service contracts',
        },
        { status: 400 }
      )
    }

    // Create approval record
    const approval = await prisma.approval.create({
      data: {
        documentType: 'SERVICE_CONTRACT',
        documentId: id,
        serviceContractId: id,
        approverId: approvalPlan.steps[0].eligibleApprovers[0] || userId,
        status: 'PENDING',
        level: 1,
        routingRuleId: approvalPlan.ruleId,
      },
    })

    // Update contract with approval ID and status
    await prisma.serviceContract.update({
      where: { id },
      data: {
        approvalId: approval.id,
        status: 'PENDING_APPROVAL', // Move to PENDING_APPROVAL status (awaiting approvers)
      },
    })

    // Notify informed parties
    if (approvalPlan.notifyUsers.length > 0) {
      await notifyApprovalSubmitted(
        'SERVICE_CONTRACT',
        id,
        approvalPlan.notifyUsers,
        userName || 'User',
        Number(contract.totalValue)
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Contract submitted for approval',
      approval: {
        id: approval.id,
        status: approval.status,
        level: approval.level,
        totalLevels: approvalPlan.totalLevels,
        estimatedDuration: `${approvalPlan.estimatedDuration} hours`,
      },
      approvalPlan: {
        steps: approvalPlan.steps.map((step) => ({
          level: step.level,
          role: step.approverRole,
          isOptional: step.isOptional,
        })),
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
