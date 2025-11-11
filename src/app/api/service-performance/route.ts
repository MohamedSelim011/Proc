import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/service-performance - Get all service performance reports
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const contractId = searchParams.get('contractId');
    const evaluationPeriod = searchParams.get('evaluationPeriod');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (contractId) {
      where.contractId = contractId;
    }

    if (evaluationPeriod) {
      where.evaluationPeriod = evaluationPeriod;
    }

    const [performances, total] = await Promise.all([
      prisma.servicePerformance.findMany({
        where,
        skip,
        take: limit,
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
        },
        orderBy: {
          evaluatedAt: 'desc'
        }
      }),
      prisma.servicePerformance.count({ where })
    ]);

    return NextResponse.json({
      performances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching service performances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service performances' },
      { status: 500 }
    );
  }
}

// POST /api/service-performance - Create new service performance report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      contractId,
      evaluationPeriod,
      startDate,
      endDate,
      qualityScore,
      timelinessScore,
      complianceScore,
      kpiMetrics,
      slaCompliance,
      penalties,
      bonuses,
      evaluatedBy,
      comments
    } = body;

    // Validate required fields
    if (!contractId || !evaluationPeriod || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate scores are between 0 and 100
    if (
      qualityScore < 0 || qualityScore > 100 ||
      timelinessScore < 0 || timelinessScore > 100 ||
      complianceScore < 0 || complianceScore > 100
    ) {
      return NextResponse.json(
        { error: 'Scores must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Calculate overall score (weighted average)
    const overallScore = (
      (qualityScore * 0.4) +
      (timelinessScore * 0.3) +
      (complianceScore * 0.3)
    );

    // Create performance report
    const performance = await prisma.servicePerformance.create({
      data: {
        contractId,
        evaluationPeriod,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        qualityScore,
        timelinessScore,
        complianceScore,
        overallScore,
        kpiMetrics: kpiMetrics || {},
        slaCompliance: slaCompliance || {},
        penalties: penalties || 0,
        bonuses: bonuses || 0,
        evaluatedBy: evaluatedBy || 'current-user-id',
        comments
      },
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

    return NextResponse.json(performance, { status: 201 });
  } catch (error) {
    console.error('Error creating service performance:', error);
    return NextResponse.json(
      { error: 'Failed to create service performance report' },
      { status: 500 }
    );
  }
}
