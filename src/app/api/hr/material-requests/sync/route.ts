import { NextRequest, NextResponse } from 'next/server';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';
import { syncMaterialRequestsFromIntegration } from '@/integration/sync/material-requests.sync';

export async function POST(request: NextRequest) {
  try {
    if (!isExternalIntegrationEnabled('materialRequests')) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'MATERIAL_REQUESTS_INTEGRATION is disabled.',
      });
    }

    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    const forwardedAuthHeader =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader
        : cookieToken
          ? `Bearer ${cookieToken}`
          : undefined;

    if (!forwardedAuthHeader) {
      return NextResponse.json(
        { error: 'Authorization bearer token is required to sync material requests.' },
        { status: 401 },
      );
    }

    const summary = await syncMaterialRequestsFromIntegration(forwardedAuthHeader);
    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error('[HR Material Requests][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync material requests' }, { status: 500 });
  }
}
