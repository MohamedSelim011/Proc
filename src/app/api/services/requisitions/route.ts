import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/jwt';
import { createActivityLog } from '@/lib/activity-log';

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const toNumber = (value: unknown) => {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// GET /api/services/requisitions - Get service requisitions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = normalizeString(searchParams.get('status'));
    const priority = normalizeString(searchParams.get('priority'));
    const departmentId = normalizeString(searchParams.get('departmentId') || searchParams.get('department'));
    const serviceType = normalizeString(searchParams.get('serviceType'));
    const search = normalizeString(searchParams.get('search'));

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (serviceType) {
      where.serviceType = serviceType;
    }

    if (search) {
      where.OR = [
        { prNumber: { contains: search, mode: 'insensitive' } },
        { departmentId: { contains: search, mode: 'insensitive' } },
        { requesterId: { contains: search, mode: 'insensitive' } },
        { serviceScope: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [serviceRequisitions, total] = await Promise.all([
      prisma.servicePR.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              serviceItem: {
                include: { serviceCategory: true },
              },
            },
          },
          materialItems: {
            include: {
              item: true,
            },
          },
          approvals: {
            orderBy: { createdAt: 'desc' },
          },
          serviceRFP: {
            select: { id: true, rfpNumber: true, status: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.servicePR.count({ where }),
    ]);

    const distinctServiceTypes = await prisma.servicePR.findMany({
      where: { serviceType: { not: null } },
      select: { serviceType: true },
      distinct: ['serviceType'],
    });

    const serviceTypes = distinctServiceTypes
      .map((sp) => sp.serviceType)
      .filter((type): type is string => type !== null)
      .sort();

    const mapped = serviceRequisitions.map((sr) => ({
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
      items: sr.materialItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        estimatedPrice: item.estimatedPrice,
        item: item.item,
      })),
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
        items: sr.items,
      },
      approvals: sr.approvals,
      serviceRFP: sr.serviceRFP,
    }));

    return NextResponse.json({
      serviceRequisitions: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      serviceTypes,
    });
  } catch (error) {
    console.error('Error fetching service requisitions:', error);
    return NextResponse.json({ error: 'Failed to fetch service requisitions' }, { status: 500 });
  }
}

