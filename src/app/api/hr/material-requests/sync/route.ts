import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mapHrMaterialRequestRecord } from '@/lib/hr-material-requests';

export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.HR_API_URL?.replace(/\/$/, '');
    const hrApiKey = process.env.HR_API_KEY?.trim();
    const hrApiToken = process.env.HR_API_TOKEN?.trim();
    if (!baseUrl) {
      return NextResponse.json({ error: 'HR_API_URL is not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    const forwardedAuthHeader =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader
        : cookieToken
          ? `Bearer ${cookieToken}`
          : hrApiToken
            ? `Bearer ${hrApiToken}`
            : null;

    const response = await fetch(`${baseUrl}/material-requests`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(forwardedAuthHeader ? { Authorization: forwardedAuthHeader } : {}),
        ...(hrApiKey ? { 'X-API-Key': hrApiKey } : {}),
      },
      cache: 'no-store',
    });

    const payload = (await response.json()) as { success?: boolean; data?: unknown[]; message?: string };

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.message || 'Failed to sync material requests from HR API' },
        { status: response.status }
      );
    }

    if (!payload?.success || !Array.isArray(payload.data)) {
      return NextResponse.json({ error: 'Invalid response from HR API' }, { status: 502 });
    }

    let synced = 0;
    for (const entry of payload.data) {
      const mapped = mapHrMaterialRequestRecord(entry);
      const externalId = mapped.externalId;
      if (!externalId) continue;

      await prisma.hrMaterialRequest.upsert({
        where: { externalId },
        update: {
          ...mapped.data,
        },
        create: {
          externalId,
          ...mapped.data,
        },
      });
      synced += 1;
    }

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error('[HR Material Requests][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync material requests' }, { status: 500 });
  }
}
