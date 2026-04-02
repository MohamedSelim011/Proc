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

const asBool = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  if (typeof value === 'number') return value === 1;
  return fallback;
};

const parseDate = (value: unknown): Date | null => {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const pickInventoryItemExternalId = (record: PlainObject): string | null =>
  asString(record._id) || asString(record.id) || asString(record.externalId);

export const mapInventoryItemRecord = (entry: unknown) => {
  const record = asObject(entry);
  const category = asObject(record.category);
  const itemGroup = asObject(record.itemGroup);
  const baseUom = asObject(record.baseUom);

  const externalId = pickInventoryItemExternalId(record);
  const itemCode = asString(record.code) || asString(record.itemCode) || (externalId ? `ITM-${externalId}` : null);
  const nameEn = asString(record.name) || asString(record.nameEn);
  const nameAr = asString(record.arabicName) || asString(record.nameAr) || nameEn;

  return {
    externalId,
    itemCode,
    nameEn,
    nameAr,
    categoryExternalId: asString(category.id) || asString(record.categoryId),
    categoryCode: asString(category.code),
    categoryName: asString(category.name),
    data: {
      itemCode,
      nameEn,
      nameAr,
      description: asString(record.description),
      unitOfMeasure: asString(baseUom.abbreviation) || asString(baseUom.name) || 'EA',
      minStockLevel: asInt(record.minimumStock),
      maxStockLevel: asInt(record.maximumStock),
      reorderPoint: asInt(record.reorderLevel),
      reorderQuantity: asInt(record.reorderQuantity),
      leadTimeDays: asInt(record.leadTimeDays),
      shelfLifeDays: asInt(record.shelfLifeDays),
      itemStatus: asString(record.status),
      stockType: asString(record.stockType),
      isCritical: asBool(record.isCritical),
      isHazardous: asBool(record.isHazardous),
      storageCondition: asString(record.storageCondition),
      hsnCode: asString(record.hsnCode),
      barcode: asString(record.barcode),
      categoryExternalId: asString(category.id) || asString(record.categoryId),
      categoryName: asString(category.name),
      itemGroupExternalId: asString(itemGroup.id) || asString(record.itemGroupId),
      itemGroupName: asString(itemGroup.name),
      baseUomExternalId: asString(baseUom.id) || asString(record.baseUomId),
      baseUomName: asString(baseUom.name),
      baseUomAbbreviation: asString(baseUom.abbreviation),
      integrationSource: 'INVENTORY',
      externalUpdatedAt: parseDate(record.updatedAt || record.updated_at),
      lastSyncedAt: new Date(),
      rawPayload: record,
    },
  };
};

