import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * GET /api/inventory-projects
 * Backward-compatible alias that now serves projects from Procurement internal DB.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(500, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10)));
    const search = (searchParams.get('search') || '').trim();

    const where = search
      ? {
          OR: [
            { projectName: { contains: search, mode: 'insensitive' as const } },
            { projectCode: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const rows = await prisma.project.findMany({
      where,
      orderBy: [{ projectName: 'asc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        projectCode: true,
        projectName: true,
      },
    });

    return NextResponse.json({
      projects: rows.map((row) => ({
        id: row.id,
        code: row.projectCode || '',
        name: row.projectName,
      })),
    });
  } catch (error) {
    console.error('[inventory-projects][GET] failed:', error);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}
