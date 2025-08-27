import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/invoices/[id]/status - Update invoice status (approval workflow)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, approvedBy, comments, paymentReference } = body;

    // Validate status
    const validStatuses = ['PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'PAID'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        vendor: true,
        po: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    const currentStatus = invoice.status;
    const validTransitions: { [key: string]: string[] } = {
      'PENDING': ['VERIFIED', 'REJECTED'],
      'VERIFIED': ['APPROVED', 'REJECTED'],
      'APPROVED': ['PAID', 'REJECTED'],
      'REJECTED': ['PENDING'], // Can be resubmitted
      'PAID': [] // Final state
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // Additional validations
    if (status === 'VERIFIED' && !invoice.threeWayMatched) {
      return NextResponse.json(
        { error: 'Invoice must pass three-way matching before verification' },
        { status: 400 }
      );
    }

    if (status === 'PAID' && !paymentReference) {
      return NextResponse.json(
        { error: 'Payment reference is required when marking as paid' },
        { status: 400 }
      );
    }

    // Update invoice status and payment status
    let updateData: any = {
      status,
      updatedAt: new Date()
    };

    // Handle payment status updates
    if (status === 'PAID') {
      updateData.paymentStatus = 'PAID';
      updateData.paymentDate = new Date();
      updateData.paymentReference = paymentReference;
    } else if (status === 'REJECTED') {
      // Reset payment status if rejected
      updateData.paymentStatus = 'UNPAID';
      updateData.paymentDate = null;
      updateData.paymentReference = null;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        vendor: true,
        po: {
          include: {
            items: {
              include: {
                item: true
              }
            }
          }
        }
      }
    });

    // Log status change
    console.log(`Invoice ${invoice.invoiceNumber} status changed from ${currentStatus} to ${status} by ${approvedBy || 'system'}`);

    return NextResponse.json({
      ...updatedInvoice,
      statusChange: {
        from: currentStatus,
        to: status,
        timestamp: new Date(),
        approvedBy: approvedBy || 'system',
        comments
      }
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice status' },
      { status: 500 }
    );
  }
}

// POST /api/invoices/[id]/status - Record payment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { 
      paymentAmount, 
      paymentDate, 
      paymentReference, 
      paymentMethod,
      paidBy 
    } = body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice can receive payment
    if (invoice.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Invoice must be approved before payment can be recorded' },
        { status: 400 }
      );
    }

    if (invoice.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Invoice is already fully paid' },
        { status: 400 }
      );
    }

    // Validate payment amount
    const totalAmount = Number(invoice.totalAmount);
    const paidAmount = Number(paymentAmount);

    if (paidAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (paidAmount > totalAmount) {
      return NextResponse.json(
        { error: 'Payment amount cannot exceed invoice total' },
        { status: 400 }
      );
    }

    // Determine payment status
    let newPaymentStatus: string;
    let newStatus: string = invoice.status;

    if (paidAmount === totalAmount) {
      newPaymentStatus = 'PAID';
      newStatus = 'PAID';
    } else {
      newPaymentStatus = 'PARTIAL';
    }

    // Update invoice with payment information
    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        paymentStatus: newPaymentStatus,
        status: newStatus,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentReference,
        updatedAt: new Date()
      },
      include: {
        vendor: true,
        po: true
      }
    });

    // Create payment record (you might want to add a separate Payment table)
    const paymentRecord = {
      invoiceId: params.id,
      amount: paidAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      reference: paymentReference,
      method: paymentMethod,
      paidBy
    };

    return NextResponse.json({
      message: `Payment of ${paidAmount} OMR recorded successfully`,
      invoice: updatedInvoice,
      payment: paymentRecord,
      remainingAmount: totalAmount - paidAmount
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
