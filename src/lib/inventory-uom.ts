type PlainObject = Record<string, unknown>;

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' ? (value as PlainObject) : {};

const asString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const asBool = (value: unknown, fallback = true): boolean => {
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

const normalizeUomType = (value: unknown): 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'AREA' | 'COUNT' | 'TIME' => {
  const raw = asString(value)?.trim().toUpperCase();
  if (raw === 'WEIGHT' || raw === 'VOLUME' || raw === 'LENGTH' || raw === 'AREA' || raw === 'COUNT' || raw === 'TIME') {
    return raw;
  }
  return 'COUNT';
};

export const pickInventoryUomExternalId = (record: PlainObject): string | null =>
  asString(record.id) || asString(record._id) || asString(record.externalId);

export const mapInventoryUomRecord = (entry: unknown) => {
  const record = asObject(entry);
  const externalId = pickInventoryUomExternalId(record);
  const code = asString(record.code)?.trim().toUpperCase() || null;
  const name = asString(record.name)?.trim() || null;
  const abbreviation = asString(record.abbreviation)?.trim() || null;

  return {
    externalId,
    code,
    name,
    abbreviation,
    data: {
      code,
      name,
      abbreviation,
      type: normalizeUomType(record.type),
      isActive: asBool(record.isActive, true),
      externalUpdatedAt:
        parseDate(record.externalUpdatedAt) ||
        parseDate(record.updatedAt) ||
        parseDate(record.updated_at),
      rawPayload: record,
      lastSyncedAt: new Date(),
    },
  };
};

