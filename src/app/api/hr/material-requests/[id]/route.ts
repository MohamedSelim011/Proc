import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/jwt';
import {
  approveMaterialRequestFromIntegration,
  rejectMaterialRequestFromIntegration,
  updateMaterialRequestFromIntegration,
} from '@/integration/contracts/material-requests.client';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';
import { syncMaterialRequestsFromIntegration } from '@/integration/sync/material-requests.sync';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
  { params }: { params: Promise<{ id: string }> },
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
      updatedAt?: string;
      updated_at?: string;
    };

    const rawStatus = (payload.status || '').toLowerCase();
    const normalizedStatus = rawStatus === 'fulfilled' ? 'fullfilled' : rawStatus;
    if (!['approved', 'rejected', 'fullfilled'].includes(normalizedStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved, rejected, or fullfilled' },
        { status: 400 },
      );
    }
    if (normalizedStatus === 'rejected' && !payload.rejection_reason?.trim()) {
      return NextResponse.json(
        { error: 'rejection_reason is required when rejecting a request' },
        { status: 400 },
      );
    }

    const record = await prisma.hrMaterialRequest.findFirst({
      where: { OR: [{ id }, { externalId: id }] },
    });
    if (!record) {
      return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
    }

    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    const forwardedAuthHeader =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader
        : cookieToken
          ? `Bearer ${cookieToken}`
          : undefined;

    const updatedTimestamp = payload.updated_at || payload.updatedAt || new Date().toISOString();
    const approverExternalId = payload.approved_by_external || authUser.employeeId || authUser.id;

    const externalIntegrationEnabled = isExternalIntegrationEnabled('materialRequests');
    let externalPayload: { success?: boolean; data?: unknown; message?: string; error?: string } | null =
      null;
    let syncSummary: { synced: number; skippedByTimestamp: number; pagesSynced: number } | null = null;

    if (externalIntegrationEnabled) {
      if (!forwardedAuthHeader) {
        return NextResponse.json(
          { error: 'Authorization bearer token is required for external material request updates.' },
          { status: 401 },
        );
      }

      const externalId = record.externalId?.trim();
      if (!externalId) {
        return NextResponse.json(
          { error: 'Material request does not have an externalId required for external updates.' },
          { status: 400 },
        );
      }

      const integrationPayload = {
        approved_by_external: approverExternalId,
        updated_at: updatedTimestamp,
        updatedAt: updatedTimestamp,
        ...(normalizedStatus === 'rejected'
          ? { rejection_reason: payload.rejection_reason?.trim() || '' }
          : {}),
      };

      try {
        if (normalizedStatus === 'approved') {
          externalPayload = (await approveMaterialRequestFromIntegration(
            externalId,
            integrationPayload,
            forwardedAuthHeader,
          )) as { success?: boolean; data?: unknown; message?: string; error?: string };
        } else if (normalizedStatus === 'rejected') {
          externalPayload = (await rejectMaterialRequestFromIntegration(
            externalId,
            integrationPayload,
            forwardedAuthHeader,
          )) as { success?: boolean; data?: unknown; message?: string; error?: string };
        } else {
          externalPayload = (await updateMaterialRequestFromIntegration(
            externalId,
            {
              ...integrationPayload,
              status: normalizedStatus,
            },
            forwardedAuthHeader,
          )) as { success?: boolean; data?: unknown; message?: string; error?: string };
        }
      } catch (integrationError) {
        const status =
          typeof integrationError === 'object' &&
          integrationError &&
          'status' in integrationError &&
          typeof (integrationError as { status?: unknown }).status === 'number'
            ? (integrationError as { status: number }).status
            : 502;
        const details =
          typeof integrationError === 'object' &&
          integrationError &&
          'details' in integrationError
            ? (integrationError as { details?: unknown }).details
            : undefined;
        const message =
          integrationError instanceof Error
            ? integrationError.message
            : 'Failed to update material request status through integration middleware';

        return NextResponse.json({ error: message, details }, { status });
      }

      try {
        syncSummary = await syncMaterialRequestsFromIntegration(forwardedAuthHeader);
      } catch (syncError) {
        const message =
          syncError instanceof Error
            ? syncError.message
            : 'External update succeeded, but post-update sync failed';
        return NextResponse.json(
          {
            error: message,
            details: externalPayload,
          },
          { status: 502 },
        );
      }

      const refreshedRecord = await prisma.hrMaterialRequest.findFirst({
        where: {
          OR: [{ id: record.id }, { externalId: record.externalId }],
        },
      });

      if (!refreshedRecord) {
        return NextResponse.json(
          {
            error: 'Material request updated externally, but refreshed record was not found after sync.',
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        success: true,
        data: refreshedRecord,
        external: externalPayload,
        sync: syncSummary,
      });
    }

    const updated = await prisma.hrMaterialRequest.update({
      where: { id: record.id },
      data: {
        status: normalizedStatus,
        approvedByExternal: approverExternalId,
        rejectionReason: normalizedStatus === 'rejected' ? payload.rejection_reason?.trim() || null : null,
        lastSyncedAt: new Date(),
        externalUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      external: null,
      sync: null,
    });
  } catch (error) {
    console.error('[HR Material Requests][PUT] Failed:', error);
    return NextResponse.json({ error: 'Failed to update material request' }, { status: 500 });
  }
}
