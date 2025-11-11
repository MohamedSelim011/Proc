import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { activatedBy } = body;

    // Check if contract exists and is in DRAFT status
    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        pr: true
      }
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Service contract not found' },
        { status: 404 }
      );
    }

    if (contract.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft contracts can be activated' },
        { status: 400 }
      );
    }

    // Activate the contract and update PR status
    const [updatedContract, updatedPR] = await prisma.$transaction([
      prisma.serviceContract.update({
        where: { id },
        data: { 
          status: 'ACTIVE',
          signedAt: new Date()
        }
      }),
      prisma.purchaseRequisition.update({
        where: { id: contract.prId },
        data: { status: 'CONVERTED' }
      })
    ]);

    return NextResponse.json({
      message: 'Service contract activated successfully',
      contract: updatedContract,
      purchaseRequisition: updatedPR
    });

  } catch (error) {
    console.error('Error activating service contract:', error);
    return NextResponse.json(
      { error: 'Failed to activate service contract' },
      { status: 500 }
    );
  }
} 