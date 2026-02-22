import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/jwt';


// POST /api/purchase-requisitions/[id]/approve - Approve or reject PR
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;
    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const approverRole = (user.role || '').toUpperCase();
    const canApprove = ['PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(approverRole);
    if (!canApprove) {
      return NextResponse.json(
        { error: 'Only Procurement Manager or Admin can approve requisitions' },
        { status: 403 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    const pr = await prisma.purchaseRequisition.findUnique({
      where: { id }
    });

    if (!pr) {
      return NextResponse.json(
        { error: 'Purchase requisition not found' },
        { status: 404 }
      );
    }

    // Allow approval if PR is pending approval
    if (pr.status !== 'PENDING_APPROVAL' && pr.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `PR is not in a state that can be approved. Current status: ${pr.status}` },
        { status: 400 }
      );
    }

    const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await prisma.purchaseRequisition.update({
      where: { id },
      data: { status: nextStatus }
    });

    return NextResponse.json({ 
      message: action === 'APPROVE' ? 'Purchase requisition approved' : 'Purchase requisition rejected',
      status: nextStatus
    });
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}
