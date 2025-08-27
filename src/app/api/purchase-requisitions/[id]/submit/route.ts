import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    const updatedPR = await prisma.$transaction([
      prisma.purchaseRequisition.update({
        where: { id },
        data: { status: 'SUBMITTED' }
      }),
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