// POST /api/services/requisitions - Create service requisition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      requestBasis,
      departmentId,
      projectId,
      priority,
      justification,
      requestedDeliveryDate,
      serviceScope,
      serviceCategory,
      serviceType,
      requestor,
      technicalSpecifications,
      qualityStandards,
      duration,
      durationUnit,
      deliverables,
      performanceMetrics,
      slaRequirements,
      certificationRequired,
      safetyRequirements,
      paymentSchedule,
      paymentTerms,
      preferredVendors,
      milestones,
      items,
      materialItems,
      isMixed,
    } = body;

    const normalizedRequestBasis = String(requestBasis || '').toUpperCase();
    const resolvedRequestBasis: 'DEPARTMENT' | 'PROJECT' =
      normalizedRequestBasis === 'PROJECT' || normalizedRequestBasis === 'DEPARTMENT'
        ? (normalizedRequestBasis as 'DEPARTMENT' | 'PROJECT')
        : (typeof projectId === 'string' && projectId.trim() ? 'PROJECT' : 'DEPARTMENT');

    const normalizedDepartmentId = normalizeString(departmentId);
    const normalizedProjectId = normalizeString(projectId);
    const normalizedServiceScope = normalizeString(serviceScope);
    const user = getAuthenticatedUser(request);
    const creatorId = user?.employeeId || user?.id || '';

    if (!creatorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!normalizedServiceScope || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    if (resolvedRequestBasis === 'DEPARTMENT' && !normalizedDepartmentId) {
      return NextResponse.json(
        { error: 'Department is required for department-based requisitions' },
        { status: 400 }
      );
    }

    if (resolvedRequestBasis === 'PROJECT' && !normalizedProjectId) {
      return NextResponse.json({ error: 'Project is required for project-based requisitions' }, { status: 400 });
    }

    if (isMixed && (!Array.isArray(materialItems) || materialItems.length === 0)) {
      return NextResponse.json(
        { error: 'Mixed requisitions require at least one material line' },
        { status: 400 }
      );
    }

    if (requestedDeliveryDate) {
      const selectedDate = new Date(requestedDeliveryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(selectedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format for required by date' }, { status: 400 });
      }

      if (selectedDate < today) {
        return NextResponse.json({ error: 'Required by date must be today or in the future' }, { status: 400 });
      }

      if (selectedDate.getFullYear() < 1900) {
        return NextResponse.json({ error: 'Date cannot be before year 1900' }, { status: 400 });
      }

      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 10);
      if (selectedDate > maxDate) {
        return NextResponse.json({ error: 'Date cannot be more than 10 years in the future' }, { status: 400 });
      }
    }

    const serviceEstimatedCost = items.reduce(
      (sum: number, item: any) =>
        sum + toNumber(item.quantity) * toNumber(item.estimatedRate) * Math.max(toNumber(item.duration || 1), 1),
      0
    );
    const materialEstimatedCost = Array.isArray(materialItems)
      ? materialItems.reduce(
          (sum: number, item: any) => sum + toNumber(item.quantity) * toNumber(item.estimatedPrice),
          0
        )
      : 0;
    const totalEstimatedCost = serviceEstimatedCost + materialEstimatedCost;

    const srCount = await prisma.servicePR.count();
    const prNumber = `SPR-${String(srCount + 1).padStart(6, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const servicePR = await tx.servicePR.create({
        data: {
          prNumber,
          requesterId: creatorId,
          requestBasis: resolvedRequestBasis,
          departmentId: resolvedRequestBasis === 'DEPARTMENT' ? normalizedDepartmentId : null,
          projectId: resolvedRequestBasis === 'PROJECT' ? normalizedProjectId : null,
          priority: priority || 'NORMAL',
          status: 'DRAFT',
          estimatedCost: totalEstimatedCost,
          justification,
          requiredByDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
          createdBy: creatorId,

          serviceScope: normalizedServiceScope,
          serviceCategory: serviceCategory || null,
          serviceType: serviceType || null,
          requestor: requestor || null,
          technicalSpecifications: technicalSpecifications || null,
          qualityStandards: qualityStandards || null,
          duration: duration || 30,
          durationUnit: (durationUnit || 'DAYS').toUpperCase(),
          deliverables: deliverables && Array.isArray(deliverables) && deliverables.length > 0 ? deliverables : [],
          performanceMetrics:
            performanceMetrics && Array.isArray(performanceMetrics) && performanceMetrics.length > 0
              ? performanceMetrics
              : null,
          slaRequirements: slaRequirements || null,
          certificationRequired: certificationRequired || false,
          safetyRequirements: safetyRequirements || null,
          paymentSchedule: paymentSchedule || 'MILESTONE',
          paymentTerms: paymentTerms || null,
          preferredVendors:
            preferredVendors && Array.isArray(preferredVendors) && preferredVendors.length > 0
              ? preferredVendors
              : null,
          milestones: milestones && Array.isArray(milestones) && milestones.length > 0 ? milestones : null,
        },
      });

      for (const item of items) {
        let serviceItem;

        if (item.serviceItemId && item.serviceItemId !== 'IT-001') {
          serviceItem = await tx.serviceItem.findUnique({ where: { id: item.serviceItemId } });
        }

        if (!serviceItem) {
          let serviceCategoryRecord = await tx.serviceCategory.findFirst({
            where: { nameEn: serviceCategory || 'Custom Services' },
          });

          if (!serviceCategoryRecord) {
            const existingCustom = await tx.serviceCategory.findFirst({ where: { code: 'CUSTOM' } });
            if (existingCustom) {
              serviceCategoryRecord = existingCustom;
            } else {
              serviceCategoryRecord = await tx.serviceCategory.create({
                data: {
                  code: 'CUSTOM',
                  nameEn: serviceCategory || 'Custom Services',
                  nameAr: 'خدمات مخصصة',
                  description: 'Custom service items created during requisition',
                  requiresInsurance: false,
                  requiresCertification: false,
                  requiresPerformanceBond: false,
                },
              });
            }
          }

          const serviceItemCount = await tx.serviceItem.count();
          const serviceCode = `CUSTOM-${String(serviceItemCount + 1).padStart(6, '0')}`;

          serviceItem = await tx.serviceItem.create({
            data: {
              serviceCode,
              nameEn: item.description || serviceType || 'Custom Service',
              nameAr: 'خدمة مخصصة',
              description: item.specifications || item.description || 'Custom service item',
              serviceCategoryId: serviceCategoryRecord.id,
              unitOfMeasure: item.unit || 'Hours',
              standardRate: toNumber(item.estimatedRate),
              currency: 'OMR',
              slaRequired: false,
              performanceMetrics:
                item.performanceMetrics && Array.isArray(item.performanceMetrics) && item.performanceMetrics.length > 0
                  ? item.performanceMetrics
                  : null,
            },
          });
        }

        await tx.servicePRItem.create({
          data: {
            servicePRId: servicePR.id,
            serviceItemId: serviceItem.id,
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

      if (Array.isArray(materialItems) && materialItems.length > 0) {
        for (const material of materialItems) {
          if (!material.itemId || toNumber(material.quantity) <= 0 || toNumber(material.estimatedPrice) <= 0) {
            throw new Error('Invalid material line in mixed requisition');
          }
          await tx.servicePRMaterialItem.create({
            data: {
              servicePrId: servicePR.id,
              itemId: material.itemId,
              quantity: toNumber(material.quantity),
              estimatedPrice: toNumber(material.estimatedPrice),
              specifications: material.specifications || null,
              requiredDate: material.requiredDate ? new Date(material.requiredDate) : null,
            },
          });
        }
      }

      return servicePR;
    });

    await createActivityLog({
      type: 'SERVICE_REQUISITION',
      entityType: 'ServicePR',
      entityId: result.id,
      title: `Service Requisition ${result.prNumber} created`,
      status: result.status,
      amount: Number(result.estimatedCost || 0),
      currency: 'OMR',
      createdBy: creatorId,
      createdByName: user?.name || user?.email || creatorId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating service requisition:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: `Failed to create service requisition: ${errorMessage}` }, { status: 500 });
  }
}
