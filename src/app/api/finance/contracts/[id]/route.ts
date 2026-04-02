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
  const startedAt = Date.now();
  const auth = getFinanceAuth(request);
  const { id } = await params;

  console.log('[finance/contracts/[id]][GET] Incoming request', {
    requestId,
    path: request.nextUrl.pathname,
    id,
  });

  if (!auth.ok) {
    console.warn('[finance/contracts/[id]][GET] Unauthorized request', {
      requestId,
      path: request.nextUrl.pathname,
      id,
      durationMs: Date.now() - startedAt,
    });
    return financeError(
      'Unauthorized. Use Authorization: Bearer <token> or X-API-Key: <key>.',
      401,
      requestId
    );
  }

  try {
    console.log('[finance/contracts/[id]][GET] Authenticated request', {
      requestId,
      authMethod: auth.authMethod,
      id,
    });
    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        vendor: true,
        servicePR: {
          include: {
            items: {
              include: {
                serviceItem: {
                  include: { serviceCategory: true },
                },
              },
            },
            materialItems: { include: { item: true } },
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
      console.warn('[finance/contracts/[id]][GET] Contract not found', {
        requestId,
        authMethod: auth.authMethod,
        id,
        durationMs: Date.now() - startedAt,
      });
      return financeError('Service contract not found.', 404, requestId);
    }

    console.log('[finance/contracts/[id]][GET] Success', {
      requestId,
      authMethod: auth.authMethod,
      id,
      contractNumber: contract.contractNumber,
      durationMs: Date.now() - startedAt,
    });
    const legacyPr = contract.servicePR
      ? {
          id: contract.servicePR.id,
          prNumber: contract.servicePR.prNumber,
          estimatedCost: contract.servicePR.estimatedCost,
          servicePR: contract.servicePR,
        }
      : null;

    return financeSuccess({ ...contract, pr: legacyPr }, undefined, requestId);
  } catch (error) {
    console.error('[finance/contracts/[id]][GET] Failed', {
      requestId,
      id,
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    return financeError(
      'Failed to fetch contract.',
      500,
      requestId
    );
  }
}
