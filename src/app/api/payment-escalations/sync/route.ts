import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const parseDate = (value: unknown): Date | null => {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const asString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const pickExternalId = (record: Record<string, unknown>): string | null => {
  return asString(record._id) || asString(record.id) || asString(record.externalId);
};

export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.HR_API_URL?.replace(/\/$/, '');
    const endpointPath = process.env.PAYMENT_ESCALATIONS_API_PATH || '/payment-escalations';
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

    const response = await fetch(`${baseUrl}${endpointPath}`, {
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
        { error: payload?.message || 'Failed to sync payment escalations from external API' },
        { status: response.status }
      );
    }

    if (!payload?.success || !Array.isArray(payload.data)) {
      return NextResponse.json({ error: 'Invalid response from external payment escalation API' }, { status: 502 });
    }

    let synced = 0;

    for (const entry of payload.data) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const externalId = pickExternalId(record);
      if (!externalId) continue;

      const updatedAt = parseDate(record.updated_at) || parseDate(record.updatedAt);

      await prisma.paymentEscalation.upsert({
        where: { externalId },
        update: {
          title: asString(record.title) || asString(record.subject),
          status: asString(record.status) || 'unknown',
          priority: asString(record.priority),
          reason: asString(record.reason) || asString(record.description),
          amount: asNumber(record.amount),
          currency: asString(record.currency),
          requestedBy: asString(record.requested_by) || asString(record.requestedBy),
          approver: asString(record.approver),
          dueDate: parseDate(record.due_date) || parseDate(record.dueDate),
          resolvedAt: parseDate(record.resolved_at) || parseDate(record.resolvedAt),
          externalCreatedAt: parseDate(record.created_at) || parseDate(record.createdAt),
          externalUpdatedAt: updatedAt,
          lastSyncedAt: new Date(),
          rawPayload: record,
        },
        create: {
          externalId,
          title: asString(record.title) || asString(record.subject),
          status: asString(record.status) || 'unknown',
          priority: asString(record.priority),
          reason: asString(record.reason) || asString(record.description),
          amount: asNumber(record.amount),
          currency: asString(record.currency),
          requestedBy: asString(record.requested_by) || asString(record.requestedBy),
          approver: asString(record.approver),
          dueDate: parseDate(record.due_date) || parseDate(record.dueDate),
          resolvedAt: parseDate(record.resolved_at) || parseDate(record.resolvedAt),
          externalCreatedAt: parseDate(record.created_at) || parseDate(record.createdAt),
          externalUpdatedAt: updatedAt,
          lastSyncedAt: new Date(),
          rawPayload: record,
        },
      });
      synced += 1;
    }

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error('[Payment Escalations][SYNC] Failed:', error);
    return NextResponse.json({ error: 'Failed to sync payment escalations' }, { status: 500 });
  }
}
