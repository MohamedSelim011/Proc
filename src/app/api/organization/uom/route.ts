import { NextRequest, NextResponse } from 'next/server';
import { Prisma, UOMType } from '@prisma/client';

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

const parseType = (value: unknown): UOMType | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (
    normalized === 'WEIGHT' ||
    normalized === 'VOLUME' ||
    normalized === 'LENGTH' ||
    normalized === 'AREA' ||
    normalized === 'COUNT' ||
    normalized === 'TIME'
  ) {
    return normalized as UOMType;
  }
  return null;
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
    const type = parseType(searchParams.get('type'));
    const status = (searchParams.get('status') || '').trim().toLowerCase();

    const where: Prisma.UnitOfMeasureWhereInput = {};
    const andClauses: Prisma.UnitOfMeasureWhereInput[] = [];

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { abbreviation: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) andClauses.push({ type });
    if (status === 'active') andClauses.push({ isActive: true });
    if (status === 'inactive') andClauses.push({ isActive: false });
    if (andClauses.length > 0) where.AND = andClauses;

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      prisma.unitOfMeasure.findMany({
        where,
        ...(usePagination ? { skip, take: limit } : {}),
        orderBy: [{ code: 'asc' }, { updatedAt: 'desc' }],
      }),
      prisma.unitOfMeasure.count({ where }),
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
    console.error('[Organization UOM][GET] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch units of measure' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isExternalIntegrationEnabled('uom')) {
      return NextResponse.json(
        { success: false, error: 'UOM integration is enabled. Manual create is disabled.' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const abbreviation = typeof body.abbreviation === 'string' ? body.abbreviation.trim() : '';
    const type = parseType(body.type);
    const externalId = typeof body.externalId === 'string' ? body.externalId.trim() : '';
    const isActive = parseBool(body.isActive);

    if (!code || !name || !abbreviation || !type) {
      return NextResponse.json(
        { success: false, error: 'code, name, abbreviation, and a valid type are required.' },
        { status: 400 },
      );
    }

    const item = await prisma.unitOfMeasure.create({
      data: {
        code,
        name,
        abbreviation,
        type,
        isActive: isActive ?? true,
        externalId: externalId || null,
        externalUpdatedAt: parseDateOrNull(body.externalUpdatedAt),
      },
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    console.error('[Organization UOM][POST] Failed:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'code or externalId already exists.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create unit of measure' }, { status: 500 });
  }
}

