import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/service-performance/[id] - Get a single service performance report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const performance = await prisma.servicePerformance.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            vendor: {
              select: {
                id: true,
                vendorCode: true,
                nameEn: true,
                nameAr: true
              }
            }
          }
        }
      }
    });

    if (!performance) {
      return NextResponse.json(
        { error: 'Performance report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(performance);
  } catch (error) {
    console.error('Error fetching service performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service performance report' },
      { status: 500 }
    );
  }
}

