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
        pr: {
          include: {
            items: true
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

    const result = await prisma.$transaction(async (tx) => {
      const updatedContract = await tx.serviceContract.update({
        where: { id },
        data: updateData
      });

      const updatedPR = await tx.purchaseRequisition.update({
        where: { id: contract.prId },
        data: { status: 'CONVERTED' }
      });

      // Auto-create material PO when contract is activated (for mixed requisitions)
      // Idempotent check: skip if a PO for this PR + vendor already exists.
      let autoCreatedPO: any = null;
      const materialLines = contract.pr.items || [];
      if (materialLines.length > 0) {
        const existingPO = await tx.purchaseOrder.findFirst({
          where: {
            prId: contract.prId,
            vendorId: contract.vendorId
          }
        });

        if (!existingPO) {
          const count = await tx.purchaseOrder.count();
          const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
          const totalAmount = materialLines.reduce(
            (sum, line) => sum + Number(line.quantity || 0) * Number(line.estimatedPrice || 0),
            0
          );

          autoCreatedPO = await tx.purchaseOrder.create({
            data: {
              poNumber,
              prId: contract.prId,
              vendorId: contract.vendorId,
              deliveryDate: contract.pr.requiredByDate || contract.endDate || new Date(),
              deliveryAddress: {
                type: 'AUTO_FROM_CONTRACT',
                note: `Auto-generated when activating contract ${contract.contractNumber}`
              },
              paymentTerms: contract.paymentTerms,
              status: 'COMPLETED',
              totalAmount,
              invoicedAmount: 0,
              currency: contract.currency,
              createdBy: activatedBy || contract.createdBy || 'system',
              items: {
                create: materialLines.map((line) => ({
                  itemId: line.itemId,
                  quantity: Number(line.quantity || 0),
                  unitPrice: Number(line.estimatedPrice || 0),
                  totalPrice: Number(line.quantity || 0) * Number(line.estimatedPrice || 0),
                  deliveryDate: line.requiredDate || contract.pr.requiredByDate || contract.endDate || null
                }))
              }
            }
          });
        }
      }

      return { updatedContract, updatedPR, autoCreatedPO };
    });

    return NextResponse.json({
      message: 'Service contract activated successfully',
      contract: result.updatedContract,
      purchaseRequisition: result.updatedPR,
      autoCreatedPO: result.autoCreatedPO
    });

  } catch (error) {
    console.error('Error activating service contract:', error);
    return NextResponse.json(
      { error: 'Failed to activate service contract' },
      { status: 500 }
    );
  }
} 
