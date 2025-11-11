import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// PUT /api/rfq/[id]/status - Update RFQ status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateRFQStatus(request, params);
}

// PATCH /api/rfq/[id]/status - Update RFQ status (alternative method)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateRFQStatus(request, params);
}

// Common function for updating RFQ status
async function updateRFQStatus(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, updatedBy, comments } = body;

    // Validate status
    const validStatuses = ['DRAFT', 'PUBLISHED', 'CLOSED', 'EVALUATED', 'AWARDED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        responses: true
      }
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    const currentStatus = rfq.status;
    const validTransitions: { [key: string]: string[] } = {
      'DRAFT': ['PUBLISHED'],
      'PUBLISHED': ['CLOSED'],
      'CLOSED': ['EVALUATED'],
      'EVALUATED': ['AWARDED'],
      'AWARDED': [] // Final state
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // Additional validations based on status
    if (status === 'PUBLISHED') {
      // Check if RFQ has all required information
      if (!rfq.title || !rfq.closingDate) {
        return NextResponse.json(
          { error: 'RFQ must have title and closing date to be published' },
          { status: 400 }
        );
      }

      // Check if closing date is reasonable (not too far in the past - allow up to 90 days in the past for testing)
      const closingDate = new Date(rfq.closingDate);
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      
      if (closingDate < ninetyDaysAgo) {
        return NextResponse.json(
          { error: 'Closing date cannot be more than 90 days in the past' },
          { status: 400 }
        );
      }
    }

    if (status === 'CLOSED') {
      // Allow manual closing regardless of date
      // The system will automatically close RFQs past their closing date
    }

    if (status === 'EVALUATED') {
      // Check if there are responses to evaluate
      if (rfq.responses.length === 0) {
        return NextResponse.json(
          { error: 'Cannot evaluate RFQ with no responses' },
          { status: 400 }
        );
      }

      // Check if all responses have been scored
      const unscoredResponses = rfq.responses.filter(r => 
        r.technicalScore === null || r.commercialScore === null
      );
      
      if (unscoredResponses.length > 0) {
        return NextResponse.json(
          { error: 'All responses must be scored before evaluation can be completed' },
          { status: 400 }
        );
      }
    }

    if (status === 'AWARDED') {
      // Check if there's a selected response
      const selectedResponse = rfq.responses.find(r => r.status === 'SELECTED');
      if (!selectedResponse) {
        return NextResponse.json(
          { error: 'Must select a winning response before awarding RFQ' },
          { status: 400 }
        );
      }
    }

    // Update RFQ status
    const updatedRFQ = await prisma.rFQ.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        pr: true,
        responses: {
          include: {
            vendor: true
          }
        }
      }
    });

    // Perform additional actions based on status
    if (status === 'CLOSED') {
      // Update all pending responses to under review
      await prisma.rFQResponse.updateMany({
        where: { 
          rfqId: id,
          status: 'SUBMITTED'
        },
        data: { 
          status: 'UNDER_REVIEW'
        }
      });
    }

    // Log status change
    console.log(`RFQ ${rfq.rfqNumber} status changed from ${currentStatus} to ${status} by ${updatedBy || 'system'}`);

    return NextResponse.json({
      ...updatedRFQ,
      statusChange: {
        from: currentStatus,
        to: status,
        timestamp: new Date(),
        updatedBy: updatedBy || 'system',
        comments
      }
    });
  } catch (error) {
    console.error('Error updating RFQ status:', error);
    return NextResponse.json(
      { error: 'Failed to update RFQ status' },
      { status: 500 }
    );
  }
}
