import { NextRequest } from 'next/server';
import { getInventoryWarehouses, isInventoryConfigured } from '@/lib/inventory-client';

/**
 * GET /api/inventory-warehouses
 * Proxy to Inventory warehouses for material requisition (delivery warehouse + availability check).
 */
export async function GET(request: NextRequest) {
  if (!isInventoryConfigured()) {
    return Response.json(
      { error: 'Inventory integration not configured.' },
      { status: 503 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const result = await getInventoryWarehouses({
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100),
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
  });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json({ warehouses: result.data });
}
