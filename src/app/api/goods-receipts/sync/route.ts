import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { mapInventoryGoodsReceiptRecord } from '@/lib/inventory-goods-receipts';
import { fetchGoodsReceiptsFromIntegration } from '@/integration/contracts/goods-receipt.client';
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

const resolvePo = async (poNumber: string | null, poExternalId: string | null) => {
  const orFilters: Prisma.PurchaseOrderWhereInput[] = [];
  if (poNumber) {
    orFilters.push({ poNumber });
  }
  if (poExternalId) {
    // Integration may send either our local PO id or PO number in purchaseOrderId.
    orFilters.push({ id: poExternalId });
    orFilters.push({ poNumber: poExternalId });
  }

  if (orFilters.length === 0) return null;
  return prisma.purchaseOrder.findFirst({
    where: { OR: orFilters },
    select: { id: true, vendorId: true },
  });
};

const itemCache = new Map<string, string | null>();
const resolveItemId = async (itemExternalId: string | null, itemCode: string | null) => {
  const cacheKey = `${itemExternalId || ''}|${itemCode || ''}`;
  if (itemCache.has(cacheKey)) return itemCache.get(cacheKey) || null;

  const orFilters: Array<Record<string, string>> = [];
  if (itemExternalId) {
    orFilters.push({ externalId: itemExternalId });
    orFilters.push({ id: itemExternalId });
  }
  if (itemCode) {
    orFilters.push({ itemCode });
  }

  if (orFilters.length === 0) {
    itemCache.set(cacheKey, null);
    return null;
  }

  const found = await prisma.item.findFirst({
    where: { OR: orFilters },
    select: { id: true },
  });
  const resolved = found?.id || null;
  itemCache.set(cacheKey, resolved);
  return resolved;
};

