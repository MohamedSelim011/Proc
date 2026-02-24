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

    let synced = 0;
    let page = 1;
    const limit = 100;
    let totalPages: number | null = null;
    let pagesSynced = 0;

    while (totalPages === null || page <= totalPages) {
      const response = await fetch(`${baseUrl}/material-requests?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(forwardedAuthHeader ? { Authorization: forwardedAuthHeader } : {}),
          ...(hrApiKey ? { 'X-API-Key': hrApiKey } : {}),
        },
        cache: 'no-store',
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: unknown[];
        message?: string;
        pagination?: { page?: number; totalPages?: number };
      };

      if (!response.ok) {
        return NextResponse.json(
          { error: payload?.message || 'Failed to sync material requests from HR API' },
          { status: response.status }
        );
      }

      if (!payload?.success || !Array.isArray(payload.data)) {
        return NextResponse.json({ error: 'Invalid response from HR API' }, { status: 502 });
      }

      if (typeof payload.pagination?.totalPages === 'number' && payload.pagination.totalPages > 0) {
        totalPages = payload.pagination.totalPages;
      }
      pagesSynced += 1;

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

      // Fallback in case external API does not return pagination metadata.
      if (totalPages === null && payload.data.length < limit) {
        break;
      }
      if (payload.data.length === 0) {
        break;
      }

      page += 1;
    }

    return NextResponse.json({ success: true, synced, pagesSynced });
  } catch (error) {
    console.error('[HR Material Requests][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync material requests' }, { status: 500 });
  }
}
