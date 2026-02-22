import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || '').trim();

    const where: Prisma.PaymentEscalationWhereInput = {};

    if (status) {
      where.status = { equals: status, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { externalId: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { requestedBy: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = await prisma.paymentEscalation.findMany({
      where,
      orderBy: [{ externalUpdatedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Payment Escalations][GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch payment escalations' }, { status: 500 });
  }
}
