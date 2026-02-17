import { NextRequest } from 'next/server';
import { checkAvailability, isInventoryConfigured } from '@/lib/inventory-client';

const LOG_PREFIX = '[req] check-availability';

/**
 * POST /api/material-requisition/check-availability
 * Proxy to Inventory check-availability. For material requisition only.
 * Body: { items: [{ itemId, quantity, warehouseId }] }
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIX} → request received`);

  if (!isInventoryConfigured()) {
    console.error(`${LOG_PREFIX} → Inventory not configured (missing INVENTORY_SYSTEM_BASE_URL or API key)`);
    return Response.json(
      { error: 'Inventory integration not configured.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.error(`${LOG_PREFIX} → Invalid JSON body`);
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as { items?: Array<{ itemId?: string; quantity?: number; warehouseId?: string }> };
  if (!Array.isArray(b?.items) || b.items.length === 0) {
    console.error(`${LOG_PREFIX} → Validation failed: items array missing or empty`);
    return Response.json(
      { error: 'items array is required and must not be empty.' },
      { status: 400 }
    );
  }

  const items = b.items.map((it) => ({
    itemId: String(it?.itemId ?? '').trim(),
    quantity: Number(it?.quantity) || 0,
    warehouseId: String(it?.warehouseId ?? '').trim(),
  }));

  const invalid = items.filter((i) => !i.itemId || !i.warehouseId || i.quantity <= 0);
  if (invalid.length > 0) {
    console.error(`${LOG_PREFIX} → Validation failed: invalid lines`, invalid);
    return Response.json(
      { error: 'Each item must have itemId, warehouseId, and positive quantity.' },
      { status: 400 }
    );
  }

  console.log(`${LOG_PREFIX} → Calling Inventory API with ${items.length} item(s), warehouseId=${items[0]?.warehouseId}`);
  const result = await checkAvailability(items);
  if (!result.success) {
    console.error(`${LOG_PREFIX} → Inventory API error:`, result.error);
    return Response.json({ error: result.error }, { status: 502 });
  }

  const recommendation = result.data?.overallRecommendation;
  console.log(`${LOG_PREFIX} → OK overallRecommendation=${recommendation}`, result.data?.summary ?? '');
  return Response.json({ success: true, data: result.data });
}
