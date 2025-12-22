import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/kpis/targets - Get all KPI targets
export async function GET(request: NextRequest) {
  try {
    const targets = await prisma.kPITarget.findMany({
      orderBy: {
        kpiKey: 'asc'
      }
    });

    // Convert to a key-value map for easy lookup
    const targetsMap: Record<string, number> = {};
    targets.forEach(target => {
      targetsMap[target.kpiKey] = Number(target.target);
    });

    return NextResponse.json({
      targets: targetsMap
    });
  } catch (error) {
    console.error('Error fetching KPI targets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI targets' },
      { status: 500 }
    );
  }
}

// POST /api/kpis/targets - Update KPI targets (bulk update)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targets, updatedBy } = body;

    if (!targets || typeof targets !== 'object') {
      return NextResponse.json(
        { error: 'Invalid targets data' },
        { status: 400 }
      );
    }

    // Update or create targets
    const updatePromises = Object.entries(targets).map(([kpiKey, target]) => {
      const targetValue = typeof target === 'number' ? target : parseFloat(target as string);
      
      if (isNaN(targetValue)) {
        throw new Error(`Invalid target value for ${kpiKey}: ${target}`);
      }

      return prisma.kPITarget.upsert({
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
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: 'KPI targets updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating KPI targets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update KPI targets' },
      { status: 500 }
    );
  }
}

