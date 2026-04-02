import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createActivityLog } from '@/lib/activity-log';

const INVENTORY_SYNC_CATEGORY_CODE = 'INVENTORY';

async function getOrCreateInventorySyncCategory() {
  const existing = await prisma.category.findUnique({
    where: { code: INVENTORY_SYNC_CATEGORY_CODE },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.category.create({
    data: {
      code: INVENTORY_SYNC_CATEGORY_CODE,
      nameEn: 'Inventory (synced)',
      nameAr: 'Inventory (synced)',
      description: 'Items synced from external inventory catalogs.',
    },
    select: { id: true },
  });
  return created.id;
}

// GET /api/purchase-requisitions - Get all PRs with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scope = (searchParams.get('scope') || 'material').toLowerCase();
    const isExport = searchParams.get('export') === 'true';
    const includeRFQ = searchParams.get('includeRFQ') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = isExport ? undefined : parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const itemType = searchParams.get('itemType') || '';
    const requesterId = searchParams.get('requesterId') || '';
    const departmentId = searchParams.get('departmentId') || '';

    const skip = isExport ? undefined : (page - 1) * limit!;

    const where: any = {};
    
    // Default scope is material-only for backward compatibility.
    // Use scope=all to include service and mixed requisitions too.
    if (scope !== 'all') {
      where.itemType = {
        in: ['STOCK', 'NON_STOCK']
      };
    }
    
    // Search functionality - search across PR number, requester ID, and department ID
    // Only apply search if search term is at least 2 characters to avoid overly broad matches
    if (search && search.trim().length >= 2) {
      const searchTerm = search.trim();
      const searchConditions: any[] = [];
      
      // For PR number search, be more specific:
      // - If search starts with "PR" or contains numbers, search PR number more precisely
      // - Otherwise, search all fields
      if (searchTerm.toUpperCase().startsWith('PR') || /\d/.test(searchTerm)) {
        // Search PR number with the search term
        searchConditions.push({ prNumber: { contains: searchTerm, mode: 'insensitive' } });
      } else {
        // For other searches, include PR number but also other fields
        searchConditions.push(
          { prNumber: { contains: searchTerm, mode: 'insensitive' } },
          { requesterId: { contains: searchTerm, mode: 'insensitive' } },
          { departmentId: { contains: searchTerm, mode: 'insensitive' } }
        );
      }
      
      if (scope !== 'all') {
        where.AND = [
          {
            itemType: {
              in: ['STOCK', 'NON_STOCK']
            }
          },
          {
            OR: searchConditions
          }
        ];
      } else {
        where.OR = searchConditions;
      }
    }
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (itemType) where.itemType = itemType;
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
          ...(includeRFQ && {
            rfqs: {
              where: {
                status: {
                  not: 'REJECTED'
                }
              },
              select: {
                id: true,
                rfqNumber: true,
                status: true
              },
              orderBy: {
                createdAt: 'desc'
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

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Resolve incoming items to valid local Item ids.
    // Some callers send inventory/external ids; in that case we fallback to itemCode mapping.
    const requestedIds = [...new Set(
      body.items
        .map((item: any) => (typeof item?.itemId === 'string' ? item.itemId.trim() : ''))
        .filter(Boolean)
    )];

    const requestedCodes = [...new Set(
      body.items
        .map((item: any) => (typeof item?.itemCode === 'string' ? item.itemCode.trim() : ''))
        .filter(Boolean)
    )];

    const [itemsById, itemsByCode] = await Promise.all([
      requestedIds.length > 0
        ? prisma.item.findMany({
            where: { id: { in: requestedIds } },
            select: { id: true }
          })
        : Promise.resolve([]),
      requestedCodes.length > 0
        ? prisma.item.findMany({
            where: { itemCode: { in: requestedCodes } },
            select: { id: true, itemCode: true }
          })
        : Promise.resolve([])
    ]);

    const validIdSet = new Set(itemsById.map((item) => item.id));
    const idByCode = new Map(itemsByCode.map((item) => [item.itemCode, item.id]));

    // Auto-create missing local catalog items by itemCode to avoid hard failures
    // when UI lines come from external/inventory sources.
    const missingCodes = requestedCodes.filter((code) => !idByCode.has(code));
    if (missingCodes.length > 0) {
      const categoryId = await getOrCreateInventorySyncCategory();
      const createdItems = await Promise.all(
        missingCodes.map((code) =>
          prisma.item.upsert({
            where: { itemCode: code },
            create: {
              itemCode: code,
              nameEn: code,
              nameAr: code,
              categoryId,
              unitOfMeasure: 'EA',
            },
            update: {},
            select: { id: true, itemCode: true },
          })
        )
      );
      for (const created of createdItems) {
        idByCode.set(created.itemCode, created.id);
      }
    }

    const resolvedItems = body.items.map((item: any, index: number) => {
      const incomingId = typeof item?.itemId === 'string' ? item.itemId.trim() : '';
      const incomingCode = typeof item?.itemCode === 'string' ? item.itemCode.trim() : '';
      const resolvedItemId = validIdSet.has(incomingId) ? incomingId : (idByCode.get(incomingCode) || '');

      return {
        index,
        resolvedItemId,
        quantity: Number(item?.quantity) || 0,
        estimatedPrice: Number(item?.estimatedPrice) || 0,
        specifications: item?.specifications,
        requiredDate: item?.requiredDate
      };
    });

    // Second fallback: for unresolved lines with an external/inventory itemId and no code,
    // fetch inventory item details and create local catalog entries on the fly.
    const unresolvedBeforeFallback = resolvedItems.filter((item) => !item.resolvedItemId);
    if (unresolvedBeforeFallback.length > 0) {
      for (const unresolvedItem of unresolvedBeforeFallback) {
        const originalLine = body.items[unresolvedItem.index];
        const externalId = typeof originalLine?.itemId === 'string' ? originalLine.itemId.trim() : '';
        if (!externalId) continue;
        const localItem = await prisma.item.findFirst({
          where: {
            OR: [{ externalId }, { id: externalId }, { itemCode: externalId }],
          },
          select: { id: true },
        });
        if (localItem) {
          resolvedItems[unresolvedItem.index].resolvedItemId = localItem.id;
        }
      }
    }

    const unresolved = resolvedItems.filter((item) => !item.resolvedItemId);
    if (unresolved.length > 0) {
      return NextResponse.json(
        {
          error: 'Some requisition items could not be mapped to local catalog items',
          unresolvedItemIndexes: unresolved.map((item) => item.index)
        },
        { status: 400 }
      );
    }
    
    // Generate PR number
    const count = await prisma.purchaseRequisition.count();
    const prNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Calculate total estimated cost
    const estimatedCost = resolvedItems.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.estimatedPrice), 0
    );

    // Set requesterId from body or use a default for now
    const requesterId = body.requesterId || 'emp001';
    const incomingSourceMaterialRequestId =
      typeof body.sourceMaterialRequestId === 'string' && body.sourceMaterialRequestId.trim()
        ? body.sourceMaterialRequestId.trim()
        : null;
    let sourceMaterialRequestId: string | null = null;
    if (incomingSourceMaterialRequestId) {
      const sourceRequest = await prisma.hrMaterialRequest.findFirst({
        where: {
          OR: [
            { id: incomingSourceMaterialRequestId },
            { externalId: incomingSourceMaterialRequestId },
          ],
        },
        select: { id: true },
      });
      sourceMaterialRequestId = sourceRequest?.id || null;
    }

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
        justification: body.justification,
        requiredByDate: body.requiredByDate ? new Date(body.requiredByDate) : null,
        projectId: body.projectId || null,
        sourceMaterialRequestId,
        createdBy: requesterId,
        integrationSource: 'INTERNAL',
        items: {
          create: resolvedItems.map((item: any) => ({
            itemId: item.resolvedItemId,
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

    // Optional direct submission: move to pending approval without creating approval records
    if (body.autoSubmit) {
      await prisma.purchaseRequisition.update({
        where: { id: requisition.id },
        data: { status: 'PENDING_APPROVAL' }
      });
    }

    await createActivityLog({
      type: 'PURCHASE_REQUISITION',
      entityType: 'PurchaseRequisition',
      entityId: requisition.id,
      title: `Purchase Requisition ${requisition.prNumber} created`,
      status: requisition.status,
      amount: Number(requisition.estimatedCost || 0),
      currency: 'OMR',
      createdBy: requisition.createdBy || requisition.requesterId || null,
      createdByName: requisition.requesterName || requisition.requesterEmail || undefined,
    });

    return NextResponse.json(requisition, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase requisition:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase requisition' },
      { status: 500 }
    );
  }
}
