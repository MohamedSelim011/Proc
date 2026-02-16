import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getFinanceAuth } from '@/lib/finance-auth';
import {
  financeSuccess,
  financeError,
  getRequestId,
} from '@/lib/finance-response';

/**
 * GET /api/finance/vendors/[id]
 * Single vendor for finance with purchase orders. Auth: Bearer <jwt> or X-API-Key.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);
  const auth = getFinanceAuth(request);
  if (!auth.ok) {
    return financeError(
      'Unauthorized. Use Authorization: Bearer <token> or X-API-Key: <key>.',
      401,
      requestId
    );
  }

  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        purchaseOrders: {
          include: {
            pr: true,
            items: {
              include: {
                item: {
                  include: {
                    category: true,
                  },
                },
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
          orderBy: {
            createdAt: 'desc',
          },
        },
        invoices: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            purchaseOrders: true,
            invoices: true,
            evaluations: true,
          },
        },
      },
    });

    if (!vendor) {
      return financeError('Vendor not found.', 404, requestId);
    }

    return financeSuccess(vendor, undefined, requestId);
  } catch (error) {
    console.error('[finance/vendors/[id]]', error);
    return financeError(
      'Failed to fetch vendor.',
      500,
      requestId
    );
  }
}
