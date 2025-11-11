import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


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
      currency,
      isPartialPayment = false
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

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
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

    // Process each invoice payment
    const updatedInvoices = [];
    for (const invoice of invoices) {
      const currentAmountPaid = Number(invoice.amountPaid) || 0;
      const newAmountPaid = currentAmountPaid + totalAmount;
      const invoiceTotal = Number(invoice.totalAmount) || 0;

      // Determine payment status
      let newPaymentStatus = 'UNPAID';
      if (newAmountPaid >= invoiceTotal) {
        newPaymentStatus = 'PAID';
      } else if (newAmountPaid > 0) {
        newPaymentStatus = 'PARTIAL';
      }

      // Update invoice
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
          paymentDate: newPaymentStatus === 'PAID' ? new Date(paymentDate) : invoice.paymentDate,
          paymentReference: reference,
          updatedAt: new Date()
        }
      });

      updatedInvoices.push(updated);
    }

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
      processedInvoices: updatedInvoices.length,
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
