import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/non-stock-items - Get non-stock items
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';

    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Filter to get items that are commonly used as non-stock
    // or items that don't have inventory tracking fields set
    where.OR = [
      ...(where.OR || []),
      {
        AND: [
          { minStockLevel: null },
          { maxStockLevel: null },
          { reorderPoint: null }
        ]
      }
    ];

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          _count: {
            select: {
              prItems: true,
              poItems: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.item.count({ where })
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching non-stock items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch non-stock items' },
      { status: 500 }
    );
  }
}

// POST /api/non-stock-items - Create ad-hoc non-stock item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nameEn,
      nameAr,
      description,
      categoryId,
      unitOfMeasure,
      estimatedPrice,
      specifications
    } = body;

    // Validation
    if (!nameEn || !nameAr || !categoryId || !unitOfMeasure) {
      return NextResponse.json(
        { error: 'Names, category, and unit of measure are required' },
        { status: 400 }
      );
    }

    // Generate item code for ad-hoc non-stock item
    const itemCount = await prisma.item.count();
    const itemCode = `NS-${String(itemCount + 1).padStart(6, '0')}`;
    
    const item = await prisma.item.create({
      data: {
        itemCode,
        nameEn,
        nameAr,
        description: description || `${nameEn} - Ad-hoc non-stock item`,
        categoryId,
        unitOfMeasure,
        // Non-stock items don't have inventory tracking
        minStockLevel: null,
        maxStockLevel: null,
        reorderPoint: null
      },
      include: {
        category: true
      }
    });

    return NextResponse.json({
      ...item,
      estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : null,
      specifications
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating non-stock item:', error);
    
    return NextResponse.json(
      { error: 'Failed to create non-stock item' },
      { status: 500 }
    );
  }
}
