/**
 * Client for Wujha Inventory APIs. Used for material requisition flow only:
 * - Item catalog, warehouses, projects, users
 * - Check availability (stock)
 * - Create Material Requisition (MR) when stock sufficient
 */

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

  const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
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

export interface InventoryProject {
  id: string;
  code: string;
  name: string;
  budget?: number;
  status?: string;
  company?: { id: string; name: string; code: string };
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
  boqReference?: string;
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

/** GET /api/items/:id – fetch a single item by id (Inventory is master; use to sync into Procurement). */
export async function getInventoryItemById(
  id: string
): Promise<{ success: true; data: InventoryItem } | { success: false; error: string }> {
  if (!id?.trim()) return { success: false, error: 'Item id is required.' };
  const out = await fetchInventory<InventoryItem>(`/api/items/${encodeURIComponent(id.trim())}`);
  if (!out.success) return out;
  return { success: true, data: out.data as InventoryItem };
}

/** GET /api/items – item catalog (for material requisition item selection). */
export async function getInventoryItems(params?: {
  page?: number;
  limit?: number;
  status?: string;
  stockType?: string;
  search?: string;
  categoryId?: string;
}): Promise<{ success: true; data: InventoryItem[]; total?: number } | { success: false; error: string }> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.status) sp.set('status', params.status);
  if (params?.stockType) sp.set('stockType', params.stockType);
  if (params?.search) sp.set('search', params.search);
  if (params?.categoryId) sp.set('categoryId', params.categoryId);
  const path = `/api/items?${sp.toString() || 'page=1&limit=100&status=ACTIVE'}`;
  const out = await fetchInventory<InventoryItem[] | { data: InventoryItem[]; total?: number }>(path);
  if (!out.success) return out;
  const raw = out.data;
  const list = Array.isArray(raw) ? raw : (raw as { data?: InventoryItem[] })?.data ?? [];
  const total = Array.isArray(raw) ? undefined : (raw as { total?: number })?.total;
  return { success: true, data: list, total };
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

/** GET /api/projects – project list (for projectId in Create MR). */
export async function getInventoryProjects(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ success: true; data: InventoryProject[] } | { success: false; error: string }> {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set('page', String(params.page));
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);
  const path = `/api/projects?${sp.toString() || 'page=1&limit=50'}`;
  const out = await fetchInventory<InventoryProject[] | { data: InventoryProject[] }>(path);
  if (!out.success) return out;
  const raw = out.data;
  const list = Array.isArray(raw) ? raw : (raw as { data?: InventoryProject[] })?.data ?? [];
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
      ...(i.boqReference && { boqReference: i.boqReference }),
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
