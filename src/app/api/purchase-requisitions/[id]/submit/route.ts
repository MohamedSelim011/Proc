import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// POST /api/purchase-requisitions/[id]/submit - Submit draft PR for approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { firstApproverId } = body;

    // Check if PR exists and is in DRAFT status
    const pr = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!pr) {
      return NextResponse.json(
        { error: 'Purchase requisition not found' },
        { status: 404 }
      );
    }

    if (pr.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft requisitions can be submitted' },
        { status: 400 }
      );
    }

    // Submit the PR for approval
    const approvals = [
      // Level 1 approval (always required)
      prisma.approval.create({
        data: {
          documentType: 'PURCHASE_REQUISITION',
          documentId: id,
          prId: id,
          approverId: firstApproverId || 'manager001',
          status: 'PENDING',
          level: 1
        }
      })
    ];

    // Level 2 approval (required for high-value PRs)
    if (Number(pr.estimatedCost) > 50000) {
      approvals.push(
        prisma.approval.create({
          data: {
            documentType: 'PURCHASE_REQUISITION',
            documentId: id,
            prId: id,
            approverId: 'director001',
            status: 'PENDING',
            level: 2
          }
        })
      );
    }

    const updatedPR = await prisma.$transaction([
      prisma.purchaseRequisition.update({
        where: { id },
        data: { status: 'PENDING_APPROVAL' }
      }),
      ...approvals
    ]);

    return NextResponse.json({
      message: 'Purchase requisition submitted successfully',
      requisition: updatedPR[0]
    });

  } catch (error) {
    console.error('Error submitting purchase requisition:', error);
    return NextResponse.json(
      { error: 'Failed to submit purchase requisition' },
      { status: 500 }
    );
  }
} 