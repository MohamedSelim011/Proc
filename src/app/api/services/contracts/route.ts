import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createContractVersion } from '@/lib/contract-version-service';

// GET /api/services/contracts - Get service contracts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const vendorId = searchParams.get('vendorId') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [contracts, total] = await Promise.all([
      prisma.serviceContract.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: true,
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
          },
          milestones: {
            orderBy: {
              milestoneNumber: 'asc'
            }
          },
          receipts: {
            orderBy: {
              receiptDate: 'desc'
            },
            take: 5
          },
          performances: {
            orderBy: {
              evaluatedAt: 'desc'
            },
            take: 3
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.serviceContract.count({ where })
    ]);

    const contractsWithLegacyPr = contracts.map((contract) => {
      const servicePR = contract.servicePR;
      const pr = servicePR
        ? {
            id: servicePR.id,
            prNumber: servicePR.prNumber,
            estimatedCost: servicePR.estimatedCost,
            servicePR,
          }
        : null;

      return {
        ...contract,
        pr,
      };
    });

    return NextResponse.json({
      contracts: contractsWithLegacyPr,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching service contracts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service contracts' },
      { status: 500 }
    );
  }
}

// POST /api/services/contracts - Create service contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prId,
      servicePrId,
      vendorId,
      contractType,
      startDate,
      endDate,
      totalValue,
      currency,
      paymentTerms,
      slaTerms,
      penaltyClause,
      performanceBond,
      retentionAmount,
      insuranceRequirements,
      milestones
    } = body;

    const resolvedServicePrId = servicePrId || prId;

    if (!resolvedServicePrId || !vendorId || !startDate || !endDate || !totalValue || !paymentTerms) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Check payment schedule before creating contract and milestones
    const pr = await prisma.servicePR.findUnique({
      where: { id: resolvedServicePrId },
    });

    if (milestones && milestones.length > 0) {
      const paymentSchedule = pr?.paymentSchedule;
      if (paymentSchedule && paymentSchedule !== 'MILESTONE') {
        if (milestones.length !== 1) {
          return NextResponse.json(
            { error: 'Only one milestone is allowed for this payment schedule.' },
            { status: 400 }
          );
        }
        const totalValueNumber = Number(totalValue || 0);
        const milestoneAmount = Number(milestones[0]?.amount || 0);
        if (Math.abs(totalValueNumber - milestoneAmount) > 0.01) {
          return NextResponse.json(
            { error: 'Milestone amount must match total contract value.' },
            { status: 400 }
          );
        }
      }
    }

    // Generate contract number
    const contractCount = await prisma.serviceContract.count();
    const contractNumber = `SC-${String(contractCount + 1).padStart(6, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create the service contract
      const contract = await tx.serviceContract.create({
        data: {
          contractNumber,
          servicePrId: resolvedServicePrId,
          departmentId: pr?.departmentId || null,
          projectId: pr?.projectId || null,
          vendorId,
          contractType: contractType || 'SERVICE_AGREEMENT',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          totalValue: parseFloat(totalValue),
          currency: currency || 'OMR',
          paymentTerms,
          slaTerms,
          penaltyClause,
          performanceBond: performanceBond ? parseFloat(performanceBond) : null,
          retentionAmount: retentionAmount ? parseFloat(retentionAmount) : null,
          insuranceRequirements,
          status: 'DRAFT'
        }
      });

      // Create milestones if provided (already validated above)
      if (milestones && milestones.length > 0) {
        for (let i = 0; i < milestones.length; i++) {
          const milestone = milestones[i];
          await tx.serviceMilestone.create({
            data: {
              contractId: contract.id,
              milestoneNumber: i + 1,
              name: milestone.name,
              description: milestone.description,
              targetDate: new Date(milestone.targetDate),
              completionCriteria: milestone.completionCriteria,
              paymentPercentage: parseFloat(milestone.paymentPercentage),
              amount: parseFloat(milestone.amount)
            }
          });
        }
      }

      return contract;
    });

    try {
      await createContractVersion({
        contractId: result.id,
        createdBy: body.createdBy || 'system',
        createdByName: body.createdByName || body.createdBy || 'system',
      });
    } catch (versionError) {
      console.error('Error creating initial version:', versionError);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating service contract:', error);
    return NextResponse.json(
      { error: 'Failed to create service contract' },
      { status: 500 }
    );
  }
}
