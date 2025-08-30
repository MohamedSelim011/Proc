import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
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