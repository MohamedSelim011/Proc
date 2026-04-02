import { NextRequest } from 'next/server';
import { fetchItemsFromIntegration } from '@/integration/contracts/items.client';

/**
 * GET /api/inventory-items
 * Proxy to Inventory item catalog through integration middleware.
 * Returns items in a shape compatible with the requisition form (id, itemCode, nameEn, nameAr, unitOfMeasure, category).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);
  const status = searchParams.get('status') || 'ACTIVE';
  const stockType = searchParams.get('stockType') || '';
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';

  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('token')?.value;
  const forwardedAuthHeader =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader
      : cookieToken
        ? `Bearer ${cookieToken}`
        : undefined;

  if (!forwardedAuthHeader) {
    return Response.json(
      { error: 'Authorization bearer token is required.' },
      { status: 401 },
    );
  }

  try {
    const payload = (await fetchItemsFromIntegration(
      {
        status,
        ...(stockType ? { stockType } : {}),
        ...(search ? { search } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      forwardedAuthHeader,
    )) as Record<string, unknown>;

    const sourceItems = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.items)
        ? payload.items
        : [];

    const start = (page - 1) * limit;
    const end = start + limit;
    const items = sourceItems.slice(start, end).map((entry) => {
      const inv = (entry ?? {}) as Record<string, unknown>;
      const category = (inv.category ?? {}) as Record<string, unknown>;
      const baseUom = (inv.baseUom ?? {}) as Record<string, unknown>;
      const name = typeof inv.name === 'string' ? inv.name : '';
      return {
        id: (inv._id as string) || (inv.id as string) || '',
        itemCode: (inv.code as string) || '',
        nameEn: name,
        nameAr: (inv.arabicName as string) || name,
        unitOfMeasure: (baseUom.abbreviation as string) || (baseUom.name as string) || 'EA',
        category: { nameEn: (category.name as string) || '' },
      };
    });

    return Response.json({
      items,
      pagination: {
        page,
        limit,
        total: sourceItems.length,
        totalPages: Math.max(1, Math.ceil(sourceItems.length / limit)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch items from integration middleware.';
    return Response.json({ error: message }, { status: 502 });
  }
}
