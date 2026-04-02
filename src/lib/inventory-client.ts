/**
 * Client for Wujha Inventory APIs. Used for material requisition flow only:
 * - Item catalog, warehouses, users
 * - Check availability (stock)
 * - Create Material Requisition (MR) when stock sufficient
 */
import { fetchItemsFromIntegration } from '@/integration/contracts/items.client';

const DEFAULT_TIMEOUT_MS = 15_000;

function getConfig() {
  const baseUrl = process.env.INVENTORY_SYSTEM_BASE_URL?.trim();
  const apiKey = process.env.INVENTORY_SYSTEM_API_KEY?.trim();
  return { baseUrl, apiKey };
}

function buildHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };
}

async function fetchInventory<T>(
  path: string,
  options: { method?: string; body?: object; timeoutMs?: number } = {}
): Promise<{ success: true; data: T } | { success: false; error: string; status?: number }> {
  const { baseUrl, apiKey } = getConfig();
  if (!baseUrl || !apiKey) {
    return { success: false, error: 'INVENTORY_SYSTEM_BASE_URL and INVENTORY_SYSTEM_API_KEY must be set' };
  }

  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const resolvedPath =
    normalizedBase.endsWith('/api') && normalizedPath.startsWith('/api/')
      ? normalizedPath.replace(/^\/api/, '')
      : normalizedPath;
  const url = `${normalizedBase}${resolvedPath}`;
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: buildHeaders(apiKey),
      ...(body && { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof json?.error === 'string' ? json.error : json?.message || res.statusText;
      return { success: false, error: msg || `Inventory API ${res.status}`, status: res.status };
    }
    if (json?.success === false) {
      return { success: false, error: json?.error || 'Unknown error', status: res.status };
    }
    return { success: true, data: json?.data ?? json };
  } catch (e: unknown) {
    clearTimeout(timeout);
    const msg = e instanceof Error ? e.message : 'Network error';
    return { success: false, error: msg };
  }
}

// --- Response types (match Inventory API contract) ---

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  arabicName?: string;
  description?: string | null;
  status?: string;
  stockType?: string;
  category?: { id: string; name: string; code: string };
  itemGroup?: { id: string; name: string; code: string };
  baseUom?: { id: string; name: string; abbreviation: string; type?: string };
}

export interface InventoryWarehouse {
  id: string;
  code: string;
  name: string;
  type?: string;
  status?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
}

export interface InventoryUser {
  id: string;
  email: string;
  name: string;
  employeeId?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
}

export interface CheckAvailabilityItem {
  itemId: string;
  quantity: number;
  warehouseId: string;
}

export interface CheckAvailabilityResult {
  summary?: {
    totalItems: number;
    fullyAvailable: number;
    partiallyAvailable: number;
    notAvailable: number;
    totalEstimatedCost?: number;
    averageLeadTime?: number;
  };
  items?: Array<{
    itemId: string;
    itemCode?: string;
    itemName?: string;
    requestedQuantity: number;
    availableStock?: number;
    suggestedFulfillment?: string;
    canFulfillNow?: number;
    needsProcurement?: number;
    estimatedUnitCost?: number;
  }>;
  overallRecommendation?: 'DIRECT_ISSUE_ALL' | 'PROCUREMENT_REQUIRED' | 'MIXED_FULFILLMENT';
  procurementSuggestions?: { totalValue?: number; estimatedLeadTime?: number };
}

export interface CreateMRItem {
  itemId: string;
  quantity: number;
  requiredDate?: string;
  specification?: string;
  uomId?: string;
}

export interface CreateMRPayload {
  projectId: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  requiredDate: string;
  deliveryWarehouseId: string;
  purpose: string;
  items: CreateMRItem[];
  userId: string;
  justification?: string;
  wbsCodeId?: string;
  /** When true, Inventory should set MR status to "Needs PO" (pending Purchase Order from Procurement). */
  needsPO?: boolean;
  /** Optional status for Inventory (e.g. 'PENDING_PO', 'NEEDS_PO'). Used when stock insufficient. */
  status?: string;
}

export interface CreateMRResult {
  id: string;
  mrNumber: string;
  status: string;
  projectId?: string;
  deliveryWarehouseId?: string;
  requestedById?: string;
  purpose?: string;
  requiredDate?: string;
  items?: unknown[];
}

// --- API functions ---

