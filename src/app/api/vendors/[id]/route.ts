import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/vendors/[id] - Get single vendor by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: {
        id: params.id
      },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        _count: {
          select: {
            purchaseOrders: true,
            invoices: true,
            evaluations: true
          }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

// PUT /api/vendors/[id] - Update vendor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const vendor = await prisma.vendor.update({
      where: {
        id: params.id
      },
      data: {
        vendorCode: body.vendorCode,
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        crNumber: body.crNumber,
        taxId: body.taxId,
        vatNumber: body.vatNumber,
        primaryContactName: body.primaryContactName,
        email: body.email,
        mobile: body.mobile,
        address: body.address,
        businessType: body.businessType,
        yearEstablished: body.yearEstablished,
        numberOfEmployees: body.numberOfEmployees,
        omanizationPercentage: body.omanizationPercentage,
        status: body.status,
        performanceScore: body.performanceScore
      },
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

// DELETE /api/vendors/[id] - Delete vendor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.vendor.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
