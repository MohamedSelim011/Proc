import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/vendors/[id] - Get vendor by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        documents: {
          orderBy: {
            uploadedAt: 'desc'
          }
        },
        evaluations: {
          orderBy: {
            evaluationDate: 'desc'
          }
        },
        purchaseOrders: {
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        },
        invoices: {
          take: 5,
          orderBy: {
            createdAt: 'desc'
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
    
    // Update vendor and categories in a transaction
    const vendor = await prisma.$transaction(async (tx) => {
      // Update vendor
      const updatedVendor = await tx.vendor.update({
        where: { id: params.id },
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
          performanceScore: body.performanceScore,
        }
      });

      // Update categories if provided
      if (body.categories) {
        // Delete existing categories
        await tx.vendorCategory.deleteMany({
          where: { vendorId: params.id }
        });

        // Create new categories
        await tx.vendorCategory.createMany({
          data: body.categories.map((cat: any) => ({
            vendorId: params.id,
            categoryId: cat.categoryId,
            isPrimary: cat.isPrimary || false
          }))
        });
      }

      // Return updated vendor with relations
      return await tx.vendor.findUnique({
        where: { id: params.id },
        include: {
          categories: {
            include: {
              category: true
            }
          }
        }
      });
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
    // Check if vendor has related records
    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            invoices: true
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

    if (vendor._count.purchaseOrders > 0 || vendor._count.invoices > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with existing orders or invoices' },
        { status: 400 }
      );
    }

    // Delete vendor and related records
    await prisma.$transaction([
      prisma.vendorCategory.deleteMany({ where: { vendorId: params.id } }),
      prisma.vendorDocument.deleteMany({ where: { vendorId: params.id } }),
      prisma.vendorEvaluation.deleteMany({ where: { vendorId: params.id } }),
      prisma.vendor.delete({ where: { id: params.id } })
    ]);

    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}