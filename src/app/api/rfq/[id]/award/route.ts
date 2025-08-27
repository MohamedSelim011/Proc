import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/rfq/[id]/award - Award RFQ to selected vendor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { selectedResponseId, awardedBy, comments, createPO = false } = body;

    const rfq = await prisma.rFQ.findUnique({
      where: { id: params.id },
      include: {
        pr: {
          include: {
            items: {
              include: {
                item: true
              }
            }
          }
        },
        responses: {
          include: {
            vendor: true
          }
        }
      }
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    // Check if RFQ can be awarded
    if (rfq.status !== 'EVALUATED') {
      return NextResponse.json(
        { error: 'RFQ must be evaluated before awarding' },
        { status: 400 }
      );
    }

    // Find the selected response
    const selectedResponse = rfq.responses.find(r => r.id === selectedResponseId);
    if (!selectedResponse) {
      return NextResponse.json(
        { error: 'Selected response not found' },
        { status: 404 }
      );
    }

    // Validate that response has been evaluated
    if (selectedResponse.technicalScore === null || selectedResponse.commercialScore === null) {
      return NextResponse.json(
        { error: 'Selected response must be evaluated before awarding' },
        { status: 400 }
      );
    }

    // Award RFQ in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update selected response status
      const awardedResponse = await tx.rFQResponse.update({
        where: { id: selectedResponseId },
        data: { status: 'SELECTED' },
        include: { vendor: true }
      });

      // Update other responses to rejected
      await tx.rFQResponse.updateMany({
        where: { 
          rfqId: params.id,
          id: { not: selectedResponseId }
        },
        data: { status: 'REJECTED' }
      });

      // Update RFQ status to awarded
      const awardedRFQ = await tx.rFQ.update({
        where: { id: params.id },
        data: { status: 'AWARDED' },
        include: {
          pr: {
            include: {
              items: {
                include: {
                  item: true
                }
              }
            }
          },
          responses: {
            include: {
              vendor: true
            }
          }
        }
      });

      let purchaseOrder = null;

      // Create Purchase Order if requested
      if (createPO && rfq.pr) {
        // Generate PO number
        const poCount = await tx.purchaseOrder.count();
        const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(4, '0')}`;

        // Calculate delivery date (30 days from now as default)
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 30);

        purchaseOrder = await tx.purchaseOrder.create({
          data: {
            poNumber,
            prId: rfq.pr.id,
            vendorId: selectedResponse.vendorId,
            deliveryDate,
            deliveryAddress: {
              // Default delivery address - should be configurable
              building: 'Main Building',
              street: 'Government Street',
              city: 'Muscat',
              governorate: 'Muscat',
              postalCode: '100',
              country: 'Oman'
            },
            paymentTerms: 'Net 30 days',
            status: 'DRAFT',
            totalAmount: selectedResponse.totalAmount,
            currency: 'OMR',
            items: {
              create: rfq.pr.items.map(prItem => ({
                itemId: prItem.itemId,
                quantity: prItem.quantity,
                unitPrice: Number(selectedResponse.totalAmount) / rfq.pr.items.reduce((sum, item) => sum + item.quantity, 0), // Simple average - should be more sophisticated
                totalPrice: prItem.quantity * (Number(selectedResponse.totalAmount) / rfq.pr.items.reduce((sum, item) => sum + item.quantity, 0)),
                deliveryDate: deliveryDate
              }))
            }
          },
          include: {
            vendor: true,
            items: {
              include: {
                item: true
              }
            }
          }
        });

        // Update PR status to converted
        await tx.purchaseRequisition.update({
          where: { id: rfq.pr.id },
          data: { status: 'CONVERTED' }
        });
      }

      return {
        rfq: awardedRFQ,
        awardedResponse,
        purchaseOrder
      };
    });

    // Create award summary
    const awardSummary = {
      rfqNumber: rfq.rfqNumber,
      awardedTo: {
        vendor: result.awardedResponse.vendor,
        amount: result.awardedResponse.totalAmount,
        technicalScore: result.awardedResponse.technicalScore,
        commercialScore: result.awardedResponse.commercialScore
      },
      awardedBy,
      awardedAt: new Date(),
      comments,
      purchaseOrderCreated: !!result.purchaseOrder,
      purchaseOrderNumber: result.purchaseOrder?.poNumber
    };

    return NextResponse.json({
      message: 'RFQ awarded successfully',
      awardSummary,
      rfq: result.rfq,
      purchaseOrder: result.purchaseOrder
    });

  } catch (error) {
    console.error('Error awarding RFQ:', error);
    return NextResponse.json(
      { error: 'Failed to award RFQ' },
      { status: 500 }
    );
  }
}

// GET /api/rfq/[id]/award - Get award details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: params.id },
      include: {
        responses: {
          include: {
            vendor: true
          }
        },
        purchaseOrders: {
          include: {
            vendor: true,
            items: {
              include: {
                item: true
              }
            }
          }
        }
      }
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    // Find awarded response
    const awardedResponse = rfq.responses.find(r => r.status === 'SELECTED');
    
    if (!awardedResponse) {
      return NextResponse.json({
        message: 'RFQ not yet awarded',
        rfq,
        awarded: false
      });
    }

    const awardDetails = {
      rfq,
      awarded: true,
      awardedResponse,
      rejectedResponses: rfq.responses.filter(r => r.status === 'REJECTED'),
      purchaseOrders: rfq.purchaseOrders,
      awardSummary: {
        totalResponses: rfq.responses.length,
        awardedAmount: awardedResponse.totalAmount,
        savingsFromHighest: Math.max(...rfq.responses.map(r => Number(r.totalAmount))) - Number(awardedResponse.totalAmount),
        technicalScore: awardedResponse.technicalScore,
        commercialScore: awardedResponse.commercialScore
      }
    };

    return NextResponse.json(awardDetails);

  } catch (error) {
    console.error('Error fetching award details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch award details' },
      { status: 500 }
    );
  }
}
