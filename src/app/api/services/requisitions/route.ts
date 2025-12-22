import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/services/requisitions - Get service requisitions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const departmentId = searchParams.get('departmentId') || searchParams.get('department') || '';
    const serviceType = searchParams.get('serviceType') || '';
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause - show both SERVICE and NON_STOCK itemTypes
    // (Service Requisitions page manages both service and non-stock item requisitions)
    const where: any = {
      itemType: {
        in: ['SERVICE', 'NON_STOCK']
      }
    };
    
    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    // Filter by servicePR.serviceType when serviceType filter is provided
    // The serviceType values are specific service types like "Construction", "Installation", etc.
    if (serviceType) {
      // Filter by servicePR.serviceType (e.g., "Construction", "Installation", "Fabrication", etc.)
      where.servicePR = {
        serviceType: serviceType
      };
    }

    if (search) {
      where.OR = [
        { prNumber: { contains: search, mode: 'insensitive' } },
        { departmentId: { contains: search, mode: 'insensitive' } },
        { requesterId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [prs, total] = await Promise.all([
      prisma.purchaseRequisition.findMany({
        where,
        skip,
        take: limit,
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
          },
          approvals: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.purchaseRequisition.count({ where })
    ]);

    // Get distinct service types for the filter dropdown
    const distinctServiceTypes = await prisma.servicePR.findMany({
      where: {
        serviceType: {
          not: null
        }
      },
      select: {
        serviceType: true
      },
      distinct: ['serviceType']
    });

    const serviceTypes = distinctServiceTypes
      .map(sp => sp.serviceType)
      .filter((type): type is string => type !== null)
      .sort();

    return NextResponse.json({
      serviceRequisitions: prs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      serviceTypes
    });
  } catch (error) {
    console.error('Error fetching service requisitions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service requisitions' },
      { status: 500 }
    );
  }
}

// POST /api/services/requisitions - Create service requisition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      departmentId,
      projectId,
      requesterId,
      priority,
      budgetCode,
      costCenter,
      justification,
      requestedDeliveryDate,
      serviceScope,
      serviceCategory,
      serviceType,
      requestor,
      technicalSpecifications,
      qualityStandards,
      duration,
      durationUnit,
      deliverables,
      performanceMetrics,
      slaRequirements,
      insuranceRequired,
      certificationRequired,
      safetyRequirements,
      paymentSchedule,
      paymentTerms,
      retentionPercentage,
      preferredVendors,
      milestones,
      items
    } = body;

    if (!departmentId || !requesterId || !serviceScope || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Calculate total estimated cost
    const totalEstimatedCost = items.reduce(
      (sum: number, item: any) => sum + (parseFloat(item.quantity) * parseFloat(item.estimatedRate)),
      0
    );

    // Generate PR number
    const prCount = await prisma.purchaseRequisition.count();
    const prNumber = `SPR-${String(prCount + 1).padStart(6, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create the main PR
      const pr = await tx.purchaseRequisition.create({
        data: {
          prNumber,
          requesterId,
          departmentId,
          projectId: projectId || null,
          itemType: 'SERVICE',
          priority: priority || 'NORMAL',
          estimatedCost: totalEstimatedCost,
          budgetCode,
          costCenter: costCenter || null,
          justification,
          requiredByDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null
        }
      });

      // Create the service PR
      const servicePR = await tx.servicePR.create({
        data: {
          prId: pr.id,
          serviceScope,
          serviceCategory: serviceCategory || null,
          serviceType: serviceType || null,
          requestor: requestor || null,
          technicalSpecifications: technicalSpecifications || null,
          qualityStandards: qualityStandards || null,
          duration: duration || 30,
          durationUnit: (durationUnit || 'DAYS').toUpperCase(),
          deliverables: deliverables && Array.isArray(deliverables) && deliverables.length > 0 ? deliverables : [],
          performanceMetrics: performanceMetrics && Array.isArray(performanceMetrics) && performanceMetrics.length > 0 ? performanceMetrics : null,
          slaRequirements: slaRequirements || null,
          insuranceRequired: insuranceRequired || false,
          certificationRequired: certificationRequired || false,
          safetyRequirements: safetyRequirements || null,
          paymentSchedule: paymentSchedule || 'MILESTONE',
          paymentTerms: paymentTerms || null,
          retentionPercentage: retentionPercentage ? parseFloat(retentionPercentage) : 0,
          preferredVendors: preferredVendors && Array.isArray(preferredVendors) && preferredVendors.length > 0 ? preferredVendors : null,
          milestones: milestones && Array.isArray(milestones) && milestones.length > 0 ? milestones : null
        }
      });

      // Create service PR items
      for (const item of items) {
        // Try to find existing service item by service code, or create a new one
        let serviceItem;
        
        if (item.serviceItemId && item.serviceItemId !== 'IT-001') {
          // If a specific service item ID is provided, try to find it
          serviceItem = await tx.serviceItem.findUnique({
            where: { id: item.serviceItemId }
          });
        }
        
        if (!serviceItem) {
          // Create a new service item based on the form data
          // First, find or create a service category
          let serviceCategoryRecord = await tx.serviceCategory.findFirst({
            where: { nameEn: serviceCategory || 'Custom Services' }
          });
          
          if (!serviceCategoryRecord) {
            // Check if CUSTOM already exists
            const existingCustom = await tx.serviceCategory.findFirst({
              where: { code: 'CUSTOM' }
            });
            
            if (existingCustom) {
              serviceCategoryRecord = existingCustom;
            } else {
              // Create CUSTOM category only if it doesn't exist
              serviceCategoryRecord = await tx.serviceCategory.create({
                data: {
                  code: 'CUSTOM',
                  nameEn: serviceCategory || 'Custom Services',
                  nameAr: 'خدمات مخصصة',
                  description: 'Custom service items created during requisition',
                  requiresInsurance: false,
                  requiresCertification: false,
                  requiresPerformanceBond: false
                }
              });
            }
          }
          
          // Generate a unique service code
          const serviceItemCount = await tx.serviceItem.count();
          const serviceCode = `CUSTOM-${String(serviceItemCount + 1).padStart(6, '0')}`;
          
          serviceItem = await tx.serviceItem.create({
            data: {
              serviceCode,
              nameEn: item.description || serviceType || 'Custom Service',
              nameAr: 'خدمة مخصصة',
              description: item.specifications || item.description || 'Custom service item',
              serviceCategoryId: serviceCategoryRecord.id,
              unitOfMeasure: item.unit || 'Hours',
              standardRate: parseFloat(item.estimatedRate) || 0,
              currency: 'OMR',
              slaRequired: false,
              performanceMetrics: item.performanceMetrics && Array.isArray(item.performanceMetrics) && item.performanceMetrics.length > 0 ? item.performanceMetrics : null
            }
          });
        }

        await tx.servicePRItem.create({
          data: {
            servicePRId: servicePR.id,
            serviceItemId: serviceItem.id,
            quantity: parseFloat(item.quantity),
            estimatedRate: parseFloat(item.estimatedRate),
            unit: item.unit || 'Hours',
            duration: item.duration || 1,
            durationUnit: (item.durationUnit || 'DAYS').toUpperCase(),
            specifications: item.specifications || null,
            deliverables: item.deliverables && Array.isArray(item.deliverables) && item.deliverables.length > 0 ? item.deliverables : null,
            performanceMetrics: item.performanceMetrics && Array.isArray(item.performanceMetrics) && item.performanceMetrics.length > 0 ? item.performanceMetrics : null
          }
        });
      }

      return pr;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating service requisition:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: `Failed to create service requisition: ${errorMessage}` },
      { status: 500 }
    );
  }
}
