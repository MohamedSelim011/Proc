import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/purchase-orders - Get all POs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const vendorId = searchParams.get('vendorId') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      // Handle comma-separated status values
      if (status.includes(',')) {
        where.status = { in: status.split(',').map(s => s.trim()) };
      } else {
        where.status = status;
      }
    }
    if (vendorId) where.vendorId = vendorId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: true,
          pr: true,
          items: {
            include: {
              item: true
            }
          },
          _count: {
            select: {
              goodsReceipts: true,
              invoices: true,
              amendments: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.purchaseOrder.count({ where })
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

// POST /api/purchase-orders - Create new PO
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Calculate total amount
    const totalAmount = body.items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0
    );

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        prId: body.prId,
        vendorId: body.vendorId,
        deliveryDate: new Date(body.deliveryDate),
        deliveryAddress: body.deliveryAddress,
        paymentTerms: body.paymentTerms,
        status: body.status || 'DRAFT',
        totalAmount,
        currency: body.currency || 'OMR',
        items: {
          create: body.items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null
          }))
        }
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

    // Update PR status if needed
    if (body.prId && body.status === 'APPROVED') {
      await prisma.purchaseRequisition.update({
        where: { id: body.prId },
        data: { status: 'CONVERTED' }
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}