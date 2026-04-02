import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';

const toQuantity = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
};


// GET /api/goods-receipts/[id] - Get goods receipt by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        po: {
          include: {
            vendor: true,
            items: {
              include: {
                item: {
                  include: {
                    category: true
                  }
                }
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
        }
      }
    });

    if (!receipt) {
      return NextResponse.json(
        { error: 'Goods receipt not found' },
        { status: 404 }
      );
    }

    // Calculate receipt statistics
    const stats = {
      totalOrdered: receipt.items.reduce((sum, item) => sum + item.orderedQuantity, 0),
      totalReceived: receipt.items.reduce((sum, item) => sum + item.receivedQuantity, 0),
      totalAccepted: receipt.items.reduce((sum, item) => sum + item.acceptedQuantity, 0),
      totalRejected: receipt.items.reduce((sum, item) => sum + item.rejectedQuantity, 0),
      receiptPercentage: 0,
      acceptancePercentage: 0
    };

    if (stats.totalOrdered > 0) {
      stats.receiptPercentage = (stats.totalReceived / stats.totalOrdered) * 100;
      stats.acceptancePercentage = (stats.totalAccepted / stats.totalOrdered) * 100;
    }

    // Calculate value statistics
    const valueStats = {
      orderedValue: 0,
      receivedValue: 0,
      acceptedValue: 0,
      rejectedValue: 0
    };

    if (receipt.po?.items) {
      receipt.items.forEach(grItem => {
        const poItem = receipt.po?.items.find(pi => pi.itemId === grItem.itemId);
        if (poItem) {
          const unitPrice = Number(poItem.unitPrice);
          valueStats.orderedValue += grItem.orderedQuantity * unitPrice;
          valueStats.receivedValue += grItem.receivedQuantity * unitPrice;
          valueStats.acceptedValue += grItem.acceptedQuantity * unitPrice;
          valueStats.rejectedValue += grItem.rejectedQuantity * unitPrice;
        }
      });
    }

    return NextResponse.json({
      ...receipt,
      statistics: {
        quantity: stats,
        value: valueStats
      }
    });
  } catch (error) {
    console.error('Error fetching goods receipt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goods receipt' },
      { status: 500 }
    );
  }
}

// PUT /api/goods-receipts/[id] - Update goods receipt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (isExternalIntegrationEnabled('goodsReceipts')) {
      return NextResponse.json(
        { error: 'Goods receipts integration is enabled. Manual update is disabled.' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    const existingGR = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!existingGR) {
      return NextResponse.json(
        { error: 'Goods receipt not found' },
        { status: 404 }
      );
    }

    // Update GR and items in transaction
    const receipt = await prisma.$transaction(async (tx) => {
      // Update goods receipt
      const updatedGR = await tx.goodsReceipt.update({
        where: { id: id },
        data: {
          receivedDate: body.receivedDate ? new Date(body.receivedDate) : existingGR.receivedDate,
          receiptDate: body.receivedDate ? new Date(body.receivedDate) : existingGR.receiptDate,
          receivedBy: body.receivedBy || existingGR.receivedBy,
          receivedById: body.receivedBy || existingGR.receivedById,
          deliveryNote: body.deliveryNote !== undefined ? body.deliveryNote : existingGR.deliveryNote,
          transportDetails: body.transportDetails !== undefined ? body.transportDetails : existingGR.transportDetails,
          vehicleNumber: body.transportDetails !== undefined ? body.transportDetails : existingGR.vehicleNumber,
          driverName: body.driverName !== undefined ? body.driverName : existingGR.driverName,
          storageLocation: body.storageLocation !== undefined ? body.storageLocation : existingGR.storageLocation,
          specialHandling: body.specialHandling !== undefined ? body.specialHandling : existingGR.specialHandling,
          remarks: body.specialHandling !== undefined ? body.specialHandling : existingGR.remarks,
          qualityChecked: body.qualityChecked !== undefined ? body.qualityChecked : existingGR.qualityChecked,
          qualityComments: body.qualityComments !== undefined ? body.qualityComments : existingGR.qualityComments,
          qualityInspector: body.qualityInspector !== undefined ? body.qualityInspector : existingGR.qualityInspector,
          inspectedBy: body.qualityInspector !== undefined ? body.qualityInspector : existingGR.inspectedBy,
          inspectedAt: body.qualityChecked ? new Date() : existingGR.inspectedAt,
          updatedAt: new Date()
        }
      });

      // Update items if provided
      if (body.items && Array.isArray(body.items)) {
        // Update existing items instead of deleting and recreating
        for (const item of body.items) {
          await tx.gRItem.update({
            where: { id: item.id },
            data: {
              deliveredQuantity: toQuantity(item.receivedQuantity),
              receivedQuantity: toQuantity(item.receivedQuantity),
              acceptedQuantity: toQuantity(item.acceptedQuantity),
              rejectedQuantity: toQuantity(item.rejectedQuantity),
              rejectionReason: item.rejectionReason,
              remarks: item.inspectionNotes || null,
            }
          });
        }

        // Determine new status based on items
        const allFullyReceived = body.items.every(
          (item: any) =>
            toQuantity(item.receivedQuantity) >=
            toQuantity(item.acceptedQuantity) + toQuantity(item.rejectedQuantity),
        );

        const newStatus = allFullyReceived ? 'COMPLETED' : 'PARTIALLY_ACCEPTED';
        
        await tx.goodsReceipt.update({
          where: { id: id },
          data: { status: newStatus }
        });
      }

      // Return updated GR with relations
      return await tx.goodsReceipt.findUnique({
        where: { id: id },
        include: {
          po: {
            include: {
              vendor: true
            }
          },
          items: {
            include: {
              item: true
            }
          }
        }
      });
    });

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('Error updating goods receipt:', error);
    return NextResponse.json(
      { error: 'Failed to update goods receipt' },
      { status: 500 }
    );
  }
}

// DELETE /api/goods-receipts/[id] - Delete goods receipt (only if PENDING)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (isExternalIntegrationEnabled('goodsReceipts')) {
      return NextResponse.json(
        { error: 'Goods receipts integration is enabled. Manual delete is disabled.' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        po: true
      }
    });

    if (!receipt) {
      return NextResponse.json(
        { error: 'Goods receipt not found' },
        { status: 404 }
      );
    }

    // Check if GR can be deleted
    if (receipt.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only delete goods receipt in PENDING status' },
        { status: 400 }
      );
    }

    // Delete GR and items in transaction
    await prisma.$transaction(async (tx) => {
      // Delete GR items first
      await tx.gRItem.deleteMany({
        where: { grId: id }
      });

      // Delete GR
      await tx.goodsReceipt.delete({
        where: { id: id }
      });

      // Update PO status back to previous state if needed
      if (receipt.poId) {
        const remainingGRs = await tx.goodsReceipt.findMany({
          where: { poId: receipt.poId }
        });

        if (remainingGRs.length === 0) {
          // No more GRs, revert PO status
          await tx.purchaseOrder.update({
            where: { id: receipt.poId },
            data: { status: 'ACKNOWLEDGED' }
          });
        }
      }
    });

    return NextResponse.json({ 
      message: 'Goods receipt deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting goods receipt:', error);
    return NextResponse.json(
      { error: 'Failed to delete goods receipt' },
      { status: 500 }
    );
  }
}
