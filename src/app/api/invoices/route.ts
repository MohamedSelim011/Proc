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
    
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: body.invoiceNumber,
        vendorId: body.vendorId,
        poId: body.poId,
        invoiceDate: new Date(body.invoiceDate),
        dueDate: new Date(body.dueDate),
        totalAmount: body.totalAmount,
        taxAmount: body.taxAmount || 0,
        status: 'PENDING',
        threeWayMatched: false,
        paymentStatus: 'UNPAID'
      },
      include: {
        vendor: true,
        po: true
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