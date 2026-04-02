export type GoodsReceiptIntegrationQuery = {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
  supplierId?: string;
  view?: string;
};

function getIntegrationBaseUrl() {
  const base = process.env.INTEGRATION_MIDDLEWARE_URL?.trim();
  if (!base) {
    throw new Error('INTEGRATION_MIDDLEWARE_URL is not configured.');
  }
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function buildHeaders(authorizationHeader?: string) {
  const headers = new Headers();
  headers.set('Accept', 'application/json');

  if (authorizationHeader?.trim()) {
    headers.set('Authorization', authorizationHeader.trim());
  }

  const serviceToken = process.env.INTEGRATION_SERVICE_TOKEN?.trim();
  if (serviceToken) {
    headers.set('x-integration-token', serviceToken);
    if (!authorizationHeader?.trim()) {
      headers.set('Authorization', `Bearer ${serviceToken}`);
    }
  }

  return headers;
}

function buildListUrl(query: GoodsReceiptIntegrationQuery) {
  const url = new URL('/goods-receipt', getIntegrationBaseUrl());

  if (query.search) url.searchParams.set('search', query.search);
  if (query.status) url.searchParams.set('status', query.status);
  if (query.dateFrom) url.searchParams.set('dateFrom', query.dateFrom);
  if (query.dateTo) url.searchParams.set('dateTo', query.dateTo);
  if (query.warehouseId) url.searchParams.set('warehouseId', query.warehouseId);
  if (query.supplierId) url.searchParams.set('supplierId', query.supplierId);
  if (query.view) url.searchParams.set('view', query.view);

  return url.toString();
}

export async function fetchGoodsReceiptsFromIntegration(
  query: GoodsReceiptIntegrationQuery,
  authorizationHeader?: string,
) {
  const response = await fetch(buildListUrl(query), {
    method: 'GET',
    headers: buildHeaders(authorizationHeader),
    cache: 'no-store',
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const errorDetails = contentType.includes('application/json')
      ? await response.json().catch(() => undefined)
      : await response.text().catch(() => undefined);
    const error = new Error('Failed to fetch goods receipts from integration middleware.') as Error & {
      status?: number;
      details?: unknown;
    };
    error.status = response.status;
    error.details = errorDetails;
    throw error;
  }

  return (await response.json()) as unknown;
}

