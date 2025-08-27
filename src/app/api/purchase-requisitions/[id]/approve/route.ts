import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/purchase-requisitions/[id]/approve - Approve or reject PR
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, approverId, comments, level } = body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    const pr = await prisma.purchaseRequisition.findUnique({
      where: { id: params.id },
      include: {
        approvals: {
          where: {
            level: level || 1,
            status: 'PENDING'
          }
        }
      }
    });

    if (!pr) {
      return NextResponse.json(
        { error: 'Purchase requisition not found' },
        { status: 404 }
      );
    }

    if (pr.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'PR is not in submitted status' },
        { status: 400 }
      );
    }

    const approval = pr.approvals[0];
    if (!approval) {
      return NextResponse.json(
        { error: 'No pending approval found for this level' },
        { status: 400 }
      );
    }

    // Update approval record
    await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        comments,
        approvedAt: new Date()
      }
    });

    if (action === 'REJECT') {
      // Reject the PR
      await prisma.purchaseRequisition.update({
        where: { id: params.id },
        data: { status: 'REJECTED' }
      });

      return NextResponse.json({ 
        message: 'Purchase requisition rejected',
        status: 'REJECTED' 
      });
    }

    // Check if more approvals needed
    const nextLevel = (level || 1) + 1;
    const needsMoreApproval = pr.estimatedCost > 50000 && nextLevel <= 2; // Example business rule

    if (needsMoreApproval) {
      // Create next level approval
      await prisma.approval.create({
        data: {
          documentType: 'PURCHASE_REQUISITION',
          documentId: params.id,
          prId: params.id,
          approverId: body.nextApproverId || 'director001',
          status: 'PENDING',
          level: nextLevel
        }
      });

      return NextResponse.json({ 
        message: 'Approved at current level, escalated to next level',
        nextLevel 
      });
    }

    // Final approval - update PR status
    await prisma.purchaseRequisition.update({
      where: { id: params.id },
      data: { status: 'APPROVED' }
    });

    return NextResponse.json({ 
      message: 'Purchase requisition fully approved',
      status: 'APPROVED' 
    });
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}