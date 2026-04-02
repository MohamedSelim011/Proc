import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { mapInventoryItemRecord } from '@/lib/inventory-items';
import { fetchItemsFromIntegration } from '@/integration/contracts/items.client';
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
    const errorObject = data.error as Record<string, unknown>;
    if (typeof errorObject.message === 'string' && errorObject.message.trim()) {
      return errorObject.message.trim();
    }
  }
  return null;
};

const parseBearerAuthorization = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const [scheme, ...rest] = trimmed.split(' ');
  if (!scheme || rest.length === 0 || scheme.toLowerCase() !== 'bearer') return null;

  const token = rest.join(' ').trim();
  if (!token) return null;
  return `Bearer ${token}`;
};

const normalizeCode = (text: string) =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);

const ensureCategory = async (input: {
  categoryCode: string | null;
  categoryExternalId: string | null;
  categoryName: string | null;
}) => {
  const fallbackCode = input.categoryCode || (input.categoryExternalId ? `INV_${normalizeCode(input.categoryExternalId)}` : 'INV_UNCATEGORIZED');
  const code = fallbackCode.length > 0 ? fallbackCode : 'INV_UNCATEGORIZED';

  const categoryName = input.categoryName?.trim() || code;

  const category = await prisma.category.upsert({
    where: { code },
    create: {
      code,
      nameEn: categoryName,
      nameAr: categoryName,
      description: input.categoryExternalId ? `Inventory category ${input.categoryExternalId}` : 'Inventory category',
    },
    update: {
      nameEn: categoryName,
      nameAr: categoryName,
    },
    select: { id: true },
  });

  return category.id;
};

export async function POST(request: NextRequest) {
  try {
    if (!isExternalIntegrationEnabled('items')) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'ITEMS_INTEGRATION is disabled.',
      });
    }

    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value || request.cookies.get('auth_token')?.value;
    const forwardedAuthHeader = parseBearerAuthorization(authHeader) || (cookieToken ? `Bearer ${cookieToken}` : undefined);

    if (!forwardedAuthHeader) {
      return NextResponse.json(
        { error: 'Authorization bearer token is required to sync items.' },
        { status: 401 },
      );
    }

    let synced = 0;
    let failedRecords = 0;
    const upstreamErrors: string[] = [];

    let payload: unknown;
    try {
      payload = await fetchItemsFromIntegration({}, forwardedAuthHeader);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch items from integration middleware.';
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

    for (const entry of list) {
      try {
        const mapped = mapInventoryItemRecord(entry);
        if (!mapped.externalId || !mapped.itemCode || !mapped.nameEn || !mapped.nameAr) continue;

        const categoryId = await ensureCategory({
          categoryCode: mapped.categoryCode,
          categoryExternalId: mapped.categoryExternalId,
          categoryName: mapped.categoryName,
        });

        const existing = await prisma.item.findFirst({
          where: {
            OR: [{ externalId: mapped.externalId }, { itemCode: mapped.itemCode }],
          },
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
          categoryId,
          itemCode: mapped.itemCode,
          nameEn: mapped.nameEn,
          nameAr: mapped.nameAr,
          description: mapped.data.description,
          unitOfMeasure: mapped.data.unitOfMeasure,
          minStockLevel: mapped.data.minStockLevel,
          maxStockLevel: mapped.data.maxStockLevel,
          reorderPoint: mapped.data.reorderPoint,
          reorderQuantity: mapped.data.reorderQuantity,
          leadTimeDays: mapped.data.leadTimeDays,
          shelfLifeDays: mapped.data.shelfLifeDays,
          itemStatus: mapped.data.itemStatus,
          stockType: mapped.data.stockType,
          isCritical: mapped.data.isCritical,
          isHazardous: mapped.data.isHazardous,
          storageCondition: mapped.data.storageCondition,
          hsnCode: mapped.data.hsnCode,
          barcode: mapped.data.barcode,
          categoryExternalId: mapped.data.categoryExternalId,
          categoryName: mapped.data.categoryName,
          itemGroupExternalId: mapped.data.itemGroupExternalId,
          itemGroupName: mapped.data.itemGroupName,
          baseUomExternalId: mapped.data.baseUomExternalId,
          baseUomName: mapped.data.baseUomName,
          baseUomAbbreviation: mapped.data.baseUomAbbreviation,
          integrationSource: mapped.data.integrationSource,
          externalUpdatedAt: mapped.data.externalUpdatedAt,
          lastSyncedAt: mapped.data.lastSyncedAt,
          rawPayload: mapped.data.rawPayload as Prisma.InputJsonValue,
        };

        if (existing) {
          await prisma.item.update({
            where: { id: existing.id },
            data: persistenceData,
          });
        } else {
          await prisma.item.create({ data: persistenceData });
        }

        synced += 1;
      } catch (recordError) {
        failedRecords += 1;
        console.error('[Procurement Items][SYNC] Failed record:', recordError);
      }
    }

    const totalLocalRows = await prisma.item.count({
      where: { externalId: { not: null } },
    });

    return NextResponse.json({
      success: true,
      synced,
      failedRecords,
      sourceEndpoint: '/items',
      totalLocalRows,
      upstreamErrors,
    });
  } catch (error) {
    console.error('[Procurement Items][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync items' }, { status: 500 });
  }
}
