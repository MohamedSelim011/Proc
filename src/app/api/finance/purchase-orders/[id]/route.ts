import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getFinanceAuth } from '@/lib/finance-auth';
import {
  financeSuccess,
  financeError,
  getRequestId,
} from '@/lib/finance-response';
import { POStatus, Prisma } from '@prisma/client';

type FinancePOUpdateItem = {
  itemId: string;
  quantity: number;
  unitPrice: number;
  deliveryDate?: string | null;
};

type FinancePOUpdateBody = {
  vendorId?: string;
  deliveryDate?: string;
  deliveryAddress?: Prisma.InputJsonValue;
  paymentTerms?: string;
  currency?: string;
  status?: POStatus;
  invoicedAmount?: number | string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  items?: FinancePOUpdateItem[];
};

const poInclude = {
  vendor: {
    include: {
      categories: { include: { category: true } },
    },
  },
  pr: {
    include: {
      items: { include: { item: true } },
    },
  },
  sourceMaterialRequisition: true,
  items: {
    include: {
      item: { include: { category: true } },
    },
  },
  goodsReceipts: {
    include: {
      items: { include: { item: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  invoices: { orderBy: { createdAt: 'desc' as const } },
  amendments: { orderBy: { createdAt: 'desc' as const } },
};

/**
 * GET /api/finance/purchase-orders/[id]
 * Single PO with full details. Auth: Bearer <jwt> or X-API-Key.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const auth = getFinanceAuth(request);
  const lookupKey = decodeURIComponent(params.id || '').trim();

  console.log('[finance/purchase-orders/[id]][GET] Incoming request', {
    requestId,
    path: request.nextUrl.pathname,
    lookupKey,
  });

  if (!auth.ok) {
    console.warn('[finance/purchase-orders/[id]][GET] Unauthorized request', {
      requestId,
      path: request.nextUrl.pathname,
      lookupKey,
      durationMs: Date.now() - startedAt,
    });
    return financeError(
      'Unauthorized. Use Authorization: Bearer <token> or X-API-Key: <key>.',
      401,
      requestId
    );
  }

  try {
    console.log('[finance/purchase-orders/[id]][GET] Authenticated request', {
      requestId,
      authMethod: auth.authMethod,
      lookupKey,
    });
    const order = await prisma.purchaseOrder.findFirst({
      where: {
        OR: [
          { id: lookupKey },
          { poNumber: lookupKey },
        ],
      },
      include: poInclude,
    });

    if (!order) {
      console.warn('[finance/purchase-orders/[id]][GET] PO not found', {
        requestId,
        authMethod: auth.authMethod,
        lookupKey,
        durationMs: Date.now() - startedAt,
      });
      return financeError('Purchase order not found.', 404, requestId);
    }

    const deliveryStats = {
      totalOrdered: order.items.reduce((sum, item) => sum + item.quantity, 0),
      totalReceived: order.goodsReceipts.reduce(
        (sum, gr) =>
          sum +
          gr.items.reduce(
            (itemSum, grItem) => itemSum + grItem.acceptedQuantity,
            0
          ),
        0
      ),
      totalRejected: order.goodsReceipts.reduce(
        (sum, gr) =>
          sum +
          gr.items.reduce(
            (itemSum, grItem) => itemSum + grItem.rejectedQuantity,
            0
          ),
        0
      ),
      totalPending: 0,
    };
    deliveryStats.totalPending =
      deliveryStats.totalOrdered -
      deliveryStats.totalReceived -
      deliveryStats.totalRejected;

    const transformedGoodsReceipts = order.goodsReceipts.map((gr) => {
      const totalAccepted = gr.items.reduce(
        (sum, item) => sum + item.acceptedQuantity,
        0
      );
      const totalRejected = gr.items.reduce(
        (sum, item) => sum + item.rejectedQuantity,
        0
      );
      return {
        id: gr.id,
        grnNumber: gr.grNumber,
        receiptDate: gr.receivedDate.toISOString(),
        status: gr.status,
        totalReceived: totalAccepted,
        totalRejected,
      };
    });

    const paymentStats = {
      totalInvoiced: order.invoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0
      ),
      totalPaid: order.invoices
        .filter((inv) => inv.paymentStatus === 'PAID')
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
    };

    const data = {
      ...order,
      invoicedAmount: order.invoicedAmount ?? 0,
      goodsReceipts: transformedGoodsReceipts,
      deliveryStats,
      statistics: {
        delivery: deliveryStats,
        payment: paymentStats,
      },
    };

    console.log('[finance/purchase-orders/[id]][GET] Success', {
      requestId,
      authMethod: auth.authMethod,
      lookupKey,
      poId: order.id,
      poNumber: order.poNumber,
      durationMs: Date.now() - startedAt,
    });
    return financeSuccess(data, undefined, requestId);
  } catch (error) {
    console.error('[finance/purchase-orders/[id]][GET] Failed', {
      requestId,
      lookupKey,
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    return financeError(
      'Failed to fetch purchase order.',
      500,
      requestId
    );
  }
}

/**
 * PUT /api/finance/purchase-orders/[id]
 * Update PO for finance app. Auth: Bearer <jwt> or X-API-Key.
 * - Supports the same editable fields as /api/purchase-orders/[id]
 * - Allows status update without transition restrictions
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const auth = getFinanceAuth(request);
  const lookupKey = decodeURIComponent(params.id || '').trim();

  console.log('[finance/purchase-orders/[id]][PUT] Incoming request', {
    requestId,
    path: request.nextUrl.pathname,
    lookupKey,
  });

  if (!auth.ok) {
    console.warn('[finance/purchase-orders/[id]][PUT] Unauthorized request', {
      requestId,
      path: request.nextUrl.pathname,
      lookupKey,
      durationMs: Date.now() - startedAt,
    });
    return financeError(
      'Unauthorized. Use Authorization: Bearer <token> or X-API-Key: <key>.',
      401,
      requestId
    );
  }

  try {
    console.log('[finance/purchase-orders/[id]][PUT] Authenticated request', {
      requestId,
      authMethod: auth.authMethod,
      lookupKey,
    });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return financeError('Invalid JSON body.', 400, requestId);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return financeError('Body must be a JSON object.', 400, requestId);
    }
    const payload = body as FinancePOUpdateBody;
    console.log('[finance/purchase-orders/[id]][PUT] Payload summary', {
      requestId,
      lookupKey,
      fields: Object.keys(payload),
      hasItems: Array.isArray(payload.items),
      itemsCount: Array.isArray(payload.items) ? payload.items.length : null,
      status: payload.status ?? null,
      invoicedAmount: payload.invoicedAmount ?? null,
    });

    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        OR: [{ id: lookupKey }, { poNumber: lookupKey }],
      },
      select: {
        id: true,
        status: true,
        vendorId: true,
        deliveryDate: true,
        deliveryAddress: true,
        paymentTerms: true,
        currency: true,
        totalAmount: true,
        invoicedAmount: true,
      },
    });

    if (!existingPO) {
      console.warn('[finance/purchase-orders/[id]][PUT] PO not found', {
        requestId,
        lookupKey,
        durationMs: Date.now() - startedAt,
      });
      return financeError('Purchase order not found.', 404, requestId);
    }

    if (payload.status !== undefined) {
      const validStatuses = Object.values(POStatus);
      if (!validStatuses.includes(payload.status)) {
        return financeError(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          400,
          requestId
        );
      }
    }

    if (payload.items !== undefined) {
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        return financeError('items must be a non-empty array when provided.', 400, requestId);
      }
      for (let i = 0; i < payload.items.length; i++) {
        const item = payload.items[i];
        if (!item || typeof item !== 'object') {
          return financeError(`items[${i}] must be an object.`, 400, requestId);
        }
        if (!item.itemId || typeof item.itemId !== 'string') {
          return financeError(`items[${i}].itemId is required and must be a string.`, 400, requestId);
        }
        if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
          return financeError(`items[${i}].quantity must be a number > 0.`, 400, requestId);
        }
        if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
          return financeError(`items[${i}].unitPrice must be a number >= 0.`, 400, requestId);
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (payload.items !== undefined) {
        await tx.pOItem.deleteMany({
          where: { poId: existingPO.id },
        });
      }

      const updateData: Prisma.PurchaseOrderUpdateInput = {};

      if (payload.vendorId !== undefined) updateData.vendorId = payload.vendorId;
      if (payload.deliveryDate !== undefined) updateData.deliveryDate = new Date(payload.deliveryDate);
      if (payload.deliveryAddress !== undefined) updateData.deliveryAddress = payload.deliveryAddress;
      if (payload.paymentTerms !== undefined) updateData.paymentTerms = payload.paymentTerms;
      if (payload.currency !== undefined) updateData.currency = payload.currency;
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.invoicedAmount !== undefined) updateData.invoicedAmount = payload.invoicedAmount;
      if (payload.acknowledgedAt !== undefined) {
        updateData.acknowledgedAt = payload.acknowledgedAt ? new Date(payload.acknowledgedAt) : null;
      }
      if (payload.acknowledgedBy !== undefined) updateData.acknowledgedBy = payload.acknowledgedBy;

      if (payload.items !== undefined) {
        const totalAmount = payload.items.reduce(
          (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
          0
        );
        updateData.totalAmount = totalAmount;
        updateData.items = {
          create: payload.items.map((item) => ({
            itemId: item.itemId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
          })),
        };
      }

      return tx.purchaseOrder.update({
        where: { id: existingPO.id },
        data: updateData,
        include: {
          vendor: true,
          pr: { select: { id: true, prNumber: true } },
          items: {
            include: {
              item: true,
            },
          },
        },
      });
    });

    console.log('[finance/purchase-orders/[id]][PUT] Success', {
      requestId,
      authMethod: auth.authMethod,
      lookupKey,
      poId: updated.id,
      poNumber: updated.poNumber,
      durationMs: Date.now() - startedAt,
    });
    return financeSuccess(updated, undefined, requestId);
  } catch (error) {
    console.error('[finance/purchase-orders/[id]][PUT] Failed', {
      requestId,
      lookupKey,
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    return financeError('Failed to update purchase order.', 500, requestId);
  }
}
