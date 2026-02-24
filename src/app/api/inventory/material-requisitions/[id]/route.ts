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

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error('[Inventory Material Requisitions][DETAIL] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch material requisition details' }, { status: 500 });
  }
}

