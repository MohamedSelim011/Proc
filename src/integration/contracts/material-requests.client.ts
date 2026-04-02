export type MaterialRequestsIntegrationQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
};

export type UpdateMaterialRequestIntegrationPayload = {
  status?: string;
  approved_by_external?: string;
  rejection_reason?: string;
  updatedAt?: string;
  updated_at?: string;
};

export type MaterialRequestDecisionIntegrationPayload = {
  approved_by_external?: string;
  rejection_reason?: string;
  updatedAt?: string;
  updated_at?: string;
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
  headers.set('Content-Type', 'application/json');

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

function buildListUrl(query: MaterialRequestsIntegrationQuery) {
  const url = new URL('/material-requests', getIntegrationBaseUrl());
  if (typeof query.page === 'number' && Number.isFinite(query.page) && query.page > 0) {
    url.searchParams.set('page', String(query.page));
  }
  if (typeof query.limit === 'number' && Number.isFinite(query.limit) && query.limit > 0) {
    url.searchParams.set('limit', String(query.limit));
  }
  if (query.search) url.searchParams.set('search', query.search);
  if (query.status) url.searchParams.set('status', query.status);
  if (query.department) url.searchParams.set('department', query.department);
  return url.toString();
}

function buildUpdateUrl(id: string) {
  return new URL(`/material-requests/${encodeURIComponent(id)}`, getIntegrationBaseUrl()).toString();
}

function buildDecisionUrl(id: string, action: 'approve' | 'reject') {
  return new URL(
    `/material-requests/${encodeURIComponent(id)}/${action}`,
    getIntegrationBaseUrl(),
  ).toString();
}

export async function fetchMaterialRequestsFromIntegration(
  query: MaterialRequestsIntegrationQuery,
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
    const error = new Error(
      'Failed to fetch material requests from integration middleware.',
    ) as Error & { status?: number; details?: unknown };
    error.status = response.status;
    error.details = errorDetails;
    throw error;
  }

  return (await response.json()) as unknown;
}

export async function updateMaterialRequestFromIntegration(
  id: string,
  payload: UpdateMaterialRequestIntegrationPayload,
  authorizationHeader?: string,
) {
  const response = await fetch(buildUpdateUrl(id), {
    method: 'PUT',
    headers: buildHeaders(authorizationHeader),
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const responseBody = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      'Failed to update material request through integration middleware.',
    ) as Error & { status?: number; details?: unknown };
    error.status = response.status;
    error.details = responseBody;
    throw error;
  }

  return responseBody as unknown;
}

async function executeMaterialRequestDecision(
  id: string,
  action: 'approve' | 'reject',
  payload: MaterialRequestDecisionIntegrationPayload,
  authorizationHeader?: string,
) {
  const response = await fetch(buildDecisionUrl(id, action), {
    method: 'POST',
    headers: buildHeaders(authorizationHeader),
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const responseBody = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      `Failed to ${action} material request through integration middleware.`,
    ) as Error & { status?: number; details?: unknown };
    error.status = response.status;
    error.details = responseBody;
    throw error;
  }

  return responseBody as unknown;
}

export async function approveMaterialRequestFromIntegration(
  id: string,
  payload: MaterialRequestDecisionIntegrationPayload,
  authorizationHeader?: string,
) {
  return executeMaterialRequestDecision(id, 'approve', payload, authorizationHeader);
}

export async function rejectMaterialRequestFromIntegration(
  id: string,
  payload: MaterialRequestDecisionIntegrationPayload,
  authorizationHeader?: string,
) {
  return executeMaterialRequestDecision(id, 'reject', payload, authorizationHeader);
}
