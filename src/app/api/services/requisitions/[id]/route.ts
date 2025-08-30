import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Find the purchase requisition by ID
    const purchaseRequisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        servicePR: {
          include: {
            items: {
              include: {
                serviceItem: {
                  include: {
                    serviceCategory: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!purchaseRequisition) {
      return NextResponse.json(
        { error: 'Service requisition not found' },
        { status: 404 }
      );
    }

    // Check if it's a service requisition
    if (purchaseRequisition.itemType !== 'SERVICE') {
      return NextResponse.json(
        { error: 'This is not a service requisition' },
        { status: 400 }
      );
    }

    return NextResponse.json(purchaseRequisition);
  } catch (error) {
    console.error('Error fetching service requisition:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 