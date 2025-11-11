import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    return NextResponse.json({
      contracts,
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

    if (!prId || !vendorId || !startDate || !endDate || !totalValue || !paymentTerms) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Generate contract number
    const contractCount = await prisma.serviceContract.count();
    const contractNumber = `SC-${String(contractCount + 1).padStart(6, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create the service contract
      const contract = await tx.serviceContract.create({
        data: {
          contractNumber,
          prId,
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

      // Create milestones if provided
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
              amount: parseFloat(milestone.amount),
              status: 'PENDING'
            }
          });
        }
      }

      return contract;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating service contract:', error);
    return NextResponse.json(
      { error: 'Failed to create service contract' },
      { status: 500 }
    );
  }
}
