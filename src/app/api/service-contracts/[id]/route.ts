import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createContractVersion } from '@/lib/contract-version-service';


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
            items: {
              include: {
                item: true
              }
            },
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
        },
        approval: {
          include: {
            approvalHistory: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        },
        versions: {
          orderBy: {
            versionNumber: 'desc'
          },
          take: 5
        },
        vendorResponses: {
          orderBy: {
            createdAt: 'desc'
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

    console.log('[GET CONTRACT] Approval data being returned:', {
      contractId: contract.id,
      approvalId: contract.approval?.id,
      approvalLevel: contract.approval?.level,
      approvalStatus: contract.approval?.status,
      historyCount: contract.approval?.approvalHistory?.length
    });

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
        serviceAmount: body.serviceAmount ?? body.totalValue,
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

    // Create a new version snapshot after edit
    if (body.editedBy) {
      try {
        await createContractVersion({
          contractId: id,
          changeReason: body.changeReason || 'Contract updated',
          changeDescription: body.changeDescription || 'Contract details modified',
          createdBy: body.editedBy,
          createdByName: body.editedByName
        });
      } catch (versionError) {
        console.error('Error creating version after edit:', versionError);
        // Continue even if version creation fails
      }
    }

    return NextResponse.json(updatedContract);
  } catch (error) {
    console.error('Error updating service contract:', error);
    return NextResponse.json(
      { error: 'Failed to update service contract' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Only allow deleting DRAFT contracts
    if (existingContract.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft contracts can be deleted' },
        { status: 400 }
      );
    }

    // Delete the contract
    await prisma.serviceContract.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Service contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting service contract:', error);
    return NextResponse.json(
      { error: 'Failed to delete service contract' },
      { status: 500 }
    );
  }
} 