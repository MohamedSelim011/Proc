import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/jwt';
import { notifyApprovalSubmitted } from '@/lib/notification-service';
import { initializeApprovalWorkflow } from '@/lib/approval-routing';

// POST /api/purchase-requisitions/[id]/submit - Submit draft PR for approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    const role = (user.role || '').toUpperCase();
    const canRequestByRole = ['REQUESTOR', 'DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(role);
    const isOwner = pr.requesterId === user.id || pr.requesterId === user.employeeId || pr.createdBy === user.id || pr.createdBy === user.employeeId;
    if (!canRequestByRole && !isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to request approval for this requisition' },
        { status: 403 }
      );
    }

    const updatedPR = await prisma.purchaseRequisition.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' }
    });

    // Notify informed parties (includes system admins); optional rule-based list
    const submitterName = user?.name ?? user?.email ?? 'User';
    let notifyUserIds: string[] = [];
    try {
      const plan = await initializeApprovalWorkflow({
        documentType: 'PR',
        amount: Number(pr.estimatedCost),
        departmentId: pr.departmentId ?? undefined,
        createdBy: pr.createdBy ?? '',
      });
      if (plan?.notifyUsers?.length) notifyUserIds = plan.notifyUsers;
    } catch {
      // No rule or routing error: still notify admins via empty list
    }
    await notifyApprovalSubmitted(
      'PR',
      id,
      notifyUserIds,
      submitterName,
      Number(pr.estimatedCost)
    );

    return NextResponse.json({
      message: 'Purchase requisition submitted successfully',
      requisition: updatedPR
    });

  } catch (error) {
    console.error('Error submitting purchase requisition:', error);
    return NextResponse.json(
      { error: 'Failed to submit purchase requisition' },
      { status: 500 }
    );
  }
} 
