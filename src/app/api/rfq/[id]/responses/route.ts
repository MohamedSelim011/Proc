import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/rfq/[id]/responses - Get all responses for an RFQ
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responses = await prisma.rFQResponse.findMany({
      where: { rfqId: params.id },
      include: {
        vendor: true
      },
      orderBy: [
        { totalAmount: 'asc' },
        { technicalScore: 'desc' }
      ]
    });

    // Calculate comparison metrics
    const metrics = {
      totalResponses: responses.length,
      lowestBid: responses.length > 0 ? Math.min(...responses.map(r => Number(r.totalAmount))) : 0,
      highestBid: responses.length > 0 ? Math.max(...responses.map(r => Number(r.totalAmount))) : 0,
      averageBid: responses.length > 0 
        ? responses.reduce((sum, r) => sum + Number(r.totalAmount), 0) / responses.length 
        : 0
    };

    return NextResponse.json({
      responses,
      metrics
    });
  } catch (error) {
    console.error('Error fetching RFQ responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RFQ responses' },
      { status: 500 }
    );
  }
}

// POST /api/rfq/[id]/responses - Submit vendor response to RFQ
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Check if RFQ is open
    const rfq = await prisma.rFQ.findUnique({
      where: { id: params.id }
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    if (rfq.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'RFQ is not open for responses' },
        { status: 400 }
      );
    }

    if (new Date() > rfq.closingDate) {
      return NextResponse.json(
        { error: 'RFQ submission deadline has passed' },
        { status: 400 }
      );
    }

    const response = await prisma.rFQResponse.create({
      data: {
        rfqId: params.id,
        vendorId: body.vendorId,
        totalAmount: body.totalAmount,
        validUntil: new Date(body.validUntil),
        status: 'SUBMITTED'
      },
      include: {
        vendor: true
      }
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating RFQ response:', error);
    return NextResponse.json(
      { error: 'Failed to submit RFQ response' },
      { status: 500 }
    );
  }
}