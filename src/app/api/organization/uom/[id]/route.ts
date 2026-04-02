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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const item = await prisma.unitOfMeasure.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: 'Unit of measure not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('[Organization UOM][GET by id] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch unit of measure' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (isExternalIntegrationEnabled('uom')) {
      return NextResponse.json(
        { success: false, error: 'UOM integration is enabled. Manual update is disabled.' },
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

    const item = await prisma.unitOfMeasure.update({
      where: { id },
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

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('[Organization UOM][PUT] Failed:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'code or externalId already exists.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to update unit of measure' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (isExternalIntegrationEnabled('uom')) {
      return NextResponse.json(
        { success: false, error: 'UOM integration is enabled. Manual delete is disabled.' },
        { status: 403 },
      );
    }

    const existing = await prisma.unitOfMeasure.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Unit of measure not found' }, { status: 404 });
    }

    await prisma.unitOfMeasure.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Organization UOM][DELETE] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete unit of measure' }, { status: 500 });
  }
}
