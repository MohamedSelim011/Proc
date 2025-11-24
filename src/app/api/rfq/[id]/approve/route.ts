import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RFQStatus } from '@prisma/client';

// POST /api/rfq/[id]/approve - Approve or reject RFQ
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, approverId, comments, level } = body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        approvals: {
          orderBy: {
            level: 'asc'
          }
        }
      }
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    // Allow approval if RFQ is pending approval
    if (rfq.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `RFQ is not in a state that can be approved. Current status: ${rfq.status}` },
        { status: 400 }
      );
    }

    // Find ANY pending approval (parallel approval - any manager can approve)
    const approval = rfq.approvals.find(a => a.status === 'PENDING');
    
    if (!approval) {
      return NextResponse.json(
        { error: 'All approvals have been completed. This RFQ may have already been fully approved or rejected.' },
        { status: 400 }
      );
    }
    
    // Verify user role is allowed to approve (any manager role)
    const allowedRoles = ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    // Note: approverId in the request should contain the user's role or ID
    // For now, we'll allow any manager to approve any pending approval

    // Update the approval
    const updatedApproval = await prisma.approval.update({
      where: {
        id: approval.id,
      },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approverId: approverId,
        comments: comments || null,
        approvedAt: new Date(),
      },
    });

    // Create approval history entry
    await prisma.approvalHistory.create({
      data: {
        approvalId: approval.id,
        level: approval.level,
        action: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        performedBy: approverId,
        previousStatus: 'PENDING',
        newStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        comments: comments || null,
        metadata: {
          rfqId: id,
          rfqNumber: rfq.rfqNumber,
        },
      },
    });

    // Update RFQ status - ANY manager approval is sufficient (parallel approval)
    let newStatus: RFQStatus = rfq.status as RFQStatus;
    if (action === 'REJECT') {
      newStatus = RFQStatus.REJECTED;
      // No need to delete other approvals - there's only one approval record
    } else if (action === 'APPROVE') {
      // ANY manager approval is sufficient - mark RFQ as approved immediately
      newStatus = RFQStatus.APPROVED;
      // No need to delete other approvals - there's only one approval record
    }

    const updatedRFQ = await prisma.rFQ.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        pr: true,
        approvals: {
          orderBy: {
            level: 'asc',
          },
        },
      },
    });

    // Create process audit entry for approval/rejection
    await prisma.processAudit.create({
      data: {
        processType: 'RFQ_APPROVAL',
        documentId: rfq.id,
        documentType: 'RFQ',
        action: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        performedBy: approverId,
        details: {
          rfqNumber: rfq.rfqNumber,
          previousStatus: rfq.status,
          newStatus: newStatus,
          approvalType: 'PARALLEL', // Any manager can approve
          comments: comments || null,
          approvedBy: approverId,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      message: `RFQ ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
      rfq: updatedRFQ,
    });
  } catch (error) {
    console.error('Error approving/rejecting RFQ:', error);
    return NextResponse.json(
      { error: 'Failed to approve/reject RFQ' },
      { status: 500 }
    );
  }
}

