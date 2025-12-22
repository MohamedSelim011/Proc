import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/rfq - Get all RFQs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const itemType = searchParams.get('itemType') || '';
    const prId = searchParams.get('prId') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      // Map frontend status values to database enum values for backward compatibility
      // Some statuses map to multiple database values
      const statusMappings: Record<string, string[]> = {
        'ISSUED': ['PUBLISHED', 'SENT', 'ISSUED'], // Map to PUBLISHED/SENT for backward compatibility
        'UNDER_EVALUATION': ['EVALUATED', 'CLOSED', 'UNDER_EVALUATION'], // Map to EVALUATED/CLOSED for backward compatibility
        'COMPLETED': ['AWARDED', 'COMPLETED'], // Map to AWARDED for backward compatibility
        'CANCELLED': ['CANCELLED'],
        // Direct mappings for statuses that match exactly
        'DRAFT': ['DRAFT'],
        'PENDING_APPROVAL': ['PENDING_APPROVAL'],
        'APPROVED': ['APPROVED'],
        'REJECTED': ['REJECTED'],
        // Also support direct database enum values
        'PUBLISHED': ['PUBLISHED'],
        'SENT': ['SENT'],
        'CLOSED': ['CLOSED'],
        'EVALUATED': ['EVALUATED'],
        'AWARDED': ['AWARDED']
      };
      
      const normalizedStatus = status.toUpperCase().trim();
      const mappedStatuses = statusMappings[normalizedStatus];
      
      if (mappedStatuses) {
        // Always use 'in' for consistency, even for single values
        where.status = { in: mappedStatuses };
      } else {
        // If status is not in mapping, try to use it directly (for backward compatibility)
        // But validate it's a valid enum value
        const validStatuses = [
          'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED',
          'PUBLISHED', 'SENT', 'CLOSED', 'EVALUATED', 'AWARDED',
          'ISSUED', 'UNDER_EVALUATION', 'COMPLETED', 'CANCELLED'
        ];
        
        if (validStatuses.includes(normalizedStatus)) {
          where.status = normalizedStatus;
        } else {
          console.warn(`Invalid RFQ status filter: ${status}. Ignoring filter.`);
          // Don't apply filter if status is invalid
        }
      }
      
      console.log('RFQ Status Filter:', { 
        requestedStatus: status,
        normalizedStatus,
        mappedStatuses,
        whereClause: where.status 
      });
    }
    if (prId) where.prId = prId;
    
    // Filter by item type (from Purchase Requisition)
    if (itemType) {
      // Map frontend itemType values to database enum values
      const itemTypeMapping: Record<string, string> = {
        'STOCK': 'STOCK',
        'NON_STOCK': 'NON_STOCK',
        'SERVICE': 'SERVICE'
      };
      
      const mappedItemType = itemTypeMapping[itemType.toUpperCase()] || itemType.toUpperCase();
      
      // Filter RFQs by the related Purchase Requisition's itemType
      // Only include RFQs that have a related PR with the specified itemType
      where.pr = {
        ...(where.pr || {}),
        itemType: mappedItemType
      };
      
      console.log('RFQ ItemType Filter:', {
        requestedItemType: itemType,
        mappedItemType,
        whereClause: where.pr
      });
    }

    console.log('RFQ Query Where Clause:', JSON.stringify(where, null, 2));

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

    console.log('RFQ Query Results:', { 
      count: rfqs.length, 
      total,
      statuses: rfqs.map(r => r.status),
      requestedStatus: status 
    });

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
    
    // Check if PR already has an RFQ
    if (body.prId) {
      const existingRFQ = await prisma.rFQ.findFirst({
        where: { prId: body.prId }
      });

      if (existingRFQ) {
        return NextResponse.json(
          { error: `An RFQ (${existingRFQ.rfqNumber}) already exists for this Purchase Requisition` },
          { status: 400 }
        );
      }
    }
    
    // Generate RFQ number
    const count = await prisma.rFQ.count();
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Validate closing date
    const closingDateInput = body.closingDate || body.submissionDeadline;
    let closingDate: Date;
    
    if (closingDateInput) {
      closingDate = new Date(closingDateInput);
      
      // Validate date format
      if (isNaN(closingDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid closing date format' },
          { status: 400 }
        );
      }
      
      // Validate that closing date is not in the past
      const now = new Date();
      if (closingDate < now) {
        return NextResponse.json(
          { error: 'Closing date cannot be in the past' },
          { status: 400 }
        );
      }
    } else {
      // Default to 7 days from now if not provided
      closingDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    // Create RFQ with additional fields
    const rfqData: any = {
      rfqNumber,
      title: body.title,
      description: body.description,
      closingDate,
      status: body.status || 'DRAFT',
      createdBy: body.createdBy || null
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

    // Add invited vendors if provided
    if (body.vendorIds && Array.isArray(body.vendorIds) && body.vendorIds.length > 0) {
      rfqData.invitedVendors = {
        create: body.vendorIds.map((vendorId: string) => ({
          vendorId: vendorId
        }))
      };
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
        },
        invitedVendors: {
          include: {
            vendor: true
          }
        }
      }
    });

    return NextResponse.json(rfq, { status: 201 });
  } catch (error) {
    console.error('Error creating RFQ:', error);
    return NextResponse.json(
      { error: 'Failed to create RFQ' },
      { status: 500 }
    );
  }
}