/** GET /api/items – item catalog (for material requisition item selection). */
export async function getInventoryItems(params?: {
  page?: number;
  limit?: number;
  status?: string;
  stockType?: string;
  search?: string;
  categoryId?: string;
}, authorizationHeader?: string): Promise<{ success: true; data: InventoryItem[]; total?: number } | { success: false; error: string }> {
  try {
    const payload = (await fetchItemsFromIntegration(
      {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.stockType ? { stockType: params.stockType } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
      },
      authorizationHeader,
    )) as Record<string, unknown>;

    const source = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.items)
        ? payload.items
        : [];

    const mapped = source
      .map((entry) => {
        const raw = (entry ?? {}) as Record<string, unknown>;
        const category = (raw.category ?? {}) as Record<string, unknown>;
        const itemGroup = (raw.itemGroup ?? {}) as Record<string, unknown>;
        const baseUom = (raw.baseUom ?? {}) as Record<string, unknown>;
        return {
          id: (raw._id as string) || (raw.id as string) || '',
          code: (raw.code as string) || '',
          name: (raw.name as string) || '',
          arabicName: (raw.arabicName as string) || undefined,
          description: (raw.description as string) || null,
          status: (raw.status as string) || undefined,
          stockType: (raw.stockType as string) || undefined,
          category: category.id
            ? {
                id: category.id as string,
                name: (category.name as string) || '',
                code: (category.code as string) || '',
              }
            : undefined,
          itemGroup: itemGroup.id
            ? {
                id: itemGroup.id as string,
                name: (itemGroup.name as string) || '',
                code: (itemGroup.code as string) || '',
              }
            : undefined,
          baseUom: baseUom.id
            ? {
                id: baseUom.id as string,
                name: (baseUom.name as string) || '',
                abbreviation: (baseUom.abbreviation as string) || '',
                type: (baseUom.type as string) || undefined,
              }
            : undefined,
        } satisfies InventoryItem;
      })
      .filter((item) => Boolean(item.id));

    if (params?.page || params?.limit) {
      const page = params.page && params.page > 0 ? params.page : 1;
      const limit = params.limit && params.limit > 0 ? params.limit : 100;
      const start = (page - 1) * limit;
      const end = start + limit;
      return { success: true, data: mapped.slice(start, end), total: mapped.length };
    }

    return { success: true, data: mapped, total: mapped.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch items from integration middleware.',
    };
  }
}

/** GET /api/warehouses – warehouse list (for deliveryWarehouseId and availability). */
export async function getInventoryWarehouses(params?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
}): Promise<{ success: true; data: InventoryWarehouse[] } | { success: false; error: string }> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);
  if (params?.type) sp.set('type', params.type);
  if (params?.status) sp.set('status', params.status);
  const path = `/api/warehouses?${sp.toString() || 'page=1&limit=50'}`;
  const out = await fetchInventory<InventoryWarehouse[] | { data: InventoryWarehouse[] }>(path);
  if (!out.success) return out;
  const raw = out.data;
  const list = Array.isArray(raw) ? raw : (raw as { data?: InventoryWarehouse[] })?.data ?? [];
  return { success: true, data: list };
}

/** GET /api/users – user list (map procurement user by email → userId for Create MR). */
export async function getInventoryUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}): Promise<{ success: true; data: InventoryUser[] } | { success: false; error: string }> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);
  if (params?.isActive != null) sp.set('isActive', String(params.isActive));
  const path = `/api/users?${sp.toString() || 'page=1&limit=100'}`;
  const out = await fetchInventory<InventoryUser[] | { data: InventoryUser[] }>(path);
  if (!out.success) return out;
  const raw = out.data;
  const list = Array.isArray(raw) ? raw : (raw as { data?: InventoryUser[] })?.data ?? [];
  return { success: true, data: list };
}

/** Resolve inventory userId by email (unique identifier). */
export async function getInventoryUserIdByEmail(email: string): Promise<{ success: true; userId: string } | { success: false; error: string }> {
  const res = await getInventoryUsers({ limit: 200 });
  if (!res.success) return res;
  const normalized = email?.trim().toLowerCase();
  const user = res.data.find((u) => u.email?.trim().toLowerCase() === normalized);
  if (!user) return { success: false, error: `No inventory user found for email: ${email}` };
  return { success: true, userId: user.id };
}

/** POST /api/requisitions/check-availability – stock check before MR vs PR. */
export async function checkAvailability(
  items: CheckAvailabilityItem[]
): Promise<{ success: true; data: CheckAvailabilityResult } | { success: false; error: string }> {
  if (!items?.length) return { success: false, error: 'items array is required and must not be empty' };
  const out = await fetchInventory<CheckAvailabilityResult>('/api/requisitions/check-availability', {
    method: 'POST',
    body: { items },
  });
  if (!out.success) return out;
  return { success: true, data: out.data as CheckAvailabilityResult };
}

/**
 * POST /api/requisitions – create Material Requisition (MR).
 * Sends only fields documented in INVENTORY_API_CONTRACT.md so Inventory accepts the request.
 * (needsPO/status are not in the contract and are stripped before sending.)
 */
export async function createMR(
  payload: CreateMRPayload
): Promise<{ success: true; data: CreateMRResult } | { success: false; error: string }> {
  const body: Record<string, unknown> = {
    projectId: payload.projectId,
    priority: payload.priority,
    requiredDate: payload.requiredDate,
    deliveryWarehouseId: payload.deliveryWarehouseId,
    purpose: payload.purpose,
    items: payload.items.map((i) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      ...(i.requiredDate && { requiredDate: i.requiredDate }),
      ...(i.specification && { specification: i.specification }),
      ...(i.uomId && { uomId: i.uomId }),
    })),
    userId: payload.userId,
  };
  if (payload.justification) body.justification = payload.justification;
  if (payload.wbsCodeId) body.wbsCodeId = payload.wbsCodeId;

  const out = await fetchInventory<CreateMRResult>('/api/requisitions', {
    method: 'POST',
    body,
  });
  if (!out.success) return out;
  return { success: true, data: out.data as CreateMRResult };
}

/** GET /api/requisitions/:id – get MR details/status. */
export async function getRequisition(
  id: string
): Promise<{ success: true; data: Record<string, unknown> } | { success: false; error: string }> {
  const out = await fetchInventory<Record<string, unknown>>(`/api/requisitions/${encodeURIComponent(id)}`);
  if (!out.success) return out;
  return { success: true, data: out.data as Record<string, unknown> };
}

/** Check if inventory integration is configured. */
export function isInventoryConfigured(): boolean {
  const { baseUrl, apiKey } = getConfig();
  return Boolean(baseUrl && apiKey);
}
