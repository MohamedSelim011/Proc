import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPOToVendor } from '@/lib/email-service';
import { getAppBaseUrl } from '@/lib/app-base-url';
import { randomBytes } from 'crypto';
import { notifySoul } from '@/lib/soul-notifier';


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
    const validStatuses = [
      'DRAFT',
      'SUBMITTED',
      'PENDING_APPROVAL',
      'APPROVED',
      'SENT',
      'ACKNOWLEDGED',
      'PARTIALLY_INVOICED',
      'INVOICED',
      'PAID',
      'PARTIAL',
      'COMPLETED',
      'CANCELLED',
      'REJECTED',
    ];
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
      DRAFT: ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'],
      SUBMITTED: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'],
      PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
      APPROVED: ['SENT', 'CANCELLED'],
      SENT: ['ACKNOWLEDGED', 'CANCELLED'],
      ACKNOWLEDGED: ['PARTIAL', 'PARTIALLY_INVOICED', 'INVOICED', 'COMPLETED', 'CANCELLED'],
      PARTIAL: ['PARTIALLY_INVOICED', 'INVOICED', 'COMPLETED', 'CANCELLED'],
      PARTIALLY_INVOICED: ['INVOICED', 'PAID', 'CANCELLED'],
      INVOICED: ['PAID', 'COMPLETED', 'CANCELLED'],
      PAID: ['COMPLETED'],
      COMPLETED: ['INVOICED', 'PAID'], // Allow finance flow after delivery completion
      CANCELLED: [], // Final state
      REJECTED: [], // Final state
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
        const baseUrl = getAppBaseUrl();
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

    void notifySoul('purchase_order.status_changed', {
      id: updatedOrder.id,
      poNumber: updatedOrder.poNumber,
      previousStatus: currentStatus,
      status,
      updatedBy: updatedBy || null,
      vendorId: updatedOrder.vendorId,
      vendorName: updatedOrder.vendor?.nameEn || updatedOrder.vendor?.nameAr || null,
      totalAmount: Number(updatedOrder.totalAmount || 0),
      currency: updatedOrder.currency,
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
