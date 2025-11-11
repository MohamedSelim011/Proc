import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/items - Get all items with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const belowReorderPoint = searchParams.get('belowReorderPoint') === 'true';

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

    if (belowReorderPoint) {
      // This would need actual stock tracking implementation
      // For now, we'll use a placeholder condition
      where.reorderPoint = { not: null };
    }

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
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

// POST /api/items - Create new item (supports both stock and non-stock)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      itemCode,
      nameEn,
      nameAr,
      description,
      categoryId,
      unitOfMeasure,
      itemType,
      minStockLevel,
      maxStockLevel,
      reorderPoint
    } = body;

    // Validation
    if (!itemCode || !nameEn || !nameAr || !categoryId || !unitOfMeasure) {
      return NextResponse.json(
        { error: 'Item code, names, category, and unit of measure are required' },
        { status: 400 }
      );
    }

    // For non-stock items, inventory fields are not required
    const isNonStock = itemType === 'NON_STOCK';
    
    const item = await prisma.item.create({
      data: {
        itemCode,
        nameEn,
        nameAr,
        description,
        categoryId,
        unitOfMeasure,
        // Only set inventory fields for stock items
        minStockLevel: isNonStock ? null : (minStockLevel ? parseInt(minStockLevel) : null),
        maxStockLevel: isNonStock ? null : (maxStockLevel ? parseInt(maxStockLevel) : null),
        reorderPoint: isNonStock ? null : (reorderPoint ? parseInt(reorderPoint) : null)
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Item code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}