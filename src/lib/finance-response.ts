/**
 * Consistent response envelope for Finance API. Includes requestId for debugging.
 */

import { NextResponse } from 'next/server';

export function financeSuccess<T>(
  data: T,
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number },
  requestId?: string
) {
  const body: { success: true; data: T; meta?: object; requestId?: string } = {
    success: true,
    data,
  };
  if (meta && Object.keys(meta).length > 0) body.meta = meta;
  if (requestId) body.requestId = requestId;
  return NextResponse.json(body);
}

export function financeError(
  message: string,
  status: number,
  requestId?: string
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(requestId && { requestId }),
    },
    { status }
  );
}

export function getRequestId(request: Request): string | undefined {
  return request.headers.get('x-request-id') ?? undefined;
}
