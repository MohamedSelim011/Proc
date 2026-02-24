import { NextRequest, NextResponse } from 'next/server';

type DepartmentOption = {
  id: string;
  name: string;
  code?: string | null;
  raw?: Record<string, unknown>;
};

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const normalizeDepartments = (payload: unknown): DepartmentOption[] => {
  const root = asObject(payload);
  const dataCandidate =
    root.data ??
    root.units ??
    root.results ??
    root.items ??
    root.organizationUnits ??
    root.departments;
  const list = Array.isArray(dataCandidate)
    ? dataCandidate
    : Array.isArray(payload)
      ? payload
      : [];

  return list
    .map((entry) => {
      const rec = asObject(entry);
      const id = asString(rec._id) || asString(rec.id) || asString(rec.code);
      const name =
        asString(rec.name) ||
        asString(rec.unit_name) ||
        asString(rec.title) ||
        asString(rec.displayName);
      const code = asString(rec.code);
      if (!id || !name) return null;
      return { id, name, code, raw: rec } as DepartmentOption;
    })
    .filter((item): item is DepartmentOption => Boolean(item));
};

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.HR_API_URL?.replace(/\/$/, '');
    const hrApiKey = process.env.HR_API_KEY?.trim();
    const hrApiToken = process.env.HR_API_TOKEN?.trim();
    if (!baseUrl) {
      return NextResponse.json({ error: 'HR_API_URL is not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    const forwardedAuthHeader =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader
        : cookieToken
          ? `Bearer ${cookieToken}`
          : hrApiToken
            ? `Bearer ${hrApiToken}`
            : null;

    const response = await fetch(`${baseUrl}/organization/units?type=department`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(forwardedAuthHeader ? { Authorization: forwardedAuthHeader } : {}),
        ...(hrApiKey ? { 'X-API-Key': hrApiKey } : {}),
      },
      cache: 'no-store',
    });

    const payload = await response.json().catch(() => ({}));
    console.log('[HR Departments][GET] External response status:', response.status);
    console.log('[HR Departments][GET] External response payload:', payload);
    if (!response.ok) {
      const rec = asObject(payload);
      return NextResponse.json(
        { error: asString(rec.message) || asString(rec.error) || 'Failed to fetch departments from HR API' },
        { status: response.status }
      );
    }

    const departments = normalizeDepartments(payload);
    console.log('[HR Departments][GET] Normalized departments count:', departments.length);
    console.log('[HR Departments][GET] Normalized departments:', departments);
    return NextResponse.json({ success: true, data: departments });
  } catch (error) {
    console.error('[HR Departments][GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}
