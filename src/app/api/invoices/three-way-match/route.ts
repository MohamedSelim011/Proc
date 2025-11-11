import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// POST /api/invoices/three-way-match - Perform three-way matching
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId } = body;

    // Get invoice with related PO and GR
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        po: {
          include: {
            items: {
              include: {
                item: true
              }
            },
            goodsReceipts: {
              include: {
                items: true
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

    if (!invoice.po) {
      return NextResponse.json(
        { error: 'No purchase order linked to this invoice' },
        { status: 400 }
      );
    }

    // Perform three-way matching
    const matchingResults = {
      poAmount: Number(invoice.po.totalAmount),
      invoiceAmount: Number(invoice.totalAmount),
      receivedAmount: 0,
      discrepancies: [] as any[],
      matched: false
    };

    // Calculate total received amount
    for (const poItem of invoice.po.items) {
      const totalReceived = invoice.po.goodsReceipts.reduce((sum, gr) => {
        const grItem = gr.items.find(i => i.itemId === poItem.itemId);
        return sum + (grItem?.acceptedQuantity || 0);
      }, 0);

      const receivedValue = totalReceived * Number(poItem.unitPrice);
      matchingResults.receivedAmount += receivedValue;

      // Check for discrepancies
      if (totalReceived < poItem.quantity) {
        matchingResults.discrepancies.push({
          itemId: poItem.itemId,
          itemName: poItem.item.nameEn,
          orderedQty: poItem.quantity,
          receivedQty: totalReceived,
          difference: poItem.quantity - totalReceived
        });
      }
    }

    // Check if amounts match (within tolerance)
    const tolerance = 0.01; // 1% tolerance
    const poInvoiceDiff = Math.abs(matchingResults.poAmount - matchingResults.invoiceAmount);
    const poReceivedDiff = Math.abs(matchingResults.poAmount - matchingResults.receivedAmount);

    matchingResults.matched = 
      poInvoiceDiff <= (matchingResults.poAmount * tolerance) &&
      poReceivedDiff <= (matchingResults.poAmount * tolerance) &&
      matchingResults.discrepancies.length === 0;

    // Update invoice with matching results
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        threeWayMatched: matchingResults.matched,
        matchingComments: matchingResults.matched 
          ? 'Three-way match successful'
          : `Discrepancies found: ${JSON.stringify(matchingResults.discrepancies)}`,
        status: matchingResults.matched ? 'VERIFIED' : 'PENDING'
      }
    });

    return NextResponse.json({
      success: matchingResults.matched,
      results: matchingResults,
      message: matchingResults.matched 
        ? 'Three-way matching successful. Invoice verified.'
        : 'Three-way matching failed. Discrepancies found.'
    });
  } catch (error) {
    console.error('Error performing three-way match:', error);
    return NextResponse.json(
      { error: 'Failed to perform three-way matching' },
      { status: 500 }
    );
  }
}