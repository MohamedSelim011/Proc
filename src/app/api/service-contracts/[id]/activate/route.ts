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

    // Check if contract exists
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

    // Allow activation from two states:
    // 1. DRAFT - for direct activation (bypassing approval)
    // 2. SIGNED - for normal flow (after vendor acceptance)
    if (contract.status !== 'SIGNED' && contract.status !== 'DRAFT') {
      return NextResponse.json(
        { 
          error: `Cannot activate contract with status "${contract.status}". Contract must be either SIGNED (after vendor acceptance) or DRAFT (for direct activation).` 
        },
        { status: 400 }
      );
    }

    // Activate the contract and update PR status
    const updateData: any = {
      status: 'ACTIVE'
    };

    // If activating from DRAFT (direct activation), set signedAt
    if (contract.status === 'DRAFT') {
      updateData.signedAt = new Date();
      console.log('[ACTIVATE] Direct activation from DRAFT status');
    } else {
      console.log('[ACTIVATE] Normal activation from SIGNED status');
      // signedAt is already set when vendor accepted
    }

    const [updatedContract, updatedPR] = await prisma.$transaction([
      prisma.serviceContract.update({
        where: { id },
        data: updateData
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