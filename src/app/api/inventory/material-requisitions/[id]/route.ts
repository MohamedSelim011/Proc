import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await prisma.inventoryMaterialRequisition.findFirst({
      where: {
        OR: [{ id }, { externalId: id }],
      },
    });

    if (!row) {
      return NextResponse.json({ error: 'Material requisition not found' }, { status: 404 });
    }

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

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('[Inventory Material Requisitions][DETAIL] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch material requisition details' }, { status: 500 });
  }
}
