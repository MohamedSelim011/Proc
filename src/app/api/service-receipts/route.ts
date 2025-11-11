import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// POST /api/service-receipts - Create new service receipt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, milestoneId, description, completionDate, amount, deliverables, qualityScore, attachments, status } = body;

    if (!contractId || !description || !completionDate || !amount) {
      return NextResponse.json(
        { error: 'Contract ID, description, completion date, and amount are required' },
        { status: 400 }
      );
    }

    // Verify contract exists
    const contract = await prisma.serviceContract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Service contract not found' },
        { status: 404 }
      );
    }

    // Generate receipt number
    const count = await prisma.serviceReceipt.count();
    const srnNumber = `SRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create receipt
    const receipt = await prisma.serviceReceipt.create({
      data: {
        srnNumber,
        contractId,
        milestoneId,
        receiptDate: new Date(completionDate),
        serviceDescription: description,
        deliverables: deliverables,
        qualityRating: qualityScore,
        completionPercentage: 100, // Assuming 100% completion for new receipt
        acceptanceStatus: 'PENDING',
        attachments: attachments || [],
        createdBy: 'current-user-id' // This should come from user context
      }
    });

    return NextResponse.json({
      message: 'Service receipt created successfully',
      receipt
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating service receipt:', error);
    return NextResponse.json(
      { error: 'Failed to create service receipt' },
      { status: 500 }
    );
  }
}

// GET /api/service-receipts - Get receipts with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const contractId = searchParams.get('contractId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const vendor = searchParams.get('vendor');
    const contract = searchParams.get('contract');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (contractId) {
      where.contractId = contractId;
    }
    
    if (status) {
      where.acceptanceStatus = status;
    }
    
    if (search) {
      where.OR = [
        { srnNumber: { contains: search, mode: 'insensitive' } },
        { serviceDescription: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (vendor) {
      where.contract = {
        vendor: {
          nameEn: { contains: vendor, mode: 'insensitive' }
        }
      };
    }
    
    if (contract) {
      where.contract = {
        contractNumber: { contains: contract, mode: 'insensitive' }
      };
    }

    const [receipts, total] = await Promise.all([
      prisma.serviceReceipt.findMany({
        where,
        skip,
        take: limit,
        include: {
          contract: {
            include: {
              vendor: true
            }
          },
          milestone: true
        },
        orderBy: { receiptDate: 'desc' }
      }),
      prisma.serviceReceipt.count({ where })
    ]);

    return NextResponse.json({
      receipts,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit
    });

  } catch (error) {
    console.error('Error fetching service receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service receipts' },
      { status: 500 }
    );
  }
} 