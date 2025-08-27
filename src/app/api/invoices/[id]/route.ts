import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/invoices/[id] - Get invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        vendor: {
          include: {
            categories: {
              include: {
                category: true
              }
            }
          }
        },
        po: {
          include: {
            items: {
              include: {
                item: {
                  include: {
                    category: true
                  }
                }
              }
            },
            goodsReceipts: {
              include: {
                items: {
                  include: {
                    item: true
                  }
                }
              }
            }
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

    // Calculate matching statistics if PO exists
    let matchingStats = null;
    if (invoice.po) {
      const poAmount = Number(invoice.po.totalAmount);
      const invoiceAmount = Number(invoice.totalAmount);
      
      // Calculate received amount from goods receipts
      let receivedAmount = 0;
      if (invoice.po.goodsReceipts.length > 0) {
        for (const poItem of invoice.po.items) {
          const totalReceived = invoice.po.goodsReceipts.reduce((sum, gr) => {
            const grItem = gr.items.find(i => i.itemId === poItem.itemId);
            return sum + (grItem?.acceptedQuantity || 0);
          }, 0);
          receivedAmount += totalReceived * Number(poItem.unitPrice);
        }
      }

      matchingStats = {
        poAmount,
        invoiceAmount,
        receivedAmount,
        poInvoiceDifference: Math.abs(poAmount - invoiceAmount),
        poReceivedDifference: Math.abs(poAmount - receivedAmount),
        invoiceReceivedDifference: Math.abs(invoiceAmount - receivedAmount),
        matchingPercentage: receivedAmount > 0 
          ? Math.min(100, (Math.min(invoiceAmount, receivedAmount) / Math.max(invoiceAmount, receivedAmount)) * 100)
          : 0
      };
    }

    // Calculate payment statistics
    const paymentStats = {
      totalAmount: Number(invoice.totalAmount),
      taxAmount: Number(invoice.taxAmount),
      netAmount: Number(invoice.totalAmount) - Number(invoice.taxAmount),
      daysUntilDue: Math.ceil((new Date(invoice.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      isOverdue: new Date() > new Date(invoice.dueDate) && invoice.paymentStatus !== 'PAID'
    };

    return NextResponse.json({
      ...invoice,
      statistics: {
        matching: matchingStats,
        payment: paymentStats
      }
    });
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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: params.id }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice can be edited
    if (!['PENDING', 'REJECTED'].includes(existingInvoice.status)) {
      return NextResponse.json(
        { error: 'Cannot edit invoice in current status' },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        invoiceNumber: body.invoiceNumber || existingInvoice.invoiceNumber,
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : existingInvoice.invoiceDate,
        dueDate: body.dueDate ? new Date(body.dueDate) : existingInvoice.dueDate,
        totalAmount: body.totalAmount !== undefined ? body.totalAmount : existingInvoice.totalAmount,
        taxAmount: body.taxAmount !== undefined ? body.taxAmount : existingInvoice.taxAmount,
        updatedAt: new Date()
      },
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

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete invoice (only if PENDING)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice can be deleted
    if (invoice.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only delete invoice in PENDING status' },
        { status: 400 }
      );
    }

    if (invoice.paymentStatus !== 'UNPAID') {
      return NextResponse.json(
        { error: 'Cannot delete invoice with payment records' },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ 
      message: 'Invoice deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
