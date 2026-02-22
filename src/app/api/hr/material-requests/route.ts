import { NextRequest, NextResponse } from 'next/server';

type HrMaterialRequestResponse = {
  success: boolean;
  data?: unknown[];
  message?: string;
};

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.HR_API_URL?.replace(/\/$/, '');
    console.log('[HR Material Requests] Start', {
      hasBaseUrl: Boolean(baseUrl),
      method: request.method,
      path: request.nextUrl.pathname,
    });

    if (!baseUrl) {
      console.error('[HR Material Requests] Missing HR_API_URL');
      return NextResponse.json(
        { error: 'HR_API_URL is not configured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    const forwardedAuthHeader =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader
        : cookieToken
          ? `Bearer ${cookieToken}`
          : null;

    console.log('[HR Material Requests] Auth forwarding', {
      hasAuthorizationHeader: Boolean(authHeader),
      hasCookieToken: Boolean(cookieToken),
      isForwardingAuth: Boolean(forwardedAuthHeader),
    });

    const response = await fetch(`${baseUrl}/material-requests`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(forwardedAuthHeader ? { Authorization: forwardedAuthHeader } : {}),
      },
      cache: 'no-store',
    });

    const payload = (await response.json()) as HrMaterialRequestResponse;

    console.log('[HR Material Requests] Upstream response', {
      status: response.status,
      ok: response.ok,
      success: payload?.success,
      count: Array.isArray(payload?.data) ? payload.data.length : undefined,
      message: payload?.message,
    });

    if (!response.ok) {
      console.error('[HR Material Requests] Upstream error payload', payload);
      return NextResponse.json(
        { error: payload?.message || 'Failed to fetch material requests from HR API' },
        { status: response.status }
      );
    }

    if (!payload?.success || !Array.isArray(payload.data)) {
      console.error('[HR Material Requests] Invalid upstream shape', payload);
      return NextResponse.json(
        { error: 'Invalid response from HR API' },
        { status: 502 }
      );
    }

    console.log('[HR Material Requests] Success', { count: payload.data.length });
    return NextResponse.json({ success: true, data: payload.data });
  } catch (error) {
    console.error('[HR Material Requests] Exception', error);
    return NextResponse.json(
      { error: 'Failed to fetch material requests' },
      { status: 500 }
    );
  }
}
