import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prId = searchParams.get('prId');

    let where: any = {};

    if (prId) {
      where.prId = prId;
    }

    const rfps = await prisma.serviceRFP.findMany({
      where,
      include: {
        pr: {
          select: {
            prNumber: true,
            estimatedCost: true,
            servicePR: {
              select: {
                serviceScope: true,
                duration: true,
                durationUnit: true,
              }
            }
          }
        },
        invitedVendors: {
          include: {
            vendor: {
              select: {
                id: true,
                nameEn: true,
                email: true,
                mobile: true,
              }
            }
          }
        },
        responses: {
          include: {
            vendor: {
              select: {
                id: true,
                nameEn: true,
                email: true,
              }
            }
          }
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ rfps }, { status: 200 });
  } catch (error) {
    console.error('Error fetching Service RFPs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Service RFPs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prId,
      title,
      description,
      submissionDeadline,
      evaluationCriteria,
      termsAndConditions,
      invitedVendors,
      createdBy
    } = body;

    // Check if RFP already exists for this PR
    const existingRFP = await prisma.serviceRFP.findFirst({
      where: { prId }
    });

    if (existingRFP) {
      return NextResponse.json(
        { error: 'An RFP already exists for this Service Requisition' },
        { status: 400 }
      );
    }

    // Generate RFP number
    const count = await prisma.serviceRFP.count();
    const rfpNumber = `RFP-SRV-${String(count + 1).padStart(5, '0')}`;

    // Determine closing date
    let closingDate = new Date();
    if (submissionDeadline) {
      closingDate = new Date(submissionDeadline);
    } else {
      closingDate.setDate(closingDate.getDate() + 7); // Default 7 days from now
    }

    // Create RFP
    const rfp = await prisma.serviceRFP.create({
      data: {
        rfpNumber,
        prId,
        title,
        description,
        closingDate,
        evaluationCriteria: evaluationCriteria ? JSON.stringify(evaluationCriteria) : null,
        termsAndConditions: termsAndConditions ? JSON.stringify(termsAndConditions) : null,
        createdBy: createdBy || 'SYSTEM',
        status: 'DRAFT',
      },
      include: {
        invitedVendors: true
      }
    });

    // Create vendor invitations
    if (invitedVendors && invitedVendors.length > 0) {
      await prisma.serviceRFPVendor.createMany({
        data: invitedVendors.map((vendorId: string) => ({
          rfpId: rfp.id,
          vendorId
        }))
      });
    }

    return NextResponse.json(rfp, { status: 201 });
  } catch (error) {
    console.error('Error creating Service RFP:', error);
    return NextResponse.json(
      { error: 'Failed to create Service RFP' },
      { status: 500 }
    );
  }
}

