import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { comments } = body

    // Find the approval
    const approval = await prisma.approval.findUnique({
      where: { id },
    })

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    // Verify the user is the approver
    if (approval.approverId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify it's pending
    if (approval.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Approval is not pending' },
        { status: 400 }
      )
    }

    // Update approval
    await prisma.approval.update({
      where: { id },
      data: {
        status: 'APPROVED',
        comments: comments || null,
        approvedAt: new Date(),
      },
    })

    // Create approval history entry
    await prisma.approvalHistory.create({
      data: {
        approvalId: id,
        level: approval.level,
        action: 'APPROVED',
        performedBy: user.id,
        previousStatus: 'PENDING',
        newStatus: 'APPROVED',
        comments: comments || null,
      },
    })

    return NextResponse.json({ success: true, message: 'Approval approved successfully' })
  } catch (error) {
    console.error('Error approving:', error)
    return NextResponse.json(
      { error: 'Failed to approve' },
      { status: 500 }
    )
  }
}
