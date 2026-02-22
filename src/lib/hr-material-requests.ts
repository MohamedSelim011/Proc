type PlainObject = Record<string, unknown>;

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' ? (value as PlainObject) : {};

const asString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const asInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
};

const asDecimal = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseDate = (value: unknown): Date | null => {
  const str = asString(value);
  if (!str) return null;
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const pickExternalId = (record: PlainObject): string | null => {
  return asString(record._id) || asString(record.id) || asString(record.externalId);
};

export const mapHrMaterialRequestRecord = (entry: unknown) => {
  const record = asObject(entry);
  const budget = asObject(record.budget_id);
  const department = asObject(budget.department_id);
  const category = asObject(record.category);
  const requester = asObject(record.requested_by);

  const requesterFirstName = asString(requester.first_name);
  const requesterLastName = asString(requester.last_name);
  const requesterName = [requesterFirstName, requesterLastName].filter(Boolean).join(' ').trim() || null;

  return {
    externalId: pickExternalId(record),
    data: {
      status: asString(record.status) || 'unknown',
      quantity: asInt(record.quantity),
      description: asString(record.description),
      notes: asString(record.notes),
      rejectionReason: asString(record.rejection_reason),
      approvedByExternal: asString(record.approved_by_external),
      budgetExternalId: asString(budget._id),
      departmentExternalId: asString(department._id),
      categoryExternalId: asString(category._id),
      departmentName: asString(department.name),
      categoryName: asString(category.name),
      categoryPriceLimit: asDecimal(category.price_limit),
      budgetCategoryBudgets: budget.category_budgets ?? null,
      requesterName,
      requesterFirstName,
      requesterLastName,
      requesterExternalId: asString(requester._id),
      requesterEmail: asString(requester.email),
      fiscalYear: asInt(budget.fiscal_year),
      quarter: asInt(budget.quarter),
      externalVersion: asInt(record.__v),
      budgetTotalAmount: asDecimal(budget.total_amount),
      externalCreatedAt: parseDate(record.created_at) || parseDate(record.createdAt),
      externalUpdatedAt: parseDate(record.updated_at) || parseDate(record.updatedAt),
      lastSyncedAt: new Date(),
      rawPayload: record,
    },
  };
};

