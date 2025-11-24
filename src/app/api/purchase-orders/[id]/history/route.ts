import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/purchase-orders/[id]/history - Get PO history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch all process audit entries for this PO
    const history = await prisma.processAudit.findMany({
      where: {
        documentId: id,
        documentType: 'PO',
      },
      orderBy: {
        performedAt: 'desc',
      },
    });

    return NextResponse.json({
      history,
    });
  } catch (error) {
    console.error('Error fetching PO history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order history' },
      { status: 500 }
    );
  }
}

