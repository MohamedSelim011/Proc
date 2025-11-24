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

    if (!responseId || !vendorId) {
      return NextResponse.json(
        { error: 'Response ID and vendor ID are required' },
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

    if (rfp.status !== 'EVALUATED') {
      return NextResponse.json(
        { error: 'RFP must be in EVALUATED status to select a winner' },
        { status: 400 }
      );
    }

    // Update the selected response to SELECTED
    await prisma.serviceRFPResponse.update({
      where: { id: responseId },
      data: { status: 'SELECTED' }
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
        documentType: 'SERVICE_RFP',
        documentId: id,
        action: 'WINNER_SELECTED',
        performedBy: 'SYSTEM',
        details: JSON.stringify({
          vendorId,
          responseId
        })
      }
    });

    return NextResponse.json({ 
      message: 'Winner selected successfully',
      vendorId,
      responseId
    });

  } catch (error) {
    console.error('Error selecting winner:', error);
    return NextResponse.json(
      { error: 'Failed to select winner' },
      { status: 500 }
    );
  }
}

