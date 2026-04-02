import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { responseId, vendorId } = body;
    const justification =
      typeof body.justification === 'string' ? body.justification.trim() : '';

    if (!responseId || !vendorId) {
      return NextResponse.json(
        { error: 'Response ID and vendor ID are required' },
        { status: 400 }
      );
    }

    if (!justification) {
      return NextResponse.json(
        { error: 'Winner selection justification is required' },
        { status: 400 }
      );
    }

    // Find the RFP
    const rfp = await prisma.serviceRFP.findUnique({
      where: { id },
      include: {
        responses: true
      }
    });

    if (!rfp) {
      return NextResponse.json(
        { error: 'Service RFP not found' },
        { status: 404 }
      );
    }

    if (!['SENT', 'PUBLISHED', 'EVALUATED', 'CLOSED'].includes(rfp.status)) {
      return NextResponse.json(
        { error: `RFP must be in SENT, PUBLISHED, EVALUATED, or CLOSED status to select a winner. Current status: ${rfp.status}` },
        { status: 400 }
      );
    }

    // Verify that the response has been scored
    const selectedResponse = rfp.responses.find(r => r.id === responseId);
    if (!selectedResponse) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    if (selectedResponse.vendorId !== vendorId) {
      return NextResponse.json(
        { error: 'Selected response does not belong to the provided vendor' },
        { status: 400 }
      );
    }

    if (!selectedResponse.overallScore) {
      return NextResponse.json(
        { error: 'Response must be scored before selecting as winner' },
        { status: 400 }
      );
    }

    // Update the selected response to SELECTED
    await prisma.serviceRFPResponse.update({
      where: { id: responseId },
      data: {
        status: 'SELECTED',
        awardJustification: justification
      }
    });

    // Update other responses to REJECTED
    await prisma.serviceRFPResponse.updateMany({
      where: {
        rfpId: id,
        id: { not: responseId }
      },
      data: { status: 'REJECTED' }
    });

    // Update RFP status to AWARDED
    await prisma.serviceRFP.update({
      where: { id },
      data: { status: 'AWARDED' }
    });

    // Create process audit
    await prisma.processAudit.create({
      data: {
        processType: 'SERVICE_RFP_WINNER_SELECTION',
        documentType: 'SERVICE_RFP',
        documentId: id,
        action: 'WINNER_SELECTED',
        performedBy: 'SYSTEM',
        details: JSON.stringify({
          vendorId,
          responseId,
          justification
        })
      }
    });

    return NextResponse.json({ 
      message: 'Winner selected successfully',
      vendorId,
      responseId,
      justification
    });

  } catch (error) {
    console.error('Error selecting winner:', error);
    return NextResponse.json(
      { error: 'Failed to select winner' },
      { status: 500 }
    );
  }
}

