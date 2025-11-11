import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;

    // For now, create mock payment batches based on paid invoices
    // In a real implementation, you would have a PaymentBatch model
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        paymentStatus: 'PAID'
      },
      include: {
        vendor: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    // Group invoices into mock batches
    const batchesMap = new Map();
    
    paidInvoices.forEach((invoice, index) => {
      const batchKey = Math.floor(index / 3); // Group every 3 invoices into a batch
      
      if (!batchesMap.has(batchKey)) {
        batchesMap.set(batchKey, {
          id: `batch_${batchKey}_${Date.now()}`,
          batchNumber: `PB-${new Date().getFullYear()}-${String(1000 + batchKey).slice(-3)}`,
          batchDate: invoice.updatedAt,
          status: 'COMPLETED',
          totalAmount: 0,
          currency: invoice.currency,
          invoiceCount: 0,
          paymentMethod: 'BANK_TRANSFER',
          createdAt: invoice.updatedAt,
          invoices: []
        });
      }
      
      const batch = batchesMap.get(batchKey);
      batch.totalAmount += Number(invoice.totalAmount);
      batch.invoiceCount += 1;
      batch.invoices.push(invoice);
    });

    const batches = Array.from(batchesMap.values());
    const total = batches.length;

    return NextResponse.json({
      batches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching payment batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment batches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      invoiceIds,
      paymentMethod,
      paymentDate,
      reference,
      description,
      bankAccount,
      totalAmount,
      currency
    } = body;

    // Validate required fields
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: 'Invoice IDs are required' },
        { status: 400 }
      );
    }

    if (!paymentMethod || !paymentDate || !reference) {
      return NextResponse.json(
        { error: 'Payment method, date, and reference are required' },
        { status: 400 }
      );
    }

    // For now, we'll just update the invoice payment status
    // In a real implementation, you would create a PaymentBatch record
    
    // Update all selected invoices to PAID status
    await prisma.invoice.updateMany({
      where: {
        id: {
          in: invoiceIds
        }
      },
      data: {
        paymentStatus: 'PAID',
        paymentDate: new Date(paymentDate),
        paymentReference: reference,
        updatedAt: new Date()
      }
    });

    // Create a mock payment batch response
    const paymentBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: `PB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      batchDate: paymentDate,
      status: 'PROCESSED',
      totalAmount,
      currency: currency || 'OMR',
      invoiceCount: invoiceIds.length,
      paymentMethod,
      reference,
      description,
      bankAccount,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json(paymentBatch, { status: 201 });

  } catch (error) {
    console.error('Error creating payment batch:', error);
    return NextResponse.json(
      { error: 'Failed to create payment batch' },
      { status: 500 }
    );
  }
}
