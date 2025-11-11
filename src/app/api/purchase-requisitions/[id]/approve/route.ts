import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// POST /api/purchase-requisitions/[id]/approve - Approve or reject PR
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

    const pr = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        approvals: {
          orderBy: {
            level: 'asc'
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

    // Allow approval if PR is submitted
    if (pr.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `PR is not in a state that can be approved. Current status: ${pr.status}` },
        { status: 400 }
      );
    }

    // Find the next pending approval
    const currentLevel = level || 1;
    console.log('Looking for approval at level:', currentLevel);
    console.log('Available approvals:', pr.approvals.map(a => ({ level: a.level, status: a.status, id: a.id })));
    
    const approval = pr.approvals.find(a => a.level === currentLevel && a.status === 'PENDING');
    
    if (!approval) {
      // Check if there are any pending approvals at any level
      const pendingApproval = pr.approvals.find(a => a.status === 'PENDING');
      if (!pendingApproval) {
        // If no pending approvals, check if all approvals are completed
        const allApprovalsCompleted = pr.approvals.every(a => a.status === 'APPROVED');
        if (allApprovalsCompleted) {
          // All approvals are done, update PR status to APPROVED
          await prisma.purchaseRequisition.update({
            where: { id },
            data: { status: 'APPROVED' }
          });
          
          return NextResponse.json({ 
            message: 'Purchase requisition already fully approved',
            status: 'APPROVED' 
          });
        }
        
        return NextResponse.json(
          { error: 'No pending approvals found for this PR' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `No pending approval found for level ${currentLevel}. Next pending approval is at level ${pendingApproval.level}` },
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
        where: { id },
        data: { status: 'REJECTED' }
      });

      return NextResponse.json({ 
        message: 'Purchase requisition rejected',
        status: 'REJECTED' 
      });
    }

    // Check if there are more pending approvals
    const remainingPendingApprovals = pr.approvals.filter(a => a.status === 'PENDING' && a.level !== currentLevel);
    
    if (remainingPendingApprovals.length > 0) {
      // More approvals needed
      const nextLevel = Math.min(...remainingPendingApprovals.map(a => a.level));
      return NextResponse.json({ 
        message: `Approved at level ${currentLevel}. Pending approval at level ${nextLevel}`,
        nextLevel,
        status: 'SUBMITTED'
      });
    }

    // All approvals completed - update PR status to APPROVED
    await prisma.purchaseRequisition.update({
      where: { id },
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