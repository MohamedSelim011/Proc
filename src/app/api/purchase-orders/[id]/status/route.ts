import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/purchase-orders/[id]/status - Update PO status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, comments, updatedBy } = body;

    // Validate status
    const validStatuses = ['DRAFT', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        vendor: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    const currentStatus = order.status;
    const validTransitions: { [key: string]: string[] } = {
      'DRAFT': ['APPROVED', 'CANCELLED'],
      'APPROVED': ['SENT', 'CANCELLED'],
      'SENT': ['ACKNOWLEDGED', 'CANCELLED'],
      'ACKNOWLEDGED': ['PARTIAL', 'COMPLETED', 'CANCELLED'],
      'PARTIAL': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [], // Final state
      'CANCELLED': [] // Final state
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // Update PO status
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        vendor: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    // Log status change (you might want to add a status history table)
    console.log(`PO ${order.poNumber} status changed from ${currentStatus} to ${status} by ${updatedBy || 'system'}`);

    return NextResponse.json({
      ...updatedOrder,
      statusChange: {
        from: currentStatus,
        to: status,
        timestamp: new Date(),
        updatedBy: updatedBy || 'system',
        comments
      }
    });
  } catch (error) {
    console.error('Error updating PO status:', error);
    return NextResponse.json(
      { error: 'Failed to update PO status' },
      { status: 500 }
    );
  }
}
