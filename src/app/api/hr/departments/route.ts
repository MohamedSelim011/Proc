import { NextRequest, NextResponse } from 'next/server';
import { fetchDepartmentsFromIntegration } from '@/integration/contracts/departments.client';

type DepartmentOption = {
  id: string;
  name: string;
  code?: string | null;
  raw?: Record<string, unknown>;
};

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const extractDepartments = (payload: unknown): DepartmentOption[] => {
  const root = asObject(payload);
  const dataCandidate = root.data ?? root.items ?? root.results ?? root.records ?? root.departments;
  const list = Array.isArray(dataCandidate)
    ? dataCandidate
    : Array.isArray(payload)
      ? payload
      : [];

  return list.filter(
    (entry): entry is DepartmentOption =>
      Boolean(
        entry &&
          typeof entry === 'object' &&
          typeof (entry as { id?: unknown }).id === 'string' &&
          typeof (entry as { name?: unknown }).name === 'string',
      ),
  );
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('token')?.value;
    const forwardedAuthHeader =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader
        : cookieToken
          ? `Bearer ${cookieToken}`
          : undefined;

    const search = request.nextUrl.searchParams.get('search')?.trim() || undefined;
    const payload = await fetchDepartmentsFromIntegration(
      { type: 'department', ...(search ? { search } : {}) },
      forwardedAuthHeader,
    );

    const departments = extractDepartments(payload);
    return NextResponse.json({ success: true, data: departments });
  } catch (error) {
    console.error('[HR Departments][GET via integration middleware] Failed:', error);
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: unknown }).status) : 500;
    const safeStatus = Number.isFinite(status) && status >= 400 && status <= 599 ? status : 500;
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: safeStatus });
  }
}
