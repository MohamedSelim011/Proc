import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/goods-receipts - Get all goods receipts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isExport = searchParams.get('export') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = isExport ? undefined : parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const poId = searchParams.get('poId') || '';
    const poNumber = searchParams.get('poNumber') || '';
    const search = searchParams.get('search') || '';

    const skip = isExport ? undefined : (page - 1) * limit!;

    const where: any = {};
    
    // Status filter
    if (status) {
      if (status.includes(',')) {
        where.status = { in: status.split(',').map(s => s.trim()) };
      } else {
        where.status = status;
      }
    }
    
    // PO ID filter (exact match)
    if (poId) {
      where.poId = poId;
    }
    
    // PO Number filter
    if (poNumber) {
      where.po = {
        poNumber: {
          contains: poNumber,
          mode: 'insensitive'
        }
      };
    }
    
    // Search filter - searches across GR number, receivedBy, and vendor name
    if (search) {
      // If we already have a po filter, we need to combine them with AND
      if (where.po) {
        const poFilter = where.po;
        delete where.po;
        where.AND = [
          { po: poFilter },
          {
            OR: [
              {
                grNumber: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                receivedBy: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                po: {
                  vendor: {
                    nameEn: {
                      contains: search,
                      mode: 'insensitive'
                    }
                  }
                }
              }
            ]
          }
        ];
      } else {
        // Simple search without PO number filter
        where.OR = [
          {
            grNumber: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            receivedBy: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            po: {
              vendor: {
                nameEn: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            }
          }
        ];
      }
    }

    const [receipts, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(limit !== undefined && { take: limit }),
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

    if (isExport) {
      return NextResponse.json({
        receipts,
        total
      });
    }

    return NextResponse.json({
      receipts,
      pagination: {
        page,
        limit: limit!,
        total,
        totalPages: Math.ceil(total / limit!)
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
        receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
        receivedBy: body.receivedBy,
        deliveryNote: body.deliveryNote || null,
        transportDetails: body.transportDetails || null,
        storageLocation: body.storageLocation || null,
        specialHandling: body.specialHandling || null,
        status: allFullyReceived ? 'COMPLETED' : 'PARTIAL',
        qualityChecked: body.qualityChecked || allItemsAccepted,
        qualityComments: body.qualityComments || null,
        qualityInspector: body.qualityInspector || null,
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
              rejectionReason: item.rejectionReason || null
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

    // Update PO status - When Goods Receipt is created, PO becomes COMPLETED
    await prisma.purchaseOrder.update({
      where: { id: body.poId },
      data: { status: 'COMPLETED' }
    });
    
    // Create process audit entry for PO completion
    await prisma.processAudit.create({
      data: {
        processType: 'PO_COMPLETION',
        documentId: body.poId,
        documentType: 'PO',
        action: 'COMPLETED',
        performedBy: body.receivedBy || 'SYSTEM',
        details: {
          grNumber: grNumber,
          completedAt: new Date().toISOString(),
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
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