import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/services/items - Get all service items
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
        { serviceCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.serviceCategoryId = categoryId;
    }

    const [serviceItems, total] = await Promise.all([
      prisma.serviceItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          serviceCategory: true,
          _count: {
            select: {
              servicePRItems: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.serviceItem.count({ where })
    ]);

    return NextResponse.json({
      serviceItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching service items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service items' },
      { status: 500 }
    );
  }
}

// POST /api/services/items - Create new service item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      serviceCode,
      nameEn,
      nameAr,
      description,
      serviceCategoryId,
      unitOfMeasure,
      standardRate,
      currency,
      slaRequired,
      performanceMetrics
    } = body;

    if (!serviceCode || !nameEn || !nameAr || !serviceCategoryId || !unitOfMeasure) {
      return NextResponse.json(
        { error: 'Service code, names, category, and unit of measure are required' },
        { status: 400 }
      );
    }

    const newServiceItem = await prisma.serviceItem.create({
      data: {
        serviceCode,
        nameEn,
        nameAr,
        description,
        serviceCategoryId,
        unitOfMeasure,
        standardRate: standardRate ? parseFloat(standardRate) : null,
        currency: currency || 'OMR',
        slaRequired: slaRequired || false,
        performanceMetrics: performanceMetrics || null
      },
      include: {
        serviceCategory: true
      }
    });

    return NextResponse.json(newServiceItem, { status: 201 });
  } catch (error) {
    console.error('Error creating service item:', error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Service code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create service item' },
      { status: 500 }
    );
  }
}
