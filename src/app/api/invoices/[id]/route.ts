import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/invoices/[id] - Get single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
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
        },
        items: {
          include: {
            item: true,
            poItem: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        invoiceNumber: body.invoiceNumber,
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        totalAmount: body.totalAmount,
        taxAmount: body.taxAmount,
        discountAmount: body.discountAmount,
        netAmount: body.netAmount,
        currency: body.currency,
        status: body.status,
        matchingStatus: body.matchingStatus,
        threeWayMatched: body.matchingStatus === 'MATCHED',
        paymentStatus: body.paymentStatus,
        description: body.description,
        paymentTerms: body.paymentTerms
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

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.invoice.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
