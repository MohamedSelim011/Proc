import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await prisma.purchaseRequisition.findFirst({
      where: {
        OR: [{ id }, { externalId: id }, { prNumber: id }],
      },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                itemCode: true,
                nameEn: true,
                unitOfMeasure: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      return NextResponse.json({ error: 'Material requisition not found' }, { status: 404 });
    }

    const basePayload =
      row.rawPayload && typeof row.rawPayload === 'object'
        ? (row.rawPayload as Record<string, unknown>)
        : {};

    const normalizedPayload = {
      ...basePayload,
      items:
        Array.isArray(basePayload.items) && basePayload.items.length > 0
          ? basePayload.items
          : row.items.map((line) => ({
              itemId: line.itemId,
              itemCode: line.item?.itemCode || null,
              itemName: line.item?.nameEn || null,
              quantity: Number(line.quantity || 0),
              unit: line.item?.unitOfMeasure || null,
            })),
    };

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        externalId: row.externalId || row.id,
        requisitionNumber: row.mrNumber || row.prNumber,
        status: row.externalStatus || row.status,
        priority: row.externalPriority || row.priority,
        projectExternalId:
          row.projectExternalId ||
          row.requestedProjectId ||
          row.projectId,
        projectName: row.projectName || row.requestedProjectName,
        requesterName: row.requesterName || row.requesterId,
        requesterEmail: row.requesterEmail,
        departmentExternalId:
          row.departmentExternalId || row.requestedDepartmentId,
        departmentName: row.departmentName || row.requestedDepartmentName,
        requiredDate: row.requiredDate || row.requiredByDate,
        purpose: row.purpose,
        justification: row.justification,
        externalCreatedAt: row.externalCreatedAt || row.createdAt,
        externalUpdatedAt: row.externalUpdatedAt || row.updatedAt,
        rawPayload: normalizedPayload,
      },
    });
  } catch (error) {
    console.error('[Material Requisitions][DETAIL] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch material requisition details' }, { status: 500 });
  }
}
