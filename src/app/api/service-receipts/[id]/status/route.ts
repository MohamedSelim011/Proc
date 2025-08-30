import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['PENDING', 'ACCEPTED', 'REJECTED', 'CONDITIONAL'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be PENDING, ACCEPTED, REJECTED, or CONDITIONAL' },
        { status: 400 }
      );
    }

    // Update receipt status
    const updatedReceipt = await prisma.serviceReceipt.update({
      where: { id },
      data: { 
        acceptanceStatus: status
      },
      include: {
        contract: {
          include: {
            vendor: true
          }
        },
        milestone: true
      }
    });

    return NextResponse.json({
      message: 'Service receipt status updated successfully',
      receipt: updatedReceipt
    });

  } catch (error) {
    console.error('Error updating service receipt status:', error);
    return NextResponse.json(
      { error: 'Failed to update service receipt status' },
      { status: 500 }
    );
  }
} 