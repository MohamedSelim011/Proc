type PlainObject = Record<string, unknown>;

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' ? (value as PlainObject) : {};

const asString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const asNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toQuantity = (value: unknown): number => Math.max(0, asNumber(value));

const parseDate = (value: unknown): Date | null => {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStatus = (
  value: string | null,
): 'DRAFT' | 'PENDING' | 'INSPECTING' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_ACCEPTED' | 'COMPLETED' | 'REJECTED' => {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return 'PENDING';
  if (normalized.includes('draft')) return 'DRAFT';
  if (normalized.includes('inspect')) return 'INSPECTING';
  if (normalized.includes('pending_approval') || normalized.includes('pending approval')) return 'PENDING_APPROVAL';
  if (normalized === 'approved' || normalized.includes('approve')) return 'APPROVED';
  if (normalized.includes('reject')) return 'REJECTED';
  if (normalized.includes('partial')) return 'PARTIALLY_ACCEPTED';
  if (normalized.includes('approve') || normalized.includes('complete')) return 'COMPLETED';
  return 'PENDING';
};

const normalizeItems = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const row = asObject(entry);
      const item = asObject(row.item);
      return {
        itemExternalId: asString(row.itemId) || asString(item.id) || asString(item._id),
        itemCode: asString(item.code) || asString(item.itemCode),
        orderedQuantity:
          toQuantity(row.orderedQuantity) ||
          toQuantity(row.deliveredQuantity) ||
          toQuantity(row.quantity),
        deliveredQuantity:
          toQuantity(row.deliveredQuantity) ||
          toQuantity(row.receivedQuantity) ||
          toQuantity(row.quantity),
        receivedQuantity:
          toQuantity(row.receivedQuantity) ||
          toQuantity(row.deliveredQuantity) ||
          toQuantity(row.quantity),
        acceptedQuantity:
          toQuantity(row.acceptedQuantity) ||
          toQuantity(row.receivedQuantity) ||
          toQuantity(row.deliveredQuantity),
        rejectedQuantity: toQuantity(row.rejectedQuantity),
        rejectionReason: asString(row.rejectionReason),
        unitPrice: asNumber(row.unitPrice),
        currency: asString(row.currency) || 'OMR',
        batchNumber: asString(row.batchNumber),
        serialNumber: asString(row.serialNumber),
        manufacturingDate: parseDate(row.manufacturingDate),
        expiryDate: parseDate(row.expiryDate),
        storageLocation: asString(row.storageLocation),
        qualityStatus: normalizeQualityStatus(row.qualityStatus),
        remarks: asString(row.remarks),
      };
    })
    .filter((item) => Boolean(item.itemExternalId || item.itemCode));
};

export const pickInventoryGoodsReceiptExternalId = (record: PlainObject): string | null =>
  asString(record._id) || asString(record.id) || asString(record.externalId);

export const mapInventoryGoodsReceiptRecord = (entry: unknown) => {
  const record = asObject(entry);
  const purchaseOrder = asObject(record.purchaseOrder || record.po);
  const purchaseOrderSupplier = asObject(purchaseOrder.supplier);
  const receivedBy = asObject(record.receivedBy);
  const supplier = asObject(record.supplier);
  const externalId = pickInventoryGoodsReceiptExternalId(record);

  const grNumber =
    asString(record.grnNumber) ||
    asString(record.grNumber) ||
    asString(record.number) ||
    (externalId ? `GR-${externalId}` : null);

  return {
    externalId,
    poExternalId:
      asString(purchaseOrder.externalId) ||
      asString(purchaseOrder.procurementPoId) ||
      asString(record.purchaseOrderId) ||
      asString(purchaseOrder.id),
    poNumber: asString(purchaseOrder.poNumber) || asString(record.poNumber),
    data: {
      grNumber,
      grnNumber: asString(record.grnNumber) || grNumber,
      receivedDate:
        parseDate(record.receiptDate) ||
        parseDate(record.receivedDate) ||
        parseDate(record.createdAt) ||
        new Date(),
      receiptDate:
        parseDate(record.receiptDate) ||
        parseDate(record.receivedDate) ||
        parseDate(record.createdAt) ||
        new Date(),
      receivedBy:
        asString(receivedBy.name) ||
        asString(record.receivedBy) ||
        asString(record.receivedById) ||
        'INVENTORY_SYNC',
      receivedById: asString(record.receivedById) || asString(receivedBy.id),
      status: normalizeStatus(asString(record.status)),
      deliveryNote: asString(record.deliveryNote),
      transportDetails: asString(record.transportDetails) || asString(record.vehicleNumber),
      vehicleNumber: asString(record.vehicleNumber),
      driverName: asString(record.driverName),
      receiptReason: asString(record.receiptReason),
      storageLocation: asString(record.storageLocation),
      specialHandling: asString(record.remarks),
      qualityChecked:
        typeof record.qualityChecked === 'boolean'
          ? record.qualityChecked
          : ['APPROVED', 'COMPLETED', 'PARTIALLY_ACCEPTED'].includes(normalizeStatus(asString(record.status))),
      qualityComments:
        asString(record.qualityComments) ||
        asString(record.remarks) ||
        asString(record.inspectionNotes),
      qualityInspector: asString(record.qualityInspector) || asString(record.inspectedBy),
      inspectedBy: asString(record.inspectedBy),
      inspectedAt: parseDate(record.inspectedAt),
      approvedBy: asString(record.approvedBy),
      approvedAt: parseDate(record.approvedAt),
      remarks: asString(record.remarks),
      externalUpdatedAt: parseDate(record.updatedAt),
      externalCreatedAt: parseDate(record.createdAt),
      supplierName:
        asString(supplier.name) ||
        asString(purchaseOrderSupplier.nameEn) ||
        asString(purchaseOrderSupplier.name),
      supplierExternalId:
        asString(record.supplierId) ||
        asString(supplier.id) ||
        asString(purchaseOrder.supplierId) ||
        asString(purchaseOrderSupplier.id),
      supplierCode: asString(supplier.code) || asString(purchaseOrderSupplier.code),
      warehouseExternalId: asString(record.warehouseId),
      items: normalizeItems(record.items),
      rawPayload: record,
    },
  };
};
const normalizeQualityStatus = (
  value: unknown,
): 'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL' | null => {
  const normalized = (asString(value) || '').trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'PASSED') return 'PASSED';
  if (normalized === 'FAILED') return 'FAILED';
  if (normalized === 'CONDITIONAL') return 'CONDITIONAL';
  return null;
};
