/**
 * Finance API authentication: accept either JWT (Bearer) or API key.
 * Use JWT for SSO integration; use API key for system-to-system (e.g. finance system).
 */

import { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

export type FinanceAuthResult =
  | { ok: true; authMethod: 'jwt' | 'api_key' | 'integration_token' }
  | { ok: false };

const API_KEY_HEADER = 'x-api-key';
const INTEGRATION_TOKEN_HEADER = 'x-integration-token';
const BEARER_PREFIX = 'Bearer ';
const APIKEY_PREFIX = 'ApiKey ';

export function getFinanceAuth(request: NextRequest): FinanceAuthResult {
  // 0. Integration middleware token (system-to-system trust)
  const integrationToken = request.headers.get(INTEGRATION_TOKEN_HEADER);
  const expectedIntegrationToken = process.env.INTEGRATION_SERVICE_TOKEN?.trim();
  if (
    integrationToken &&
    expectedIntegrationToken &&
    integrationToken.trim() === expectedIntegrationToken
  ) {
    return { ok: true, authMethod: 'integration_token' };
  }

  // 1. Try API key (header X-API-Key or Authorization: ApiKey <key>)
  const apiKeyFromHeader = request.headers.get(API_KEY_HEADER);
  const authHeader = request.headers.get('authorization');
  const apiKeyFromAuth =
    authHeader?.startsWith(APIKEY_PREFIX)
      ? authHeader.slice(APIKEY_PREFIX.length).trim()
      : null;
  const key = apiKeyFromHeader || apiKeyFromAuth;
  const expectedKey = process.env.FINANCE_API_KEY;
  if (key && expectedKey && key === expectedKey) {
    return { ok: true, authMethod: 'api_key' };
  }

  // 2. Try JWT (Authorization: Bearer <token>)
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    try {
      const token = authHeader.slice(BEARER_PREFIX.length).trim();
      const user = verifyJWT(token);
      if (user) return { ok: true, authMethod: 'jwt' };
    } catch {
      // token expired or invalid
    }
  }

  return { ok: false };
}
