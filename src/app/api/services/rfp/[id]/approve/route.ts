import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the RFP with approvals
    const rfp = await prisma.serviceRFP.findUnique({
      where: { id },
      include: { 
        approvals: true,
        pr: true
      }
    });

    if (!rfp) {
      return NextResponse.json(
        { error: 'Service RFP not found' },
        { status: 404 }
      );
    }

    if (rfp.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'RFP is not pending approval' },
        { status: 400 }
      );
    }

    // Update all pending approvals to approved
    await prisma.approval.updateMany({
      where: {
        serviceRFPId: id,
        status: 'PENDING'
      },
      data: {
        status: 'APPROVED',
        approvedAt: new Date()
      }
    });

    // Update RFP status to APPROVED
    await prisma.serviceRFP.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    return NextResponse.json({ 
      message: 'Service RFP approved successfully',
      status: 'APPROVED'
    });

  } catch (error) {
    console.error('Error approving RFP:', error);
    return NextResponse.json(
      { error: 'Failed to approve RFP' },
      { status: 500 }
    );
  }
}

