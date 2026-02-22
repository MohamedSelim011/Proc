import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = await prisma.paymentEscalation.findFirst({
      where: {
        OR: [{ id }, { externalId: id }],
      },
    });

    if (!row) {
      return NextResponse.json({ error: 'Payment escalation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error('[Payment Escalations][DETAIL] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch payment escalation details' }, { status: 500 });
  }
}
