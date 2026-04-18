import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mapInventoryMaterialRequisitionRecord } from '@/lib/inventory-material-requisitions';

const ensureUniquePrNumber = async (basePrNumber: string, externalId: string) => {
  const normalizedBase = (basePrNumber || `EXT-${externalId}`).trim() || `EXT-${externalId}`;
  let candidate = normalizedBase;
  let attempt = 0;

  while (attempt < 1000) {
    const conflict = await prisma.purchaseRequisition.findFirst({
      where: { prNumber: candidate },
      select: { externalId: true },
    });

    if (!conflict || conflict.externalId === externalId) {
      return candidate;
    }

    attempt += 1;
    candidate = `${normalizedBase}-${attempt}`;
  }

  return `${normalizedBase}-${Date.now()}`;
};

function authenticate(request: NextRequest): boolean {
  const serviceToken = process.env.INTEGRATION_SERVICE_TOKEN?.trim();
  if (!serviceToken) return true;

  const authHeader = request.headers.get('authorization') || '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const queryToken = request.nextUrl.searchParams.get('token') || '';

  return headerToken === serviceToken || queryToken === serviceToken;
}

function extractRecords(body: unknown): unknown[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;

  // Soul event envelope: { event, source, data: <record|record[]> }
  if (b.data !== undefined) {
    if (Array.isArray(b.data)) return b.data;
    if (typeof b.data === 'object' && b.data !== null) return [b.data];
  }

  // Direct array
  if (Array.isArray(body)) return body;

  // Single record
  return [body];
}

export async function POST(request: NextRequest) {
  try {
    if (!authenticate(request)) {
      const receivedAuth = request.headers.get('authorization') || '(none)';
      console.error('[MR Sync] 401 — received Authorization:', receivedAuth, '| expected token:', process.env.INTEGRATION_SERVICE_TOKEN ? 'set' : 'NOT SET');
      return NextResponse.json({ error: 'Unauthorized.', received: receivedAuth }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const records = extractRecords(body);
    if (records.length === 0) {
      return NextResponse.json({ success: true, synced: 0, failedRecords: 0, message: 'No records to process.' });
    }

    let synced = 0;
    let failedRecords = 0;

    for (const entry of records) {
      try {
        const mapped = mapInventoryMaterialRequisitionRecord(entry);
        const externalId = mapped.externalId;
        if (!externalId) continue;

        const existing = await prisma.purchaseRequisition.findUnique({
          where: { externalId },
          select: { id: true, prNumber: true, externalUpdatedAt: true },
        });

        const incomingUpdatedAt = mapped.data.externalUpdatedAt;
        const shouldUpdate =
          !existing ||
          !existing.externalUpdatedAt ||
          !incomingUpdatedAt ||
          incomingUpdatedAt.getTime() >= existing.externalUpdatedAt.getTime();

        if (!shouldUpdate) continue;

        const departmentExternalId =
          mapped.data.departmentExternalId ||
          mapped.data.requestedDepartmentId ||
          (mapped.data.departmentId && mapped.data.departmentId !== 'EXTERNAL'
            ? mapped.data.departmentId
            : null);
        const departmentRecord = departmentExternalId
          ? await prisma.hrDepartment.findUnique({
              where: { externalId: departmentExternalId },
              select: { id: true },
            })
          : null;

        const projectExternalId =
          mapped.data.projectExternalId ||
          mapped.data.requestedProjectId ||
          mapped.data.projectId ||
          null;
        const projectRecord = projectExternalId
          ? await prisma.project.findUnique({
              where: { externalId: projectExternalId },
              select: { id: true },
            })
          : null;

        const persistenceData = {
          ...mapped.data,
          departmentId: departmentRecord?.id ?? null,
          projectId: projectRecord?.id ?? null,
          rawPayload: mapped.data.rawPayload
            ? (mapped.data.rawPayload as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        };

        if (existing) {
          await prisma.purchaseRequisition.update({
            where: { id: existing.id },
            data: { ...persistenceData, externalId, prNumber: existing.prNumber },
          });
        } else {
          const prNumber = await ensureUniquePrNumber(mapped.data.prNumber, externalId);
          await prisma.purchaseRequisition.create({
            data: { ...persistenceData, externalId, prNumber },
          });
        }
        synced += 1;
      } catch (recordError) {
        failedRecords += 1;
        console.error('[MR Sync] Failed record:', recordError);
      }
    }

    const totalLocalRows = await prisma.purchaseRequisition.count({
      where: { externalId: { not: null } },
    });

    return NextResponse.json({ success: true, synced, failedRecords, totalLocalRows });
  } catch (error) {
    console.error('[MR Sync] Failed:', error);
    return NextResponse.json({ error: 'Failed to process material requisitions.' }, { status: 500 });
  }
}
