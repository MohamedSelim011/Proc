import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { POStatus } from '@prisma/client';

// POST /api/purchase-orders/[id]/submit - Submit PO for approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        vendor: true
      }
    });

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    if (po.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft purchase orders can be submitted for approval' },
        { status: 400 }
      );
    }

    // Get user ID who is submitting (from request body or PO creator)
    const submittedBy = body.submittedBy || po.createdBy || 'SYSTEM';

    // Create approval records based on PO amount
    const amount = Number(po.totalAmount);
    const approvalLevels: { level: number; role: string }[] = [];

    // Simple approval matrix based on amount
    if (amount > 0) {
      // Level 1: Department Manager (always required)
      approvalLevels.push({ level: 1, role: 'DEPARTMENT_MANAGER' });
    }
    
    if (amount >= 5000) {
      // Level 2: Procurement Manager (for amounts >= 5000)
      approvalLevels.push({ level: 2, role: 'PROCUREMENT_MANAGER' });
    }
    
    if (amount >= 10000) {
      // Level 3: Finance Manager (for amounts >= 10000)
      approvalLevels.push({ level: 3, role: 'FINANCE_MANAGER' });
    }

    // Create approval records
    const approvals = await Promise.all(
      approvalLevels.map(async ({ level, role }) => {
        return prisma.approval.create({
          data: {
            documentType: 'PO',
            documentId: po.id,
            purchaseOrderId: po.id,
            approverId: role, // Using role as placeholder for now
            level,
            status: 'PENDING',
          },
        });
      })
    );

    // Update PO status
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: POStatus.PENDING_APPROVAL,
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

    // Create process audit entry for submission
    await prisma.processAudit.create({
      data: {
        processType: 'PO_SUBMISSION',
        documentId: po.id,
        documentType: 'PO',
        action: 'SUBMITTED',
        performedBy: submittedBy,
        details: {
          poNumber: po.poNumber,
          previousStatus: 'DRAFT',
          newStatus: 'PENDING_APPROVAL',
          approvalLevels: approvalLevels.length,
          totalAmount: amount,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      message: 'Purchase order submitted for approval successfully',
      po: updatedPO,
      approvals,
    });
  } catch (error) {
    console.error('Error submitting purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to submit purchase order for approval' },
      { status: 500 }
    );
  }
}

