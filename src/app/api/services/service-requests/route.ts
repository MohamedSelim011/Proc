import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = normalizeString(searchParams.get('search'));
    const prId = normalizeString(searchParams.get('prId'));
    const status = normalizeString(searchParams.get('status'));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (prId) {
      where.id = prId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { prNumber: { contains: search, mode: 'insensitive' } },
        { departmentId: { contains: search, mode: 'insensitive' } },
        { serviceScope: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.servicePR.findMany({
        where,
        include: {
          items: {
            include: {
              serviceItem: {
                include: { serviceCategory: true },
              },
            },
          },
          materialItems: {
            include: { item: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.servicePR.count({ where }),
    ]);

    const serviceRequests = rows.map((sr) => ({
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
    }));

    return NextResponse.json({
      serviceRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching service requests from ServicePR:', error);
    return NextResponse.json({ error: 'Failed to fetch service requests' }, { status: 500 });
  }
}
