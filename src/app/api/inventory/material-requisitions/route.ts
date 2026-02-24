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

    return NextResponse.json({
      success: true,
      data: rows,
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

