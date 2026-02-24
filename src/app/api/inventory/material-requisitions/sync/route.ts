import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mapInventoryMaterialRequisitionRecord } from '@/lib/inventory-material-requisitions';

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

const extractTotalPages = (payload: unknown): number | null => {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;

  const direct = data.pagination as Record<string, unknown> | undefined;
  if (direct && typeof direct.totalPages === 'number' && direct.totalPages > 0) {
    return direct.totalPages;
  }

  const nested = data.data as Record<string, unknown> | undefined;
  if (nested && typeof nested === 'object') {
    const nestedPagination = nested.pagination as Record<string, unknown> | undefined;
    if (nestedPagination && typeof nestedPagination.totalPages === 'number' && nestedPagination.totalPages > 0) {
      return nestedPagination.totalPages;
    }
  }

  return null;
};

export async function POST(request: NextRequest) {
  try {
    const baseUrlRaw = process.env.INVENTORY_SYSTEM_BASE_URL?.trim();
    const apiKey = process.env.INVENTORY_SYSTEM_API_KEY?.trim();
    const bearerToken = request.headers.get('authorization')?.trim() || '';
    if (!baseUrlRaw) {
      return NextResponse.json({ error: 'INVENTORY_SYSTEM_BASE_URL is not configured' }, { status: 500 });
    }
    if (!bearerToken && !apiKey) {
      return NextResponse.json(
        { error: 'Neither Authorization bearer token nor INVENTORY_SYSTEM_API_KEY is available for Inventory sync.' },
        { status: 500 }
      );
    }

    const baseUrl = baseUrlRaw.replace(/\/$/, '');
    const endpointBase = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
    const authHeaders: Record<string, string> = {
      Accept: 'application/json',
    };
    const hasBearer = bearerToken.toLowerCase().startsWith('bearer ');
    if (hasBearer) {
      // Prefer user token explicitly when provided.
      authHeaders.Authorization = bearerToken;
    } else if (apiKey) {
      // Fallback only when no bearer token exists.
      authHeaders['X-API-Key'] = apiKey;
    }

    console.log('[Inventory Material Requisitions][SYNC] Starting sync', {
      endpointBase,
      authMode: authHeaders.Authorization ? 'bearer-only' : 'api-key-only',
    });

    let synced = 0;
    let failedRecords = 0;
    let pagesSynced = 0;
    let sourceEndpoint: string | null = null;
    const limit = 100;
    const upstreamErrors: string[] = [];

    const endpointCandidates = ['/requisitions', '/material-requisitions'];

    for (const endpoint of endpointCandidates) {
      let page = 1;
      let totalPages: number | null = null;
      let gotAtLeastOnePage = false;
      let endpointFailed = false;

      while (totalPages === null || page <= totalPages) {
        const response = await fetch(`${endpointBase}${endpoint}?page=${page}&limit=${limit}`, {
          method: 'GET',
          headers: authHeaders,
          cache: 'no-store',
        });

        const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const payloadSuccess =
          typeof payload.success === 'boolean' ? payload.success : undefined;

        if (!response.ok || payloadSuccess === false) {
          const reason =
            (typeof payload?.message === 'string' ? payload.message : null) ||
            (typeof payload?.error === 'string' ? payload.error : null) ||
            `Inventory API ${response.status} for ${endpoint}`;
          upstreamErrors.push(reason);
          console.warn('[Inventory Material Requisitions][SYNC] Upstream request failed', {
            endpoint,
            page,
            status: response.status,
            reason,
          });
          endpointFailed = true;
          break;
        }

        const list = extractList(payload);

        gotAtLeastOnePage = true;
        sourceEndpoint = endpoint;
        pagesSynced += 1;
        console.log('[Inventory Material Requisitions][SYNC] Upstream page fetched', {
          endpoint,
          page,
          count: list.length,
        });

        const upstreamTotalPages = extractTotalPages(payload);
        if (upstreamTotalPages) {
          totalPages = upstreamTotalPages;
        }

        for (const entry of list) {
          try {
            const mapped = mapInventoryMaterialRequisitionRecord(entry);
            const externalId = mapped.externalId;
            if (!externalId) continue;

            const existing = await prisma.inventoryMaterialRequisition.findUnique({
              where: { externalId },
              select: { externalUpdatedAt: true },
            });

            const incomingUpdatedAt = mapped.data.externalUpdatedAt;
            const shouldUpdate =
              !existing ||
              !existing.externalUpdatedAt ||
              !incomingUpdatedAt ||
              incomingUpdatedAt.getTime() >= existing.externalUpdatedAt.getTime();

            if (!shouldUpdate) continue;

            await prisma.inventoryMaterialRequisition.upsert({
              where: { externalId },
              update: { ...mapped.data },
              create: { externalId, ...mapped.data },
            });
            synced += 1;
          } catch (recordError) {
            failedRecords += 1;
            console.error('[Inventory Material Requisitions][SYNC] Failed record:', recordError);
          }
        }

        if (totalPages === null && list.length < limit) break;
        if (list.length === 0) break;

        page += 1;
      }

      if (gotAtLeastOnePage && !endpointFailed) {
        break;
      }
    }

    if (!sourceEndpoint) {
      return NextResponse.json({
        success: false,
        synced: 0,
        failedRecords: 0,
        pagesSynced: 0,
        warning: 'Inventory API is currently unavailable. Local synced data is still accessible.',
        upstreamErrors,
      });
    }

    const totalLocalRows = await prisma.inventoryMaterialRequisition.count();
    console.log('[Inventory Material Requisitions][SYNC] Completed', {
      sourceEndpoint,
      pagesSynced,
      synced,
      failedRecords,
      totalLocalRows,
    });

    return NextResponse.json({
      success: true,
      synced,
      failedRecords,
      pagesSynced,
      sourceEndpoint,
      totalLocalRows,
    });
  } catch (error) {
    console.error('[Inventory Material Requisitions][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync material requisitions' }, { status: 500 });
  }
}
