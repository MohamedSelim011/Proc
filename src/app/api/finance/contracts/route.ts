import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getFinanceAuth } from '@/lib/finance-auth';
import {
  financeSuccess,
  financeError,
  getRequestId,
} from '@/lib/finance-response';

/**
 * GET /api/finance/contracts
 * List service contracts for finance. Auth: Bearer <jwt> or X-API-Key.
 * Query: page, limit, status, contractType, vendor, search
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
  const contractType = searchParams.get('contractType') || '';
  const vendor = searchParams.get('vendor') || '';
  const search = searchParams.get('search') || '';

  console.log('[finance/contracts][GET] Incoming request', {
    requestId,
    path: request.nextUrl.pathname,
    page,
    limit,
    status: status || null,
    contractType: contractType || null,
    vendor: vendor || null,
    search: search || null,
  });

  if (!auth.ok) {
    console.warn('[finance/contracts][GET] Unauthorized request', {
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
    console.log('[finance/contracts][GET] Authenticated request', {
      requestId,
      authMethod: auth.authMethod,
    });

    const skip = (page - 1) * limit;
    const andConditions: Record<string, unknown>[] = [];
    if (status) andConditions.push({ status });
    if (contractType) andConditions.push({ contractType });
    if (vendor) {
      const isVendorId =
        (vendor.startsWith('c') && vendor.length === 25) ||
        vendor.startsWith('VEN-');
      if (isVendorId) {
        if (vendor.startsWith('VEN-')) {
          andConditions.push({ vendor: { vendorCode: vendor } });
        } else {
          andConditions.push({ vendorId: vendor });
        }
      } else {
        andConditions.push({
          vendor: {
            OR: [
              { nameEn: { contains: vendor, mode: 'insensitive' } },
              { nameAr: { contains: vendor, mode: 'insensitive' } },
              { vendorCode: { contains: vendor, mode: 'insensitive' } },
            ],
          },
        });
      }
    }
    if (search) {
      andConditions.push({
        OR: [
          { contractNumber: { contains: search, mode: 'insensitive' } },
          { vendor: { nameEn: { contains: search, mode: 'insensitive' } } },
          { vendor: { nameAr: { contains: search, mode: 'insensitive' } } },
          { vendor: { vendorCode: { contains: search, mode: 'insensitive' } } },
          { pr: { prNumber: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
    const where =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const [contracts, total] = await Promise.all([
      prisma.serviceContract.findMany({
        where,
        skip,
        take: limit,
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
            include: { approvalHistory: true },
          },
          vendorResponses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.serviceContract.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    console.log('[finance/contracts][GET] Success', {
      requestId,
      authMethod: auth.authMethod,
      count: contracts.length,
      total,
      totalPages,
      durationMs: Date.now() - startedAt,
    });
    return financeSuccess(
      { contracts },
      { page, limit, total, totalPages },
      requestId
    );
  } catch (error) {
    console.error('[finance/contracts][GET] Failed', {
      requestId,
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
    return financeError(
      'Failed to fetch contracts.',
      500,
      requestId
    );
  }
}
