import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/invoices/[id] - Get invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
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
        },
        items: {
          include: {
            item: true
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if invoice exists and is in DRAFT status
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (existingInvoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft invoices can be edited' },
        { status: 400 }
      );
    }

    // Update invoice and items in a transaction
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // Update invoice details
      const invoice = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: body.invoiceNumber || existingInvoice.invoiceNumber,
          invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : existingInvoice.invoiceDate,
          dueDate: body.dueDate ? new Date(body.dueDate) : existingInvoice.dueDate,
          currency: body.currency || existingInvoice.currency,
          paymentTerms: body.paymentTerms || existingInvoice.paymentTerms,
          description: body.description !== undefined ? body.description : existingInvoice.description,
          totalAmount: body.totalAmount !== undefined ? body.totalAmount : existingInvoice.totalAmount,
          taxAmount: body.taxAmount !== undefined ? body.taxAmount : existingInvoice.taxAmount,
          discountAmount: body.discountAmount !== undefined ? body.discountAmount : existingInvoice.discountAmount,
          netAmount: body.totalAmount !== undefined 
            ? body.totalAmount - (body.discountAmount || 0)
            : existingInvoice.netAmount,
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
          },
          items: {
            include: {
              item: true
            }
          }
        }
      });

      // Update invoice items if provided
      if (body.items && body.items.length > 0) {
        for (const item of body.items) {
          await tx.invoiceItem.update({
            where: { id: item.id },
            data: {
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              description: item.description
            }
          });
        }
      }

      return invoice;
    });

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete invoice (only if DRAFT)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice can be deleted
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only delete invoice in DRAFT status' },
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
      where: { id }
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