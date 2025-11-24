import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPOToVendor } from '@/lib/email-service';
import { randomBytes } from 'crypto';


// PUT /api/purchase-orders/[id]/status - Update PO status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, comments, updatedBy } = body;

    // Validate status
    const validStatuses = ['DRAFT', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    const currentStatus = order.status;
    const validTransitions: { [key: string]: string[] } = {
      'DRAFT': ['APPROVED', 'CANCELLED'],
      'APPROVED': ['SENT', 'CANCELLED'],
      'SENT': ['ACKNOWLEDGED', 'CANCELLED'],
      'ACKNOWLEDGED': ['PARTIAL', 'COMPLETED', 'CANCELLED'],
      'PARTIAL': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [], // Final state
      'CANCELLED': [] // Final state
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // Update PO status
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      },
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

    // If status is SENT, generate acknowledgment token and send email to vendor
    let emailSent = false;
    if (status === 'SENT' && updatedOrder.vendor) {
      try {
        // Generate unique acknowledgment token
        const acknowledgmentToken = randomBytes(32).toString('hex');
        
        // Save token to PO
        await prisma.purchaseOrder.update({
          where: { id },
          data: { acknowledgmentToken }
        });
        
        // Create acknowledgment link
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3001';
        const acknowledgmentLink = `${baseUrl}/po/acknowledge/${id}/${acknowledgmentToken}`;
        
        emailSent = await sendPOToVendor({
          poId: id,
          poNumber: updatedOrder.poNumber,
          vendorEmail: updatedOrder.vendor.email,
          vendorName: updatedOrder.vendor.nameEn || updatedOrder.vendor.nameAr || 'Vendor',
          orderDate: updatedOrder.orderDate,
          deliveryDate: updatedOrder.deliveryDate,
          totalAmount: Number(updatedOrder.totalAmount),
          currency: updatedOrder.currency,
          paymentTerms: updatedOrder.paymentTerms || 'Standard',
          deliveryAddress: updatedOrder.deliveryAddress || 'Not specified',
          items: updatedOrder.items.map(item => ({
            itemCode: item.item.itemCode,
            name: item.item.nameEn || item.item.nameAr || 'Item',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            deliveryDate: item.deliveryDate || undefined,
          })),
          prNumber: updatedOrder.pr?.prNumber,
          notes: comments || undefined,
          acknowledgmentLink,
        });
      } catch (emailError) {
        console.error('Error sending PO email:', emailError);
        // Don't fail the status update if email fails
      }
    }

    // Create process audit entry for status change
    await prisma.processAudit.create({
      data: {
        processType: 'PO_STATUS_UPDATE',
        documentId: id,
        documentType: 'PO',
        action: `STATUS_CHANGED_TO_${status}`,
        performedBy: updatedBy || 'SYSTEM',
        details: {
          poNumber: order.poNumber,
          previousStatus: currentStatus,
          newStatus: status,
          comments: comments || null,
          emailSent: status === 'SENT' ? emailSent : undefined,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      ...updatedOrder,
      statusChange: {
        from: currentStatus,
        to: status,
        timestamp: new Date(),
        updatedBy: updatedBy || 'system',
        comments
      },
      emailSent: status === 'SENT' ? emailSent : undefined
    });
  } catch (error) {
    console.error('Error updating PO status:', error);
    return NextResponse.json(
      { error: 'Failed to update PO status' },
      { status: 500 }
    );
  }
}
