import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/purchase-requisitions - Get all PRs with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isExport = searchParams.get('export') === 'true';
    const includeRFQ = searchParams.get('includeRFQ') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = isExport ? undefined : parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const requesterId = searchParams.get('requesterId') || '';
    const departmentId = searchParams.get('departmentId') || '';

    const skip = isExport ? undefined : (page - 1) * limit!;

    const where: any = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (requesterId) where.requesterId = requesterId;
    if (departmentId) where.departmentId = departmentId;

    const [requisitions, total] = await Promise.all([
      prisma.purchaseRequisition.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(limit !== undefined && { take: limit }),
        include: {
          items: {
            include: {
              item: true
            }
          },
          approvals: {
            orderBy: {
              level: 'asc'
            }
          },
          ...(includeRFQ && {
            rfqs: {
              select: {
                id: true,
                rfqNumber: true,
                status: true
              },
              take: 1
            }
          }),
          _count: {
            select: {
              purchaseOrders: true,
              rfqs: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.purchaseRequisition.count({ where })
    ]);

    // Add hasRFQ flag to each requisition if includeRFQ is true
    const processedRequisitions = includeRFQ 
      ? requisitions.map(req => ({
          ...req,
          hasRFQ: (req as any).rfqs && (req as any).rfqs.length > 0,
          rfqNumber: (req as any).rfqs && (req as any).rfqs.length > 0 ? (req as any).rfqs[0].rfqNumber : null
        }))
      : requisitions;

    if (isExport) {
      return NextResponse.json({
        requisitions: processedRequisitions,
        total
      });
    }

    return NextResponse.json({
      requisitions: processedRequisitions,
      pagination: {
        page,
        limit: limit!,
        total,
        totalPages: Math.ceil(total / limit!)
      }
    });
  } catch (error) {
    console.error('Error fetching purchase requisitions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase requisitions' },
      { status: 500 }
    );
  }
}

// POST /api/purchase-requisitions - Create new PR
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate PR number
    const count = await prisma.purchaseRequisition.count();
    const prNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Calculate total estimated cost
    const estimatedCost = body.items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.estimatedPrice), 0
    );

    // Set requesterId from body or use a default for now
    const requesterId = body.requesterId || 'emp001';

    const requisition = await prisma.purchaseRequisition.create({
      data: {
        prNumber,
        requesterId,
        requestDate: new Date(),
        departmentId: body.departmentId,
        itemType: body.itemType,
        priority: body.priority,
        status: 'DRAFT',
        estimatedCost,
        budgetCode: body.budgetCode,
        justification: body.justification,
        requiredByDate: body.requiredByDate ? new Date(body.requiredByDate) : null,
        projectId: body.projectId || null,
        boqReference: body.boqReference || null,
        costCenter: body.costCenter || null,
        createdBy: requesterId,
        items: {
          create: body.items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice,
            specifications: item.specifications,
            requiredDate: item.requiredDate ? new Date(item.requiredDate) : null
          }))
        }
      },
      include: {
        items: {
          include: {
            item: true
          }
        }
      }
    });

    // Create initial approval entry if status is SUBMITTED
    if (body.autoSubmit) {
      await prisma.$transaction([
        prisma.purchaseRequisition.update({
          where: { id: requisition.id },
          data: { status: 'SUBMITTED' }
        }),
        prisma.approval.create({
          data: {
            documentType: 'PURCHASE_REQUISITION',
            documentId: requisition.id,
            prId: requisition.id,
            approverId: body.firstApproverId || 'manager001',
            status: 'PENDING',
            level: 1
          }
        })
      ]);
    }

    return NextResponse.json(requisition, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase requisition:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase requisition' },
      { status: 500 }
    );
  }
}