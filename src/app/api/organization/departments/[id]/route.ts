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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.hrDepartment.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('[Organization Departments][GET by id] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch department' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (isExternalIntegrationEnabled('departments')) {
      return NextResponse.json(
        { success: false, error: 'Departments integration is enabled. Manual update is disabled.' },
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
    const item = await prisma.hrDepartment.update({
      where: { id: params.id },
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

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('[Organization Departments][PUT] Failed:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'externalId must be unique when provided.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to update department' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (isExternalIntegrationEnabled('departments')) {
      return NextResponse.json(
        { success: false, error: 'Departments integration is enabled. Manual delete is disabled.' },
        { status: 403 },
      );
    }

    const existing = await prisma.hrDepartment.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Department not found' }, { status: 404 });
    }

    await prisma.hrDepartment.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Organization Departments][DELETE] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete department' }, { status: 500 });
  }
}
