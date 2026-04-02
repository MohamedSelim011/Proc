import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { mapInventoryUomRecord } from '@/lib/inventory-uom';
import { fetchUomFromIntegration } from '@/integration/contracts/uom.client';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';

const extractList = (payload: unknown): unknown[] => {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as Record<string, unknown>;

  const directCandidates = [data.data, data.items, data.results, data.records];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (data.data && typeof data.data === 'object') {
    const nested = data.data as Record<string, unknown>;
    const nestedCandidates = [nested.data, nested.items, nested.results, nested.records, nested.rows];
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

export async function POST(request: NextRequest) {
  try {
    if (!isExternalIntegrationEnabled('uom')) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'UOM_INTEGRATION is disabled.',
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
        { error: 'Authorization bearer token is required to sync units of measure.' },
        { status: 401 },
      );
    }

    let payload: unknown;
    const upstreamErrors: string[] = [];
    try {
      payload = await fetchUomFromIntegration({}, forwardedAuthHeader);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch units of measure from integration middleware.';
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
        const mapped = mapInventoryUomRecord(entry);
        if (!mapped.externalId || !mapped.code || !mapped.name || !mapped.abbreviation) continue;

        const existing = await prisma.unitOfMeasure.findUnique({
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
          externalId: mapped.externalId,
          code: mapped.code,
          name: mapped.name,
          abbreviation: mapped.abbreviation,
          type: mapped.data.type,
          isActive: mapped.data.isActive,
          externalUpdatedAt: mapped.data.externalUpdatedAt,
        };

        if (existing) {
          await prisma.unitOfMeasure.update({
            where: { id: existing.id },
            data: persistenceData,
          });
        } else {
          await prisma.unitOfMeasure.create({
            data: persistenceData,
          });
        }

        synced += 1;
      } catch (recordError) {
        failedRecords += 1;
        console.error('[UOM][SYNC] Failed record:', recordError);
      }
    }

    const totalLocalRows = await prisma.unitOfMeasure.count({
      where: { externalId: { not: null } },
    });

    return NextResponse.json({
      success: true,
      synced,
      failedRecords,
      sourceEndpoint: '/procurement/uom',
      totalLocalRows,
      upstreamErrors,
    });
  } catch (error) {
    console.error('[UOM][SYNC] Failed:', error);
    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json({ error: 'Failed to map synced UOM records' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to sync units of measure' }, { status: 500 });
  }
}