export async function POST(request: NextRequest) {
  try {
    if (!isExternalIntegrationEnabled('goodsReceipts')) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'GOODS_RECEIPTS_INTEGRATION is disabled.',
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
        { error: 'Authorization bearer token is required to sync goods receipts.' },
        { status: 401 },
      );
    }

    let synced = 0;
    let failedRecords = 0;
    let missingLocalPo = 0;
    let mappedRecords = 0;
    let skippedInvalidRecords = 0;
    const upstreamErrors: string[] = [];

    let payload: unknown;
    try {
      payload = await fetchGoodsReceiptsFromIntegration({}, forwardedAuthHeader);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch goods receipts from integration middleware.';
      const details =
        typeof error === 'object' && error && 'details' in error ? (error as { details?: unknown }).details : null;
      upstreamErrors.push(message);
      if (details) {
        upstreamErrors.push(typeof details === 'string' ? details : JSON.stringify(details));
      }
      return NextResponse.json({
        success: true,
        skipped: true,
        warning: message,
        upstreamErrors,
      });
    }

    const payloadObject = payload as Record<string, unknown>;
    if (payloadObject && payloadObject.success === false) {
      const reason = extractErrorMessage(payload) || 'Integration middleware returned an unsuccessful response.';
      upstreamErrors.push(reason);
      return NextResponse.json({
        success: true,
        skipped: true,
        warning: reason,
        upstreamErrors,
      });
    }

    const list = extractList(payload);
    console.log('[Goods Receipts][SYNC] Retrieved from integration middleware', {
      count: list.length,
    });
    itemCache.clear();

    for (const entry of list) {
      try {
        const mapped = mapInventoryGoodsReceiptRecord(entry);
        if (!mapped.externalId || !mapped.data.grNumber) {
          skippedInvalidRecords += 1;
          failedRecords += 1;
          continue;
        }
        mappedRecords += 1;

        const po = await resolvePo(mapped.poNumber, mapped.poExternalId);
        if (!po) {
          missingLocalPo += 1;
          console.warn('[Goods Receipts][SYNC] PO link missing for record', {
            externalId: mapped.externalId,
            grNumber: mapped.data.grNumber,
            poExternalId: mapped.poExternalId,
            poNumber: mapped.poNumber,
          });
        }

        const existing = await prisma.goodsReceipt.findUnique({
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

        const resolvedItems: Array<{
          itemId: string;
          orderedQuantity: number;
          deliveredQuantity: number;
          receivedQuantity: number;
          acceptedQuantity: number;
          rejectedQuantity: number;
          rejectionReason: string | null;
          unitPrice: number;
          currency: string;
          batchNumber: string | null;
          serialNumber: string | null;
          manufacturingDate: Date | null;
          expiryDate: Date | null;
          storageLocation: string | null;
          qualityStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL';
          remarks: string | null;
        }> = [];
        for (const item of mapped.data.items) {
          const localItemId = await resolveItemId(item.itemExternalId, item.itemCode);
          if (!localItemId) continue;
          resolvedItems.push({
            itemId: localItemId,
            orderedQuantity: item.orderedQuantity,
            deliveredQuantity: item.deliveredQuantity,
            receivedQuantity: item.receivedQuantity,
            acceptedQuantity: item.acceptedQuantity,
            rejectedQuantity: item.rejectedQuantity,
            rejectionReason: item.rejectionReason,
            unitPrice: item.unitPrice,
            currency: item.currency,
            batchNumber: item.batchNumber,
            serialNumber: item.serialNumber,
            manufacturingDate: item.manufacturingDate,
            expiryDate: item.expiryDate,
            storageLocation: item.storageLocation,
            qualityStatus:
              item.qualityStatus === 'PASSED' ||
              item.qualityStatus === 'FAILED' ||
              item.qualityStatus === 'CONDITIONAL' ||
              item.qualityStatus === 'PENDING'
                ? item.qualityStatus
                : 'PENDING',
            remarks: item.remarks,
          });
        }

        if (existing) {
          await prisma.$transaction(async (tx) => {
            await tx.goodsReceipt.update({
              where: { id: existing.id },
              data: {
                externalId: mapped.externalId,
                externalUpdatedAt: mapped.data.externalUpdatedAt,
                externalCreatedAt: mapped.data.externalCreatedAt,
                lastSyncedAt: new Date(),
                rawPayload: mapped.data.rawPayload as Prisma.InputJsonValue,
                grnNumber: mapped.data.grnNumber,
                poId: po?.id ?? null,
                purchaseOrderId: mapped.poExternalId,
                // Prefer vendor linked from resolved local PO for referential consistency.
                supplierId: po?.vendorId ?? mapped.data.supplierExternalId,
                warehouseId: mapped.data.warehouseExternalId,
                receivedDate: mapped.data.receivedDate,
                receiptDate: mapped.data.receiptDate,
                receivedBy: mapped.data.receivedBy,
                receivedById: mapped.data.receivedById,
                status: mapped.data.status,
                deliveryNote: mapped.data.deliveryNote,
                transportDetails: mapped.data.transportDetails,
                vehicleNumber: mapped.data.vehicleNumber,
                driverName: mapped.data.driverName,
                receiptReason:
                  mapped.data.receiptReason === 'OPENING_BALANCE' ||
                  mapped.data.receiptReason === 'DIRECT_PURCHASE' ||
                  mapped.data.receiptReason === 'SAMPLE_GIFT' ||
                  mapped.data.receiptReason === 'CONSIGNMENT' ||
                  mapped.data.receiptReason === 'LOAN_BORROWING' ||
                  mapped.data.receiptReason === 'WARRANTY_REPLACEMENT' ||
                  mapped.data.receiptReason === 'DONATION' ||
                  mapped.data.receiptReason === 'FOUND_SURPLUS' ||
                  mapped.data.receiptReason === 'PRODUCTION_OUTPUT' ||
                  mapped.data.receiptReason === 'OTHER'
                    ? mapped.data.receiptReason
                    : null,
                storageLocation: mapped.data.storageLocation,
                specialHandling: mapped.data.specialHandling,
                qualityChecked: mapped.data.qualityChecked,
                qualityComments: mapped.data.qualityComments,
                qualityInspector: mapped.data.qualityInspector,
                inspectedBy: mapped.data.inspectedBy,
                inspectedAt: mapped.data.inspectedAt,
                approvedBy: mapped.data.approvedBy,
                approvedAt: mapped.data.approvedAt,
                remarks: mapped.data.remarks,
              },
            });

            if (resolvedItems.length > 0) {
              await tx.gRItem.deleteMany({ where: { grId: existing.id } });
              await tx.gRItem.createMany({
                data: resolvedItems.map((item) => ({ ...item, grId: existing.id })),
              });
            }
          });
        } else {
          await prisma.goodsReceipt.create({
            data: {
              grNumber: mapped.data.grNumber,
              externalId: mapped.externalId,
              externalUpdatedAt: mapped.data.externalUpdatedAt,
              externalCreatedAt: mapped.data.externalCreatedAt,
              lastSyncedAt: new Date(),
              rawPayload: mapped.data.rawPayload as Prisma.InputJsonValue,
              grnNumber: mapped.data.grnNumber,
              poId: po?.id ?? null,
              purchaseOrderId: mapped.poExternalId,
              // Prefer vendor linked from resolved local PO for referential consistency.
              supplierId: po?.vendorId ?? mapped.data.supplierExternalId,
              warehouseId: mapped.data.warehouseExternalId,
              receivedDate: mapped.data.receivedDate,
              receiptDate: mapped.data.receiptDate,
              receivedBy: mapped.data.receivedBy,
              receivedById: mapped.data.receivedById,
              status: mapped.data.status,
              deliveryNote: mapped.data.deliveryNote,
              transportDetails: mapped.data.transportDetails,
              vehicleNumber: mapped.data.vehicleNumber,
              driverName: mapped.data.driverName,
              receiptReason:
                mapped.data.receiptReason === 'OPENING_BALANCE' ||
                mapped.data.receiptReason === 'DIRECT_PURCHASE' ||
                mapped.data.receiptReason === 'SAMPLE_GIFT' ||
                mapped.data.receiptReason === 'CONSIGNMENT' ||
                mapped.data.receiptReason === 'LOAN_BORROWING' ||
                mapped.data.receiptReason === 'WARRANTY_REPLACEMENT' ||
                mapped.data.receiptReason === 'DONATION' ||
                mapped.data.receiptReason === 'FOUND_SURPLUS' ||
                mapped.data.receiptReason === 'PRODUCTION_OUTPUT' ||
                mapped.data.receiptReason === 'OTHER'
                  ? mapped.data.receiptReason
                  : null,
              storageLocation: mapped.data.storageLocation,
              specialHandling: mapped.data.specialHandling,
              qualityChecked: mapped.data.qualityChecked,
              qualityComments: mapped.data.qualityComments,
              qualityInspector: mapped.data.qualityInspector,
              inspectedBy: mapped.data.inspectedBy,
              inspectedAt: mapped.data.inspectedAt,
              approvedBy: mapped.data.approvedBy,
              approvedAt: mapped.data.approvedAt,
              remarks: mapped.data.remarks,
              items: {
                create: resolvedItems,
              },
            },
          });
        }
        synced += 1;
      } catch (recordError) {
        failedRecords += 1;
        console.error('[Goods Receipts][SYNC] Failed record:', recordError);
      }
    }

    const totalLocalRows = await prisma.goodsReceipt.count();

    const responsePayload = {
      success: true,
      retrievedFromIntegration: list.length,
      mappedRecords,
      skippedInvalidRecords,
      synced,
      failedRecords,
      missingLocalPo,
      sourceEndpoint: '/goods-receipt',
      totalLocalRows,
      upstreamErrors,
    };

    console.log('[Goods Receipts][SYNC] Completed', responsePayload);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('[Goods Receipts][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync goods receipts' }, { status: 500 });
  }
}
