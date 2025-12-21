import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// POST /api/service-contracts - Create new service contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate contract number
    const count = await prisma.serviceContract.count();
    const contractNumber = `SC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const contract = await prisma.serviceContract.create({
      data: {
        contractNumber,
        prId: body.prId,
        vendorId: body.vendorId,
        contractType: body.contractType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        totalValue: body.totalValue,
        currency: body.currency || 'OMR',
        paymentTerms: body.paymentTerms,
        slaTerms: body.slaTerms,
        penaltyClause: body.penaltyClause,
        performanceBond: body.performanceBond,
        retentionAmount: body.retentionAmount,
        insuranceRequirements: body.insuranceRequirements,
        status: body.status || 'DRAFT'
      },
      include: {
        vendor: true,
        pr: true
      }
    });

    return NextResponse.json(contract, { status: 201 });
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

    const skip = (page - 1) * limit;

    const where: any = {};
    const andConditions: any[] = [];
    
    if (status) {
      andConditions.push({ status });
    }

    if (contractType) {
      andConditions.push({ contractType });
    }

    if (vendor) {
      // Support both vendorId and vendor name search
      // Check if it's a valid CUID (starts with 'c' and is 25 chars) or vendor code (starts with 'VEN-')
      const isVendorId = (vendor.startsWith('c') && vendor.length === 25) || vendor.startsWith('VEN-');
      
      if (isVendorId) {
        // If it looks like an ID or vendor code, search by vendorId or vendorCode
        if (vendor.startsWith('VEN-')) {
          andConditions.push({
            vendor: {
              vendorCode: vendor
            }
          });
        } else {
          andConditions.push({ vendorId: vendor });
        }
      } else {
        // Otherwise search by vendor name (case-insensitive)
        andConditions.push({
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
      andConditions.push({
        OR: [
          { contractNumber: { contains: search, mode: 'insensitive' } },
          { vendor: { nameEn: { contains: search, mode: 'insensitive' } } },
          { vendor: { nameAr: { contains: search, mode: 'insensitive' } } },
          { vendor: { vendorCode: { contains: search, mode: 'insensitive' } } },
          { pr: { prNumber: { contains: search, mode: 'insensitive' } } }
        ]
      });
    }

    // Combine all conditions with AND
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [contracts, total] = await Promise.all([
      prisma.serviceContract.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: true,
          pr: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.serviceContract.count({ where })
    ]);

    return NextResponse.json({
      contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
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