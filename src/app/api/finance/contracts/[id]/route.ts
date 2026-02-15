import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getFinanceAuth } from '@/lib/finance-auth';
import {
  financeSuccess,
  financeError,
  getRequestId,
} from '@/lib/finance-response';

/**
 * GET /api/finance/contracts/[id]
 * Single service contract with full details. Auth: Bearer <jwt> or X-API-Key.
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
    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        vendor: true,
        pr: {
          include: {
            items: { include: { item: true } },
            servicePR: {
              include: {
                items: {
                  include: {
                    serviceItem: {
                      include: { serviceCategory: true },
                    },
                  },
                },
              },
            },
          },
        },
        approval: {
          include: {
            approvalHistory: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5,
        },
        vendorResponses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contract) {
      return financeError('Service contract not found.', 404, requestId);
    }

    return financeSuccess(contract, undefined, requestId);
  } catch (error) {
    console.error('[finance/contracts/[id]]', error);
    return financeError(
      'Failed to fetch contract.',
      500,
      requestId
    );
  }
}
