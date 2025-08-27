import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/items/[id] - Get item by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        prItems: {
          include: {
            pr: true
          },
          take: 5,
          orderBy: {
            pr: {
              createdAt: 'desc'
            }
          }
        },
        poItems: {
          include: {
            po: {
              include: {
                vendor: true
              }
            }
          },
          take: 5,
          orderBy: {
            po: {
              createdAt: 'desc'
            }
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Calculate usage statistics
    const stats = await prisma.$transaction([
      prisma.pRItem.aggregate({
        where: { itemId: params.id },
        _sum: { quantity: true },
        _count: true
      }),
      prisma.pOItem.aggregate({
        where: { itemId: params.id },
        _sum: { quantity: true },
        _avg: { unitPrice: true }
      })
    ]);

    return NextResponse.json({
      ...item,
      statistics: {
        totalRequested: stats[0]._sum.quantity || 0,
        totalRequisitions: stats[0]._count || 0,
        totalOrdered: stats[1]._sum.quantity || 0,
        averagePrice: stats[1]._avg.unitPrice || 0
      }
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

// PUT /api/items/[id] - Update item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const item = await prisma.item.update({
      where: { id: params.id },
      data: {
        itemCode: body.itemCode,
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        description: body.description,
        categoryId: body.categoryId,
        unitOfMeasure: body.unitOfMeasure,
        minStockLevel: body.minStockLevel,
        maxStockLevel: body.maxStockLevel,
        reorderPoint: body.reorderPoint
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE /api/items/[id] - Delete item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if item is used in any PR or PO
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            prItems: true,
            poItems: true,
            grItems: true
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item._count.prItems > 0 || item._count.poItems > 0 || item._count.grItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item with existing transactions' },
        { status: 400 }
      );
    }

    await prisma.item.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}