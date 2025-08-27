import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/purchase-requisitions/[id] - Get individual PR details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pr = await prisma.purchaseRequisition.findUnique({
      where: {
        id: id,
      },
      include: {
        items: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!pr) {
      return NextResponse.json(
        { error: 'Purchase requisition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(pr);
  } catch (error) {
    console.error('Error fetching purchase requisition:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase requisition' },
      { status: 500 }
    );
  }
}

// PUT /api/purchase-requisitions/[id] - Update PR
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      itemType,
      departmentId,
      projectId,
      boqReference,
      priority,
      requiredByDate,
      justification,
      budgetCode,
      costCenter,
      items,
    } = body;

    // Calculate total estimated cost
    const totalEstimatedCost = items.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.estimatedPrice),
      0
    );

    const updatedPR = await prisma.purchaseRequisition.update({
      where: {
        id: id,
      },
      data: {
        itemType,
        departmentId,
        projectId,
        boqReference,
        priority,
        requiredByDate: new Date(requiredByDate),
        justification,
        budgetCode,
        costCenter,
        totalEstimatedCost,
        updatedAt: new Date(),
        // Update items
        items: {
          deleteMany: {
            purchaseRequisitionId: id,
          }, // Remove existing items
          create: items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice,
            specifications: item.specifications,
            requiredDate: item.requiredDate ? new Date(item.requiredDate) : null,
          })),
        },
      },
      include: {
        items: {
          include: {
            item: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedPR);
  } catch (error) {
    console.error('Error updating purchase requisition:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase requisition' },
      { status: 500 }
    );
  }
}

// DELETE /api/purchase-requisitions/[id] - Delete PR (only if DRAFT)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // First check if PR exists and is in DRAFT status
    const pr = await prisma.purchaseRequisition.findUnique({
      where: {
        id: id,
      },
    });

    if (!pr) {
      return NextResponse.json(
        { error: 'Purchase requisition not found' },
        { status: 404 }
      );
    }

    if (pr.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft purchase requisitions can be deleted' },
        { status: 400 }
      );
    }

    // Delete PR items first, then PR
    await prisma.pRItem.deleteMany({
      where: {
        purchaseRequisitionId: id,
      },
    });

    await prisma.purchaseRequisition.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ message: 'Purchase requisition deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase requisition:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase requisition' },
      { status: 500 }
    );
  }
}