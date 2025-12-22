import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/jwt';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user
    let user;
    try {
      user = getAuthenticatedUser(request);
    } catch (error: any) {
      if (error.message === 'TOKEN_EXPIRED') {
        return NextResponse.json(
          { error: 'Your session has expired. Please sign in again.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the RFP
    const rfp = await prisma.serviceRFP.findUnique({
      where: { id },
      include: { pr: true }
    });

    if (!rfp) {
      return NextResponse.json(
        { error: 'Service RFP not found' },
        { status: 404 }
      );
    }

    if (rfp.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only request approval for draft RFPs' },
        { status: 400 }
      );
    }

    // Get approval hierarchy (managers/admins)
    const approvers = await prisma.user.findMany({
      where: {
        role: {
          in: ['SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_MANAGER', 'DEPARTMENT_MANAGER']
        }
      },
      take: 1 // Just need one approver for simplified workflow
    });

    if (approvers.length === 0) {
      return NextResponse.json(
        { error: 'No approvers found in the system' },
        { status: 400 }
      );
    }

    // Create approval record
    await prisma.approval.create({
      data: {
        documentType: 'SERVICE_RFP',
        documentId: id,
        serviceRFPId: id,
        prId: rfp.prId,
        approverId: approvers[0].id,
        status: 'PENDING',
        level: 1
      }
    });

    // Update RFP status to PENDING_APPROVAL
    await prisma.serviceRFP.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' }
    });

    return NextResponse.json({ 
      message: 'Approval requested successfully',
      status: 'PENDING_APPROVAL'
    });

  } catch (error) {
    console.error('Error requesting approval:', error);
    return NextResponse.json(
      { error: 'Failed to request approval' },
      { status: 500 }
    );
  }
}

