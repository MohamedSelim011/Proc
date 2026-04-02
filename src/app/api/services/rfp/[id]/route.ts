import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rfp = await prisma.serviceRFP.findUnique({
      where: { id },
      include: {
        servicePR: {
          select: {
            id: true,
            prNumber: true,
            estimatedCost: true,
            serviceScope: true,
            duration: true,
            durationUnit: true,
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
          },
          orderBy: [
            { totalAmount: 'asc' },
            { technicalScore: 'desc' }
          ]
        },
        approvals: {
          orderBy: {
            level: 'asc'
          }
        },
        documents: {
          orderBy: {
            uploadedAt: 'desc'
          }
        }
      }
    });

    if (!rfp) {
      return NextResponse.json(
        { error: 'Service RFP not found' },
        { status: 404 }
      );
    }

    const legacyPr = rfp.servicePR
      ? {
          id: rfp.servicePR.id,
          prNumber: rfp.servicePR.prNumber,
          estimatedCost: rfp.servicePR.estimatedCost,
          servicePR: {
            serviceScope: rfp.servicePR.serviceScope,
            duration: rfp.servicePR.duration,
            durationUnit: rfp.servicePR.durationUnit,
            items: rfp.servicePR.items,
          },
        }
      : null;

    const responseWithAccessibleProposalUrls = {
      ...rfp,
      pr: legacyPr,
      responses: (rfp.responses || []).map((response) => ({
        ...response,
        proposalFileUrl: response.proposalFileUrl
          ? `/api/services/rfp/${id}/responses/${response.id}/proposal`
          : null,
      })),
    };

    return NextResponse.json(responseWithAccessibleProposalUrls, { status: 200 });
  } catch (error) {
    console.error('Error fetching Service RFP:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Service RFP' },
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
    const { status } = body;

    const rfp = await prisma.serviceRFP.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json(rfp, { status: 200 });
  } catch (error) {
    console.error('Error updating Service RFP:', error);
    return NextResponse.json(
      { error: 'Failed to update Service RFP' },
      { status: 500 }
    );
  }
}

