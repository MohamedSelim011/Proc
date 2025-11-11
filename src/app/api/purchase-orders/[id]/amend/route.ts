import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// POST /api/purchase-orders/[id]/amend - Create PO amendment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { changeType, description, newValue, approvedBy } = body;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        amendments: {
          orderBy: {
            amendmentNo: 'desc'
          },
          take: 1
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Check if PO can be amended
    if (!['APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL'].includes(order.status)) {
      return NextResponse.json(
        { error: 'PO cannot be amended in current status' },
        { status: 400 }
      );
    }

    // Get current amendment number
    const lastAmendment = order.amendments[0];
    const amendmentNo = lastAmendment ? lastAmendment.amendmentNo + 1 : 1;

    // Get old value based on change type
    let oldValue: any = {};
    let updateData: any = {};

    switch (changeType) {
      case 'DELIVERY_DATE':
        oldValue = { deliveryDate: order.deliveryDate };
        updateData = { deliveryDate: new Date(newValue.deliveryDate) };
        break;
      
      case 'DELIVERY_ADDRESS':
        oldValue = { deliveryAddress: order.deliveryAddress };
        updateData = { deliveryAddress: newValue.deliveryAddress };
        break;
      
      case 'PAYMENT_TERMS':
        oldValue = { paymentTerms: order.paymentTerms };
        updateData = { paymentTerms: newValue.paymentTerms };
        break;
      
      case 'TOTAL_AMOUNT':
        oldValue = { totalAmount: order.totalAmount };
        updateData = { totalAmount: newValue.totalAmount };
        break;
      
      case 'ITEMS':
        // For item changes, we need to handle more complex logic
        const currentItems = await prisma.pOItem.findMany({
          where: { poId: params.id },
          include: { item: true }
        });
        oldValue = { items: currentItems };
        // Item updates will be handled separately
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid change type' },
          { status: 400 }
        );
    }

    // Create amendment and update PO in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create amendment record
      const amendment = await tx.pOAmendment.create({
        data: {
          poId: params.id,
          amendmentNo,
          changeType,
          description,
          oldValue,
          newValue,
          approvedBy,
          approvedDate: approvedBy ? new Date() : null
        }
      });

      // Update PO if amendment is pre-approved
      let updatedOrder = order;
      if (approvedBy) {
        updatedOrder = await tx.purchaseOrder.update({
          where: { id: params.id },
          data: updateData,
          include: {
            vendor: true,
            items: {
              include: {
                item: true
              }
            },
            amendments: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        });

        // Handle item changes if applicable
        if (changeType === 'ITEMS' && newValue.items) {
          // Delete existing items
          await tx.pOItem.deleteMany({
            where: { poId: params.id }
          });

          // Create new items
          await tx.pOItem.createMany({
            data: newValue.items.map((item: any) => ({
              poId: params.id,
              itemId: item.itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null
            }))
          });

          // Update total amount
          const newTotalAmount = newValue.items.reduce((sum: number, item: any) => 
            sum + (item.quantity * item.unitPrice), 0
          );
          
          updatedOrder = await tx.purchaseOrder.update({
            where: { id: params.id },
            data: { totalAmount: newTotalAmount },
            include: {
              vendor: true,
              items: {
                include: {
                  item: true
                }
              },
              amendments: {
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          });
        }
      }

      return {
        amendment,
        order: updatedOrder
      };
    });

    return NextResponse.json({
      message: approvedBy 
        ? 'Amendment created and applied successfully'
        : 'Amendment created, pending approval',
      amendment: result.amendment,
      order: result.order
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating PO amendment:', error);
    return NextResponse.json(
      { error: 'Failed to create PO amendment' },
      { status: 500 }
    );
  }
}

// GET /api/purchase-orders/[id]/amend - Get PO amendments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const amendments = await prisma.pOAmendment.findMany({
      where: { poId: params.id },
      orderBy: {
        amendmentNo: 'desc'
      }
    });

    return NextResponse.json(amendments);
  } catch (error) {
    console.error('Error fetching PO amendments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PO amendments' },
      { status: 500 }
    );
  }
}
