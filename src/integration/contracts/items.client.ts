export type ItemsIntegrationQuery = {
  search?: string;
  status?: string;
  stockType?: string;
  categoryId?: string;
  lowStock?: string;
  isCritical?: string;
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
  }

  return headers;
}

function buildListUrl(query: ItemsIntegrationQuery) {
  const url = new URL('/items', getIntegrationBaseUrl());

  if (query.search) url.searchParams.set('search', query.search);
  if (query.status) url.searchParams.set('status', query.status);
  if (query.stockType) url.searchParams.set('stockType', query.stockType);
  if (query.categoryId) url.searchParams.set('categoryId', query.categoryId);
  if (query.lowStock) url.searchParams.set('lowStock', query.lowStock);
  if (query.isCritical) url.searchParams.set('isCritical', query.isCritical);

  return url.toString();
}

export async function fetchItemsFromIntegration(
  query: ItemsIntegrationQuery,
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
    const error = new Error('Failed to fetch items from integration middleware.') as Error & {
      status?: number;
      details?: unknown;
    };
    error.status = response.status;
    error.details = errorDetails;
    throw error;
  }

  return (await response.json()) as unknown;
}
