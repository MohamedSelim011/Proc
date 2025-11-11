import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/rfq - Get all RFQs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [rfqs, total] = await Promise.all([
      prisma.rFQ.findMany({
        where,
        skip,
        take: limit,
        include: {
          pr: true,
          responses: {
            include: {
              vendor: true
            }
          },
          _count: {
            select: {
              responses: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.rFQ.count({ where })
    ]);

    return NextResponse.json({
      rfqs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching RFQs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RFQs' },
      { status: 500 }
    );
  }
}

// POST /api/rfq - Create new RFQ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate RFQ number
    const count = await prisma.rFQ.count();
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create RFQ with additional fields
    const rfqData: any = {
      rfqNumber,
      title: body.title,
      description: body.description,
      closingDate: new Date(body.closingDate),
      status: body.status || 'DRAFT'
    };

    // Add PR relation if prId is provided
    if (body.prId) {
      rfqData.pr = {
        connect: {
          id: body.prId
        }
      };
    }

    // Add custom fields if they exist
    if (body.evaluationCriteria) {
      rfqData.evaluationCriteria = body.evaluationCriteria;
    }
    if (body.termsAndConditions) {
      rfqData.termsAndConditions = body.termsAndConditions;
    }

    const rfq = await prisma.rFQ.create({
      data: rfqData,
      include: {
        pr: {
          include: {
            items: {
              include: {
                item: true
              }
            }
          }
        }
      }
    });

    // If publishing immediately, send to vendors
    if (body.status === 'PUBLISHED' && body.vendorIds?.length > 0) {
      // In real implementation, this would send emails to vendors
      // For now, just update the status
      await prisma.rFQ.update({
        where: { id: rfq.id },
        data: { status: 'PUBLISHED' }
      });
    }

    return NextResponse.json(rfq, { status: 201 });
  } catch (error) {
    console.error('Error creating RFQ:', error);
    return NextResponse.json(
      { error: 'Failed to create RFQ' },
      { status: 500 }
    );
  }
}