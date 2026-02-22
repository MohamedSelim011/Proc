import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mapHrMaterialRequestRecord } from '@/lib/hr-material-requests';
import { getAuthenticatedUser } from '@/lib/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = await prisma.hrMaterialRequest.findFirst({
      where: {
        OR: [{ id }, { externalId: id }],
      },
    });

    if (!row) {
      return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error('[HR Material Requests][DETAIL] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch material request details' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as {
      status?: string;
      approved_by_external?: string;
      rejection_reason?: string;
    };

    const normalizedStatus = (payload.status || '').toLowerCase();
    if (!['approved', 'rejected'].includes(normalizedStatus)) {
      return NextResponse.json({ error: 'Invalid status. Must be approved or rejected' }, { status: 400 });
    }
    if (normalizedStatus === 'rejected' && !payload.rejection_reason?.trim()) {
      return NextResponse.json({ error: 'rejection_reason is required when rejecting a request' }, { status: 400 });
    }

    const record = await prisma.hrMaterialRequest.findFirst({
      where: { OR: [{ id }, { externalId: id }] },
    });
    if (!record) {
      return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
    }

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

    const approverExternalId = payload.approved_by_external || authUser.employeeId || authUser.id;
    const externalBody = {
      status: normalizedStatus,
      approved_by_external: approverExternalId,
      ...(normalizedStatus === 'rejected' ? { rejection_reason: payload.rejection_reason?.trim() } : {}),
    };

    const externalResponse = await fetch(`${baseUrl}/material-requests/${record.externalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(forwardedAuthHeader ? { Authorization: forwardedAuthHeader } : {}),
        ...(hrApiKey ? { 'X-API-Key': hrApiKey } : {}),
      },
      body: JSON.stringify(externalBody),
      cache: 'no-store',
    });

    const externalPayload = (await externalResponse.json().catch(() => ({}))) as {
      success?: boolean;
      data?: unknown;
      message?: string;
      error?: string;
    };

    if (!externalResponse.ok) {
      return NextResponse.json(
        { error: externalPayload.error || externalPayload.message || 'Failed to update material request status' },
        { status: externalResponse.status }
      );
    }

    let updated;
    if (externalPayload?.data && typeof externalPayload.data === 'object') {
      const mapped = mapHrMaterialRequestRecord(externalPayload.data);
      updated = await prisma.hrMaterialRequest.upsert({
        where: { externalId: record.externalId },
        update: {
          ...mapped.data,
          status: normalizedStatus,
          approvedByExternal: approverExternalId,
          rejectionReason: normalizedStatus === 'rejected' ? payload.rejection_reason?.trim() || null : null,
        },
        create: {
          externalId: record.externalId,
          ...mapped.data,
          status: normalizedStatus,
          approvedByExternal: approverExternalId,
          rejectionReason: normalizedStatus === 'rejected' ? payload.rejection_reason?.trim() || null : null,
        },
      });
    } else {
      updated = await prisma.hrMaterialRequest.update({
        where: { id: record.id },
        data: {
          status: normalizedStatus,
          approvedByExternal: approverExternalId,
          rejectionReason: normalizedStatus === 'rejected' ? payload.rejection_reason?.trim() || null : null,
          lastSyncedAt: new Date(),
          externalUpdatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      external: externalPayload,
    });
  } catch (error) {
    console.error('[HR Material Requests][PUT] Failed:', error);
    return NextResponse.json({ error: 'Failed to update material request' }, { status: 500 });
  }
}
