import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_API_PATH_PATTERNS = [
  /^\/api\/auth\/signin$/,
  /^\/api\/auth\/login$/,
  /^\/api\/rfq\/submit\/[^/]+\/[^/]+$/,
  /^\/api\/services\/rfp\/submit\/[^/]+\/[^/]+$/,
  /^\/api\/services\/rfp\/[^/]+\/responses\/[^/]+\/proposal(?:\/)?$/,
  /^\/api\/purchase-orders\/[^/]+\/acknowledge$/,
  /^\/api\/contracts\/vendor-response\/[^/]+$/,
  /^\/api\/contracts\/vendor-response\/[^/]+\/download$/,
];

const API_KEY_ALLOWED_PREFIXES = ['/api/finance/', '/api/inventory/'];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function canUseApiKey(pathname: string): boolean {
  return API_KEY_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return request.cookies.get('token')?.value ?? null;
}

async function verifyBearerToken(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (request.method === 'OPTIONS' || isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const hasApiKey =
    Boolean(request.headers.get('x-api-key')) ||
    authHeader.toLowerCase().startsWith('apikey ');

  if (hasApiKey && canUseApiKey(pathname)) {
    return NextResponse.next();
  }

  const token = extractBearerToken(request);
  if (!token) {
    return unauthorized('Unauthorized');
  }

  const isTokenValid = await verifyBearerToken(token);
  if (!isTokenValid) {
    return unauthorized('Unauthorized');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
