import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to generate unique vendor code
async function generateUniqueVendorCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Generate 8-digit random number
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const vendorCode = `VEN-${randomNum}`;
    
    // Check if code already exists
    const existing = await prisma.vendor.findUnique({
      where: { vendorCode }
    });
    
    if (!existing) {
      return vendorCode;
    }
    
    attempts++;
  }
  
  // Fallback: use timestamp-based code if random generation fails
  const timestamp = Date.now().toString().slice(-8);
  return `VEN-${timestamp}`;
}

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
    
    // Auto-generate vendor code if not provided or empty
    let vendorCode = body.vendorCode?.trim();
    if (!vendorCode) {
      vendorCode = await generateUniqueVendorCode();
    } else {
      // Validate uniqueness if code is provided
      const existing = await prisma.vendor.findUnique({
        where: { vendorCode }
      });
      
      if (existing) {
        return NextResponse.json(
          { error: 'Vendor code already exists. Please use a different code or leave it empty for auto-generation.' },
          { status: 400 }
        );
      }
    }
    
    const vendor = await prisma.vendor.create({
      data: {
        vendorCode,
        nameEn: body.nameEn,
        nameAr: body.nameAr,
        crNumber: body.crNumber,
        taxId: body.taxId,
        vatNumber: body.vatNumber,
        primaryContactName: body.primaryContactName,
        email: body.email,
        mobile: body.mobile,
        alternativePhone: body.alternativePhone,
        website: body.website,
        address: body.address,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        iban: body.iban,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        businessType: body.businessType,
        yearEstablished: body.yearEstablished,
        numberOfEmployees: body.numberOfEmployees,
        omanizationPercentage: body.omanizationPercentage,
        status: body.status || 'PENDING',
        performanceScore: body.performanceScore ?? 0,
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
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return NextResponse.json(
        { error: `A vendor with this ${field} already exists.` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}