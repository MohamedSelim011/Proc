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

    // Create sample Service PR and Contract
    const existingPR = await prisma.purchaseRequisition.findFirst({
      where: { itemType: 'SERVICE' }
    });

    if (existingPR) {
      // Create ServicePR for existing SERVICE PR
      const servicePR = await prisma.servicePR.upsert({
        where: { prId: existingPR.id },
        update: {},
        create: {
          prId: existingPR.id,
          serviceScope: 'Comprehensive IT system integration and software development services for digital transformation initiative',
          technicalSpecifications: 'Modern web technologies, cloud-native architecture, microservices design, API-first approach',
          duration: 180,
          durationUnit: 'DAYS',
          deliverables: [
            'System architecture documentation',
            'API specifications and documentation',
            'Source code and deployment scripts',
            'User training materials',
            'Technical support documentation'
          ],
          performanceMetrics: {
            codeQuality: 'Minimum 95% test coverage',
            performance: 'Page load time < 3 seconds',
            availability: '99.9% uptime SLA',
            security: 'OWASP compliance'
          },
          slaRequirements: {
            responseTime: '4 hours for critical issues',
            resolutionTime: '24 hours for critical issues',
            availability: '99.9% system uptime',
            support: '8x5 business hours support'
          },
          insuranceRequired: true,
          certificationRequired: true,
          safetyRequirements: 'ISO 27001 compliance for data security',
          paymentSchedule: 'MILESTONE',
          retentionPercentage: 10
        }
      });

      // Create ServicePRItems
      await prisma.servicePRItem.upsert({
        where: { id: 'service-pr-item-1' },
        update: {},
        create: {
          id: 'service-pr-item-1',
          servicePRId: servicePR.id,
          serviceItemId: serviceItems[2].id, // Software Development
          quantity: 800,
          estimatedRate: 80,
          duration: 120,
          durationUnit: 'DAYS',
          specifications: 'Full-stack web application development using React, Node.js, and PostgreSQL',
          deliverables: [
            'Frontend application',
            'Backend API services',
            'Database schema and migrations',
            'Deployment documentation'
          ],
          performanceMetrics: {
            codeQuality: '95% test coverage',
            performance: 'API response time < 500ms',
            security: 'Zero critical vulnerabilities'
          }
        }
      });

      await prisma.servicePRItem.upsert({
        where: { id: 'service-pr-item-2' },
        update: {},
        create: {
          id: 'service-pr-item-2',
          servicePRId: servicePR.id,
          serviceItemId: serviceItems[3].id, // System Integration
          quantity: 200,
          estimatedRate: 120,
          duration: 60,
          durationUnit: 'DAYS',
          specifications: 'Integration with existing ERP and CRM systems via REST APIs',
          deliverables: [
            'Integration architecture',
            'API connectors',
            'Data mapping documentation',
            'Testing and validation reports'
          ],
          performanceMetrics: {
            dataAccuracy: '100% data integrity',
            performance: 'Sync time < 5 minutes',
            reliability: '99.9% integration uptime'
          }
        }
      });

      console.log('✅ Service PR and items created');

      // Create a sample Service Contract
      const vendor = await prisma.vendor.findFirst();
      if (vendor) {
        const serviceContract = await prisma.serviceContract.upsert({
          where: { contractNumber: 'SC-000001' },
          update: {},
          create: {
            contractNumber: 'SC-000001',
            prId: existingPR.id,
            vendorId: vendor.id,
            contractType: 'SERVICE_AGREEMENT',
            startDate: new Date(),
            endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
            totalValue: 88000, // 800*80 + 200*120
            currency: 'OMR',
            paymentTerms: 'Milestone-based payments with 10% retention',
            slaTerms: {
              responseTime: '4 hours for critical issues',
              resolutionTime: '24 hours for critical issues',
              availability: '99.9% system uptime',
              support: '8x5 business hours support'
            },
            penaltyClause: '0.5% of milestone value per day for delays beyond 7 days',
            performanceBond: 8800, // 10% of contract value
            retentionAmount: 8800, // 10% retention
            insuranceRequirements: {
              professionalIndemnity: '1,000,000 OMR',
              publicLiability: '500,000 OMR',
              cyberLiability: '250,000 OMR'
            },
            status: 'SIGNED'
          }
        });

        // Create Service Milestones
        const milestones = [
          {
            name: 'Project Initiation & Planning',
            description: 'Project kickoff, requirements analysis, and detailed planning',
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            completionCriteria: 'Approved project plan, technical specifications, and resource allocation',
            paymentPercentage: 20,
            amount: 17600
          },
          {
            name: 'Development Phase 1',
            description: 'Core system development and basic integrations',
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            completionCriteria: 'Working prototype with core functionality and initial integrations',
            paymentPercentage: 30,
            amount: 26400
          },
          {
            name: 'Development Phase 2',
            description: 'Advanced features and complete system integration',
            targetDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
            completionCriteria: 'Full system functionality with all integrations completed',
            paymentPercentage: 30,
            amount: 26400
          },
          {
            name: 'Testing & Deployment',
            description: 'System testing, user acceptance testing, and production deployment',
            targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            completionCriteria: 'Successfully deployed system with user acceptance sign-off',
            paymentPercentage: 20,
            amount: 17600
          }
        ];

        for (let i = 0; i < milestones.length; i++) {
          const milestone = milestones[i];
          await prisma.serviceMilestone.upsert({
            where: { id: `milestone-${i + 1}` },
            update: {},
            create: {
              id: `milestone-${i + 1}`,
              contractId: serviceContract.id,
              milestoneNumber: i + 1,
              name: milestone.name,
              description: milestone.description,
              targetDate: milestone.targetDate,
              completionCriteria: milestone.completionCriteria,
              paymentPercentage: milestone.paymentPercentage,
              amount: milestone.amount,
              status: i === 0 ? 'COMPLETED' : 'PENDING'
            }
          });
        }

        console.log('✅ Service contract and milestones created');

        // Create a sample Service Receipt Note (SRN)
        const firstMilestone = await prisma.serviceMilestone.findFirst({
          where: { contractId: serviceContract.id }
        });

        if (firstMilestone) {
          await prisma.serviceReceipt.upsert({
            where: { srnNumber: 'SRN-000001' },
            update: {},
            create: {
              srnNumber: 'SRN-000001',
              contractId: serviceContract.id,
              milestoneId: firstMilestone.id,
              serviceDescription: 'Project initiation phase completed successfully with all deliverables met',
              deliverables: [
                'Project charter and scope document',
                'Technical architecture specification',
                'Resource allocation plan',
                'Risk assessment and mitigation plan',
                'Communication and governance framework'
              ],
              qualityRating: 4.5,
              performanceRating: 4.8,
              completionPercentage: 100,
              acceptanceStatus: 'ACCEPTED',
              acceptedBy: 'Project Manager',
              acceptedAt: new Date(),
              notes: 'Excellent work quality and timely delivery. All requirements met satisfactorily.',
              attachments: [
                'project_charter.pdf',
                'technical_specs.pdf',
                'resource_plan.xlsx'
              ],
              createdBy: 'Project Manager'
            }
          });

          console.log('✅ Service receipt note created');
        }
      }
    }

    console.log('🎉 Service data seeding completed successfully!');
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
