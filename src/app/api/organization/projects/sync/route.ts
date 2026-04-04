import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { fetchProjectsFromIntegration } from '@/integration/contracts/projects.client';
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

const asDecimal = (value: unknown): Prisma.Decimal | null => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === '') return null;
  try {
    return new Prisma.Decimal(normalized as Prisma.Decimal.Value);
  } catch {
    return null;
  }
};

const parseDate = (value: unknown): Date | null => {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const findDepartmentNameByToken = async (token: string): Promise<string | null> => {
  const value = token.trim();
  if (!value) return null;

  const byId = await prisma.hrDepartment.findFirst({
    where: { id: value },
    select: { name: true },
  });
  if (byId) return byId.name;

  const byExternalId = await prisma.hrDepartment.findFirst({
    where: { externalId: value },
    select: { name: true },
  });
  if (byExternalId) return byExternalId.name;

  const byCode = await prisma.hrDepartment.findFirst({
    where: { code: { equals: value, mode: 'insensitive' } },
    select: { name: true },
  });
  if (byCode) return byCode.name;

  const byName = await prisma.hrDepartment.findFirst({
    where: {
      name: { equals: value, mode: 'insensitive' },
      NOT: { externalId: value },
    },
    select: { name: true },
  });

  return byName?.name ?? null;
};

const extractList = (payload: unknown): unknown[] => {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;

  const directCandidates = [data.data, data.items, data.results, data.records, data.projects];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (data.data && typeof data.data === 'object') {
    const nested = data.data as Record<string, unknown>;
    const nestedCandidates = [
      nested.data,
      nested.items,
      nested.results,
      nested.records,
      nested.projects,
    ];
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

const pickProjectExternalId = (record: PlainObject): string | null =>
  asString(record.id) ||
  asString(record._id) ||
  asString(record.externalId) ||
  asString(record.externalSystemId) ||
  asString(record.projectCode) ||
  asString(record.code);

const mapProjectRecord = (entry: unknown) => {
  const record = asObject(entry);
  const externalId = pickProjectExternalId(record);

  const projectCode = asString(record.projectCode) || asString(record.code);
  const projectName =
    asString(record.projectName) || asString(record.name) || asString(record.title);

  return {
    externalId,
    data: {
      companyId: asString(record.companyId),
      projectCode,
      projectName,
      description: asString(record.description),
      status: asString(record.status),
      startDate: parseDate(record.startDate),
      endDate: parseDate(record.endDate),
      projectManager:
        asString(record.projectManager) ||
        asString(record.manager) ||
        asString(record.projectManagerName),
      department: asString(record.department) || asString(record.departmentName),
      isActive: asBoolean(record.isActive ?? record.active, true),
      totalBudget: asDecimal(record.totalBudget),
      allocatedBudget: asDecimal(record.allocatedBudget ?? record.totalAllocated),
      actualSpent: asDecimal(record.actualSpent ?? record.totalActual),
      externalSystemId: asString(record.externalSystemId),
      externalCreatedAt: parseDate(record.createdAt) || parseDate(record.externalCreatedAt),
      externalUpdatedAt:
        parseDate(record.updatedAt) ||
        parseDate(record.externalUpdatedAt) ||
        parseDate(record.lastModifiedDate),
      lastSyncedAt: new Date(),
      rawPayload: record,
    },
  };
};

export async function POST(request: NextRequest) {
  try {
    if (!isExternalIntegrationEnabled('projects')) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'PROJECTS_INTEGRATION is disabled.',
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
        { error: 'Authorization bearer token is required to sync projects.' },
        { status: 401 },
      );
    }

    let payload: unknown;
    const upstreamErrors: string[] = [];
    try {
      payload = await fetchProjectsFromIntegration({ limit: '2000' }, forwardedAuthHeader);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch projects from integration middleware.';
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
    const departmentNameCache = new Map<string, string | null>();

    for (const entry of list) {
      try {
        const mapped = mapProjectRecord(entry);
        if (!mapped.externalId || !mapped.data.projectName) continue;
        const rawDepartment = (mapped.data.department || '').trim();
        let resolvedDepartmentName: string | null = null;

        if (rawDepartment) {
          if (departmentNameCache.has(rawDepartment)) {
            resolvedDepartmentName = departmentNameCache.get(rawDepartment) ?? null;
          } else {
            resolvedDepartmentName = await findDepartmentNameByToken(rawDepartment);
            departmentNameCache.set(rawDepartment, resolvedDepartmentName);
          }
        }

        const existing = await prisma.project.findUnique({
          where: { externalId: mapped.externalId },
          select: { id: true, externalUpdatedAt: true, rawPayload: true },
        });

        const incomingUpdatedAt = mapped.data.externalUpdatedAt;
        const payloadChanged =
          existing && incomingUpdatedAt == null
            ? JSON.stringify(existing.rawPayload ?? null) !==
              JSON.stringify(mapped.data.rawPayload ?? null)
            : false;
        const shouldUpdate =
          !existing ||
          !existing.externalUpdatedAt ||
          (incomingUpdatedAt != null &&
            incomingUpdatedAt.getTime() >= existing.externalUpdatedAt.getTime()) ||
          payloadChanged;

        if (!shouldUpdate) continue;

        const persistenceData: Prisma.ProjectUncheckedCreateInput = {
          externalId: mapped.externalId,
          projectCode: mapped.data.projectCode,
          projectName: mapped.data.projectName,
          companyId: mapped.data.companyId,
          description: mapped.data.description,
          status: mapped.data.status,
          startDate: mapped.data.startDate,
          endDate: mapped.data.endDate,
          projectManager: mapped.data.projectManager,
          department: resolvedDepartmentName,
          isActive: mapped.data.isActive,
          totalBudget: mapped.data.totalBudget,
          allocatedBudget: mapped.data.allocatedBudget,
          actualSpent: mapped.data.actualSpent,
          externalSystemId: mapped.data.externalSystemId,
          externalCreatedAt: mapped.data.externalCreatedAt,
          externalUpdatedAt: mapped.data.externalUpdatedAt,
          lastSyncedAt: mapped.data.lastSyncedAt,
          rawPayload: mapped.data.rawPayload as Prisma.InputJsonValue,
        };

        if (existing) {
          await prisma.project.update({
            where: { id: existing.id },
            data: persistenceData,
          });
        } else {
          await prisma.project.create({
            data: persistenceData,
          });
        }

        synced += 1;
      } catch (recordError) {
        failedRecords += 1;
        console.error('[Projects][SYNC] Failed record:', recordError);
      }
    }

    const totalLocalRows = await prisma.project.count({
      where: { externalId: { not: null } },
    });

    return NextResponse.json({
      success: true,
      synced,
      failedRecords,
      sourceEndpoint: '/procurement/projects',
      totalLocalRows,
      upstreamErrors,
    });
  } catch (error) {
    console.error('[Projects][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync projects' }, { status: 500 });
  }
}
