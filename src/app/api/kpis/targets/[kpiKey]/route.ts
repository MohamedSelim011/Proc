import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/kpis/targets/[kpiKey] - Get target for a specific KPI
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kpiKey: string }> }
) {
  try {
    const { kpiKey } = await params;

    const target = await prisma.kPITarget.findUnique({
      where: { kpiKey }
    });

    if (!target) {
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      kpiKey: target.kpiKey,
      target: Number(target.target),
      updatedBy: target.updatedBy,
      updatedAt: target.updatedAt
    });
  } catch (error) {
    console.error('Error fetching KPI target:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI target' },
      { status: 500 }
    );
  }
}

// PUT /api/kpis/targets/[kpiKey] - Update target for a specific KPI
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ kpiKey: string }> }
) {
  try {
    const { kpiKey } = await params;
    const body = await request.json();
    const { target, updatedBy } = body;

    if (target === undefined || target === null) {
      return NextResponse.json(
        { error: 'Target value is required' },
        { status: 400 }
      );
    }

    const targetValue = typeof target === 'number' ? target : parseFloat(target);
    
    if (isNaN(targetValue)) {
      return NextResponse.json(
        { error: 'Invalid target value' },
        { status: 400 }
      );
    }

    const updated = await prisma.kPITarget.upsert({
      where: { kpiKey },
      update: {
        target: targetValue,
        updatedBy: updatedBy || null
      },
      create: {
        kpiKey,
        target: targetValue,
        updatedBy: updatedBy || null
      }
    });

    return NextResponse.json({
      success: true,
      kpiKey: updated.kpiKey,
      target: Number(updated.target),
      updatedBy: updated.updatedBy,
      updatedAt: updated.updatedAt
    });
  } catch (error: any) {
    console.error('Error updating KPI target:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update KPI target' },
      { status: 500 }
    );
  }
}

