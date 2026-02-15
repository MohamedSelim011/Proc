/**
 * Inventory API authentication: accept either JWT (Bearer) or API key.
 * Use JWT for SSO; use API key for system-to-system (e.g. inventory system).
 */

import { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

export type InventoryAuthResult =
  | { ok: true; authMethod: 'jwt' | 'api_key' }
  | { ok: false };

const API_KEY_HEADER = 'x-api-key';
const BEARER_PREFIX = 'Bearer ';
const APIKEY_PREFIX = 'ApiKey ';

export function getInventoryAuth(request: NextRequest): InventoryAuthResult {
  // 1. Try API key (header X-API-Key or Authorization: ApiKey <key>)
  const apiKeyFromHeader = request.headers.get(API_KEY_HEADER);
  const authHeader = request.headers.get('authorization');
  const apiKeyFromAuth =
    authHeader?.startsWith(APIKEY_PREFIX)
      ? authHeader.slice(APIKEY_PREFIX.length).trim()
      : null;
  const key = apiKeyFromHeader || apiKeyFromAuth;
  const expectedKey = process.env.INVENTORY_API_KEY;
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
