import { PrismaClient, UserRole, VendorStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed with Omani data...')

  // ===========================================
  // SEED USERS (Authentication System)
  // ===========================================
  console.log('\n📧 Seeding users...')

  // Create default admin user
  const adminEmail = 'admin@wujha.com'
  const defaultPassword = 'password123' // Must be changed on first login

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log('✅ Admin user already exists:', adminEmail)
  } else {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Administrator',
        employeeId: 'ADMIN-001',
        department: 'IT',
        role: UserRole.ADMIN,
        isActive: true,
        mustChangePassword: true,
      },
    })
    console.log('✅ Created admin user:', admin.email)
  }

  // Create sample users for testing
  const testUsers = [
    {
      email: 'requester@wujha.com',
      name: 'John Requestor',
      employeeId: 'EMP-001',
      department: 'Operations',
      role: UserRole.REQUESTOR,
      password: 'password123',
    },
    {
      email: 'manager@wujha.com',
      name: 'Sarah Manager',
      employeeId: 'MGR-001',
      department: 'Operations',
      role: UserRole.DEPARTMENT_MANAGER,
      password: 'password123',
      approvalLimit: 5000,
    },
    {
      email: 'buyer@wujha.com',
      name: 'Ahmed Buyer',
      employeeId: 'BUY-001',
      department: 'Procurement',
      role: UserRole.PROCUREMENT_OFFICER,
      password: 'password123',
    },
    {
      email: 'procmgr@wujha.com',
      name: 'Ali Procurement',
      employeeId: 'PMG-001',
      department: 'Procurement',
      role: UserRole.PROCUREMENT_MANAGER,
      password: 'password123',
      approvalLimit: 50000,
    },
    {
      email: 'finance@wujha.com',
      name: 'Fatima Finance',
      employeeId: 'FIN-001',
      department: 'Finance',
      role: UserRole.FINANCE_MANAGER,
      password: 'password123',
      approvalLimit: 1000000,
    },
  ]

  for (const userData of testUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (!existing) {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          employeeId: userData.employeeId,
          department: userData.department,
          role: userData.role,
          approvalLimit: userData.approvalLimit || 0,
          isActive: true,
          mustChangePassword: true,
        },
      })
      console.log(`✅ Created user: ${userData.email} (${userData.role})`)
    }
  }

  console.log('\n✅ User seeding completed!\n')

  // ===========================================
  // SEED MASTER DATA (Categories, Vendors, etc)
  // ===========================================
  console.log('📦 Seeding master data...\n')

  // Create categories (using upsert to handle existing records)
  const categoryData = [
    {
      code: 'CONST-001',
      nameEn: 'Construction Materials',
      nameAr: 'مواد البناء',
      description: 'Building and construction materials',
    },
    {
      code: 'IT-001',
      nameEn: 'Information Technology',
      nameAr: 'تقنية المعلومات',
      description: 'IT equipment and software',
    },
    {
      code: 'OFF-001',
      nameEn: 'Office Supplies',
      nameAr: 'مستلزمات المكاتب',
      description: 'General office supplies and stationery',
    },
    {
      code: 'MED-001',
      nameEn: 'Medical Supplies',
      nameAr: 'المستلزمات الطبية',
      description: 'Medical equipment and supplies',
    },
    {
      code: 'OIL-001',
      nameEn: 'Oil & Gas Equipment',
      nameAr: 'معدات النفط والغاز',
      description: 'Oil and gas industry equipment',
    },
  ]

  const categories = await Promise.all(
    categoryData.map((data) =>
      prisma.category.upsert({
        where: { code: data.code },
        update: {},
        create: data,
      })
    )
  )

  // Create subcategories (using upsert to handle existing records)
  const subcategoryData = [
    {
      code: 'CONST-002',
      nameEn: 'Cement & Concrete',
      nameAr: 'الأسمنت والخرسانة',
      description: 'Cement and concrete products',
      parentId: categories[0].id,
    },
    {
      code: 'IT-002',
      nameEn: 'Computers & Laptops',
      nameAr: 'أجهزة الكمبيوتر',
      description: 'Desktop and laptop computers',
      parentId: categories[1].id,
    },
  ]

  const subcategories = await Promise.all(
    subcategoryData.map((data) =>
      prisma.category.upsert({
        where: { code: data.code },
        update: { parentId: data.parentId },
        create: data,
      })
    )
  )

  // Create vendors with Omani data (using upsert to handle existing records)
  const vendorData = [
    {
      vendorCode: 'VEN-001',
      nameEn: 'Al Turki Trading LLC',
      nameAr: 'شركة التركي للتجارة',
      crNumber: 'CR1234567',
      taxId: 'OM1234567890',
      vatNumber: 'OM1234567890123',
      primaryContactName: 'Mohammed Al Turki',
      email: 'info@alturkitrading.om',
      mobile: '+968 9123 4567',
      address: {
        street: 'Al Khuwair Street',
        building: 'Building 45',
        city: 'Muscat',
        governorate: 'Muscat',
        postalCode: '112',
        country: 'Oman'
      },
      businessType: 'Limited Liability Company',
      yearEstablished: 2005,
      numberOfEmployees: 150,
      omanizationPercentage: 75.5,
      status: VendorStatus.ACTIVE,
      performanceScore: 4.5,
    },
    {
      vendorCode: 'VEN-002',
      nameEn: 'Bahwan Engineering Company',
      nameAr: 'شركة بهوان للهندسة',
      crNumber: 'CR2345678',
      taxId: 'OM2345678901',
      vatNumber: 'OM2345678901234',
      primaryContactName: 'Ahmed Al Bahwani',
      email: 'procurement@bahwaneng.om',
      mobile: '+968 9234 5678',
      address: {
        street: 'Sultan Qaboos Street',
        building: 'Bahwan Tower',
        city: 'Muscat',
        governorate: 'Muscat',
        postalCode: '133',
        country: 'Oman'
      },
      businessType: 'SAOG',
      yearEstablished: 1998,
      numberOfEmployees: 500,
      omanizationPercentage: 82.0,
      status: VendorStatus.ACTIVE,
      performanceScore: 4.8,
    },
    {
      vendorCode: 'VEN-003',
      nameEn: 'Al Hashar Group',
      nameAr: 'مجموعة الحشار',
      crNumber: 'CR3456789',
      taxId: 'OM3456789012',
      vatNumber: 'OM3456789012345',
      primaryContactName: 'Khalid Al Hashar',
      email: 'sales@alhashar.om',
      mobile: '+968 9345 6789',
      address: {
        street: 'Al Ghubra Street',
        building: 'Al Hashar Building',
        city: 'Muscat',
        governorate: 'Muscat',
        postalCode: '130',
        country: 'Oman'
      },
      businessType: 'Group of Companies',
      yearEstablished: 1984,
      numberOfEmployees: 1200,
      omanizationPercentage: 90.0,
      status: VendorStatus.ACTIVE,
      performanceScore: 4.7,
    },
    {
      vendorCode: 'VEN-004',
      nameEn: 'Zubair Corporation',
      nameAr: 'مؤسسة الزبير',
      crNumber: 'CR4567890',
      taxId: 'OM4567890123',
      vatNumber: null,
      primaryContactName: 'Sultan Al Zubair',
      email: 'info@zubaircorp.om',
      mobile: '+968 9456 7890',
      address: {
        street: 'Al Wadi Street',
        building: 'Zubair Plaza',
        city: 'Muscat',
        governorate: 'Muscat',
        postalCode: '114',
        country: 'Oman'
      },
      businessType: 'Corporation',
      yearEstablished: 1967,
      numberOfEmployees: 3000,
      omanizationPercentage: 95.0,
      status: VendorStatus.ACTIVE,
      performanceScore: 4.9,
    },
    {
      vendorCode: 'VEN-005',
      nameEn: 'Al Raisi Trading',
      nameAr: 'تجارة الرئيسي',
      crNumber: 'CR5678901',
      taxId: 'OM5678901234',
      vatNumber: 'OM5678901234567',
      primaryContactName: 'Hamood Al Raisi',
      email: 'hamood@alraisitrading.om',
      mobile: '+968 9567 8901',
      address: {
        street: 'Ruwi High Street',
        building: 'Al Raisi Complex',
        city: 'Ruwi',
        governorate: 'Muscat',
        postalCode: '112',
        country: 'Oman'
      },
      businessType: 'Trading',
      yearEstablished: 2010,
      numberOfEmployees: 75,
      omanizationPercentage: 70.0,
      status: VendorStatus.ACTIVE,
      performanceScore: 4.2,
    },
  ]

  const vendors = await Promise.all(
    vendorData.map((data) =>
      prisma.vendor.upsert({
        where: { vendorCode: data.vendorCode },
        update: {},
        create: data,
      })
    )
  )

  // Link vendors to categories (using upsert to handle existing records)
  const vendorCategoryData = [
    { vendorId: vendors[0].id, categoryId: categories[0].id, isPrimary: true }, // Construction
    { vendorId: vendors[1].id, categoryId: categories[4].id, isPrimary: true }, // Oil & Gas
    { vendorId: vendors[2].id, categoryId: categories[0].id, isPrimary: true }, // Construction
    { vendorId: vendors[3].id, categoryId: categories[1].id, isPrimary: true }, // IT
    { vendorId: vendors[3].id, categoryId: categories[2].id, isPrimary: false }, // Office Supplies
    { vendorId: vendors[4].id, categoryId: categories[2].id, isPrimary: true }, // Office Supplies
  ]

  await Promise.all(
    vendorCategoryData.map((data) =>
      prisma.vendorCategory.upsert({
        where: {
          vendorId_categoryId: {
            vendorId: data.vendorId,
            categoryId: data.categoryId,
          },
        },
        update: { isPrimary: data.isPrimary },
        create: data,
      })
    )
  )

  // Create items with Omani context (using upsert to handle existing records)
  const itemData = [
    {
      itemCode: 'ITM-001',
      nameEn: 'Portland Cement',
      nameAr: 'أسمنت بورتلاند',
      description: 'High quality Portland cement for construction',
      categoryId: subcategories[0].id,
      unitOfMeasure: 'Bag (50kg)',
      minStockLevel: 100,
      maxStockLevel: 1000,
      reorderPoint: 200,
    },
    {
      itemCode: 'ITM-002',
      nameEn: 'Steel Reinforcement Bars',
      nameAr: 'قضبان حديد التسليح',
      description: 'Grade 60 steel reinforcement bars',
      categoryId: categories[0].id,
      unitOfMeasure: 'Ton',
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderPoint: 20,
    },
    {
      itemCode: 'ITM-003',
      nameEn: 'Business Laptop',
      nameAr: 'حاسوب محمول للأعمال',
      description: 'High-performance laptop for business use',
      categoryId: subcategories[1].id,
      unitOfMeasure: 'Unit',
      minStockLevel: 5,
      maxStockLevel: 50,
      reorderPoint: 10,
    },
    {
      itemCode: 'ITM-004',
      nameEn: 'A4 Copy Paper',
      nameAr: 'ورق نسخ A4',
      description: 'White A4 copy paper, 80gsm',
      categoryId: categories[2].id,
      unitOfMeasure: 'Ream',
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 100,
    },
    {
      itemCode: 'ITM-005',
      nameEn: 'Safety Helmets',
      nameAr: 'خوذات السلامة',
      description: 'Industrial safety helmets',
      categoryId: categories[0].id,
      unitOfMeasure: 'Unit',
      minStockLevel: 20,
      maxStockLevel: 200,
      reorderPoint: 40,
    },
    {
      itemCode: 'ITM-006',
      nameEn: 'Pipeline Valve',
      nameAr: 'صمام خط الأنابيب',
      description: 'Industrial pipeline valve for oil & gas',
      categoryId: categories[4].id,
      unitOfMeasure: 'Unit',
      minStockLevel: 5,
      maxStockLevel: 30,
      reorderPoint: 10,
    },
  ]

  const items = await Promise.all(
    itemData.map((data) =>
      prisma.item.upsert({
        where: { itemCode: data.itemCode },
        update: {},
        create: data,
      })
    )
  )

  // Create Purchase Requisitions (check if they exist first)
  const pr1 = await prisma.purchaseRequisition.findUnique({
    where: { prNumber: 'PR-2024-001' },
  })
  const pr2 = await prisma.purchaseRequisition.findUnique({
    where: { prNumber: 'PR-2024-002' },
  })

  const purchaseRequisitions = await Promise.all([
    pr1
      ? pr1
      : prisma.purchaseRequisition.create({
          data: {
            prNumber: 'PR-2024-001',
            requesterId: 'emp001',
            departmentId: 'dept001',
            itemType: 'STOCK',
            priority: 'HIGH',
            status: 'APPROVED',
            estimatedCost: 15000.00,
            budgetCode: 'CONST-2024-Q1',
            justification: 'Urgent requirement for ongoing construction project in Sohar',
            items: {
              create: [
                {
                  itemId: items[0].id,
                  quantity: 200,
                  estimatedPrice: 3.5,
                  specifications: 'Grade 53 Portland Cement',
                  requiredDate: new Date('2024-03-15'),
                },
                {
                  itemId: items[1].id,
                  quantity: 10,
                  estimatedPrice: 450.0,
                  specifications: '12mm diameter bars',
                  requiredDate: new Date('2024-03-15'),
                },
              ],
            },
          },
        }),
    pr2
      ? pr2
      : prisma.purchaseRequisition.create({
          data: {
            prNumber: 'PR-2024-002',
            requesterId: 'emp002',
            departmentId: 'dept002',
            itemType: 'NON_STOCK',
            priority: 'NORMAL',
            status: 'SUBMITTED',
            estimatedCost: 5000.00,
            budgetCode: 'IT-2024-Q1',
            justification: 'New employee onboarding - IT equipment',
            items: {
              create: [
                {
                  itemId: items[2].id,
                  quantity: 3,
                  estimatedPrice: 1500.0,
                  specifications: 'Core i7, 16GB RAM, 512GB SSD',
                  requiredDate: new Date('2024-03-20'),
                },
              ],
            },
          },
        }),
  ])

  // Create RFQs (check if they exist first)
  let rfq1 = await prisma.rFQ.findUnique({
    where: { rfqNumber: 'RFQ-2024-001' },
  })

  if (!rfq1) {
    rfq1 = await prisma.rFQ.create({
      data: {
        rfqNumber: 'RFQ-2024-001',
        pr: {
          connect: {
            id: purchaseRequisitions[0].id
          }
        },
        title: 'Construction Materials Supply - Sohar Project',
        description: 'Request for quotation for cement and steel bars for Sohar construction project',
        closingDate: new Date('2024-03-10'),
        status: 'PUBLISHED',
      },
    })
  }

  const rfqs = [rfq1]

  // Create RFQ Responses (check if they exist first)
  const existingRFQResponse1 = await prisma.rFQResponse.findFirst({
    where: {
      rfqId: rfqs[0].id,
      vendorId: vendors[0].id,
    },
  })
  const existingRFQResponse2 = await prisma.rFQResponse.findFirst({
    where: {
      rfqId: rfqs[0].id,
      vendorId: vendors[2].id,
    },
  })

  if (!existingRFQResponse1) {
    await prisma.rFQResponse.create({
      data: {
        rfqId: rfqs[0].id,
        vendorId: vendors[0].id,
        totalAmount: 14500.00,
        validUntil: new Date('2024-04-10'),
        status: 'SUBMITTED',
        technicalScore: 85,
        commercialScore: 90,
      },
    })
  }
  if (!existingRFQResponse2) {
    await prisma.rFQResponse.create({
      data: {
        rfqId: rfqs[0].id,
        vendorId: vendors[2].id,
        totalAmount: 14800.00,
        validUntil: new Date('2024-04-10'),
        status: 'SUBMITTED',
        technicalScore: 88,
        commercialScore: 85,
      },
    })
  }

  // Create Purchase Orders (check if they exist first)
  const po1 = await prisma.purchaseOrder.findUnique({
    where: { poNumber: 'PO-2024-001' },
  })
  const po2 = await prisma.purchaseOrder.findUnique({
    where: { poNumber: 'PO-2024-002' },
  })

  const purchaseOrders = await Promise.all([
    po1
      ? po1
      : prisma.purchaseOrder.create({
          data: {
            poNumber: 'PO-2024-001',
            prId: purchaseRequisitions[0].id,
            vendorId: vendors[0].id,
            deliveryDate: new Date('2024-03-15'),
            deliveryAddress: {
              site: 'Sohar Industrial Area',
              block: 'Block 5',
              city: 'Sohar',
              governorate: 'North Al Batinah',
              country: 'Oman'
            },
            paymentTerms: 'Net 30 days',
            status: 'APPROVED',
            totalAmount: 14500.00,
            currency: 'OMR',
            items: {
              create: [
                {
                  itemId: items[0].id,
                  quantity: 200,
                  unitPrice: 3.5,
                  totalPrice: 700.00,
                  deliveryDate: new Date('2024-03-15'),
                },
                {
                  itemId: items[1].id,
                  quantity: 10,
                  unitPrice: 450.0,
                  totalPrice: 4500.00,
                  deliveryDate: new Date('2024-03-15'),
                },
              ],
            },
          },
        }),
    po2
      ? po2
      : prisma.purchaseOrder.create({
          data: {
            poNumber: 'PO-2024-002',
            vendorId: vendors[3].id,
            deliveryDate: new Date('2024-03-20'),
            deliveryAddress: {
              building: 'Ministry Building',
              street: 'Al Kharjiyah Street',
              city: 'Muscat',
              governorate: 'Muscat',
              postalCode: '100',
              country: 'Oman'
            },
            paymentTerms: 'Net 45 days',
            status: 'SENT',
            totalAmount: 4500.00,
            currency: 'OMR',
            items: {
              create: [
                {
                  itemId: items[2].id,
                  quantity: 3,
                  unitPrice: 1500.0,
                  totalPrice: 4500.00,
                  deliveryDate: new Date('2024-03-20'),
                },
              ],
            },
          },
        }),
  ])

  // Create Goods Receipts (check if they exist first)
  let gr1 = await prisma.goodsReceipt.findUnique({
    where: { grNumber: 'GR-2024-001' },
  })

  if (!gr1) {
    gr1 = await prisma.goodsReceipt.create({
      data: {
        grNumber: 'GR-2024-001',
        poId: purchaseOrders[0].id,
        receivedBy: 'emp003',
        status: 'PARTIAL',
        qualityChecked: true,
        qualityComments: 'Cement quality verified as per specifications',
        items: {
          create: [
            {
              itemId: items[0].id,
              orderedQuantity: 200,
              receivedQuantity: 180,
              acceptedQuantity: 180,
              rejectedQuantity: 0,
            },
          ],
        },
      },
    })
  }

  const goodsReceipts = [gr1]

  // Create Invoices (check if they exist first)
  const existingInvoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: 'INV-2024-001' },
  })

  if (!existingInvoice) {
    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2024-001',
        vendorId: vendors[0].id,
        poId: purchaseOrders[0].id,
        invoiceDate: new Date('2024-03-16'),
        dueDate: new Date('2024-04-15'),
        totalAmount: 14500.00,
        taxAmount: 725.00,
        status: 'APPROVED',
        threeWayMatched: false,
        matchingComments: 'Partial delivery - awaiting full delivery',
        paymentStatus: 'UNPAID',
      },
    })
  }

  // Create Vendor Documents (skip if they already exist)
  try {
    await Promise.all([
      prisma.vendorDocument.create({
        data: {
          vendorId: vendors[0].id,
          documentType: 'Trade License',
          documentName: 'Trade License 2024',
          fileUrl: '/documents/vendor001/trade_license_2024.pdf',
          expiryDate: new Date('2024-12-31'),
        },
      }),
      prisma.vendorDocument.create({
        data: {
          vendorId: vendors[0].id,
          documentType: 'VAT Certificate',
          documentName: 'VAT Registration Certificate',
          fileUrl: '/documents/vendor001/vat_certificate.pdf',
          expiryDate: new Date('2025-06-30'),
        },
      }),
    ])
  } catch (error) {
    // Documents may already exist, skip
    console.log('⚠️  Vendor documents may already exist, skipping...')
  }

  // Create Vendor Evaluations (skip if they already exist)
  try {
    await prisma.vendorEvaluation.create({
      data: {
        vendorId: vendors[0].id,
        qualityScore: 4.5,
        deliveryScore: 4.0,
        priceScore: 4.8,
        serviceScore: 4.3,
        overallScore: 4.4,
        comments: 'Good quality products, delivery needs improvement',
        evaluatedBy: 'procurement_manager',
      },
    })
  } catch (error) {
    // Evaluation may already exist, skip
    console.log('⚠️  Vendor evaluation may already exist, skipping...')
  }

  // Create Approvals (skip if they already exist)
  try {
    await Promise.all([
      prisma.approval.create({
        data: {
          documentType: 'PURCHASE_REQUISITION',
          documentId: purchaseRequisitions[0].id,
          prId: purchaseRequisitions[0].id,
          approverId: 'manager001',
          status: 'APPROVED',
          comments: 'Approved for urgent project requirement',
          approvedAt: new Date('2024-03-01'),
          level: 1,
        },
      }),
      prisma.approval.create({
        data: {
          documentType: 'PURCHASE_REQUISITION',
          documentId: purchaseRequisitions[1].id,
          prId: purchaseRequisitions[1].id,
          approverId: 'manager002',
          status: 'PENDING',
          level: 1,
        },
      }),
    ])
  } catch (error) {
    // Approvals may already exist, skip
    console.log('⚠️  Approvals may already exist, skipping...')
  }

  // ===========================================
  // SEED SERVICE CONTRACTS (with ended contracts)
  // ===========================================
  console.log('\n📋 Seeding Service Contracts...')

  // First, create Service Requisitions (Purchase Requisitions with SERVICE itemType)
  const servicePRData = [
    {
      prNumber: 'SPR-2023-001',
      requesterId: 'emp001',
      departmentId: 'dept001',
      itemType: 'SERVICE' as const,
      priority: 'NORMAL' as const,
      status: 'APPROVED' as const,
      estimatedCost: 25000.00,
      budgetCode: 'SERV-2023-Q1',
      justification: 'IT infrastructure maintenance and support services',
      serviceScope: 'Annual IT infrastructure maintenance and 24/7 support',
      serviceCategory: 'IT Services',
      serviceType: 'Maintenance',
      duration: 365,
      durationUnit: 'DAYS' as const,
    },
    {
      prNumber: 'SPR-2023-002',
      requesterId: 'emp002',
      departmentId: 'dept002',
      itemType: 'SERVICE' as const,
      priority: 'HIGH' as const,
      status: 'APPROVED' as const,
      estimatedCost: 15000.00,
      budgetCode: 'SERV-2023-Q2',
      justification: 'Security services for office premises',
      serviceScope: '24/7 security guard services and access control',
      serviceCategory: 'Security Services',
      serviceType: 'Guarding',
      duration: 180,
      durationUnit: 'DAYS' as const,
    },
    {
      prNumber: 'SPR-2022-001',
      requesterId: 'emp001',
      departmentId: 'dept001',
      itemType: 'SERVICE' as const,
      priority: 'NORMAL' as const,
      status: 'APPROVED' as const,
      estimatedCost: 18000.00,
      budgetCode: 'SERV-2022-Q3',
      justification: 'Management consulting for process improvement',
      serviceScope: 'Strategic planning and process optimization consulting',
      serviceCategory: 'Professional Services',
      serviceType: 'Consulting',
      duration: 90,
      durationUnit: 'DAYS' as const,
    },
  ]

  const serviceRequisitions = []
  for (const prData of servicePRData) {
    // Check if PR already exists
    let existingPR = await prisma.purchaseRequisition.findUnique({
      where: { prNumber: prData.prNumber },
      include: { servicePR: true },
    })

    if (!existingPR) {
      // Create Purchase Requisition
      const pr = await prisma.purchaseRequisition.create({
        data: {
          prNumber: prData.prNumber,
          requesterId: prData.requesterId,
          departmentId: prData.departmentId,
          itemType: prData.itemType,
          priority: prData.priority,
          status: prData.status,
          estimatedCost: prData.estimatedCost,
          budgetCode: prData.budgetCode,
          justification: prData.justification,
          servicePR: {
            create: {
              serviceScope: prData.serviceScope,
              serviceCategory: prData.serviceCategory,
              serviceType: prData.serviceType,
              duration: prData.duration,
              durationUnit: prData.durationUnit,
              deliverables: [],
              performanceMetrics: undefined,
              slaRequirements: undefined,
              insuranceRequired: false,
              certificationRequired: false,
              paymentSchedule: 'MONTHLY',
              retentionPercentage: 0,
            },
          },
        },
        include: { servicePR: true },
      })
      serviceRequisitions.push(pr)
      console.log(`✅ Created Service Requisition: ${pr.prNumber}`)
    } else {
      serviceRequisitions.push(existingPR)
      console.log(`✅ Service Requisition already exists: ${prData.prNumber}`)
    }
  }

  // Create Service Contracts with past end dates (COMPLETED status)
  const serviceContractData = [
    {
      contractNumber: 'SC-2023-001',
      prId: serviceRequisitions[0].id,
      vendorId: vendors[3].id, // Zubair Corporation (IT vendor)
      contractType: 'MAINTENANCE_CONTRACT',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'), // Ended in 2023
      totalValue: 25000.00,
      currency: 'OMR',
      paymentTerms: 'Monthly payments, Net 30 days',
      status: 'COMPLETED' as const,
      signedAt: new Date('2022-12-15'),
      slaTerms: {
        responseTime: '4 hours',
        resolutionTime: '24 hours',
        availability: '99.5%',
        support: '24/7',
      },
      insuranceRequirements: {
        generalLiability: '500,000 OMR',
        professionalIndemnity: '250,000 OMR',
      },
      performanceBond: 2500.00,
      retentionAmount: 1250.00,
    },
    {
      contractNumber: 'SC-2023-002',
      prId: serviceRequisitions[1].id,
      vendorId: vendors[1].id, // Bahwan Engineering Company
      contractType: 'SERVICE_AGREEMENT',
      startDate: new Date('2023-04-01'),
      endDate: new Date('2023-09-30'), // Ended in 2023
      totalValue: 15000.00,
      currency: 'OMR',
      paymentTerms: 'Monthly payments, Net 30 days',
      status: 'COMPLETED' as const,
      signedAt: new Date('2023-03-20'),
      slaTerms: {
        responseTime: 'Immediate',
        availability: '100%',
        coverage: '24/7',
        guardsPerShift: 2,
      },
      insuranceRequirements: {
        generalLiability: '1,000,000 OMR',
        workersCompensation: 'Required',
      },
      performanceBond: 1500.00,
      retentionAmount: 750.00,
    },
    {
      contractNumber: 'SC-2022-001',
      prId: serviceRequisitions[2].id,
      vendorId: vendors[0].id, // Al Turki Trading LLC
      contractType: 'CONSULTING_CONTRACT',
      startDate: new Date('2022-07-01'),
      endDate: new Date('2022-09-30'), // Ended in 2022
      totalValue: 18000.00,
      currency: 'OMR',
      paymentTerms: 'Milestone-based payments, Net 30 days',
      status: 'COMPLETED' as const,
      signedAt: new Date('2022-06-20'),
      slaTerms: {
        deliverables: 'On-time delivery of all milestones',
        quality: 'Minimum 4.5/5.0 client satisfaction',
        reporting: 'Weekly progress reports',
      },
      insuranceRequirements: {
        professionalIndemnity: '500,000 OMR',
        generalLiability: '250,000 OMR',
      },
      performanceBond: 1800.00,
      retentionAmount: 900.00,
    },
  ]

  for (const contractData of serviceContractData) {
    // Check if contract already exists
    const existingContract = await prisma.serviceContract.findUnique({
      where: { contractNumber: contractData.contractNumber },
    })

    if (!existingContract) {
      await prisma.serviceContract.create({
        data: {
          contractNumber: contractData.contractNumber,
          prId: contractData.prId,
          vendorId: contractData.vendorId,
          contractType: contractData.contractType,
          startDate: contractData.startDate,
          endDate: contractData.endDate,
          totalValue: contractData.totalValue,
          currency: contractData.currency,
          paymentTerms: contractData.paymentTerms,
          status: contractData.status,
          signedAt: contractData.signedAt,
          slaTerms: contractData.slaTerms,
          insuranceRequirements: contractData.insuranceRequirements,
          performanceBond: contractData.performanceBond,
          retentionAmount: contractData.retentionAmount,
        },
      })
      console.log(`✅ Created Service Contract: ${contractData.contractNumber} (Ended: ${contractData.endDate.toLocaleDateString()})`)
    } else {
      console.log(`✅ Service Contract already exists: ${contractData.contractNumber}`)
    }
  }

  console.log('✅ Service Contracts seeding completed!\n')

  console.log('✅ Seed completed successfully with Omani data!')
  console.log({
    categories: categories.length + subcategories.length,
    vendors: vendors.length,
    items: items.length,
    purchaseRequisitions: purchaseRequisitions.length,
    rfqs: rfqs.length,
    purchaseOrders: purchaseOrders.length,
    goodsReceipts: goodsReceipts.length,
    serviceRequisitions: serviceRequisitions.length,
    serviceContracts: serviceContractData.length,
  })
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })