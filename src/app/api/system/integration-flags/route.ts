import { NextResponse } from 'next/server';
import { isExternalIntegrationEnabled } from '@/integration/router/integration-switch';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      inventoryBaseUrlConfigured: Boolean(process.env.INVENTORY_SYSTEM_BASE_URL?.trim()),
      integrationMiddlewareConfigured: Boolean(process.env.INTEGRATION_MIDDLEWARE_URL?.trim()),
      materialRequestsIntegrationEnabled: isExternalIntegrationEnabled('materialRequests'),
      materialRequisitionsIntegrationEnabled: isExternalIntegrationEnabled('materialRequisitions'),
      goodsReceiptsIntegrationEnabled: isExternalIntegrationEnabled('goodsReceipts'),
      itemsIntegrationEnabled: isExternalIntegrationEnabled('items'),
      uomIntegrationEnabled: isExternalIntegrationEnabled('uom'),
      departmentsIntegrationEnabled: isExternalIntegrationEnabled('departments'),
      projectsIntegrationEnabled: isExternalIntegrationEnabled('projects'),
    },
  });
}

