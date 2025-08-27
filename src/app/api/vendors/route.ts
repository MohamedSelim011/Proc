import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/vendors - Get all vendors with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const categoryId = searchParams.get('categoryId') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categories = {
        some: {
          categoryId: categoryId
        }
      };
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.vendor.count({ where })
    ]);

    return NextResponse.json({
      vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST /api/vendors - Create new vendor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const vendor = await prisma.vendor.create({
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
        status: body.status || 'PENDING',
        performanceScore: body.performanceScore,
        categories: {
          create: body.categories?.map((cat: any) => ({
            categoryId: cat.categoryId,
            isPrimary: cat.isPrimary || false
          })) || []
        }
      },
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}