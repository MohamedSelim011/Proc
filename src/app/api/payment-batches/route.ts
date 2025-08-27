import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // For now, return empty array since we don't have payment batches in our schema yet
    // In a real implementation, you would have a PaymentBatch model
    const batches: any[] = [];
    const total = 0;

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
        paymentStatus: 'PAID'
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
