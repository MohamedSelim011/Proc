import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedServiceData() {
  console.log('🌱 Seeding service data...');

  try {
    // Create Service Categories
    const serviceCategories = await Promise.all([
      prisma.serviceCategory.upsert({
        where: { code: 'PROF_SERV' },
        update: {},
        create: {
          code: 'PROF_SERV',
          nameEn: 'Professional Services',
          nameAr: 'الخدمات المهنية',
          description: 'Consulting, advisory, and professional services',
          requiresInsurance: true,
          requiresCertification: true,
          requiresPerformanceBond: false
        }
      }),
      prisma.serviceCategory.upsert({
        where: { code: 'IT_SERV' },
        update: {},
        create: {
          code: 'IT_SERV',
          nameEn: 'IT Services',
          nameAr: 'خدمات تقنية المعلومات',
          description: 'Software development, system integration, IT support',
          requiresInsurance: true,
          requiresCertification: true,
          requiresPerformanceBond: true
        }
      }),
      prisma.serviceCategory.upsert({
        where: { code: 'MAINT_SERV' },
        update: {},
        create: {
          code: 'MAINT_SERV',
          nameEn: 'Maintenance Services',
          nameAr: 'خدمات الصيانة',
          description: 'Equipment maintenance, facility management',
          requiresInsurance: true,
          requiresCertification: false,
          requiresPerformanceBond: false
        }
      }),
      prisma.serviceCategory.upsert({
        where: { code: 'TRAINING' },
        update: {},
        create: {
          code: 'TRAINING',
          nameEn: 'Training Services',
          nameAr: 'خدمات التدريب',
          description: 'Employee training, skill development, certification programs',
          requiresInsurance: false,
          requiresCertification: true,
          requiresPerformanceBond: false
        }
      }),
      prisma.serviceCategory.upsert({
        where: { code: 'SECURITY' },
        update: {},
        create: {
          code: 'SECURITY',
          nameEn: 'Security Services',
          nameAr: 'خدمات الأمن',
          description: 'Security guards, surveillance, access control',
          requiresInsurance: true,
          requiresCertification: true,
          requiresPerformanceBond: true
        }
      })
    ]);

    console.log('✅ Service categories created');

    // Create Service Items
    const serviceItems = await Promise.all([
      // Professional Services
      prisma.serviceItem.upsert({
        where: { serviceCode: 'CONS-001' },
        update: {},
        create: {
          serviceCode: 'CONS-001',
          nameEn: 'Management Consulting',
          nameAr: 'استشارات إدارية',
          description: 'Strategic planning and management consulting services',
          serviceCategoryId: serviceCategories[0].id,
          unitOfMeasure: 'Hours',
          standardRate: 150,
          currency: 'OMR',
          slaRequired: true,
          performanceMetrics: {
            deliveryTime: '95% on-time delivery',
            qualityScore: 'Minimum 4.0/5.0',
            clientSatisfaction: 'Minimum 90%'
          }
        }
      }),
      prisma.serviceItem.upsert({
        where: { serviceCode: 'CONS-002' },
        update: {},
        create: {
          serviceCode: 'CONS-002',
          nameEn: 'Financial Advisory',
          nameAr: 'استشارات مالية',
          description: 'Financial planning and advisory services',
          serviceCategoryId: serviceCategories[0].id,
          unitOfMeasure: 'Hours',
          standardRate: 200,
          currency: 'OMR',
          slaRequired: true,
          performanceMetrics: {
            deliveryTime: '100% on-time delivery',
            qualityScore: 'Minimum 4.5/5.0',
            compliance: '100% regulatory compliance'
          }
        }
      }),

      // IT Services
      prisma.serviceItem.upsert({
        where: { serviceCode: 'IT-001' },
        update: {},
        create: {
          serviceCode: 'IT-001',
          nameEn: 'Software Development',
          nameAr: 'تطوير البرمجيات',
          description: 'Custom software development and programming services',
          serviceCategoryId: serviceCategories[1].id,
          unitOfMeasure: 'Hours',
          standardRate: 80,
          currency: 'OMR',
          slaRequired: true,
          performanceMetrics: {
            codeQuality: 'Minimum 95% test coverage',
            bugRate: 'Maximum 2 bugs per 1000 lines',
            deliveryTime: '95% milestone adherence'
          }
        }
      }),
      prisma.serviceItem.upsert({
        where: { serviceCode: 'IT-002' },
        update: {},
        create: {
          serviceCode: 'IT-002',
          nameEn: 'System Integration',
          nameAr: 'تكامل الأنظمة',
          description: 'Enterprise system integration and API development',
          serviceCategoryId: serviceCategories[1].id,
          unitOfMeasure: 'Hours',
          standardRate: 120,
          currency: 'OMR',
          slaRequired: true,
          performanceMetrics: {
            uptime: '99.9% system availability',
            performance: 'Response time < 2 seconds',
            integration: '100% data accuracy'
          }
        }
      }),

      // Maintenance Services
      prisma.serviceItem.upsert({
        where: { serviceCode: 'MAINT-001' },
        update: {},
        create: {
          serviceCode: 'MAINT-001',
          nameEn: 'HVAC Maintenance',
          nameAr: 'صيانة أنظمة التكييف',
          description: 'Heating, ventilation, and air conditioning maintenance',
          serviceCategoryId: serviceCategories[2].id,
          unitOfMeasure: 'Monthly',
          standardRate: 2500,
          currency: 'OMR',
          slaRequired: true,
          performanceMetrics: {
            responseTime: '4 hours for emergency calls',
            uptime: '98% equipment availability',
            energyEfficiency: '5% improvement annually'
          }
        }
      }),

      // Training Services
      prisma.serviceItem.upsert({
        where: { serviceCode: 'TRAIN-001' },
        update: {},
        create: {
          serviceCode: 'TRAIN-001',
          nameEn: 'Leadership Training',
          nameAr: 'تدريب القيادة',
          description: 'Executive and management leadership development programs',
          serviceCategoryId: serviceCategories[3].id,
          unitOfMeasure: 'Days',
          standardRate: 1200,
          currency: 'OMR',
          slaRequired: false,
          performanceMetrics: {
            satisfaction: 'Minimum 4.5/5.0 participant rating',
            completion: '95% completion rate',
            assessment: '80% pass rate on assessments'
          }
        }
      }),

      // Security Services
      prisma.serviceItem.upsert({
        where: { serviceCode: 'SEC-001' },
        update: {},
        create: {
          serviceCode: 'SEC-001',
          nameEn: 'Security Guard Services',
          nameAr: 'خدمات الحراسة الأمنية',
          description: '24/7 security guard services for facilities',
          serviceCategoryId: serviceCategories[4].id,
          unitOfMeasure: 'Monthly',
          standardRate: 1800,
          currency: 'OMR',
          slaRequired: true,
          performanceMetrics: {
            coverage: '100% shift coverage',
            incidents: 'Zero security breaches',
            response: '2 minutes incident response time'
          }
        }
      })
    ]);

    console.log('✅ Service items created');

    // Sample service request/contract demo seeding intentionally removed.

    console.log('Service data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding service data:', error);
    throw error;
  }
}

// Run the seed function
seedServiceData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

