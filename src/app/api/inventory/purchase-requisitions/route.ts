import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getInventoryAuth } from '@/lib/inventory-auth';
import {
  financeError,
  getRequestId,
} from '@/lib/finance-response';

/** Material PR item for request body */
const itemSchema = {
  itemId: (v: unknown) => typeof v === 'string' && v.length > 0,
  quantity: (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0,
  estimatedPrice: (v: unknown) => typeof v === 'number' && !Number.isNaN(v) && v >= 0,
  specifications: (v: unknown) => v == null || typeof v === 'string',
  requiredDate: (v: unknown) => v == null || typeof v === 'string',
};

const ITEM_TYPES = ['STOCK', 'NON_STOCK'] as const;
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

/**
 * POST /api/inventory/purchase-requisitions
 * Create a material (STOCK/NON_STOCK) PR. Enters normal procurement flow as DRAFT.
 * Auth: Bearer <jwt> or X-API-Key.
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const auth = getInventoryAuth(request);
  if (!auth.ok) {
    return financeError(
      'Unauthorized. Use Authorization: Bearer <token> or X-API-Key: <key>.',
      401,
      requestId
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return financeError('Invalid JSON body.', 400, requestId);
  }

  if (!body || typeof body !== 'object') {
    return financeError('Body must be a JSON object.', 400, requestId);
  }

  const b = body as Record<string, unknown>;

  // Required
  const departmentId = b.departmentId;
  if (typeof departmentId !== 'string' || !departmentId.trim()) {
    return financeError('departmentId is required and must be a non-empty string.', 400, requestId);
  }

  const items = b.items;
  if (!Array.isArray(items) || items.length === 0) {
    return financeError('items is required and must be a non-empty array.', 400, requestId);
  }

  // itemType: material only (STOCK or NON_STOCK)
  const itemTypeRaw = b.itemType;
  const itemType = itemTypeRaw == null || itemTypeRaw === ''
    ? 'STOCK'
    : (typeof itemTypeRaw === 'string' && ITEM_TYPES.includes(itemTypeRaw as any))
      ? itemTypeRaw
      : null;
  if (itemType === null) {
    return financeError(
      `itemType must be one of: ${ITEM_TYPES.join(', ')}. Material PRs only.`,
      400,
      requestId
    );
  }

  // Optional with defaults
  const priority = (b.priority != null && typeof b.priority === 'string' && PRIORITIES.includes(b.priority as any))
    ? b.priority
    : 'NORMAL';
  const requesterId = typeof b.requesterId === 'string' ? b.requesterId.trim() || 'inventory-system' : 'inventory-system';
  const budgetCode = typeof b.budgetCode === 'string' && b.budgetCode.trim() ? b.budgetCode.trim() : 'AUTO';

  const justification = typeof b.justification === 'string' ? b.justification : null;
  const requiredByDate = b.requiredByDate != null && b.requiredByDate !== ''
    ? (typeof b.requiredByDate === 'string' ? new Date(b.requiredByDate) : null)
    : null;
  if (requiredByDate !== null && Number.isNaN(requiredByDate.getTime())) {
    return financeError('requiredByDate must be a valid ISO date string if provided.', 400, requestId);
  }
  const projectId = typeof b.projectId === 'string' ? b.projectId.trim() || null : null;

  // Validate and normalize items
  const normalizedItems: Array<{
    itemId: string;
    quantity: number;
    estimatedPrice: number;
    specifications: string | null;
    requiredDate: Date | null;
  }> = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || typeof it !== 'object') {
      return financeError(`items[${i}] must be an object.`, 400, requestId);
    }
    const item = it as Record<string, unknown>;
    if (!itemSchema.itemId(item.itemId)) {
      return financeError(`items[${i}].itemId is required and must be a non-empty string.`, 400, requestId);
    }
    if (!itemSchema.quantity(item.quantity)) {
      return financeError(`items[${i}].quantity must be a positive integer.`, 400, requestId);
    }
    if (!itemSchema.estimatedPrice(item.estimatedPrice)) {
      return financeError(`items[${i}].estimatedPrice must be a number >= 0.`, 400, requestId);
    }
    if (!itemSchema.specifications(item.specifications)) {
      return financeError(`items[${i}].specifications must be a string if provided.`, 400, requestId);
    }
    if (!itemSchema.requiredDate(item.requiredDate)) {
      return financeError(`items[${i}].requiredDate must be an ISO date string if provided.`, 400, requestId);
    }
    const requiredDate = item.requiredDate != null && item.requiredDate !== ''
      ? new Date(item.requiredDate as string)
      : null;
    if (requiredDate !== null && Number.isNaN(requiredDate.getTime())) {
      return financeError(`items[${i}].requiredDate must be a valid ISO date.`, 400, requestId);
    }
    normalizedItems.push({
      itemId: String(item.itemId).trim(),
      quantity: Number(item.quantity),
      estimatedPrice: Number(item.estimatedPrice),
      specifications: item.specifications != null && item.specifications !== '' ? String(item.specifications) : null,
      requiredDate,
    });
  }

  // Ensure all itemIds exist in the Item table
  const itemIds = [...new Set(normalizedItems.map((i) => i.itemId))];
  const existingItems = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingItems.map((e) => e.id));
  const missing = itemIds.filter((id) => !existingIds.has(id));
  if (missing.length > 0) {
    return financeError(
      `The following itemIds do not exist in the catalog: ${missing.join(', ')}.`,
      400,
      requestId
    );
  }

  try {
    const estimatedCost = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.estimatedPrice,
      0
    );

    const count = await prisma.purchaseRequisition.count();
    const prNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const requisition = await prisma.purchaseRequisition.create({
      data: {
        prNumber,
        requesterId,
        requestDate: new Date(),
        departmentId: departmentId.trim(),
        itemType,
        priority,
        status: 'DRAFT',
        estimatedCost,
        budgetCode,
        justification,
        requiredByDate,
        projectId,
        costCenter: null,
        createdBy: requesterId,
        items: {
          create: normalizedItems.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice,
            specifications: item.specifications,
            requiredDate: item.requiredDate,
          })),
        },
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    // Optional: auto-submit for approval (same as main API)
    const autoSubmit = b.autoSubmit === true;
    if (autoSubmit) {
      await prisma.$transaction([
        prisma.purchaseRequisition.update({
          where: { id: requisition.id },
          data: { status: 'SUBMITTED' },
        }),
        prisma.approval.create({
          data: {
            documentType: 'PURCHASE_REQUISITION',
            documentId: requisition.id,
            prId: requisition.id,
            approverId: typeof b.firstApproverId === 'string' ? b.firstApproverId : 'manager001',
            status: 'PENDING',
            level: 1,
          },
        }),
      ]);
    }

    return NextResponse.json(
      {
        success: true,
        data: requisition,
        ...(requestId && { requestId }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[inventory/purchase-requisitions]', error);
    return financeError(
      'Failed to create purchase requisition.',
      500,
      requestId
    );
  }
}
