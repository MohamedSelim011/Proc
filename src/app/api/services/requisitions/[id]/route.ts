import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the purchase requisition by ID
    const purchaseRequisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
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
    });

    if (!purchaseRequisition) {
      return NextResponse.json(
        { error: 'Service requisition not found' },
        { status: 404 }
      );
    }

    // Check if it's a service requisition
    if (purchaseRequisition.itemType !== 'SERVICE') {
      return NextResponse.json(
        { error: 'This is not a service requisition' },
        { status: 400 }
      );
    }

    return NextResponse.json(purchaseRequisition);
  } catch (error) {
    console.error('Error fetching service requisition:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Find the purchase requisition
    const purchaseRequisition = await prisma.purchaseRequisition.findUnique({
      where: { id }
    });

    if (!purchaseRequisition) {
      return NextResponse.json(
        { error: 'Service requisition not found' },
        { status: 404 }
      );
    }

    // Check if it's a service requisition
    if (purchaseRequisition.itemType !== 'SERVICE') {
      return NextResponse.json(
        { error: 'This is not a service requisition' },
        { status: 400 }
      );
    }

    // Update the requisition status
    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id },
      data: {
        status: body.status,
        updatedAt: new Date()
      },
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
    });

    return NextResponse.json(updatedRequisition);
  } catch (error) {
    console.error('Error updating service requisition:', error);
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

    // Find the existing purchase requisition
    const existingPR = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        servicePR: {
          include: {
            items: true
          }
        }
      }
    });

    if (!existingPR) {
      return NextResponse.json(
        { error: 'Service requisition not found' },
        { status: 404 }
      );
    }

    // Check if it's a service requisition
    if (existingPR.itemType !== 'SERVICE') {
      return NextResponse.json(
        { error: 'This is not a service requisition' },
        { status: 400 }
      );
    }

    // Calculate total estimated cost
    const estimatedCost = body.items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.estimatedRate);
    }, 0);

    // Update the purchase requisition and service PR
    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id },
      data: {
        departmentId: body.departmentId,
        requesterId: body.requesterId,
        priority: body.priority,
        budgetCode: body.budgetCode,
        justification: body.justification,
        estimatedCost: estimatedCost,
        requestedDeliveryDate: new Date(body.requiredByDate || new Date()),
        costCenter: body.costCenter,
        updatedAt: new Date(),
        servicePR: {
          update: {
            serviceScope: body.serviceScope,
            technicalSpecifications: body.technicalSpecifications,
            duration: body.duration,
            durationUnit: body.durationUnit,
            deliverables: body.deliverables,
            performanceMetrics: body.performanceMetrics,
            slaRequirements: body.slaRequirements,
            insuranceRequired: body.insuranceRequired,
            certificationRequired: body.certificationRequired,
            safetyRequirements: body.safetyRequirements,
            paymentSchedule: body.paymentSchedule,
            retentionPercentage: body.retentionPercentage,
            preferredVendors: body.preferredVendors
          }
        }
      },
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
    });

    return NextResponse.json(updatedRequisition);
  } catch (error) {
    console.error('Error updating service requisition:', error);
    return NextResponse.json(
      { error: 'Failed to update service requisition' },
      { status: 500 }
    );
  }
}