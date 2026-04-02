import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mapInventoryMaterialRequisitionRecord } from '@/lib/inventory-material-requisitions';
import { fetchMaterialRequisitionsFromIntegration } from '@/integration/contracts/material-requisitions.client';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';

const extractList = (payload: unknown): unknown[] => {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;

  const directCandidates = [data.data, data.items, data.results, data.records, data.requisitions];
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
      nested.requisitions,
      nested.rows,
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
    const errorObject = data.error as Record<string, unknown>;
    if (typeof errorObject.message === 'string' && errorObject.message.trim()) {
      return errorObject.message.trim();
    }
  }
  return null;
};

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

export async function POST(request: NextRequest) {
  try {
    if (!isExternalIntegrationEnabled('materialRequisitions')) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'MATERIAL_REQUISITIONS_INTEGRATION is disabled.',
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
        { error: 'Authorization bearer token is required to sync material requisitions.' },
        { status: 401 },
      );
    }

    let synced = 0;
    let failedRecords = 0;
    let pagesSynced = 0;
    const upstreamErrors: string[] = [];
    let payload: unknown;
    try {
      payload = await fetchMaterialRequisitionsFromIntegration({}, forwardedAuthHeader);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch material requisitions from integration middleware.';
      upstreamErrors.push(message);
      return NextResponse.json({ error: message, upstreamErrors }, { status: 502 });
    }

    const payloadObject = payload as Record<string, unknown>;
    if (payloadObject && payloadObject.success === false) {
      const reason = extractErrorMessage(payload) || 'Integration middleware returned an unsuccessful response.';
      upstreamErrors.push(reason);
      return NextResponse.json({ error: reason, upstreamErrors }, { status: 502 });
    }

    const list = extractList(payload);
    pagesSynced = 1;

    for (const entry of list) {
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

        const persistenceData = {
          ...mapped.data,
          rawPayload: mapped.data.rawPayload
            ? (mapped.data.rawPayload as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        };

        if (existing) {
          await prisma.purchaseRequisition.update({
            where: { id: existing.id },
            data: {
              ...persistenceData,
              externalId,
              prNumber: existing.prNumber,
            },
          });
        } else {
          const prNumber = await ensureUniquePrNumber(mapped.data.prNumber, externalId);
          await prisma.purchaseRequisition.create({
            data: {
              ...persistenceData,
              externalId,
              prNumber,
            },
          });
        }
        synced += 1;
      } catch (recordError) {
        failedRecords += 1;
        console.error('[Inventory Material Requisitions][SYNC] Failed record:', recordError);
      }
    }

    const totalLocalRows = await prisma.purchaseRequisition.count({
      where: { externalId: { not: null } },
    });
    return NextResponse.json({
      success: true,
      synced,
      failedRecords,
      pagesSynced,
      sourceEndpoint: '/material-requisitions',
      totalLocalRows,
      upstreamErrors,
    });
  } catch (error) {
    console.error('[Inventory Material Requisitions][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync material requisitions' }, { status: 500 });
  }
}
