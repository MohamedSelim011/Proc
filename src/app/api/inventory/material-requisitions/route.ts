import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const project = (searchParams.get('project') || '').trim();

    const where: Prisma.InventoryMaterialRequisitionWhereInput = {};

    if (status) {
      where.status = { equals: status, mode: 'insensitive' };
    }

    if (project) {
      where.projectName = { contains: project, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { externalId: { contains: search, mode: 'insensitive' } },
        { requisitionNumber: { contains: search, mode: 'insensitive' } },
        { requesterName: { contains: search, mode: 'insensitive' } },
        { requesterEmail: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { purpose: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.inventoryMaterialRequisition.findMany({
        where,
        orderBy: [{ externalUpdatedAt: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryMaterialRequisition.count({ where }),
    ]);

    const normalizedRows = rows.map((row) => {
      const raw = (row.rawPayload && typeof row.rawPayload === 'object'
        ? (row.rawPayload as Record<string, unknown>)
        : {}) as Record<string, unknown>;

      const project =
        raw.project && typeof raw.project === 'object'
          ? (raw.project as Record<string, unknown>)
          : {};
      const department =
        raw.department && typeof raw.department === 'object'
          ? (raw.department as Record<string, unknown>)
          : {};

      return {
        ...row,
        projectExternalId:
          row.projectExternalId ||
          (typeof raw.requestedProjectId === 'string' ? raw.requestedProjectId : null) ||
          (typeof raw.projectId === 'string' ? raw.projectId : null) ||
          (typeof project.id === 'string' ? project.id : null),
        projectCode:
          row.projectCode ||
          (typeof project.code === 'string' ? project.code : null),
        projectName:
          row.projectName ||
          (typeof raw.requestedProjectName === 'string' ? raw.requestedProjectName : null) ||
          (typeof project.name === 'string' ? project.name : null),
        departmentExternalId:
          row.departmentExternalId ||
          (typeof raw.requestedDepartmentId === 'string' ? raw.requestedDepartmentId : null) ||
          (typeof raw.departmentId === 'string' ? raw.departmentId : null) ||
          (typeof department.id === 'string' ? department.id : null),
        departmentName:
          row.departmentName ||
          (typeof raw.requestedDepartmentName === 'string' ? raw.requestedDepartmentName : null) ||
          (typeof department.name === 'string' ? department.name : null),
      };
    });

    return NextResponse.json({
      success: true,
      data: normalizedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('[Inventory Material Requisitions][GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch material requisitions' }, { status: 500 });
  }
}
