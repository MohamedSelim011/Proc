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

// GET /api/purchase-orders - Get all POs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isExport = searchParams.get('export') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = isExport ? undefined : parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const vendorId = searchParams.get('vendorId') || '';

    const skip = isExport ? undefined : (page - 1) * limit!;

    const where: any = {};
    if (status) {
      // Handle comma-separated status values
      if (status.includes(',')) {
        where.status = { in: status.split(',').map(s => s.trim()) };
      } else {
        where.status = status;
      }
    }
    if (vendorId) where.vendorId = vendorId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(limit !== undefined && { take: limit }),
        include: {
          vendor: true,
          pr: true,
          sourceMaterialRequisition: true,
          items: {
            include: {
              item: true
            }
          },
          _count: {
            select: {
              goodsReceipts: true,
              invoices: true,
              amendments: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.purchaseOrder.count({ where })
    ]);

    if (isExport) {
      return NextResponse.json({
        orders,
        total
      });
    }

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit: limit!,
        total,
        totalPages: Math.ceil(total / limit!)
      }
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

// POST /api/purchase-orders - Create new PO
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

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
        unitPrice: Number(item?.unitPrice) || 0,
        deliveryDate: item?.deliveryDate ? new Date(item.deliveryDate) : null,
        externalInventoryItemId:
          typeof item?.inventoryItemId === 'string' && item.inventoryItemId.trim()
            ? item.inventoryItemId.trim()
            : null,
      };
    });

    const unresolvedBeforeFallback = resolvedItems.filter((item) => !item.resolvedItemId);
    if (unresolvedBeforeFallback.length > 0) {
      for (const unresolved of unresolvedBeforeFallback) {
        const externalId = unresolved.externalInventoryItemId;
        if (!externalId) continue;
        const localItem = await prisma.item.findFirst({
          where: {
            OR: [{ externalId: externalId }, { id: externalId }, { itemCode: externalId }],
          },
          select: { id: true },
        });
        if (localItem) {
          resolvedItems[unresolved.index].resolvedItemId = localItem.id;
        }
      }
    }

    const unresolved = resolvedItems.filter((item) => !item.resolvedItemId);
    if (unresolved.length > 0) {
      return NextResponse.json(
        {
          error: 'Some PO items could not be mapped to local catalog items',
          unresolvedItemIndexes: unresolved.map((item) => item.index)
        },
        { status: 400 }
      );
    }
    
    // Generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Calculate total amount
    const totalAmount = resolvedItems.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.unitPrice), 0
    );

    let sourceMaterialRequisitionId: string | null = null;
    let sourceDepartmentId: string | null = null;
    let sourceDepartmentName: string | null = null;
    let sourceProjectId: string | null = null;
    let sourceProjectName: string | null = null;

    const incomingSourceMr =
      typeof body.sourceMaterialRequisitionId === 'string' && body.sourceMaterialRequisitionId.trim()
        ? body.sourceMaterialRequisitionId.trim()
        : null;
    if (incomingSourceMr) {
      const sourceMr = await prisma.purchaseRequisition.findFirst({
        where: {
          OR: [{ id: incomingSourceMr }, { externalId: incomingSourceMr }, { prNumber: incomingSourceMr }],
        },
        select: {
          id: true,
          requestedDepartmentId: true,
          departmentExternalId: true,
          departmentName: true,
          requestedDepartmentName: true,
          requestedProjectId: true,
          projectExternalId: true,
          projectName: true,
          requestedProjectName: true,
        },
      });
      if (sourceMr) {
        sourceMaterialRequisitionId = sourceMr.id;
        sourceDepartmentId = sourceMr.departmentExternalId || sourceMr.requestedDepartmentId || null;
        sourceDepartmentName = sourceMr.departmentName || sourceMr.requestedDepartmentName || null;
        sourceProjectId = sourceMr.projectExternalId || sourceMr.requestedProjectId || null;
        sourceProjectName = sourceMr.projectName || sourceMr.requestedProjectName || null;
      }
    }

    // Fallback to caller-provided source context when MR record is not found locally.
    sourceDepartmentId =
      sourceDepartmentId ||
      (typeof body.sourceDepartmentId === 'string' && body.sourceDepartmentId.trim()
        ? body.sourceDepartmentId.trim()
        : null);
    sourceDepartmentName =
      sourceDepartmentName ||
      (typeof body.sourceDepartmentName === 'string' && body.sourceDepartmentName.trim()
        ? body.sourceDepartmentName.trim()
        : null);
    sourceProjectId =
      sourceProjectId ||
      (typeof body.sourceProjectId === 'string' && body.sourceProjectId.trim()
        ? body.sourceProjectId.trim()
        : null);
    sourceProjectName =
      sourceProjectName ||
      (typeof body.sourceProjectName === 'string' && body.sourceProjectName.trim()
        ? body.sourceProjectName.trim()
        : null);

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        prId: body.prId || null,
        sourceMaterialRequisitionId,
        sourceDepartmentId,
        sourceDepartmentName,
        sourceProjectId,
        sourceProjectName,
        vendorId: body.vendorId,
        deliveryDate: new Date(body.deliveryDate),
        deliveryAddress: body.deliveryAddress,
        paymentTerms: body.paymentTerms,
        status: body.status || 'DRAFT',
        totalAmount,
        invoicedAmount: 0,
        currency: body.currency || 'OMR',
        createdBy: body.createdBy || null,
        items: {
          create: resolvedItems.map((item: any) => ({
            itemId: item.resolvedItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            deliveryDate: item.deliveryDate || null
          }))
        }
      },
      include: {
        vendor: true,
        pr: true,
        sourceMaterialRequisition: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    // Update PR status if needed
    if (body.prId && body.status === 'APPROVED') {
      await prisma.purchaseRequisition.update({
        where: { id: body.prId },
        data: { status: 'CONVERTED' }
      });
    }

    await createActivityLog({
      type: 'PURCHASE_ORDER',
      entityType: 'PurchaseOrder',
      entityId: order.id,
      title: `Purchase Order ${order.poNumber} created`,
      status: order.status,
      amount: Number(order.totalAmount || 0),
      currency: order.currency || 'OMR',
      createdBy: order.createdBy || null,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}
