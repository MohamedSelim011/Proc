import { NextRequest } from 'next/server';
import { getInventoryProjects, isInventoryConfigured } from '@/lib/inventory-client';

/**
 * GET /api/inventory-projects
 * Proxy to Inventory projects for material requisition (projectId in Create MR).
 */
export async function GET(request: NextRequest) {
  if (!isInventoryConfigured()) {
    return Response.json(
      { error: 'Inventory integration not configured.' },
      { status: 503 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const result = await getInventoryProjects({
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100),
    search: searchParams.get('search') || undefined,
  });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json({ projects: result.data });
}
