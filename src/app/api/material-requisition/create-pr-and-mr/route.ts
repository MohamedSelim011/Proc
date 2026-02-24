import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import {
  createMR,
  getInventoryItemById,
  getInventoryUserIdByEmail,
  isInventoryConfigured,
} from '@/lib/inventory-client';

const INVENTORY_SYNC_CATEGORY_CODE = 'INVENTORY';

/**
 * Get or create the category used for items synced from Inventory (master).
 */
async function getOrCreateInventorySyncCategory() {
  const cat = await prisma.category.findUnique({
    where: { code: INVENTORY_SYNC_CATEGORY_CODE },
    select: { id: true },
  });
  if (cat) return cat.id;
  const created = await prisma.category.create({
    data: {
      code: INVENTORY_SYNC_CATEGORY_CODE,
      nameEn: 'Inventory (synced)',
      nameAr: 'مخزون (مزامن)',
      description: 'Items synced from Inventory system (master).',
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * POST /api/material-requisition/create-pr-and-mr
 * When stock is insufficient: create PR in Procurement (enters approval → PO) and create MR in
 * Inventory with status "Needs PO" so both systems are in sync.
 * Inventory is the master for items: if an item does not exist in Procurement, it is created from Inventory.
 * Requires authenticated user.
 * Body: departmentId, justification, requiredByDate, priority, items (itemCode, quantity, estimatedPrice, inventoryItemId), deliveryWarehouseId, inventoryProjectId, ...
 */
const LOG_PREFIX = '[req] create-pr-and-mr';

export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIX} → request received`);

  const user = getAuthenticatedUser(request);
  if (!user) {
    console.error(`${LOG_PREFIX} → Unauthorized (no/invalid token)`);
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  console.log(`${LOG_PREFIX} → user: ${user.email ?? user.id}`);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.error(`${LOG_PREFIX} → Invalid JSON body`);
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as {
    departmentId?: string;
    justification?: string;
    requiredByDate?: string;
    priority?: string;
    projectId?: string;
    deliveryWarehouseId?: string;
    inventoryProjectId?: string;
    sourceMaterialRequestId?: string;
    items?: Array<{
      itemCode?: string;
      quantity?: number;
      estimatedPrice?: number;
      inventoryItemId?: string;
      requiredDate?: string;
    }>;
  };

  const departmentId = b.departmentId?.trim();
  const budgetCode = 'AUTO';
  if (!departmentId) {
    console.error(`${LOG_PREFIX} → Validation: missing departmentId`);
    return Response.json(
      { error: 'departmentId is required.' },
      { status: 400 }
    );
  }

  if (!Array.isArray(b.items) || b.items.length === 0) {
    console.error(`${LOG_PREFIX} → Validation: items array missing or empty`);
    return Response.json(
      { error: 'items array is required and must not be empty.' },
      { status: 400 }
    );
  }
  console.log(`${LOG_PREFIX} → departmentId=${departmentId} items=${b.items.length}`);

  const priority = (b.priority?.toUpperCase() || 'NORMAL') as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL'];
  if (!validPriorities.includes(priority)) {
    return Response.json({ error: 'priority must be one of: LOW, NORMAL, HIGH, URGENT, CRITICAL.' }, { status: 400 });
  }

  const itemCodes = [...new Set(b.items.map((i) => String(i?.itemCode ?? '').trim()).filter(Boolean))];
  if (itemCodes.length === 0) {
    return Response.json({ error: 'Each item must have itemCode.' }, { status: 400 });
  }

  // Resolve Procurement Item ids by itemCode; create missing items from Inventory (master)
  const procurementItems = await prisma.item.findMany({
    where: { itemCode: { in: itemCodes } },
    select: { id: true, itemCode: true },
  });
  const codeToId = new Map(procurementItems.map((i) => [i.itemCode, i.id]));
  const missingCodes = itemCodes.filter((c) => !codeToId.has(c));

  if (missingCodes.length > 0) {
    const defaultCategoryId = await getOrCreateInventorySyncCategory();
    for (const code of missingCodes) {
      const lineWithId = b.items!.find(
        (i) => String(i?.itemCode ?? '').trim() === code && i?.inventoryItemId?.trim()
      );
      const inventoryId = lineWithId?.inventoryItemId?.trim();

      if (isInventoryConfigured() && inventoryId) {
        const invItem = await getInventoryItemById(inventoryId);
        if (invItem.success) {
          const inv = invItem.data;
          const nameEn = inv.name?.trim() || inv.code || code;
          const nameAr = inv.arabicName?.trim() || nameEn;
          const uom = inv.baseUom?.abbreviation?.trim() || inv.baseUom?.name?.trim() || 'EA';
          const created = await prisma.item.create({
            data: {
              itemCode: inv.code?.trim() || code,
              nameEn,
              nameAr,
              description: inv.description?.trim() || null,
              categoryId: defaultCategoryId,
              unitOfMeasure: uom,
            },
            select: { id: true, itemCode: true },
          });
          codeToId.set(created.itemCode, created.id);
          continue;
        }
      }
      // Fallback: create minimal item (e.g. Inventory not configured or fetch failed)
      const created = await prisma.item.create({
        data: {
          itemCode: code,
          nameEn: code,
          nameAr: code,
          categoryId: defaultCategoryId,
          unitOfMeasure: 'EA',
        },
        select: { id: true, itemCode: true },
      });
      codeToId.set(created.itemCode, created.id);
    }
  }

  const requesterId = user.employeeId || user.id || 'emp001';
  const incomingSourceMaterialRequestId =
    typeof b.sourceMaterialRequestId === 'string' && b.sourceMaterialRequestId.trim()
      ? b.sourceMaterialRequestId.trim()
      : null;
  let sourceMaterialRequestId: string | null = null;
  if (incomingSourceMaterialRequestId) {
    const sourceRequest = await prisma.hrMaterialRequest.findFirst({
      where: {
        OR: [
          { id: incomingSourceMaterialRequestId },
          { externalId: incomingSourceMaterialRequestId },
        ],
      },
      select: { id: true },
    });
    sourceMaterialRequestId = sourceRequest?.id || null;
  }
  const prItems = b.items.map((it) => {
    const code = String(it?.itemCode ?? '').trim();
    const qty = Number(it?.quantity) || 0;
    const price = Number(it?.estimatedPrice) ?? 0;
    if (!code || qty <= 0) {
      throw new Error('Each item must have itemCode and positive quantity.');
    }
    return {
      itemId: codeToId.get(code)!,
      quantity: qty,
      estimatedPrice: price,
      requiredDate: it?.requiredDate?.trim() || b.requiredByDate?.trim() || undefined,
      inventoryItemId: it?.inventoryItemId?.trim(),
    };
  });

  const estimatedCost = prItems.reduce((sum, i) => sum + i.quantity * i.estimatedPrice, 0);
  const count = await prisma.purchaseRequisition.count();
  const prNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  console.log(`${LOG_PREFIX} → Creating PR in DB: ${prNumber} ${prItems.length} line(s)`);
  const requisition = await prisma.purchaseRequisition.create({
    data: {
      prNumber,
      requesterId,
      requestDate: new Date(),
      departmentId,
      itemType: 'STOCK',
      priority,
      status: 'DRAFT',
      estimatedCost,
      budgetCode,
      justification: b.justification?.trim() || null,
      requiredByDate: b.requiredByDate ? new Date(b.requiredByDate) : null,
      projectId: b.projectId?.trim() || null,
      costCenter: null,
      sourceMaterialRequestId,
      createdBy: requesterId,
      items: {
        create: prItems.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          estimatedPrice: i.estimatedPrice,
          requiredDate: i.requiredDate ? new Date(i.requiredDate) : null,
        })),
      },
    },
    select: { id: true, prNumber: true },
  });

  let mrData: { id: string; mrNumber?: string } | null = null;
  let mrError: string | null = null;
  const mrLines = prItems.filter((i) => i.inventoryItemId).map((i) => ({
    itemId: i.inventoryItemId!,
    quantity: i.quantity,
    requiredDate: b.requiredByDate?.trim(),
  }));

  const shouldCreateMr =
    isInventoryConfigured() &&
    Boolean(b.deliveryWarehouseId?.trim()) &&
    Boolean(b.inventoryProjectId?.trim()) &&
    mrLines.length > 0;

  console.log(
    `${LOG_PREFIX} → PR created id=${requisition.id} prNumber=${requisition.prNumber}. ` +
    `MR: inventoryConfigured=${isInventoryConfigured()} deliveryWarehouseId=${Boolean(b.deliveryWarehouseId?.trim())} inventoryProjectId=${Boolean(b.inventoryProjectId?.trim())} mrLines=${mrLines.length} shouldCreateMr=${shouldCreateMr}`
  );

  if (shouldCreateMr) {
    const userIdResult = await getInventoryUserIdByEmail(user.email);
    if (!userIdResult.success) {
      mrError = userIdResult.error;
      console.error('[create-pr-and-mr] Inventory user resolution failed:', userIdResult.error);
    } else {
      const mrPayload = {
        projectId: b.inventoryProjectId!.trim(),
        deliveryWarehouseId: b.deliveryWarehouseId!.trim(),
        requiredDate: b.requiredByDate?.trim() || new Date().toISOString().slice(0, 10),
        purpose: b.justification?.trim() || 'Material requisition – stock insufficient; PR created in Procurement.',
        priority,
        userId: userIdResult.userId,
        items: mrLines,
        justification: b.justification?.trim(),
      };
      console.log(`${LOG_PREFIX} → Calling Inventory POST /api/requisitions (create MR) userId=${userIdResult.userId} items=${mrLines.length}`);
      const mrResult = await createMR(mrPayload);
      if (mrResult.success && mrResult.data) {
        mrData = { id: mrResult.data.id, mrNumber: mrResult.data.mrNumber };
        console.log(`${LOG_PREFIX} → MR created in Inventory id=${mrData.id} mrNumber=${mrData.mrNumber}`);
      } else {
        mrError = mrResult.error;
        console.error(`${LOG_PREFIX} → Create MR failed:`, mrResult.error);
      }
    }
  } else if (isInventoryConfigured() && mrLines.length === 0) {
    mrError = 'No inventory item IDs in request; cannot create MR in Inventory.';
    console.warn(`${LOG_PREFIX} → Skipping MR: no inventory item IDs in request`);
  } else if (isInventoryConfigured() && (!b.deliveryWarehouseId?.trim() || !b.inventoryProjectId?.trim())) {
    mrError = 'Missing deliveryWarehouseId or inventoryProjectId; cannot create MR in Inventory.';
    console.warn(`${LOG_PREFIX} → Skipping MR: missing deliveryWarehouseId or inventoryProjectId`);
  }

  return Response.json(
    {
      success: true,
      message: mrData
        ? 'Purchase Requisition created. MR created in Inventory with status "Needs PO".'
        : mrError
          ? 'Purchase Requisition created. MR could not be created in Inventory.'
          : 'Purchase Requisition created.',
      data: {
        prId: requisition.id,
        prNumber: requisition.prNumber,
        ...(mrData && { mrId: mrData.id, mrNumber: mrData.mrNumber }),
        ...(mrError && { mrError }),
      },
    },
    { status: 201 }
  );
}
