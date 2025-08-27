import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/services/categories - Get all service categories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';

    const where: any = {};
    
    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const categories = await prisma.serviceCategory.findMany({
      where,
      include: {
        serviceItems: {
          select: {
            id: true,
            serviceCode: true,
            nameEn: true
          }
        },
        _count: {
          select: {
            serviceItems: true
          }
        }
      },
      orderBy: {
        nameEn: 'asc'
      }
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching service categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service categories' },
      { status: 500 }
    );
  }
}

// POST /api/services/categories - Create new service category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      nameEn,
      nameAr,
      description,
      requiresInsurance,
      requiresCertification,
      requiresPerformanceBond
    } = body;

    if (!code || !nameEn || !nameAr) {
      return NextResponse.json(
        { error: 'Code, English name, and Arabic name are required' },
        { status: 400 }
      );
    }

    const newCategory = await prisma.serviceCategory.create({
      data: {
        code,
        nameEn,
        nameAr,
        description,
        requiresInsurance: requiresInsurance || false,
        requiresCertification: requiresCertification || false,
        requiresPerformanceBond: requiresPerformanceBond || false
      }
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating service category:', error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Service category code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create service category' },
      { status: 500 }
    );
  }
}
