import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Verify all invoices exist and are approved
    const invoices = await prisma.invoice.findMany({
      where: {
        id: {
          in: invoiceIds
        },
        status: 'APPROVED'
      }
    });

    if (invoices.length !== invoiceIds.length) {
      return NextResponse.json(
        { error: 'Some invoices not found or not approved' },
        { status: 400 }
      );
    }

    // Update all selected invoices to PAID status
    const updatedInvoices = await prisma.invoice.updateMany({
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

    // Create a payment batch record (mock for now)
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
      processedInvoices: updatedInvoices.count,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json(paymentBatch, { status: 201 });

  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
