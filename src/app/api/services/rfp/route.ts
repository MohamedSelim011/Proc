import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prId = searchParams.get('prId');
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let where: any = {};

    if (prId) {
      where.prId = prId;
    }

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [rfps, total, stats] = await Promise.all([
      prisma.serviceRFP.findMany({
        where,
        skip,
        take: limit,
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
      }),
      prisma.serviceRFP.count({ where }),
      // Get stats counts (without filters to get accurate totals)
      Promise.all([
        prisma.serviceRFP.count({ where: { status: 'DRAFT' } }),
        prisma.serviceRFP.count({ where: { status: 'SENT' } }),
        prisma.serviceRFP.count({ where: { status: 'EVALUATED' } }),
        prisma.serviceRFP.count()
      ]).then(([draft, sent, evaluated, total]) => ({
        draft,
        sent,
        evaluated,
        total
      }))
    ]);

    return NextResponse.json({ 
      rfps,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats
    }, { status: 200 });
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
    // submissionDeadline comes as ISO string from frontend (UTC)
    let closingDate: Date;
    if (submissionDeadline) {
      // Parse the ISO string to ensure we preserve the exact date and time
      closingDate = new Date(submissionDeadline);
      // Validate the date
      if (isNaN(closingDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid submission deadline date format' },
          { status: 400 }
        );
      }
      
      console.log('RFP closing date saved:', {
        input: submissionDeadline,
        closingDate: closingDate.toISOString(),
        closingDateLocal: closingDate.toLocaleString(),
        closingDateUTC: closingDate.toUTCString()
      });
    } else {
      // Default to 7 days from now
      closingDate = new Date();
      closingDate.setDate(closingDate.getDate() + 7);
    }

    // Create RFP with DRAFT status
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
        status: 'DRAFT', // Always create as DRAFT - invitations must be sent separately after approval
      },
      include: {
        invitedVendors: true
      }
    });

    console.log(`Service RFP created with status: ${rfp.status} (RFP Number: ${rfp.rfpNumber})`);

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

