export type IntegrationPoint =
  | 'materialRequests'
  | 'materialRequisitions'
  | 'goodsReceipts'
  | 'items'
  | 'uom'
  | 'departments'
  | 'projects'
  | 'financePurchaseOrders'
  | 'financeSuppliers'
  | 'financeServiceContracts'
  | 'inventory'
  | 'hr';

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function getIntegrationEnvKey(point: IntegrationPoint) {
  if (point === 'materialRequests') {
    return 'MATERIAL_REQUESTS_INTEGRATION';
  }
  if (point === 'materialRequisitions') {
    return 'MATERIAL_REQUISITIONS_INTEGRATION';
  }
  if (point === 'goodsReceipts') {
    return 'GOODS_RECEIPTS_INTEGRATION';
  }
  if (point === 'items') {
    return 'ITEMS_INTEGRATION';
  }
  if (point === 'uom') {
    return 'UOM_INTEGRATION';
  }
  if (point === 'departments') {
    return 'DEPARTMENTS_INTEGRATION';
  }
  if (point === 'projects') {
    return 'PROJECTS_INTEGRATION';
  }
  if (point === 'financePurchaseOrders') {
    return 'FINANCE_PURCHASE_ORDERS_INTEGRATION';
  }
  if (point === 'financeSuppliers') {
    return 'FINANCE_SUPPLIERS_INTEGRATION';
  }
  if (point === 'financeServiceContracts') {
    return 'FINANCE_SERVICE_CONTRACTS_INTEGRATION';
  }
  if (point === 'inventory') {
    return 'INVENTORY_INTEGRATION';
  }
  return 'HR_INTEGRATION';
}

export function isExternalIntegrationEnabled(point: IntegrationPoint) {
  const envKey = getIntegrationEnvKey(point);
  const enabled = parseBoolean(process.env[envKey], false);
  if (process.env.INTEGRATION_DEBUG_LOGS?.trim().toLowerCase() === 'true') {
    console.log('[INTEGRATION] switch.check', { point, envKey, enabled });
  }
  return enabled;
}
