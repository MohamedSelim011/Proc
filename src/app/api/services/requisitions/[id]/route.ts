import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/jwt';

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
        items: {
          include: {
            item: true
          }
        },
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
    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    const normalizedRole = (user.role || '').toUpperCase();
    const canApprove = ['PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(normalizedRole);
    const isOwner =
      purchaseRequisition.requesterId === user.id ||
      purchaseRequisition.requesterId === user.employeeId ||
      purchaseRequisition.createdBy === user.id ||
      purchaseRequisition.createdBy === user.employeeId;

    const requestedStatus = String(body.status || '').toUpperCase();
    const currentStatus = purchaseRequisition.status;
    let nextStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

    if (requestedStatus === 'PENDING_APPROVAL') {
      if (currentStatus !== 'DRAFT') {
        return NextResponse.json(
          { error: `Only DRAFT requisitions can request approval. Current status: ${currentStatus}` },
          { status: 400 }
        );
      }
      if (!isOwner && !['REQUESTOR', 'DEPARTMENT_MANAGER', 'PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(normalizedRole)) {
        return NextResponse.json(
          { error: 'You do not have permission to request approval for this requisition' },
          { status: 403 }
        );
      }
      nextStatus = 'PENDING_APPROVAL';
    } else if (requestedStatus === 'APPROVED' || requestedStatus === 'REJECTED') {
      if (!canApprove) {
        return NextResponse.json(
          { error: 'Only Procurement Manager or Admin can approve requisitions' },
          { status: 403 }
        );
      }
      if (currentStatus !== 'PENDING_APPROVAL' && currentStatus !== 'SUBMITTED') {
        return NextResponse.json(
          { error: `Only pending requisitions can be approved/rejected. Current status: ${currentStatus}` },
          { status: 400 }
        );
      }
      nextStatus = requestedStatus as 'APPROVED' | 'REJECTED';
    } else {
      return NextResponse.json(
        { error: 'Invalid status transition. Allowed values: PENDING_APPROVAL, APPROVED, REJECTED' },
        { status: 400 }
      );
    }

    // Update the requisition status
    const updatedRequisition = await prisma.purchaseRequisition.update({
      where: { id },
      data: {
        status: nextStatus,
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            item: true
          }
        },
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
        items: {
          include: {
            item: true
          }
        },
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
