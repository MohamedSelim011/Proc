const DEFAULT_TIMEOUT_MS = 15_000;

type InventoryClientResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number };

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
  needsPO?: boolean;
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
  options: { method?: string; body?: object; timeoutMs?: number } = {},
): Promise<InventoryClientResult<T>> {
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

function toList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown[] }).data)) {
    return ((raw as { data?: unknown[] }).data ?? []) as T[];
  }
  return [];
}

export function isInventoryApiConfigured(): boolean {
  const { baseUrl, apiKey } = getConfig();
  return Boolean(baseUrl && apiKey);
}

export async function fetchInventoryWarehouses(params?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
}): Promise<InventoryClientResult<InventoryWarehouse[]>> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);
  if (params?.type) sp.set('type', params.type);
  if (params?.status) sp.set('status', params.status);
  const path = `/api/warehouses?${sp.toString() || 'page=1&limit=50'}`;
  const out = await fetchInventory<InventoryWarehouse[] | { data: InventoryWarehouse[] }>(path);
  if (!out.success) return out;
  return { success: true, data: toList<InventoryWarehouse>(out.data) };
}

export async function fetchInventoryUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}): Promise<InventoryClientResult<InventoryUser[]>> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);
  if (params?.isActive != null) sp.set('isActive', String(params.isActive));
  const path = `/api/users?${sp.toString() || 'page=1&limit=100'}`;
  const out = await fetchInventory<InventoryUser[] | { data: InventoryUser[] }>(path);
  if (!out.success) return out;
  return { success: true, data: toList<InventoryUser>(out.data) };
}

export async function fetchInventoryAvailability(
  items: CheckAvailabilityItem[],
): Promise<InventoryClientResult<CheckAvailabilityResult>> {
  if (!items?.length) return { success: false, error: 'items array is required and must not be empty' };
  const out = await fetchInventory<CheckAvailabilityResult>('/api/requisitions/check-availability', {
    method: 'POST',
    body: { items },
  });
  if (!out.success) return out;
  return { success: true, data: out.data as CheckAvailabilityResult };
}

export async function createInventoryMR(
  payload: CreateMRPayload,
): Promise<InventoryClientResult<CreateMRResult>> {
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

export async function fetchInventoryRequisitionById(
  id: string,
): Promise<InventoryClientResult<Record<string, unknown>>> {
  const out = await fetchInventory<Record<string, unknown>>(`/api/requisitions/${encodeURIComponent(id)}`);
  if (!out.success) return out;
  return { success: true, data: out.data as Record<string, unknown> };
}
