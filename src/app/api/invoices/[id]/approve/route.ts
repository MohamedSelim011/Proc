import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/invoices/[id]/approve - Approve an invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, comments, approverId } = body;

    // Validate the invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    const validTransitions = {
      DRAFT: ['SUBMITTED', 'APPROVED'],
      SUBMITTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['PAID', 'REJECTED'],
      REJECTED: ['DRAFT', 'SUBMITTED']
    };

    const currentStatus = invoice.status as keyof typeof validTransitions;
    const allowedNextStatuses = validTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return NextResponse.json(
        { 
          error: `Invalid status transition from ${currentStatus} to ${status}`,
          allowedTransitions: allowedNextStatuses
        },
        { status: 400 }
      );
    }

    // Update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status
      }
    });

    // Create approval record
    if (approverId) {
      await prisma.approval.create({
        data: {
          documentType: 'INVOICE',
          documentId: id,
          approverId,
          status: status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING',
          comments,
          level: 1,
          ...(status === 'APPROVED' && { approvedAt: new Date() })
        }
      });
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Error approving invoice:', error);
    return NextResponse.json(
      { error: 'Failed to approve invoice' },
      { status: 500 }
    );
  }
} 