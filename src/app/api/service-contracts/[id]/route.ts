import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        vendor: true,
        pr: {
          include: {
            servicePR: {
              include: {
                items: {
                  include: {
                    serviceItem: {
                      include: {
                        serviceCategory: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Service contract not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Error fetching service contract:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if contract exists
    const existingContract = await prisma.serviceContract.findUnique({
      where: { id }
    });

    if (!existingContract) {
      return NextResponse.json(
        { error: 'Service contract not found' },
        { status: 404 }
      );
    }

    // Only allow editing DRAFT contracts
    if (existingContract.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft contracts can be edited' },
        { status: 400 }
      );
    }

    // Update the contract
    const updatedContract = await prisma.serviceContract.update({
      where: { id },
      data: {
        vendorId: body.vendorId,
        contractType: body.contractType,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        totalValue: body.totalValue,
        currency: body.currency,
        paymentTerms: body.paymentTerms,
        slaTerms: body.slaTerms,
        penaltyClause: body.penaltyClause,
        performanceBond: body.performanceBond,
        retentionAmount: body.retentionAmount,
        insuranceRequirements: body.insuranceRequirements,
      },
      include: {
        vendor: true,
        pr: true
      }
    });

    return NextResponse.json(updatedContract);
  } catch (error) {
    console.error('Error updating service contract:', error);
    return NextResponse.json(
      { error: 'Failed to update service contract' },
      { status: 500 }
    );
  }
} 