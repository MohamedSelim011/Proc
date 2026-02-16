import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getFinanceAuth } from '@/lib/finance-auth';
import {
  financeSuccess,
  financeError,
  getRequestId,
} from '@/lib/finance-response';

/**
 * GET /api/finance/vendors
 * List vendors for finance. Auth: Bearer <jwt> or X-API-Key.
 * Query: page, limit, search, status, categoryId
 */
export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      100
    );
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const categoryId = searchParams.get('categoryId') || '';

    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      const validStatuses = [
        'DRAFT',
        'PENDING',
        'APPROVED',
        'ACTIVE',
        'INACTIVE',
        'BLACKLISTED',
      ];
      const mappedStatus = status === 'SUSPENDED' ? 'BLACKLISTED' : status;
      if (validStatuses.includes(mappedStatus)) {
        where.status = mappedStatus;
      } else {
        return financeSuccess(
          { vendors: [] },
          { page, limit, total: 0, totalPages: 0 },
          requestId
        );
      }
    }

    if (categoryId) {
      where.categories = {
        some: {
          categoryId,
        },
      };
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          purchaseOrders: {
            include: {
              items: {
                include: {
                  item: true,
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
          _count: {
            select: {
              purchaseOrders: true,
              invoices: true,
              evaluations: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return financeSuccess(
      { vendors },
      { page, limit, total, totalPages },
      requestId
    );
  } catch (error) {
    console.error('[finance/vendors]', error);
    return financeError(
      'Failed to fetch vendors.',
      500,
      requestId
    );
  }
}
