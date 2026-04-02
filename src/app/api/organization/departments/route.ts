import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = Math.max(1, Number(pageParam || 1));
    const limit = Math.min(200, Math.max(1, Number(limitParam || 20)));
    const usePagination = Boolean(pageParam || limitParam);
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || '').trim().toLowerCase();

    const where: Record<string, unknown> = {};
    const andClauses: Record<string, unknown>[] = [];

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
        { costCenterCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') andClauses.push({ isActive: true });
    if (status === 'inactive') andClauses.push({ isActive: false });

    if (andClauses.length > 0) where.AND = andClauses;

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      prisma.hrDepartment.findMany({
        where,
        ...(usePagination ? { skip, take: limit } : {}),
        orderBy: [{ name: 'asc' }, { updatedAt: 'desc' }],
      }),
      prisma.hrDepartment.count({ where }),
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
    console.error('[Organization Departments][GET] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isExternalIntegrationEnabled('departments')) {
      return NextResponse.json(
        { success: false, error: 'Departments integration is enabled. Manual create is disabled.' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const externalId = typeof body.externalId === 'string' ? body.externalId.trim() : '';

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required.' }, { status: 400 });
    }

    const isActive = parseBool(body.isActive);
    const created = await prisma.hrDepartment.create({
      data: {
        name,
        code: code || null,
        type: typeof body.type === 'string' ? body.type.trim() || null : null,
        isActive: isActive ?? true,
        externalId: externalId || null,
        parentExternalId:
          typeof body.parentExternalId === 'string' ? body.parentExternalId.trim() || null : null,
        costCenterCode:
          typeof body.costCenterCode === 'string' ? body.costCenterCode.trim() || null : null,
        description: typeof body.description === 'string' ? body.description : null,
        externalCreatedAt: parseDateOrNull(body.externalCreatedAt),
        externalUpdatedAt: parseDateOrNull(body.externalUpdatedAt),
      },
    });

    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error) {
    console.error('[Organization Departments][POST] Failed:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'externalId must be unique when provided.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create department' }, { status: 500 });
  }
}
