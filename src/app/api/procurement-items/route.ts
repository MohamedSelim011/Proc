import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';

const toIntOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
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
    const categoryId = (searchParams.get('categoryId') || '').trim();
    const externalOnly = searchParams.get('externalOnly') === 'true';
    const integrationEnabled = isExternalIntegrationEnabled('items');

    const where: Record<string, unknown> = {};
    const andClauses: Record<string, unknown>[] = [];

    // Show all rows by default (internal + externally-synced).
    // Keep optional filter for callers that explicitly need external-only.
    if (externalOnly) {
      andClauses.push({ externalId: { not: null } });
    }

    if (search) {
      where.OR = [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
        { itemStatus: { contains: search, mode: 'insensitive' } },
        { stockType: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        ...(usePagination ? { skip, take: limit } : {}),
        include: {
          category: {
            select: { id: true, code: true, nameEn: true, nameAr: true },
          },
          _count: {
            select: { prItems: true, poItems: true, grItems: true, invoiceItems: true },
          },
        },
        orderBy: integrationEnabled
          ? [{ externalUpdatedAt: 'desc' }, { updatedAt: 'desc' }]
          : [{ updatedAt: 'desc' }],
      }),
      prisma.item.count({ where }),
    ]);

    const effectiveLimit = usePagination ? limit : total || items.length || 1;

    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page: usePagination ? page : 1,
        limit: effectiveLimit,
        total,
        totalPages: usePagination ? Math.max(1, Math.ceil(total / limit)) : 1,
      },
    });
  } catch (error) {
    console.error('[Procurement Items][GET] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isExternalIntegrationEnabled('items')) {
      return NextResponse.json(
        { success: false, error: 'Items integration is enabled. Manual create is disabled.' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const itemCode = String(body.itemCode ?? '').trim();
    const nameEn = String(body.nameEn ?? '').trim();
    const nameAr = String(body.nameAr ?? '').trim();
    const categoryId = String(body.categoryId ?? '').trim();
    const unitOfMeasure = String(body.unitOfMeasure ?? '').trim();
    const externalId =
      typeof body.externalId === 'string' && body.externalId.trim() ? body.externalId.trim() : null;

    if (!itemCode || !nameEn || !nameAr || !categoryId || !unitOfMeasure) {
      return NextResponse.json(
        {
          success: false,
          error: 'itemCode, nameEn, nameAr, categoryId, and unitOfMeasure are required.',
        },
        { status: 400 },
      );
    }

    const created = await prisma.item.create({
      data: {
        externalId,
        itemCode,
        nameEn,
        nameAr,
        description: typeof body.description === 'string' ? body.description : null,
        categoryId,
        unitOfMeasure,
        minStockLevel: toIntOrNull(body.minStockLevel),
        maxStockLevel: toIntOrNull(body.maxStockLevel),
        reorderPoint: toIntOrNull(body.reorderPoint),
      },
      include: {
        category: {
          select: { id: true, code: true, nameEn: true, nameAr: true },
        },
      },
    });

    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error) {
    console.error('[Procurement Items][POST] Failed:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'itemCode or externalId already exists.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create item' }, { status: 500 });
  }
}
