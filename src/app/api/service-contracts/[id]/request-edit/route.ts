import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { canUserApproveAtLevel, getApprovalStatus } from '@/lib/approval-routing'
import { requireAuth } from '@/lib/jwt'
import { sendEmail } from '@/lib/email-service'

/**
 * Request Edit on Service Contract
 * POST /api/service-contracts/[id]/request-edit
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

    if (!comments || comments.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Comments are required when requesting edits' },
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
        { success: false, error: 'Cannot request edit on an approved contract' },
        { status: 400 }
      )
    }

    const currentLevel = approvalStatus.currentLevel
    const nextLevel = approvalStatus.nextLevel || currentLevel + 1

    // Check if user can request edit at current level (same as approval permission)
    const canRequestEdit = await canUserApproveAtLevel(userId, id, nextLevel)

    if (!canRequestEdit) {
      return NextResponse.json(
        {
          success: false,
          error: `You are not authorized to request edits at level ${nextLevel}`,
        },
        { status: 403 }
      )
    }

    // Create approval history entry for edit request
    await prisma.approvalHistory.create({
      data: {
        approvalId: contract.approval.id,
        level: nextLevel,
        action: 'REQUEST_EDIT',
        approverId: userId,
        approverName: userName || 'Unknown',
        comments,
        timestamp: new Date(),
      },
    })

    // Update approval status to indicate edit requested
    await prisma.approval.update({
      where: { id: contract.approval.id },
      data: {
        status: 'PENDING',
        comments: `Edit requested by ${userName}: ${comments}`,
      },
    })

    // Update contract status back to DRAFT and clear approval
    await prisma.serviceContract.update({
      where: { id },
      data: {
        status: 'DRAFT',
        approvalId: null, // Clear approval for resubmission
      },
    })

    // Send notification to contract creator
    if (contract.createdBy) {
      try {
        // Fetch the creator user
        const creator = await prisma.user.findUnique({
          where: { id: contract.createdBy },
          select: { email: true, name: true },
        })

        if (creator?.email) {
          await sendEmail({
            to: creator.email,
            subject: `Edit Requested: ${contract.contractNumber}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #FF5722;">Edit Requested on Contract</h2>
                <p>Hello ${creator.name || 'User'},</p>
                <p><strong>${userName}</strong> has requested edits on your contract:</p>
              
              <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Contract Number:</strong> ${contract.contractNumber}</p>
                <p><strong>Reviewer Level:</strong> ${nextLevel} of 2</p>
                <p><strong>Feedback:</strong></p>
                <p style="background: white; padding: 10px; border-left: 4px solid #FF5722; margin-top: 10px;">
                  ${comments}
                </p>
              </div>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Review the feedback above</li>
                <li>Edit the contract to address the requested changes</li>
                <li>Save your changes (a new version will be created)</li>
                <li>Re-submit for approval when ready</li>
              </ol>

              <p style="margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/procurement/services/contracts/${id}/edit" 
                   style="background: #FF5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Edit Contract
                </a>
              </p>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px;">
                This is an automated notification from WUJHA HR Procurement System.<br>
                Please do not reply to this email.
              </p>
            </div>
          `,
          })
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError)
        // Don't fail the entire operation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Edit requested successfully. Contract returned to DRAFT status and creator has been notified.`,
      editRequest: {
        level: nextLevel,
        requestedBy: userName || 'Approver',
        comments,
        status: 'DRAFT',
      },
    })
  } catch (error) {
    console.error('Error requesting contract edit:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to request contract edit',
      },
      { status: 500 }
    )
  }
}
