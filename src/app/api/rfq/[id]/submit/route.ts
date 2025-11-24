import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RFQStatus } from '@prisma/client';

// POST /api/rfq/[id]/submit - Submit RFQ for approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    
    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        pr: true
      }
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    if (rfq.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft RFQs can be submitted for approval' },
        { status: 400 }
      );
    }

    // Get user ID who is submitting (from request body or RFQ creator)
    const submittedBy = body.submittedBy || rfq.createdBy || 'SYSTEM';

    // Create a single approval record that any eligible manager can approve
    // Eligible managers: Department Manager, Procurement Manager, Finance Manager
    // Only ONE approval record is needed - any of these managers can approve it
    const approval = await prisma.approval.create({
      data: {
        documentType: 'RFQ',
        documentId: rfq.id,
        rfqId: rfq.id,
        approverId: 'MANAGER', // Placeholder - any manager role can approve
        level: 1, // Single level - any manager can approve
        status: 'PENDING',
      },
    });

    // Update RFQ status
    const updatedRFQ = await prisma.rFQ.update({
      where: { id },
      data: {
        status: RFQStatus.PENDING_APPROVAL,
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

    // Create process audit entry for submission
    await prisma.processAudit.create({
      data: {
        processType: 'RFQ_SUBMISSION',
        documentId: rfq.id,
        documentType: 'RFQ',
        action: 'SUBMITTED',
        performedBy: submittedBy,
        details: {
          rfqNumber: rfq.rfqNumber,
          previousStatus: 'DRAFT',
          newStatus: 'PENDING_APPROVAL',
          approvalType: 'SINGLE_MANAGER', // Any eligible manager can approve
          eligibleRoles: ['DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER'],
          estimatedCost: rfq.pr?.estimatedCost ? Number(rfq.pr.estimatedCost) : null,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      message: 'RFQ submitted for approval successfully',
      rfq: updatedRFQ,
      approval,
    });
  } catch (error) {
    console.error('Error submitting RFQ:', error);
    return NextResponse.json(
      { error: 'Failed to submit RFQ for approval' },
      { status: 500 }
    );
  }
}

