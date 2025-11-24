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
        pr: {
          select: {
            prNumber: true,
            estimatedCost: true,
            servicePR: {
              select: {
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
        }
      }
    });

    if (!rfp) {
      return NextResponse.json(
        { error: 'Service RFP not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rfp, { status: 200 });
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

