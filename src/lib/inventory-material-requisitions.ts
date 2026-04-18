type PlainObject = Record<string, unknown>;

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' ? (value as PlainObject) : {};

const asString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const parseDate = (value: unknown): Date | null => {
  const str = asString(value);
  if (!str) return null;
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
};

const asDecimal = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeRequisitionItems = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const item = asObject(entry);
      const itemRef = asObject(item.item);
      const baseUom = asObject(itemRef.baseUom);
      const uom = asObject(item.uom);

      const quantity =
        asDecimal(item.quantity) ??
        asDecimal(item.requestedQuantity) ??
        asDecimal(item.requestedQty) ??
        0;
      const unitPrice =
        asDecimal(item.estimatedUnitCost) ??
        asDecimal(item.estimatedPrice) ??
        asDecimal(item.unitPrice) ??
        0;

      const unitOfMeasure =
        asString(item.unitOfMeasure) ||
        asString(uom.abbreviation) ||
        asString(uom.name) ||
        asString(baseUom.abbreviation) ||
        asString(baseUom.name);

      return {
        ...item,
        itemId: asString(item.itemId) || asString(itemRef.id) || asString(itemRef._id),
        itemCode: asString(item.itemCode) || asString(itemRef.code) || asString(itemRef.itemCode),
        itemName: asString(item.itemName) || asString(itemRef.name),
        quantity,
        unitPrice,
        unitOfMeasure,
        uom: {
          id: asString(item.uomId) || asString(uom.id) || asString(baseUom.id),
          name: asString(uom.name) || asString(baseUom.name),
          abbreviation: asString(uom.abbreviation) || asString(baseUom.abbreviation),
        },
      };
    })
    .filter((item) => Boolean(item.itemId) && (item.quantity ?? 0) > 0);
};

type PriorityEnum = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type PRStatusEnum =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED'
  | 'CANCELLED';

const normalizeStatus = (status: string | null): PRStatusEnum => {
  const normalized = (status || '').trim().toLowerCase();
  if (!normalized) return 'SUBMITTED';
  if (normalized.includes('approve')) return 'APPROVED';
  if (normalized.includes('reject')) return 'REJECTED';
  if (normalized.includes('cancel')) return 'CANCELLED';
  if (normalized.includes('draft')) return 'DRAFT';
  if (normalized.includes('pending')) return 'PENDING_APPROVAL';
  if (normalized.includes('convert')) return 'CONVERTED';
  return 'SUBMITTED';
};

const normalizePriority = (priority: string | null): PriorityEnum => {
  const normalized = (priority || '').trim().toLowerCase();
  if (normalized === 'low') return 'LOW';
  if (normalized === 'high') return 'HIGH';
  if (normalized === 'urgent' || normalized === 'critical') return 'URGENT';
  return 'NORMAL';
};

export const pickInventoryExternalId = (record: PlainObject): string | null => {
  return asString(record._id) || asString(record.id) || asString(record.externalId) || asString(record.requisitionId);
};

