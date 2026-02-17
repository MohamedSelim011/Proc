import { NextRequest } from 'next/server';
import { getInventoryItems, isInventoryConfigured } from '@/lib/inventory-client';

/**
 * GET /api/inventory-items
 * Proxy to Inventory item catalog for material requisition only.
 * Returns items in a shape compatible with the requisition form (id, itemCode, nameEn, nameAr, unitOfMeasure, category).
 */
export async function GET(request: NextRequest) {
  if (!isInventoryConfigured()) {
    return Response.json(
      { error: 'Inventory integration not configured. Set INVENTORY_SYSTEM_BASE_URL and INVENTORY_SYSTEM_API_KEY.' },
      { status: 503 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
  const status = searchParams.get('status') || 'ACTIVE';
  const stockType = searchParams.get('stockType') || '';
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';

  const result = await getInventoryItems({
    page,
    limit,
    status,
    ...(stockType && { stockType }),
    ...(search && { search }),
    ...(categoryId && { categoryId }),
  });

  if (!result.success) {
    return Response.json(
      { error: result.error },
      { status: 502 }
    );
  }

  const items = result.data.map((inv) => ({
    id: inv.id,
    itemCode: inv.code,
    nameEn: inv.name,
    nameAr: inv.arabicName ?? inv.name,
    unitOfMeasure: inv.baseUom?.abbreviation ?? 'EA',
    category: inv.category ? { nameEn: inv.category.name } : { nameEn: '' },
  }));

  return Response.json({
    items,
    pagination: {
      page,
      limit,
      total: result.total ?? items.length,
      totalPages: result.total != null ? Math.ceil(result.total / limit) : 1,
    },
  });
}
