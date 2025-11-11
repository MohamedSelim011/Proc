import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/categories - Get all categories with hierarchy
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeChildren = searchParams.get('includeChildren') === 'true';
    const parentOnly = searchParams.get('parentOnly') === 'true';

    const where: any = {};
    
    if (parentOnly) {
      where.parentId = null;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: includeChildren ? {
          include: {
            children: true
          }
        } : false,
        _count: {
          select: {
            items: true,
            vendors: true
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const category = await prisma.category.create({
      data: {
        code: body.code,
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        description: body.description,
        parentId: body.parentId
      },
      include: {
        parent: true
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}