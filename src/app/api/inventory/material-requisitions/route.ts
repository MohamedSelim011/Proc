import { NextRequest, NextResponse } from 'next/server';
import { PRStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

const parseStatusFilter = (value: string): PRStatus | null => {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === 'PENDING' || normalized === 'PENDING_APPROVAL') return PRStatus.PENDING_APPROVAL;
  if (normalized === 'SUBMITTED' || normalized === 'IN_PROCUREMENT') return PRStatus.SUBMITTED;
  if (normalized === 'APPROVED') return PRStatus.APPROVED;
  if (normalized === 'REJECTED') return PRStatus.REJECTED;
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return PRStatus.CANCELLED;
  if (normalized === 'DRAFT') return PRStatus.DRAFT;
  if (normalized === 'CONVERTED') return PRStatus.CONVERTED;
  return null;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const allRows = searchParams.get('all') === 'true';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const project = (searchParams.get('project') || '').trim();

    const where: Prisma.PurchaseRequisitionWhereInput = {};
    const andClauses: Prisma.PurchaseRequisitionWhereInput[] = [];

    if (status) {
      const parsedStatus = parseStatusFilter(status);
      andClauses.push({
        OR: [
          ...(parsedStatus ? [{ status: parsedStatus }] : []),
          { externalStatus: { contains: status, mode: 'insensitive' } },
        ],
      });
    }

    if (project) {
      andClauses.push({
        OR: [
          { projectName: { contains: project, mode: 'insensitive' } },
          { requestedProjectName: { contains: project, mode: 'insensitive' } },
          { projectExternalId: { contains: project, mode: 'insensitive' } },
          { projectId: { contains: project, mode: 'insensitive' } },
        ],
      });
    }

    if (search) {
      andClauses.push({
        OR: [
          { externalId: { contains: search, mode: 'insensitive' } },
          { mrNumber: { contains: search, mode: 'insensitive' } },
          { prNumber: { contains: search, mode: 'insensitive' } },
          { requesterName: { contains: search, mode: 'insensitive' } },
          { requesterEmail: { contains: search, mode: 'insensitive' } },
          { requesterId: { contains: search, mode: 'insensitive' } },
          { projectName: { contains: search, mode: 'insensitive' } },
          { requestedProjectName: { contains: search, mode: 'insensitive' } },
          { purpose: { contains: search, mode: 'insensitive' } },
          { justification: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const [rows, total] = await Promise.all([
      prisma.purchaseRequisition.findMany({
        where,
        orderBy: [{ externalUpdatedAt: 'desc' }, { updatedAt: 'desc' }],
        ...(allRows ? {} : { skip: (page - 1) * limit, take: limit }),
      }),
      prisma.purchaseRequisition.count({ where }),
    ]);

    const normalizedRows = rows.map((row) => ({
      id: row.id,
      externalId: row.externalId || row.id,
      requisitionNumber: row.mrNumber || row.prNumber,
      status: row.externalStatus || row.status,
      priority: row.externalPriority || row.priority,
      departmentExternalId:
        row.departmentExternalId ||
        row.requestedDepartmentId ||
        row.departmentId,
      departmentName: row.departmentName || row.requestedDepartmentName,
      projectExternalId:
        row.projectExternalId ||
        row.requestedProjectId ||
        row.projectId,
      projectName: row.projectName || row.requestedProjectName,
      requesterName: row.requesterName || row.requesterId,
      requesterEmail: row.requesterEmail,
      requiredDate: row.requiredDate || row.requiredByDate,
      externalUpdatedAt: row.externalUpdatedAt || row.updatedAt,
      source: row.integrationSource || 'INTERNAL',
    }));

    return NextResponse.json({
      success: true,
      data: normalizedRows,
      pagination: {
        page: allRows ? 1 : page,
        limit: allRows ? total : limit,
        total,
        totalPages: allRows ? 1 : Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('[Material Requisitions][GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch material requisitions' }, { status: 500 });
  }
}
