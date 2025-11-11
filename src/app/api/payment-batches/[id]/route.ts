import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;

    // For now, we'll create a mock payment batch based on the ID
    // In a real implementation, you would have a PaymentBatch model
    // Since we don't have actual batch data, we'll simulate it
    
    // First, try to find any paid invoices to use as a base
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        paymentStatus: 'PAID'
      },
      include: {
        vendor: true,
        po: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5 // Limit to 5 invoices for demo
    });

    if (paidInvoices.length === 0) {
      return NextResponse.json(
        { error: 'No paid invoices found to create payment batch' },
        { status: 404 }
      );
    }

    // Create a mock payment batch based on the requested ID
    const batchDetails = {
      id: batchId,
      batchNumber: `PB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      batchDate: paidInvoices[0].paymentDate || new Date().toISOString(),
      status: 'COMPLETED',
      totalAmount: paidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
      currency: (paidInvoices[0] as any).currency,
      paymentMethod: 'BANK_TRANSFER',
      reference: `PAY-${batchId}`,
      description: `Payment for ${paidInvoices.length} invoice(s)`,
      bankAccount: (paidInvoices[0].vendor as any).bankAccount || 'ACC-123456789',
      createdAt: paidInvoices[0].updatedAt || new Date().toISOString(),
      processedAt: paidInvoices[0].paymentDate || new Date().toISOString(),
      processedBy: 'system@wujha.com',
      invoiceCount: paidInvoices.length,
      invoices: paidInvoices.map((invoice: any) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        vendor: invoice.vendor,
        po: invoice.po
      }))
    };



    return NextResponse.json(batchDetails);

  } catch (error) {
    console.error('Error fetching payment batch details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment batch details' },
      { status: 500 }
    );
  }
} 