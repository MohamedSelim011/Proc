import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/invoices - Get all invoices
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const vendorId = searchParams.get('vendorId') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (vendorId) where.vendorId = vendorId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: true,
          po: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.invoice.count({ where })
    ]);

    // Calculate summary statistics
    const stats = await prisma.invoice.aggregate({
      where: {
        paymentStatus: 'UNPAID'
      },
      _sum: {
        totalAmount: true
      },
      _count: true
    });

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        totalUnpaid: stats._sum.totalAmount || 0,
        unpaidCount: stats._count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received invoice data:', JSON.stringify(body, null, 2));
    
    // Get vendor ID from PO if not provided
    let vendorId = body.vendorId;
    if (!vendorId && body.poId) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: body.poId },
        select: { vendorId: true }
      });
      if (po) {
        vendorId = po.vendorId;
      }
    }
    
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: body.invoiceNumber,
        vendorId,
        poId: body.poId,
        invoiceDate: new Date(body.invoiceDate),
        dueDate: new Date(body.dueDate),
        totalAmount: body.totalAmount,
        taxAmount: body.taxAmount || 0,
        discountAmount: body.discountAmount || 0,
        netAmount: body.totalAmount,
        currency: body.currency || 'OMR',
        status: body.status || 'DRAFT',
        matchingStatus: body.matchingStatus || 'PENDING',
        threeWayMatched: body.matchingStatus === 'MATCHED',
        paymentStatus: 'UNPAID',
        description: body.description,
        paymentTerms: body.paymentTerms,
        items: body.items ? {
          create: body.items.map((item: any) => ({
            poItemId: item.poItemId,
            itemId: item.itemId || item.poItemId, // Use PO item's item ID if not provided
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            description: item.description
          }))
        } : undefined
      },
      include: {
        vendor: true,
        po: true,
        items: {
          include: {
            item: true,
            poItem: true
          }
        }
      }
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}