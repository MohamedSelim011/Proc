import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        vendor: true,
        department: true,
        project: true,
        servicePR: {
          include: {
            department: true,
            project: true,
            items: {
              include: {
                serviceItem: {
                  include: {
                    serviceCategory: true
                  }
                }
              }
            },
            materialItems: {
              include: {
                item: true,
              },
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
        },
        documents: {
          orderBy: {
            uploadedAt: 'desc'
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

    const approvalNotesByVersion = new Map<number, any[]>();
    if (contract.approval?.approvalHistory?.length) {
      for (const entry of contract.approval.approvalHistory) {
        if (!entry.contractVersionNumber) continue;
        const list = approvalNotesByVersion.get(entry.contractVersionNumber) || [];
        list.push(entry);
        approvalNotesByVersion.set(entry.contractVersionNumber, list);
      }
    }

    const versionsWithNotes = contract.versions?.map((version) => ({
      ...version,
      approvalNotes: approvalNotesByVersion.get(version.versionNumber) || [],
    }));

    const pr = contract.servicePR
      ? {
          id: contract.servicePR.id,
          prNumber: contract.servicePR.prNumber,
          estimatedCost: contract.servicePR.estimatedCost,
          servicePR: contract.servicePR,
          items: contract.servicePR.materialItems?.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice,
            item: item.item,
          })) ?? [],
          department: contract.servicePR.department || null,
          project: contract.servicePR.project || null,
        }
      : null;

    const resolvedDepartment = contract.department || contract.servicePR?.department || null;
    const resolvedProject = contract.project || contract.servicePR?.project || null;

    return NextResponse.json({
      ...contract,
      department: resolvedDepartment,
      project: resolvedProject,
      versions: versionsWithNotes,
      pr
    });
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
        servicePR: true
      }
    });

    // Keep the current version snapshot in sync (no new version for direct edits)
    try {
      await prisma.serviceContractVersion.upsert({
        where: {
          contractId_versionNumber: {
            contractId: id,
            versionNumber: existingContract.versionNumber,
          },
        },
        update: {
          contractNumber: updatedContract.contractNumber,
          vendorId: updatedContract.vendorId,
          contractType: updatedContract.contractType,
          startDate: updatedContract.startDate,
          endDate: updatedContract.endDate,
          totalValue: updatedContract.totalValue,
          serviceAmount: updatedContract.serviceAmount,
          currency: updatedContract.currency,
          paymentTerms: updatedContract.paymentTerms,
          slaTerms: updatedContract.slaTerms,
          penaltyClause: updatedContract.penaltyClause,
          performanceBond: updatedContract.performanceBond,
          retentionAmount: updatedContract.retentionAmount,
          insuranceRequirements: updatedContract.insuranceRequirements,
          status: updatedContract.status,
        },
        create: {
          contractId: id,
          versionNumber: existingContract.versionNumber,
          contractNumber: updatedContract.contractNumber,
          vendorId: updatedContract.vendorId,
          contractType: updatedContract.contractType,
          startDate: updatedContract.startDate,
          endDate: updatedContract.endDate,
          totalValue: updatedContract.totalValue,
          serviceAmount: updatedContract.serviceAmount,
          currency: updatedContract.currency,
          paymentTerms: updatedContract.paymentTerms,
          slaTerms: updatedContract.slaTerms,
          penaltyClause: updatedContract.penaltyClause,
          performanceBond: updatedContract.performanceBond,
          retentionAmount: updatedContract.retentionAmount,
          insuranceRequirements: updatedContract.insuranceRequirements,
          status: updatedContract.status,
          createdBy: body.editedBy || updatedContract.createdBy || 'system',
          createdByName: body.editedByName || body.editedBy || updatedContract.createdBy || 'system',
          approvalStatus: 'PENDING',
        },
      })
    } catch (versionSyncError) {
      console.error('Error syncing contract version snapshot:', versionSyncError)
    }

    const legacyPr = updatedContract.servicePR
      ? {
          id: updatedContract.servicePR.id,
          prNumber: updatedContract.servicePR.prNumber,
          estimatedCost: updatedContract.servicePR.estimatedCost,
          servicePR: updatedContract.servicePR,
        }
      : null;

    const responsePayload = {
      ...updatedContract,
      pr: legacyPr,
    };

    return NextResponse.json(responsePayload);
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
