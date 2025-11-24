import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/purchase-orders/[id]/acknowledge - Acknowledge PO via email token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { token, vendorEmail } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Acknowledgment token is required' },
        { status: 400 }
      );
    }

    // Find PO with matching token
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true
      }
    });

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase Order not found' },
        { status: 404 }
      );
    }

    // Verify token
    if (po.acknowledgmentToken !== token) {
      return NextResponse.json(
        { error: 'Invalid acknowledgment token' },
        { status: 401 }
      );
    }

    // Check if already acknowledged
    if (po.status === 'ACKNOWLEDGED' || po.acknowledgedAt) {
      return NextResponse.json(
        { 
          message: 'Purchase Order already acknowledged',
          acknowledged: true,
          acknowledgedAt: po.acknowledgedAt
        },
        { status: 200 }
      );
    }

    // Check if PO is in correct status
    if (po.status !== 'SENT') {
      return NextResponse.json(
        { error: `Cannot acknowledge Purchase Order with status: ${po.status}` },
        { status: 400 }
      );
    }

    // Update PO to acknowledged
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: vendorEmail || po.vendor.email || 'VENDOR',
      },
      include: {
        vendor: true
      }
    });

    // Create process audit entry
    await prisma.processAudit.create({
      data: {
        processType: 'PO_ACKNOWLEDGMENT',
        documentId: id,
        documentType: 'PO',
        action: 'ACKNOWLEDGED',
        performedBy: vendorEmail || po.vendor.email || 'VENDOR',
        details: {
          poNumber: po.poNumber,
          acknowledgedAt: new Date().toISOString(),
          vendorEmail: vendorEmail || po.vendor.email,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      message: 'Purchase Order acknowledged successfully',
      po: updatedPO
    });
  } catch (error) {
    console.error('Error acknowledging PO:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge Purchase Order' },
      { status: 500 }
    );
  }
}

// GET /api/purchase-orders/[id]/acknowledge - Verify token and get PO details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Acknowledgment token is required' },
        { status: 400 }
      );
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          include: {
            item: true
          }
        },
        pr: {
          select: {
            prNumber: true
          }
        }
      }
    });

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase Order not found' },
        { status: 404 }
      );
    }

    // Verify token
    if (po.acknowledgmentToken !== token) {
      return NextResponse.json(
        { error: 'Invalid acknowledgment token' },
        { status: 401 }
      );
    }

    // Check if already acknowledged
    const isAcknowledged = po.status === 'ACKNOWLEDGED' || po.acknowledgedAt !== null;

    return NextResponse.json({
      po: {
        poNumber: po.poNumber,
        orderDate: po.orderDate,
        deliveryDate: po.deliveryDate,
        totalAmount: po.totalAmount,
        currency: po.currency,
        paymentTerms: po.paymentTerms,
        vendor: {
          name: po.vendor.nameEn || po.vendor.nameAr,
          email: po.vendor.email
        },
        items: po.items.map(item => ({
          itemCode: item.item.itemCode,
          name: item.item.nameEn || item.item.nameAr,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        prNumber: po.pr?.prNumber
      },
      isAcknowledged,
      acknowledgedAt: po.acknowledgedAt
    });
  } catch (error) {
    console.error('Error verifying acknowledgment token:', error);
    return NextResponse.json(
      { error: 'Failed to verify acknowledgment token' },
      { status: 500 }
    );
  }
}

