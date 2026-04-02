import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';

const toIntOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: { id: true, code: true, nameEn: true, nameAr: true },
        },
        _count: {
          select: { prItems: true, poItems: true, grItems: true, invoiceItems: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('[Procurement Items][GET by id] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch item' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (isExternalIntegrationEnabled('items')) {
      return NextResponse.json(
        { success: false, error: 'Items integration is enabled. Manual update is disabled.' },
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

    const updated = await prisma.item.update({
      where: { id: params.id },
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

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('[Procurement Items][PUT] Failed:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'itemCode or externalId already exists.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (isExternalIntegrationEnabled('items')) {
      return NextResponse.json(
        { success: false, error: 'Items integration is enabled. Manual delete is disabled.' },
        { status: 403 },
      );
    }

    const existing = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { prItems: true, poItems: true, grItems: true, invoiceItems: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    if (
      existing._count.prItems > 0 ||
      existing._count.poItems > 0 ||
      existing._count.grItems > 0 ||
      existing._count.invoiceItems > 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete item with existing transactions.' },
        { status: 400 },
      );
    }

    await prisma.item.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Procurement Items][DELETE] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete item' }, { status: 500 });
  }
}
