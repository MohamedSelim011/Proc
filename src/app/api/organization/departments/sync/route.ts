import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { fetchDepartmentsFromIntegration } from '@/integration/contracts/departments.client';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';

type PlainObject = Record<string, unknown>;

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' ? (value as PlainObject) : {};

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const asBoolean = (value: unknown, fallback = true): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  if (typeof value === 'number') return value === 1;
  return fallback;
};

const parseDate = (value: unknown): Date | null => {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const extractList = (payload: unknown): unknown[] => {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;

  const directCandidates = [data.data, data.items, data.results, data.records, data.departments];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (data.data && typeof data.data === 'object') {
    const nested = data.data as Record<string, unknown>;
    const nestedCandidates = [nested.data, nested.items, nested.results, nested.records, nested.departments];
    for (const candidate of nestedCandidates) {
      if (Array.isArray(candidate)) return candidate;
    }
  }

  return [];
};

const extractErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
  if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
  if (data.error && typeof data.error === 'object') {
    const nestedError = data.error as Record<string, unknown>;
    if (typeof nestedError.message === 'string' && nestedError.message.trim()) {
      return nestedError.message.trim();
    }
  }
  return null;
};

const pickDepartmentExternalId = (record: PlainObject): string | null =>
  asString(record.id) || asString(record._id) || asString(record.externalId) || asString(record.code);

const mapDepartmentRecord = (entry: unknown) => {
  const record = asObject(entry);
  const raw = asObject(record.raw);
  const externalId = pickDepartmentExternalId(record);

  const name =
    asString(record.name) ||
    asString(raw.name) ||
    asString(raw.unit_name) ||
    asString(raw.title) ||
    asString(raw.displayName);

  return {
    externalId,
    data: {
      name,
      code: asString(record.code) || asString(raw.code),
      type: asString(raw.type) || asString(raw.unitType) || asString(raw.unit_type),
      isActive: asBoolean(raw.isActive ?? raw.active, true),
      costCenterCode: asString(raw.costCenterCode) || asString(raw.cost_center_code),
      parentExternalId:
        asString(raw.parentExternalId) ||
        asString(raw.parentId) ||
        asString(raw.parent_id) ||
        asString(raw.parentCode),
      description: asString(raw.description),
      externalCreatedAt:
        parseDate(raw.createdAt) ||
        parseDate(raw.created_at) ||
        parseDate(raw.insertedAt),
      externalUpdatedAt:
        parseDate(raw.updatedAt) ||
        parseDate(raw.updated_at) ||
        parseDate(raw.lastModifiedDate) ||
        parseDate(raw.modifiedAt),
      lastSyncedAt: new Date(),
      rawPayload: raw,
    },
  };
};

export async function POST(request: NextRequest) {
  try {
    if (!isExternalIntegrationEnabled('departments')) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'DEPARTMENTS_INTEGRATION is disabled.',
      });
    }

    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    const forwardedAuthHeader =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader
        : cookieToken
          ? `Bearer ${cookieToken}`
          : undefined;

    if (!forwardedAuthHeader) {
      return NextResponse.json(
        { error: 'Authorization bearer token is required to sync departments.' },
        { status: 401 },
      );
    }

    let payload: unknown;
    const upstreamErrors: string[] = [];
    try {
      payload = await fetchDepartmentsFromIntegration({ type: 'department' }, forwardedAuthHeader);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch departments from integration middleware.';
      upstreamErrors.push(message);
      return NextResponse.json({ error: message, upstreamErrors }, { status: 502 });
    }

    const payloadObject = payload as Record<string, unknown>;
    if (payloadObject && payloadObject.success === false) {
      const reason =
        extractErrorMessage(payload) ||
        'Integration middleware returned an unsuccessful response.';
      upstreamErrors.push(reason);
      return NextResponse.json({ error: reason, upstreamErrors }, { status: 502 });
    }

    const list = extractList(payload);
    let synced = 0;
    let failedRecords = 0;

    for (const entry of list) {
      try {
        const mapped = mapDepartmentRecord(entry);
        if (!mapped.externalId || !mapped.data.name) continue;

        const existing = await prisma.hrDepartment.findUnique({
          where: { externalId: mapped.externalId },
          select: { id: true, externalUpdatedAt: true },
        });

        const incomingUpdatedAt = mapped.data.externalUpdatedAt;
        const shouldUpdate =
          !existing ||
          !existing.externalUpdatedAt ||
          !incomingUpdatedAt ||
          incomingUpdatedAt.getTime() >= existing.externalUpdatedAt.getTime();

        if (!shouldUpdate) continue;

        const persistenceData = {
          name: mapped.data.name,
          code: mapped.data.code,
          type: mapped.data.type,
          isActive: mapped.data.isActive,
          costCenterCode: mapped.data.costCenterCode,
          parentExternalId: mapped.data.parentExternalId,
          description: mapped.data.description,
          externalCreatedAt: mapped.data.externalCreatedAt,
          externalUpdatedAt: mapped.data.externalUpdatedAt,
          lastSyncedAt: mapped.data.lastSyncedAt,
          rawPayload: mapped.data.rawPayload as Prisma.InputJsonValue,
          externalId: mapped.externalId,
        };

        if (existing) {
          await prisma.hrDepartment.update({
            where: { id: existing.id },
            data: persistenceData,
          });
        } else {
          await prisma.hrDepartment.create({
            data: persistenceData,
          });
        }

        synced += 1;
      } catch (recordError) {
        failedRecords += 1;
        console.error('[Departments][SYNC] Failed record:', recordError);
      }
    }

    const totalLocalRows = await prisma.hrDepartment.count({
      where: { externalId: { not: null } },
    });

    return NextResponse.json({
      success: true,
      synced,
      failedRecords,
      sourceEndpoint: '/procurement/departments',
      totalLocalRows,
      upstreamErrors,
    });
  } catch (error) {
    console.error('[Departments][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync departments' }, { status: 500 });
  }
}
