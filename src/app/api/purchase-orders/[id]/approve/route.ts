import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { POStatus } from '@prisma/client';
import { notifySoul } from '@/lib/soul-notifier';

// POST /api/purchase-orders/[id]/approve - Approve or reject PO
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

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        approvals: {
          orderBy: {
            level: 'asc'
          }
        }
      }
    });

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Allow approval if PO is pending approval
    if (po.status !== 'PENDING_APPROVAL' && po.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `PO is not in a state that can be approved. Current status: ${po.status}` },
        { status: 400 }
      );
    }

    // Find the next pending approval
    const currentLevel = level || 1;
    const approval = po.approvals.find(a => a.level === currentLevel && a.status === 'PENDING');
    
    if (!approval) {
      const anyPending = po.approvals.find(a => a.status === 'PENDING');
      
      if (!anyPending) {
        return NextResponse.json(
          { error: 'All approvals have been completed. This PO may have already been fully approved or rejected.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `No pending approval found at level ${currentLevel}. Please refresh and try again.` },
        { status: 400 }
      );
    }

    // Update the approval
    const updatedApproval = await prisma.approval.update({
      where: {
        id: approval.id,
      },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approverId: approverId,
        comments: comments || null, // Save comments (can be empty string)
        approvedAt: new Date(), // Use approvedAt instead of actionDate
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
          poId: id,
          poNumber: po.poNumber,
        },
      },
    });

    // Check if there are more pending approvals
    const remainingApprovals = po.approvals.filter(
      a => a.status === 'PENDING' && a.id !== approval.id
    );

    // Update PO status
    let newStatus: POStatus = po.status as POStatus;
    if (action === 'REJECT') {
      newStatus = POStatus.REJECTED;
      
      // Mark all pending approvals as cancelled
      await prisma.approval.updateMany({
        where: {
          purchaseOrderId: id,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED'
        }
      });
    } else if (remainingApprovals.length === 0) {
      // All approvals completed, mark as approved
      newStatus = POStatus.APPROVED;
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        items: true,
        vendor: true,
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
        processType: 'PO_APPROVAL',
        documentId: po.id,
        documentType: 'PO',
        action: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        performedBy: approverId,
        details: {
          poNumber: po.poNumber,
          previousStatus: po.status,
          newStatus: newStatus,
          approvalLevel: currentLevel,
          comments: comments || null,
          allApprovalsComplete: remainingApprovals.length === 0,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    void notifySoul(action === 'APPROVE' ? 'purchase_order.approved' : 'purchase_order.rejected', {
      id: updatedPO.id,
      poNumber: updatedPO.poNumber,
      status: newStatus,
      approverId: approverId || null,
      approvalLevel: currentLevel,
      comments: comments || null,
      allApprovalsComplete: remainingApprovals.length === 0,
      vendorId: updatedPO.vendorId,
      vendorName: updatedPO.vendor?.nameEn || updatedPO.vendor?.nameAr || null,
      totalAmount: Number(updatedPO.totalAmount || 0),
      currency: updatedPO.currency,
    });

    return NextResponse.json({
      message: `Purchase order ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
      po: updatedPO,
    });
  } catch (error) {
    console.error('Error approving/rejecting purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to approve/reject purchase order' },
      { status: 500 }
    );
  }
}

