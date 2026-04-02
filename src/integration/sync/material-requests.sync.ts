import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mapHrMaterialRequestRecord } from '@/lib/hr-material-requests';
import { fetchMaterialRequestsFromIntegration } from '@/integration/contracts/material-requests.client';

type MaterialRequestsIntegrationResponse = {
  success?: boolean;
  data?: unknown[];
  pagination?: { page?: number; totalPages?: number };
};

export type MaterialRequestsSyncSummary = {
  synced: number;
  skippedByTimestamp: number;
  pagesSynced: number;
};

export async function syncMaterialRequestsFromIntegration(
  authorizationHeader: string,
): Promise<MaterialRequestsSyncSummary> {
  const payload = (await fetchMaterialRequestsFromIntegration(
    {},
    authorizationHeader,
  )) as MaterialRequestsIntegrationResponse;

  if (!payload?.success || !Array.isArray(payload.data)) {
    throw new Error('Invalid response from integration middleware');
  }

  let synced = 0;
  let skippedByTimestamp = 0;
  let pagesSynced = 1;

  if (typeof payload.pagination?.totalPages === 'number' && payload.pagination.totalPages > 0) {
    pagesSynced = payload.pagination.totalPages;
  }

  for (const entry of payload.data) {
    const mapped = mapHrMaterialRequestRecord(entry);
    const externalId = mapped.externalId;
    if (!externalId) continue;

    const existing = await prisma.hrMaterialRequest.findUnique({
      where: { externalId },
      select: { externalUpdatedAt: true },
    });

    const incomingUpdatedAt = mapped.data.externalUpdatedAt;
    const shouldUpdate =
      !existing ||
      !existing.externalUpdatedAt ||
      !incomingUpdatedAt ||
      incomingUpdatedAt.getTime() >= existing.externalUpdatedAt.getTime();

    if (!shouldUpdate) {
      skippedByTimestamp += 1;
      continue;
    }

    const persistenceData = {
      ...mapped.data,
      budgetCategoryBudgets:
        mapped.data.budgetCategoryBudgets === null ||
        mapped.data.budgetCategoryBudgets === undefined
          ? Prisma.JsonNull
          : (mapped.data.budgetCategoryBudgets as Prisma.InputJsonValue),
      rawPayload: mapped.data.rawPayload as Prisma.InputJsonValue,
    };

    await prisma.hrMaterialRequest.upsert({
      where: { externalId },
      update: persistenceData,
      create: {
        externalId,
        ...persistenceData,
      },
    });

    synced += 1;
  }

  return {
    synced,
    skippedByTimestamp,
    pagesSynced,
  };
}
