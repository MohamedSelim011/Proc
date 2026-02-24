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

export const pickInventoryExternalId = (record: PlainObject): string | null => {
  return asString(record._id) || asString(record.id) || asString(record.externalId);
};

export const mapInventoryMaterialRequisitionRecord = (entry: unknown) => {
  const record = asObject(entry);
  const project = asObject(record.project);
  const department = asObject(record.department);
  const requester = asObject(record.requestedBy || record.requester || record.user);

  return {
    externalId: pickInventoryExternalId(record),
    data: {
      requisitionNumber:
        asString(record.mrNumber) ||
        asString(record.requisitionNumber) ||
        asString(record.number) ||
        asString(record.code),
      status: asString(record.status) || 'unknown',
      priority: asString(record.priority),
      projectExternalId: asString(project.id) || asString(record.projectId),
      projectCode: asString(project.code),
      projectName: asString(project.name),
      departmentExternalId: asString(department.id) || asString(record.departmentId),
      departmentName: asString(department.name),
      requesterExternalId: asString(requester.id) || asString(requester._id),
      requesterName: asString(requester.name),
      requesterEmail: asString(requester.email),
      requiredDate: parseDate(record.requiredDate || record.required_date),
      purpose: asString(record.purpose),
      justification: asString(record.justification),
      externalCreatedAt: parseDate(record.createdAt || record.created_at),
      externalUpdatedAt: parseDate(record.updatedAt || record.updated_at),
      lastSyncedAt: new Date(),
      rawPayload: record,
    },
  };
};

