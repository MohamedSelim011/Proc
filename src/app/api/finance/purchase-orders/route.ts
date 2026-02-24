import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getFinanceAuth } from '@/lib/finance-auth';
import {
  financeSuccess,
  financeError,
  getRequestId,
} from '@/lib/finance-response';

/**
 * GET /api/finance/purchase-orders
 * List POs for finance. Auth: Bearer <jwt> or X-API-Key / Authorization: ApiKey <key>
 * Query: page, limit, status, vendorId
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const auth = getFinanceAuth(request);
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '50'),
    100
  );
  const status = searchParams.get('status') || '';
  const vendorId = searchParams.get('vendorId') || '';

  console.log('[finance/purchase-orders][GET] Incoming request', {
    requestId,
    path: request.nextUrl.pathname,
    page,
    limit,
    status: status || null,
    vendorId: vendorId || null,
  });

  if (!auth.ok) {
    console.warn('[finance/purchase-orders][GET] Unauthorized request', {
      requestId,
      path: request.nextUrl.pathname,
      durationMs: Date.now() - startedAt,
    });
    return financeError(
      'Unauthorized. Use Authorization: Bearer <token> or X-API-Key: <key>.',
      401,
      requestId
    );
  }

  try {
    console.log('[finance/purchase-orders][GET] Authenticated request', {
      requestId,
      authMethod: auth.authMethod,
    });

    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status.includes(',')
        ? { in: status.split(',').map((s) => s.trim()) }
        : status;
    }
    if (vendorId) where.vendorId = vendorId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: true,
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
          _count: {
            select: {
              goodsReceipts: true,
              invoices: true,
              amendments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);
    const purchaseOrders = orders.map((order) => ({
      ...order,
      invoicedAmount: order.invoicedAmount ?? 0,
    }));

    const totalPages = Math.ceil(total / limit);
    console.log('[finance/purchase-orders][GET] Success', {
      requestId,
      authMethod: auth.authMethod,
      count: purchaseOrders.length,
      total,
      totalPages,
      durationMs: Date.now() - startedAt,
    });
    return financeSuccess(
      { purchaseOrders },
      { page, limit, total, totalPages },
      requestId
    );
  } catch (error) {
    console.error('[finance/purchase-orders][GET] Failed', {
      requestId,
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    return financeError(
      'Failed to fetch purchase orders.',
      500,
      requestId
    );
  }
}
