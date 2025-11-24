import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/invoices - Get all invoices
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isExport = searchParams.get('export') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = isExport ? undefined : parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const matchingStatus = searchParams.get('matchingStatus') || '';
    const vendorId = searchParams.get('vendorId') || '';

    const skip = isExport ? undefined : (page - 1) * limit!;

    const where: any = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (matchingStatus) where.matchingStatus = matchingStatus;
    if (vendorId) where.vendorId = vendorId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(limit !== undefined && { take: limit }),
        include: {
          vendor: true,
          po: true,
          gr: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.invoice.count({ where })
    ]);

    if (isExport) {
      return NextResponse.json({
        invoices,
        total
      });
    }

    // Calculate summary statistics
    const stats = await prisma.invoice.aggregate({
      where: {
        paymentStatus: 'UNPAID'
      },
      _sum: {
        totalAmount: true
      },
      _count: true
    });

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit: limit!,
        total,
        totalPages: Math.ceil(total / limit!)
      },
      summary: {
        totalUnpaid: stats._sum.totalAmount || 0,
        unpaidCount: stats._count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received invoice data:', JSON.stringify(body, null, 2));
    
    // Get vendor ID from PO or service receipt if not provided
    let vendorId = body.vendorId;
    if (!vendorId) {
      if (body.poId) {
        const po = await prisma.purchaseOrder.findUnique({
          where: { id: body.poId },
          select: { vendorId: true }
        });
        if (po) {
          vendorId = po.vendorId;
        }
      } else if (body.serviceReceiptId) {
        const serviceReceipt = await prisma.serviceReceipt.findUnique({
          where: { id: body.serviceReceiptId },
          include: { contract: { include: { vendor: true } } }
        });
        if (serviceReceipt?.contract?.vendor?.id) {
          vendorId = serviceReceipt.contract.vendor.id;
        }
      }
    }
    
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    // For service receipts, we need to create a dummy item since they don't have traditional items
    let itemsData = undefined;
    if (body.items && body.items.length > 0) {
      if (body.serviceReceiptId) {
        // For service receipts, try to find an existing service item or create a simple one
        let serviceItem;
        try {
          // Try to find an existing service item
          serviceItem = await prisma.item.findFirst({
            where: {
              nameEn: { contains: 'Service' }
            }
          });
          
          if (!serviceItem) {
            // Create a simple service item if none exists
            serviceItem = await prisma.item.create({
              data: {
                itemCode: `SRV-${Date.now()}`,
                nameEn: 'Service Item',
                nameAr: 'خدمة',
                description: 'Service item for invoice',
                categoryId: 'default-category-id',
                unitOfMeasure: 'EA'
              }
            });
          }
        } catch (error) {
          console.error('Error creating/finding service item:', error);
          // If we can't create an item, skip items for now
          itemsData = undefined;
        }
        
        if (serviceItem) {
          itemsData = {
            create: body.items.map((item: any) => ({
              poItemId: null, // No PO item for service receipts
              itemId: serviceItem.id, // Use the service item ID
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              description: item.description || 'Service Item'
            }))
          };
        }
      } else {
        // For regular POs, use the existing logic
        itemsData = {
          create: body.items.map((item: any) => ({
            poItemId: item.poItemId,
            itemId: item.itemId || item.poItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            description: item.description
          }))
        };
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: body.invoiceNumber,
        vendorId,
        poId: body.poId || null, // Use null instead of empty string for service receipts
        invoiceDate: new Date(body.invoiceDate),
        dueDate: new Date(body.dueDate),
        totalAmount: body.totalAmount,
        taxAmount: body.taxAmount || 0,
        discountAmount: body.discountAmount || 0,
        netAmount: body.totalAmount,
        currency: body.currency || 'OMR',
        status: body.status || 'DRAFT',
        matchingStatus: body.matchingStatus || 'PENDING',
        threeWayMatched: body.matchingStatus === 'MATCHED',
        paymentStatus: 'UNPAID',
        description: body.description,
        paymentTerms: body.paymentTerms,
        items: itemsData
      },
      include: {
        vendor: true,
        po: true,
        items: {
          include: {
            item: true,
            poItem: true
          }
        }
      }
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}