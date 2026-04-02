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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const item = await prisma.project.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('[Organization Projects][GET by id] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (isExternalIntegrationEnabled('projects')) {
      return NextResponse.json(
        { success: false, error: 'Projects integration is enabled. Manual update is disabled.' },
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
    const item = await prisma.project.update({
      where: { id },
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

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('[Organization Projects][PUT] Failed:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'externalId must be unique when provided.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (isExternalIntegrationEnabled('projects')) {
      return NextResponse.json(
        { success: false, error: 'Projects integration is enabled. Manual delete is disabled.' },
        { status: 403 },
      );
    }

    const existing = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Organization Projects][DELETE] Failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete project' }, { status: 500 });
  }
}
