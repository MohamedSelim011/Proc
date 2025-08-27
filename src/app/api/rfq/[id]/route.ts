import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/rfq/[id] - Get RFQ by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: params.id },
      include: {
        pr: {
          include: {
            items: {
              include: {
                item: {
                  include: {
                    category: true
                  }
                }
              }
            }
          }
        },
        responses: {
          include: {
            vendor: {
              include: {
                categories: {
                  include: {
                    category: true
                  }
                }
              }
            }
          },
          orderBy: [
            { totalAmount: 'asc' },
            { technicalScore: 'desc' }
          ]
        }
      }
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    // Calculate RFQ statistics
    const stats = {
      totalResponses: rfq.responses.length,
      lowestBid: rfq.responses.length > 0 
        ? Math.min(...rfq.responses.map(r => Number(r.totalAmount))) 
        : 0,
      highestBid: rfq.responses.length > 0 
        ? Math.max(...rfq.responses.map(r => Number(r.totalAmount))) 
        : 0,
      averageBid: rfq.responses.length > 0 
        ? rfq.responses.reduce((sum, r) => sum + Number(r.totalAmount), 0) / rfq.responses.length 
        : 0,
      averageTechnicalScore: rfq.responses.length > 0 
        ? rfq.responses.reduce((sum, r) => sum + (r.technicalScore || 0), 0) / rfq.responses.length 
        : 0,
      averageCommercialScore: rfq.responses.length > 0 
        ? rfq.responses.reduce((sum, r) => sum + (r.commercialScore || 0), 0) / rfq.responses.length 
        : 0
    };

    return NextResponse.json({
      ...rfq,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching RFQ:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RFQ' },
      { status: 500 }
    );
  }
}

// PUT /api/rfq/[id] - Update RFQ
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const existingRFQ = await prisma.rFQ.findUnique({
      where: { id: params.id }
    });

    if (!existingRFQ) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    // Check if RFQ can be edited
    if (!['DRAFT'].includes(existingRFQ.status)) {
      return NextResponse.json(
        { error: 'Cannot edit RFQ in current status' },
        { status: 400 }
      );
    }

    const rfq = await prisma.rFQ.update({
      where: { id: params.id },
      data: {
        title: body.title || existingRFQ.title,
        description: body.description || existingRFQ.description,
        closingDate: body.closingDate ? new Date(body.closingDate) : existingRFQ.closingDate,
        updatedAt: new Date()
      },
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

    return NextResponse.json(rfq);
  } catch (error) {
    console.error('Error updating RFQ:', error);
    return NextResponse.json(
      { error: 'Failed to update RFQ' },
      { status: 500 }
    );
  }
}

// DELETE /api/rfq/[id] - Delete RFQ (only if DRAFT and no responses)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            responses: true
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

    if (rfq.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only delete RFQ in DRAFT status' },
        { status: 400 }
      );
    }

    if (rfq._count.responses > 0) {
      return NextResponse.json(
        { error: 'Cannot delete RFQ with existing responses' },
        { status: 400 }
      );
    }

    await prisma.rFQ.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ 
      message: 'RFQ deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting RFQ:', error);
    return NextResponse.json(
      { error: 'Failed to delete RFQ' },
      { status: 500 }
    );
  }
}
