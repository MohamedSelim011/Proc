import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/services/receipts - Get service receipt notes (SRNs)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const contractId = searchParams.get('contractId') || '';
    const acceptanceStatus = searchParams.get('acceptanceStatus') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (contractId) {
      where.contractId = contractId;
    }

    if (acceptanceStatus) {
      where.acceptanceStatus = acceptanceStatus;
    }

    const [receipts, total] = await Promise.all([
      prisma.serviceReceipt.findMany({
        where,
        skip,
        take: limit,
        include: {
          contract: {
            include: {
              vendor: true,
              pr: {
                include: {
                  servicePR: true
                }
              }
            }
          },
          milestone: true
        },
        orderBy: {
          receiptDate: 'desc'
        }
      }),
      prisma.serviceReceipt.count({ where })
    ]);

    return NextResponse.json({
      receipts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching service receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service receipts' },
      { status: 500 }
    );
  }
}

// POST /api/services/receipts - Create service receipt note (SRN)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contractId,
      milestoneId,
      serviceDescription,
      deliverables,
      qualityRating,
      performanceRating,
      completionPercentage,
      acceptanceStatus,
      notes,
      attachments,
      createdBy
    } = body;

    if (!contractId || !serviceDescription || !deliverables || completionPercentage === undefined || !createdBy) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Generate SRN number
    const srnCount = await prisma.serviceReceipt.count();
    const srnNumber = `SRN-${String(srnCount + 1).padStart(6, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create the service receipt
      const receipt = await tx.serviceReceipt.create({
        data: {
          srnNumber,
          contractId,
          milestoneId: milestoneId || null,
          serviceDescription,
          deliverables,
          qualityRating: qualityRating ? parseFloat(qualityRating) : null,
          performanceRating: performanceRating ? parseFloat(performanceRating) : null,
          completionPercentage: parseFloat(completionPercentage),
          acceptanceStatus: acceptanceStatus || 'PENDING',
          notes,
          attachments,
          createdBy
        }
      });

      // If milestone is provided and receipt is accepted, update milestone status
      if (milestoneId && acceptanceStatus === 'ACCEPTED') {
        await tx.serviceMilestone.update({
          where: { id: milestoneId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            approvedBy: createdBy,
            approvedAt: new Date()
          }
        });
      }

      return receipt;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating service receipt:', error);
    return NextResponse.json(
      { error: 'Failed to create service receipt' },
      { status: 500 }
    );
  }
}

// PUT /api/services/receipts/[id] - Update service receipt acceptance
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, acceptanceStatus, acceptedBy, rejectionReason, notes } = body;

    if (!id || !acceptanceStatus) {
      return NextResponse.json(
        { error: 'Receipt ID and acceptance status are required' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update the service receipt
      const receipt = await tx.serviceReceipt.update({
        where: { id },
        data: {
          acceptanceStatus,
          acceptedBy: acceptanceStatus === 'ACCEPTED' ? acceptedBy : null,
          acceptedAt: acceptanceStatus === 'ACCEPTED' ? new Date() : null,
          rejectionReason: acceptanceStatus === 'REJECTED' ? rejectionReason : null,
          notes
        }
      });

      // Update milestone status if applicable
      if (receipt.milestoneId) {
        if (acceptanceStatus === 'ACCEPTED') {
          await tx.serviceMilestone.update({
            where: { id: receipt.milestoneId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              approvedBy: acceptedBy,
              approvedAt: new Date()
            }
          });
        } else if (acceptanceStatus === 'REJECTED') {
          await tx.serviceMilestone.update({
            where: { id: receipt.milestoneId },
            data: {
              status: 'PENDING',
              completedAt: null,
              approvedBy: null,
              approvedAt: null,
              notes: rejectionReason
            }
          });
        }
      }

      return receipt;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating service receipt:', error);
    return NextResponse.json(
      { error: 'Failed to update service receipt' },
      { status: 500 }
    );
  }
}