export const mapInventoryMaterialRequisitionRecord = (entry: unknown) => {
  const record = asObject(entry);
  const project = asObject(record.project);
  const department = asObject(record.department);
  const deliveryWarehouse = asObject(record.deliveryWarehouse);
  const requester = asObject(record.requestedBy || record.requester || record.user);
  const requestedProject = asObject(record.requestedProject);
  const requestedDepartment = asObject(record.requestedDepartment);
  const externalId = pickInventoryExternalId(record);
  const requisitionNumber =
    asString(record.mrNumber) ||
    asString(record.requisitionNumber) ||
    asString(record.number) ||
    asString(record.code) ||
    null;
  const rawStatus = asString(record.status) || asString(record.finalStatus);
  const rawPriority = asString(record.priority);
  const estimatedCost = asDecimal(record.estimatedCost) ?? asDecimal(record.committedCost) ?? 0;
  const normalizedItems = normalizeRequisitionItems(record.items);
  const normalizedRawPayload =
    normalizedItems.length > 0
      ? {
          ...record,
          items: normalizedItems,
        }
      : record;

  return {
    externalId,
    data: {
      // PurchaseRequisition core required fields
      prNumber: requisitionNumber || (externalId ? `EXT-${externalId}` : `EXT-${Date.now()}`),
      requestDate: parseDate(record.requestDate || record.request_date) || new Date(),
      requesterId: asString(requester.id) || asString(requester._id),
      departmentId:
        asString(requestedDepartment.id) ||
        asString(department.id) ||
        asString(record.requestedDepartmentId) ||
        asString(record.departmentId) ||
        'EXTERNAL',
      itemType: 'NON_STOCK' as const,
      priority: normalizePriority(rawPriority),
      status: normalizeStatus(rawStatus),
      estimatedCost,
      justification: asString(record.justification) || asString(record.purpose),
      requiredByDate: parseDate(record.requiredDate || record.required_date),
      projectId:
        asString(project.id) ||
        asString(record.projectId) ||
        asString(requestedProject.id) ||
        asString(record.requestedProjectId),
      sourceMaterialRequestId: null,
      createdBy: asString(requester.id) || asString(requester._id),

      // Integration/source metadata
      integrationSource: 'INVENTORY',
      externalStatus: rawStatus,
      externalPriority: rawPriority,
      externalId,

      // Inventory compatibility fields
      mrNumber: requisitionNumber,
      requestedById: asString(requester.id) || asString(requester._id),
      requestBasis: asString(record.requestBasis || record.request_basis),
      requestedDepartmentId:
        asString(requestedDepartment.id) ||
        asString(department.id) ||
        asString(record.requestedDepartmentId) ||
        asString(record.departmentId),
      requestedDepartmentName:
        asString(requestedDepartment.name) ||
        asString(department.name) ||
        asString(record.requestedDepartmentName),
      requestedProjectId:
        asString(requestedProject.id) ||
        asString(project.id) ||
        asString(record.requestedProjectId) ||
        asString(record.projectId),
      requestedProjectName:
        asString(requestedProject.name) ||
        asString(project.name) ||
        asString(record.requestedProjectName),
      wbsCodeId: asString(record.wbsCodeId || record.wbs_code_id),
      deliveryWarehouseId:
        asString(deliveryWarehouse.id) || asString(record.deliveryWarehouseId),
      projectExternalId:
        asString(project.id) ||
        asString(requestedProject.id) ||
        asString(record.projectId) ||
        asString(record.requestedProjectId),
      projectCode: asString(project.code) || asString(requestedProject.code),
      projectName:
        asString(project.name) ||
        asString(requestedProject.name) ||
        asString(record.requestedProjectName),
      departmentExternalId:
        asString(department.id) ||
        asString(requestedDepartment.id) ||
        asString(record.departmentId) ||
        asString(record.requestedDepartmentId),
      departmentName:
        asString(department.name) ||
        asString(requestedDepartment.name) ||
        asString(record.requestedDepartmentName),
      requesterExternalId: asString(requester.id) || asString(requester._id),
      requesterName: asString(requester.name),
      requesterEmail: asString(requester.email),
      requiredDate: parseDate(record.requiredDate || record.required_date),
      purpose: asString(record.purpose),
      committedCost: asDecimal(record.committedCost),
      submittedAt: parseDate(record.submittedAt),
      approvedAt: parseDate(record.approvedAt),
      rejectedAt: parseDate(record.rejectedAt),
      fulfilledAt: parseDate(record.fulfilledAt),
      cancelledAt: parseDate(record.cancelledAt),
      cancellationReason: asString(record.cancellationReason),
      procurementPrId: asString(record.procurementPrId),
      externalCreatedAt: parseDate(record.createdAt || record.created_at),
      externalUpdatedAt: parseDate(record.updatedAt || record.updated_at),
      lastSyncedAt: new Date(),
      rawPayload: normalizedRawPayload,
    },
  };
};
