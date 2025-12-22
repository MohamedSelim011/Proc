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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const vendor = searchParams.get('vendor') || '';
    const performanceRange = searchParams.get('performanceRange') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    const contractAndConditions: any[] = [];
    const contractOrConditions: any[] = [];

    if (contractId) {
      where.contractId = contractId;
    }

    if (evaluationPeriod) {
      where.evaluationPeriod = evaluationPeriod;
    }

    // Search functionality - search across contract number, vendor name, and contract type
    // Only apply search if it has at least 1 character (to avoid matching everything)
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      // Each condition must be a complete object that can be used in OR
      contractOrConditions.push(
        { contractNumber: { contains: searchTerm, mode: 'insensitive' } },
        { vendor: { nameEn: { contains: searchTerm, mode: 'insensitive' } } },
        { vendor: { nameAr: { contains: searchTerm, mode: 'insensitive' } } },
        { vendor: { vendorCode: { contains: searchTerm, mode: 'insensitive' } } },
        { contractType: { contains: searchTerm, mode: 'insensitive' } }
      );
    }

    // Filter by vendor
    if (vendor) {
      const isVendorId = (vendor.startsWith('c') && vendor.length === 25) || vendor.startsWith('VEN-');
      
      if (isVendorId) {
        if (vendor.startsWith('VEN-')) {
          contractAndConditions.push({
            vendor: {
              vendorCode: vendor
            }
          });
        } else {
          contractAndConditions.push({
            vendorId: vendor
          });
        }
      } else {
        contractAndConditions.push({
          vendor: {
            OR: [
              { nameEn: { contains: vendor, mode: 'insensitive' } },
              { nameAr: { contains: vendor, mode: 'insensitive' } },
              { vendorCode: { contains: vendor, mode: 'insensitive' } }
            ]
          }
        });
      }
    }

    // Combine contract conditions: if we have both search (OR) and vendor (AND), combine them
    if (contractOrConditions.length > 0 && contractAndConditions.length > 0) {
      // Both search and vendor filters - combine with AND
      where.contract = {
        AND: [
          { OR: contractOrConditions },
          ...contractAndConditions
        ]
      };
    } else if (contractOrConditions.length > 0) {
      // Only search filter
      where.contract = {
        OR: contractOrConditions
      };
    } else if (contractAndConditions.length > 0) {
      // Only vendor filter
      if (contractAndConditions.length === 1) {
        where.contract = contractAndConditions[0];
      } else {
        where.contract = {
          AND: contractAndConditions
        };
      }
    }

    console.log('Service Performance Query:', {
      search,
      vendor,
      performanceRange,
      contractOrConditionsCount: contractOrConditions.length,
      contractAndConditionsCount: contractAndConditions.length,
      whereClause: JSON.stringify(where, null, 2)
    });

    // Filter by performance range (overallScore)
    if (performanceRange) {
      const rangeMap: Record<string, { min: number; max: number }> = {
        'excellent': { min: 90, max: 100 },
        'good': { min: 75, max: 89.99 },
        'average': { min: 60, max: 74.99 },
        'poor': { min: 0, max: 59.99 }
      };
      
      const range = rangeMap[performanceRange];
      if (range) {
        where.overallScore = {
          gte: range.min,
          lte: range.max
        };
      }
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
    if (!contractId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if a performance report already exists for this contract
    const existingPerformance = await prisma.servicePerformance.findFirst({
      where: {
        contractId: contractId
      }
    });

    if (existingPerformance) {
      return NextResponse.json(
        { error: 'A performance report already exists for this contract. Each contract can only have one performance evaluation.' },
        { status: 400 }
      );
    }
    
    // Set default evaluation period if not provided
    const finalEvaluationPeriod = evaluationPeriod || 'Final';

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
        evaluationPeriod: finalEvaluationPeriod,
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
