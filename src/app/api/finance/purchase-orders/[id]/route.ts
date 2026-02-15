import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getFinanceAuth } from '@/lib/finance-auth';
import {
  financeSuccess,
  financeError,
  getRequestId,
} from '@/lib/finance-response';

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
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: poInclude,
    });

    if (!order) {
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
      goodsReceipts: transformedGoodsReceipts,
      deliveryStats,
      statistics: {
        delivery: deliveryStats,
        payment: paymentStats,
      },
    };

    return financeSuccess(data, undefined, requestId);
  } catch (error) {
    console.error('[finance/purchase-orders/[id]]', error);
    return financeError(
      'Failed to fetch purchase order.',
      500,
      requestId
    );
  }
}
