import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/jwt';

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const toNumber = (value: unknown) => {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapServiceRequisition = (sr: any) => ({
  id: sr.id,
  prNumber: sr.prNumber,
  requesterId: sr.requesterId,
  departmentId: sr.departmentId,
  projectId: sr.projectId,
  requestBasis: sr.requestBasis,
  priority: sr.priority,
  status: sr.status,
  estimatedCost: sr.estimatedCost,
  justification: sr.justification,
  requiredByDate: sr.requiredByDate,
  createdAt: sr.createdAt,
  updatedAt: sr.updatedAt,
  items: sr.materialItems?.map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    estimatedPrice: item.estimatedPrice,
    item: item.item,
  })) || [],
  servicePR: {
    id: sr.id,
    serviceScope: sr.serviceScope,
    serviceCategory: sr.serviceCategory,
    serviceType: sr.serviceType,
    requestor: sr.requestor,
    technicalSpecifications: sr.technicalSpecifications,
    qualityStandards: sr.qualityStandards,
    duration: sr.duration,
    durationUnit: sr.durationUnit,
    deliverables: sr.deliverables,
    performanceMetrics: sr.performanceMetrics,
    slaRequirements: sr.slaRequirements,
    certificationRequired: sr.certificationRequired,
    safetyRequirements: sr.safetyRequirements,
    paymentSchedule: sr.paymentSchedule,
    paymentTerms: sr.paymentTerms,
    preferredVendors: sr.preferredVendors,
    milestones: sr.milestones,
    items: sr.items || [],
  },
  approvals: sr.approvals || [],
  serviceRFP: sr.serviceRFP || null,
  serviceContracts: sr.serviceContracts || [],
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const serviceRequisition = await prisma.servicePR.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            serviceItem: { include: { serviceCategory: true } },
          },
        },
        materialItems: {
          include: { item: true },
        },
        serviceRFP: {
          select: {
            id: true,
            rfpNumber: true,
            title: true,
            status: true,
            issueDate: true,
            closingDate: true,
            createdAt: true,
            responses: {
              select: {
                id: true,
                tokenUsed: true,
                submittedAt: true,
                proposalFileUrl: true,
              },
            },
            _count: {
              select: {
                invitedVendors: true,
              },
            },
          },
        },
        serviceContracts: {
          include: {
            vendor: {
              select: {
                id: true,
                nameEn: true,
                vendorCode: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!serviceRequisition) {
      return NextResponse.json({ error: 'Service requisition not found' }, { status: 404 });
    }

    return NextResponse.json(mapServiceRequisition(serviceRequisition));
  } catch (error) {
    console.error('Error fetching service requisition:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRequisition = await prisma.servicePR.findUnique({ where: { id } });
    if (!serviceRequisition) {
      return NextResponse.json({ error: 'Service requisition not found' }, { status: 404 });
    }

    const normalizedRole = (user.role || '').toUpperCase();
    const canApprove = ['PROCUREMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(normalizedRole);
    const isOwner =
      serviceRequisition.requesterId === user.id ||
      serviceRequisition.requesterId === user.employeeId ||
      serviceRequisition.createdBy === user.id ||
      serviceRequisition.createdBy === user.employeeId;

    const requestedStatus = String(body.status || '').toUpperCase();
    const currentStatus = serviceRequisition.status;
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

    const updated = await prisma.servicePR.update({
      where: { id },
      data: {
        status: nextStatus,
        updatedAt: new Date(),
      },
      include: {
        items: {
          include: { serviceItem: { include: { serviceCategory: true } } },
        },
        materialItems: {
          include: { item: true },
        },
      },
    });

    return NextResponse.json(mapServiceRequisition(updated));
  } catch (error) {
    console.error('Error updating service requisition:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.servicePR.findUnique({
      where: { id },
      include: {
        items: true,
        materialItems: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service requisition not found' }, { status: 404 });
    }

    const normalizedRequestBasis = String(body.requestBasis || '').toUpperCase();
    const resolvedRequestBasis: 'DEPARTMENT' | 'PROJECT' =
      normalizedRequestBasis === 'PROJECT' || normalizedRequestBasis === 'DEPARTMENT'
        ? (normalizedRequestBasis as 'DEPARTMENT' | 'PROJECT')
        : (typeof body.projectId === 'string' && body.projectId.trim() ? 'PROJECT' : 'DEPARTMENT');

    const normalizedDepartmentId = normalizeString(body.departmentId);
    const normalizedProjectId = normalizeString(body.projectId);

    if (resolvedRequestBasis === 'DEPARTMENT' && !normalizedDepartmentId) {
      return NextResponse.json(
        { error: 'Department is required for department-based requisitions' },
        { status: 400 }
      );
    }

    if (resolvedRequestBasis === 'PROJECT' && !normalizedProjectId) {
      return NextResponse.json({ error: 'Project is required for project-based requisitions' }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one service item is required' }, { status: 400 });
    }

    const serviceEstimatedCost = body.items.reduce((sum: number, item: any) => {
      return sum + toNumber(item.quantity) * toNumber(item.estimatedRate) * Math.max(toNumber(item.duration || 1), 1);
    }, 0);
    const materialEstimatedCost = Array.isArray(body.materialItems)
      ? body.materialItems.reduce(
          (sum: number, item: any) => sum + toNumber(item.quantity) * toNumber(item.estimatedPrice),
          0
        )
      : 0;
    const estimatedCost = serviceEstimatedCost + materialEstimatedCost;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedHeader = await tx.servicePR.update({
        where: { id },
        data: {
          requestBasis: resolvedRequestBasis,
          departmentId: resolvedRequestBasis === 'DEPARTMENT' ? normalizedDepartmentId : null,
          projectId: resolvedRequestBasis === 'PROJECT' ? normalizedProjectId : null,
          priority: body.priority,
          justification: body.justification,
          estimatedCost,
          requiredByDate: body.requestedDeliveryDate
            ? new Date(body.requestedDeliveryDate)
            : body.requiredByDate
              ? new Date(body.requiredByDate)
              : null,
          updatedAt: new Date(),
          serviceScope: body.serviceScope,
          serviceCategory: body.serviceCategory || null,
          serviceType: body.serviceType || null,
          requestor: body.requestor || null,
          technicalSpecifications: body.technicalSpecifications,
          qualityStandards: body.qualityStandards,
          duration: body.duration,
          durationUnit: body.durationUnit,
          deliverables: body.deliverables,
          performanceMetrics: body.performanceMetrics,
          slaRequirements: body.slaRequirements,
          certificationRequired: body.certificationRequired,
          safetyRequirements: body.safetyRequirements,
          paymentSchedule: body.paymentSchedule,
          paymentTerms: body.paymentTerms,
          preferredVendors: body.preferredVendors,
        },
      });

      await tx.servicePRItem.deleteMany({ where: { servicePRId: id } });
      for (const item of body.items) {
        await tx.servicePRItem.create({
          data: {
            servicePRId: id,
            serviceItemId: item.serviceItemId,
            quantity: toNumber(item.quantity),
            estimatedRate: toNumber(item.estimatedRate),
            unit: item.unit || 'Hours',
            duration: toNumber(item.duration || 1),
            durationUnit: (item.durationUnit || 'DAYS').toUpperCase(),
            specifications: item.specifications || null,
            deliverables:
              item.deliverables && Array.isArray(item.deliverables) && item.deliverables.length > 0
                ? item.deliverables
                : null,
            performanceMetrics:
              item.performanceMetrics && Array.isArray(item.performanceMetrics) && item.performanceMetrics.length > 0
                ? item.performanceMetrics
                : null,
          },
        });
      }

      await tx.servicePRMaterialItem.deleteMany({ where: { servicePrId: id } });
      if (Array.isArray(body.materialItems) && body.materialItems.length > 0) {
        for (const material of body.materialItems) {
          await tx.servicePRMaterialItem.create({
            data: {
              servicePrId: id,
              itemId: material.itemId,
              quantity: toNumber(material.quantity),
              estimatedPrice: toNumber(material.estimatedPrice),
              specifications: material.specifications || null,
              requiredDate: material.requiredDate ? new Date(material.requiredDate) : null,
            },
          });
        }
      }

      return updatedHeader;
    });

    const refreshed = await prisma.servicePR.findUnique({
      where: { id: updated.id },
      include: {
        items: { include: { serviceItem: { include: { serviceCategory: true } } } },
        materialItems: { include: { item: true } },
      },
    });

    return NextResponse.json(refreshed ? mapServiceRequisition(refreshed) : updated);
  } catch (error) {
    console.error('Error updating service requisition:', error);
    return NextResponse.json({ error: 'Failed to update service requisition' }, { status: 500 });
  }
}
