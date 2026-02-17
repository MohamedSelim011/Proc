import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/jwt';
import { createMR, getInventoryUserIdByEmail, isInventoryConfigured } from '@/lib/inventory-client';

const LOG_PREFIX = '[req] create-mr';

/**
 * POST /api/material-requisition/create-mr
 * Create Material Requisition in Inventory when stock is sufficient. Material requisition only.
 * Requires authenticated user (email used to resolve Inventory userId).
 * Body: projectId, deliveryWarehouseId, items, requiredDate, purpose, priority, justification?
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIX} → request received`);

  const user = getAuthenticatedUser(request);
  if (!user) {
    console.error(`${LOG_PREFIX} → Unauthorized (no/invalid token)`);
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  console.log(`${LOG_PREFIX} → user: ${user.email ?? user.id}`);

  if (!isInventoryConfigured()) {
    console.error(`${LOG_PREFIX} → Inventory not configured`);
    return Response.json(
      { error: 'Inventory integration not configured.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as {
    projectId?: string;
    deliveryWarehouseId?: string;
    requiredDate?: string;
    purpose?: string;
    priority?: string;
    justification?: string;
    items?: Array<{ itemId?: string; quantity?: number; requiredDate?: string; specification?: string }>;
  };

  const projectId = b.projectId?.trim();
  const deliveryWarehouseId = b.deliveryWarehouseId?.trim();
  const requiredDate = b.requiredDate?.trim();
  const purpose = b.purpose?.trim();
  const priority = (b.priority?.toUpperCase() || 'NORMAL') as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL'];
  if (!validPriorities.includes(priority)) {
    return Response.json({ error: 'priority must be one of: LOW, NORMAL, HIGH, URGENT, CRITICAL.' }, { status: 400 });
  }

  if (!projectId || !deliveryWarehouseId || !requiredDate || !purpose) {
    return Response.json(
      { error: 'projectId, deliveryWarehouseId, requiredDate, and purpose are required.' },
      { status: 400 }
    );
  }

  if (!Array.isArray(b.items) || b.items.length === 0) {
    return Response.json({ error: 'items array is required and must not be empty.' }, { status: 400 });
  }

  const items = b.items.map((it) => ({
    itemId: String(it?.itemId ?? '').trim(),
    quantity: Number(it?.quantity) || 0,
    requiredDate: it?.requiredDate?.trim() || undefined,
    specification: it?.specification?.trim() || undefined,
  }));

  const invalid = items.filter((i) => !i.itemId || i.quantity <= 0);
  if (invalid.length > 0) {
    return Response.json({ error: 'Each item must have itemId and positive quantity.' }, { status: 400 });
  }

  console.log(`${LOG_PREFIX} → Resolving Inventory userId for email=${user.email}`);
  const userIdResult = await getInventoryUserIdByEmail(user.email);
  if (!userIdResult.success) {
    console.error(`${LOG_PREFIX} → User resolution failed:`, userIdResult.error);
    return Response.json(
      { error: userIdResult.error },
      { status: 400 }
    );
  }
  console.log(`${LOG_PREFIX} → Inventory userId=${userIdResult.userId}`);

  const payload = {
    projectId,
    deliveryWarehouseId,
    requiredDate,
    purpose,
    priority,
    userId: userIdResult.userId,
    items,
    ...(b.justification && { justification: b.justification }),
  };

  console.log(`${LOG_PREFIX} → Calling Inventory POST /api/requisitions (items=${items.length})`);
  const result = await createMR(payload);
  if (!result.success) {
    console.error(`${LOG_PREFIX} → Create MR failed:`, result.error);
    return Response.json({ error: result.error }, { status: 502 });
  }
  console.log(`${LOG_PREFIX} → MR created id=${result.data?.id} mrNumber=${result.data?.mrNumber}`);

  return Response.json(
    {
      success: true,
      message: 'Material requisition created in Inventory.',
      data: result.data,
    },
    { status: 201 }
  );
}
