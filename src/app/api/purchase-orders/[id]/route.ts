import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/purchase-orders/[id] - Get PO by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: {
          include: {
            categories: {
              include: {
                category: true
              }
            }
          }
        },
        pr: {
          include: {
            items: {
              include: {
                item: true
              }
            }
          }
        },
        items: {
          include: {
            item: {
              include: {
                category: true
              }
            }
          }
        },
        goodsReceipts: {
          include: {
            items: {
              include: {
                item: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        invoices: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        amendments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Calculate delivery statistics
    const deliveryStats = {
      totalOrdered: order.items.reduce((sum, item) => sum + item.quantity, 0),
      totalReceived: order.goodsReceipts.reduce((sum, gr) => 
        sum + gr.items.reduce((itemSum, grItem) => itemSum + grItem.acceptedQuantity, 0), 0
      ),
      totalRejected: order.goodsReceipts.reduce((sum, gr) => 
        sum + gr.items.reduce((itemSum, grItem) => itemSum + grItem.rejectedQuantity, 0), 0
      ),
      totalPending: 0
    };

    deliveryStats.totalPending = deliveryStats.totalOrdered - deliveryStats.totalReceived - deliveryStats.totalRejected;

    // Transform goods receipts to match frontend interface
    const transformedGoodsReceipts = order.goodsReceipts.map(gr => {
      const totalReceived = gr.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
      const totalAccepted = gr.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
      const totalRejected = gr.items.reduce((sum, item) => sum + item.rejectedQuantity, 0);
      
      return {
        id: gr.id,
        grnNumber: gr.grNumber, // Map grNumber to grnNumber for frontend
        receiptDate: gr.receivedDate.toISOString(), // Map receivedDate to receiptDate
        status: gr.status,
        totalReceived: totalAccepted, // Use accepted quantity as "received"
        totalRejected: totalRejected
      };
    });

    // Calculate payment statistics
    const paymentStats = {
      totalInvoiced: order.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      totalPaid: order.invoices
        .filter(inv => inv.paymentStatus === 'PAID')
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    };

    return NextResponse.json({
      ...order,
      goodsReceipts: transformedGoodsReceipts,
      deliveryStats: deliveryStats,
      statistics: {
        delivery: deliveryStats,
        payment: paymentStats
      }
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    );
  }
}

// PUT /api/purchase-orders/[id] - Update PO
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if PO can be edited
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id }
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    if (!['DRAFT', 'APPROVED'].includes(existingPO.status)) {
      return NextResponse.json(
        { error: 'Cannot edit PO in current status' },
        { status: 400 }
      );
    }

    // Update PO and items in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Delete existing items if items are being updated
      if (body.items) {
        await tx.pOItem.deleteMany({
          where: { poId: id }
        });
      }

      // Calculate new total amount
      const totalAmount = body.items 
        ? body.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
        : existingPO.totalAmount;

      // Update PO
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          vendorId: body.vendorId || existingPO.vendorId,
          deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : existingPO.deliveryDate,
          deliveryAddress: body.deliveryAddress || existingPO.deliveryAddress,
          paymentTerms: body.paymentTerms || existingPO.paymentTerms,
          totalAmount: totalAmount,
          currency: body.currency || existingPO.currency,
          ...(body.items && {
            items: {
              create: body.items.map((item: any) => ({
                itemId: item.itemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
                deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null
              }))
            }
          })
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

      return updated;
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase order' },
      { status: 500 }
    );
  }
}

// DELETE /api/purchase-orders/[id] - Cancel PO
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            goodsReceipts: true,
            invoices: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Check if PO can be cancelled
    if (order._count.goodsReceipts > 0 || order._count.invoices > 0) {
      return NextResponse.json(
        { error: 'Cannot cancel PO with existing receipts or invoices. Use amendment instead.' },
        { status: 400 }
      );
    }

    if (!['DRAFT', 'APPROVED', 'SENT'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel PO in current status' },
        { status: 400 }
      );
    }

    // Update status to CANCELLED instead of deleting
    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({ 
      message: 'Purchase order cancelled successfully',
      status: 'CANCELLED'
    });
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel purchase order' },
      { status: 500 }
    );
  }
}
