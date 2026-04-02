import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createContractVersion } from '@/lib/contract-version-service';
import { Prisma } from '@prisma/client';
import { createActivityLog } from '@/lib/activity-log';


// POST /api/service-contracts - Create new service contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate contract number
    const count = await prisma.serviceContract.count();
    const contractNumber = `SC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const servicePR = await prisma.servicePR.findUnique({
      where: { id: body.servicePrId || body.prId },
      select: { departmentId: true, projectId: true },
    });

    const contract = await prisma.serviceContract.create({
      data: {
        contractNumber,
        servicePrId: body.servicePrId || body.prId,
        departmentId: servicePR?.departmentId || null,
        projectId: servicePR?.projectId || null,
        vendorId: body.vendorId,
        contractType: body.contractType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        totalValue: body.totalValue,
        serviceAmount: body.serviceAmount ?? body.totalValue,
        currency: body.currency || 'OMR',
        paymentTerms: body.paymentTerms,
        slaTerms: body.slaTerms,
        penaltyClause: body.penaltyClause,
        performanceBond: body.performanceBond,
        retentionAmount: body.retentionAmount,
        insuranceRequirements: body.insuranceRequirements,
        status: body.status || 'DRAFT',
        versionNumber: 1,
        createdBy: body.createdBy
      },
      include: {
        vendor: true,
        servicePR: true
      }
    });

    const legacyPr = contract.servicePR
      ? {
          id: contract.servicePR.id,
          prNumber: contract.servicePR.prNumber,
          estimatedCost: contract.servicePR.estimatedCost,
          servicePR: contract.servicePR,
        }
      : null;

    // Create initial version snapshot
    try {
      await createContractVersion({
        contractId: contract.id,
        createdBy: body.createdBy || 'system',
        createdByName: body.createdByName || body.createdBy || 'system',
      });
    } catch (versionError) {
      console.error('Error creating initial version:', versionError);
      // Continue even if version creation fails
    }

    await createActivityLog({
      type: 'SERVICE_CONTRACT',
      entityType: 'ServiceContract',
      entityId: contract.id,
      title: `Service Contract ${contract.contractNumber} created`,
      status: contract.status,
      amount: Number(contract.totalValue || 0),
      currency: contract.currency || 'OMR',
      createdBy: contract.createdBy || null,
      createdByName: body.createdByName || undefined,
    });

    return NextResponse.json({ ...contract, pr: legacyPr }, { status: 201 });
  } catch (error) {
    console.error('Error creating service contract:', error);
    return NextResponse.json(
      { error: 'Failed to create service contract' },
      { status: 500 }
    );
  }
}

// GET /api/service-contracts - Get all service contracts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const contractType = searchParams.get('contractType') || '';
    const vendor = searchParams.get('vendor') || '';
    const excludeEvaluated = searchParams.get('excludeEvaluated') === 'true';

    const skip = (page - 1) * limit;

    const statsWhere: Prisma.ServiceContractWhereInput = {};
    const statsAndConditions: Prisma.ServiceContractWhereInput[] = [];
    const where: Prisma.ServiceContractWhereInput = {};
    const andConditions: Prisma.ServiceContractWhereInput[] = [];
    
    // Exclude contracts that already have performance reports
    if (excludeEvaluated) {
      statsAndConditions.push({
        performances: {
          none: {}
        }
      });
    }

    if (contractType) {
      statsAndConditions.push({ contractType });
    }

    if (vendor) {
      // Support both vendorId and vendor name search
      // Check if it's a valid CUID (starts with 'c' and is 25 chars) or vendor code (starts with 'VEN-')
      const isVendorId = (vendor.startsWith('c') && vendor.length === 25) || vendor.startsWith('VEN-');
      
      if (isVendorId) {
        // If it looks like an ID or vendor code, search by vendorId or vendorCode
        if (vendor.startsWith('VEN-')) {
          statsAndConditions.push({
            vendor: {
              vendorCode: vendor
            }
          });
        } else {
          statsAndConditions.push({ vendorId: vendor });
        }
      } else {
        // Otherwise search by vendor name (case-insensitive)
        statsAndConditions.push({
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

    if (search) {
      // Search across contract number, vendor name, and PR number
      statsAndConditions.push({
        OR: [
          { contractNumber: { contains: search, mode: 'insensitive' } },
          { vendor: { nameEn: { contains: search, mode: 'insensitive' } } },
          { vendor: { nameAr: { contains: search, mode: 'insensitive' } } },
          { vendor: { vendorCode: { contains: search, mode: 'insensitive' } } },
          { servicePR: { prNumber: { contains: search, mode: 'insensitive' } } }
        ]
      });
    }

    if (statsAndConditions.length > 0) {
      statsWhere.AND = [...statsAndConditions];
    }

    andConditions.push(...statsAndConditions);

    if (status) {
      andConditions.push({ status });
    }

    // Combine all conditions with AND
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [contracts, total, totalContracts, activeContracts, signedContracts, completedContracts, terminatedContracts, aggregateValues, vendorGroups] = await Promise.all([
      prisma.serviceContract.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: true,
          servicePR: true,
          approval: {
            include: {
              approvalHistory: true
            }
          },
          vendorResponses: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.serviceContract.count({ where }),
      prisma.serviceContract.count({ where: statsWhere }),
      prisma.serviceContract.count({
        where: {
          ...statsWhere,
          status: 'ACTIVE'
        }
      }),
      prisma.serviceContract.count({
        where: {
          ...statsWhere,
          status: 'SIGNED'
        }
      }),
      prisma.serviceContract.count({
        where: {
          ...statsWhere,
          status: 'COMPLETED'
        }
      }),
      prisma.serviceContract.count({
        where: {
          ...statsWhere,
          status: 'TERMINATED'
        }
      }),
      prisma.serviceContract.aggregate({
        where: statsWhere,
        _sum: {
          totalValue: true
        },
        _avg: {
          totalValue: true
        }
      }),
      prisma.serviceContract.groupBy({
        by: ['vendorId'],
        where: statsWhere
      })
    ]);

    const totalValue = aggregateValues._sum.totalValue ? Number(aggregateValues._sum.totalValue) : 0;
    const averageValue = aggregateValues._avg.totalValue ? Number(aggregateValues._avg.totalValue) : 0;

    const contractsWithLegacyPr = contracts.map((contract) => {
      const servicePR = contract.servicePR;
      const pr = servicePR
        ? {
            id: servicePR.id,
            prNumber: servicePR.prNumber,
            estimatedCost: servicePR.estimatedCost,
            servicePR,
          }
        : null;

      return { ...contract, pr };
    });

    return NextResponse.json({
      contracts: contractsWithLegacyPr,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalContracts,
        activeContracts,
        signedContracts,
        completedContracts,
        terminatedContracts,
        totalValue,
        averageValue,
        vendorsEngaged: vendorGroups.length
      }
    });
  } catch (error) {
    console.error('Error fetching service contracts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service contracts' },
      { status: 500 }
    );
  }
} 
