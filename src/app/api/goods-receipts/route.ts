import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/goods-receipts - Get all goods receipts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const poId = searchParams.get('poId') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      if (status.includes(',')) {
        where.status = { in: status.split(',').map(s => s.trim()) };
      } else {
        where.status = status;
      }
    }
    if (poId) where.poId = poId;

    const [receipts, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where,
        skip,
        take: limit,
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.goodsReceipt.count({ where })
    ]);

    return NextResponse.json({
      receipts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching goods receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goods receipts' },
      { status: 500 }
    );
  }
}

// POST /api/goods-receipts - Create new goods receipt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate GR number
    const count = await prisma.goodsReceipt.count();
    const grNumber = `GR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Check if all items are fully received
    const allFullyReceived = body.items.every((item: any) => 
      item.receivedQuantity === item.orderedQuantity
    );

    // Check if all items are accepted (no rejections)
    const allItemsAccepted = body.items.every((item: any) => 
      (item.rejectedQuantity || 0) === 0
    );

    // Get PO items to map poItemId to itemId
    const poItems = await prisma.pOItem.findMany({
      where: { poId: body.poId }
    });

    const receipt = await prisma.goodsReceipt.create({
      data: {
        grNumber,
        poId: body.poId,
        receivedBy: body.receivedBy,
        status: allFullyReceived ? 'COMPLETED' : 'PARTIAL',
        qualityChecked: body.qualityChecked || allItemsAccepted,
        qualityComments: body.qualityComments,
        items: {
          create: body.items.map((item: any) => {
            const poItem = poItems.find(poi => poi.id === item.poItemId);
            if (!poItem) {
              throw new Error(`PO item not found: ${item.poItemId}`);
            }
            return {
              itemId: poItem.itemId,
              orderedQuantity: item.orderedQuantity,
              receivedQuantity: item.receivedQuantity,
              acceptedQuantity: item.acceptedQuantity || item.receivedQuantity,
              rejectedQuantity: item.rejectedQuantity || 0,
              rejectionReason: item.rejectionReason
            };
          })
        }
      },
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

    // Update PO status based on receipts
    const allGRs = await prisma.goodsReceipt.findMany({
      where: { poId: body.poId },
      include: {
        items: true
      }
    });

    // Calculate total received quantities (reuse poItems from above)

    let fullyReceived = true;
    let partiallyReceived = false;

    for (const poItem of poItems) {
      const totalReceived = allGRs.reduce((sum, gr) => {
        const grItem = gr.items.find(i => i.itemId === poItem.itemId);
        return sum + (grItem?.acceptedQuantity || 0);
      }, 0);

      if (totalReceived < poItem.quantity) {
        fullyReceived = false;
      }
      if (totalReceived > 0) {
        partiallyReceived = true;
      }
    }

    // Update PO status
    let newStatus: 'ACKNOWLEDGED' | 'COMPLETED' | 'PARTIAL' = 'ACKNOWLEDGED';
    if (fullyReceived) {
      newStatus = 'COMPLETED';
    } else if (partiallyReceived) {
      newStatus = 'PARTIAL';
    }

    await prisma.purchaseOrder.update({
      where: { id: body.poId },
      data: { status: newStatus }
    });

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    console.error('Error creating goods receipt:', error);
    return NextResponse.json(
      { error: 'Failed to create goods receipt' },
      { status: 500 }
    );
  }
}