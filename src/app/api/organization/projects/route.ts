import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';

const parseBool = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return null;
};

const parseDateOrNull = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDecimalOrNull = (value: unknown): Prisma.Decimal | null => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === '') return null;
  try {
    return new Prisma.Decimal(normalized as Prisma.Decimal.Value);
  } catch {
    return null;
  }
};

const parseJsonOrNull = (value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value && typeof value === 'object') {
    return value as Prisma.InputJsonValue;
  }
  return Prisma.JsonNull;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = Math.max(1, Number(pageParam || 1));
    const limit = Math.min(500, Math.max(1, Number(limitParam || 20)));
    const usePagination = Boolean(pageParam || limitParam);
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const department = (searchParams.get('department') || '').trim();

    const where: Prisma.ProjectWhereInput = {};
    const andClauses: Prisma.ProjectWhereInput[] = [];

    if (search) {
      where.OR = [
        { projectName: { contains: search, mode: 'insensitive' } },
        { projectCode: { contains: search, mode: 'insensitive' } },
        { companyId: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
        { externalSystemId: { contains: search, mode: 'insensitive' } },
        { projectManager: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) andClauses.push({ status: { equals: status, mode: 'insensitive' } });
    if (department) andClauses.push({ department: { contains: department, mode: 'insensitive' } });

    if (andClauses.length > 0) where.AND = andClauses;

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      prisma.project.findMany({
        where,
        ...(usePagination ? { skip, take: limit } : {}),
        orderBy: [{ projectName: 'asc' }, { updatedAt: 'desc' }],
      }),
      prisma.project.count({ where }),
    ]);

    const effectiveLimit = usePagination ? limit : total || rows.length || 1;
    return NextResponse.json({
      success: true,
      items: rows,
      pagination: {
        page: usePagination ? page : 1,
        limit: effectiveLimit,
        total,
        totalPages: usePagination ? Math.max(1, Math.ceil(total / limit)) : 1,
      },
    });
  } catch (error) {
    console.error('[Organization Projects][GET] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isExternalIntegrationEnabled('projects')) {
      return NextResponse.json(
        { success: false, error: 'Projects integration is enabled. Manual create is disabled.' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const projectName = String(body.projectName ?? '').trim();
    const projectCode = typeof body.projectCode === 'string' ? body.projectCode.trim() : '';
    const externalId = typeof body.externalId === 'string' ? body.externalId.trim() : '';

    if (!projectName) {
      return NextResponse.json({ success: false, error: 'projectName is required.' }, { status: 400 });
    }

    const isActive = parseBool(body.isActive);
    const item = await prisma.project.create({
      data: {
        projectName,
        projectCode: projectCode || null,
        externalId: externalId || null,
        companyId: typeof body.companyId === 'string' ? body.companyId.trim() || null : null,
        description: typeof body.description === 'string' ? body.description : null,
        status: typeof body.status === 'string' ? body.status.trim() || null : null,
        startDate: parseDateOrNull(body.startDate),
        endDate: parseDateOrNull(body.endDate),
        projectManager: typeof body.projectManager === 'string' ? body.projectManager.trim() || null : null,
        department: typeof body.department === 'string' ? body.department.trim() || null : null,
        isActive: isActive ?? true,
        totalBudget: parseDecimalOrNull(body.totalBudget),
        allocatedBudget: parseDecimalOrNull(body.allocatedBudget),
        actualSpent: parseDecimalOrNull(body.actualSpent),
        externalSystemId:
          typeof body.externalSystemId === 'string' ? body.externalSystemId.trim() || null : null,
        externalCreatedAt: parseDateOrNull(body.externalCreatedAt),
        externalUpdatedAt: parseDateOrNull(body.externalUpdatedAt),
        rawPayload: parseJsonOrNull(body.rawPayload),
      },
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    console.error('[Organization Projects][POST] Failed:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'externalId must be unique when provided.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 500 });
  }
}
