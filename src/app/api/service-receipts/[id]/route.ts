import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const receipt = await prisma.serviceReceipt.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            vendor: true
          }
        },
        milestone: true
      }
    });

    if (!receipt) {
      return NextResponse.json(
        { error: 'Service receipt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('Error fetching service receipt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 