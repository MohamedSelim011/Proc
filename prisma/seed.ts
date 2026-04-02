import { PrismaClient, UserRole, VendorStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed with Omani data...')

  // SEED USERS (Authentication System)
  // ===========================================
  console.log('\nSeeding users...')

  // Ensure default company exists
  const company = await prisma.company.upsert({
    where: { code: 'WUJHA' },
    update: { name: 'Wujha Real Estate' },
    create: {
      code: 'WUJHA',
      name: 'Wujha Real Estate',
    },
  })

  // Create default admin user
  const adminEmail = 'admin@wujha.com'
  const defaultPassword = 'password123' // Must be changed on first login

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    if ((existingAdmin as { companyId?: string }).companyId !== company.id) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { companyId: company.id },
      })
    }
    console.log('Admin user already exists:', adminEmail)
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
        companyId: company.id,
      },
    })
    console.log('Created admin user:', admin.email)
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
    {
      email: 'billing.engineer@wujha.com',
      name: 'Salim Billing',
      employeeId: 'BIL-001',
      department: 'Finance',
      role: UserRole.BILLING_ENGINEER,
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
          companyId: company.id,
        },
      })
      console.log(`Created user: ${userData.email} (${userData.role})`)
    } else if ((existing as { companyId?: string }).companyId !== company.id) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { companyId: company.id },
      })
      console.log(`Updated user company: ${userData.email} -> WUJHA`)
    }
  }

  console.log('\nUser seeding completed!\n')

  // ===========================================
  // SEED MASTER DATA (Categories, Vendors, etc)
  // ===========================================
  console.log('Seeding master data...\n')

  // Create categories (using upsert to handle existing records)
  const categoryData = [
    {
      code: 'CONST-001',
      nameEn: 'Construction Materials',
      nameAr: '???? ??????',
      description: 'Building and construction materials',
    },
    {
      code: 'IT-001',
      nameEn: 'Information Technology',
      nameAr: '????? ?????????',
      description: 'IT equipment and software',
    },
    {
      code: 'OFF-001',
      nameEn: 'Office Supplies',
      nameAr: '???????? ???????',
      description: 'General office supplies and stationery',
    },
    {
      code: 'MED-001',
      nameEn: 'Medical Supplies',
      nameAr: '?????????? ??????',
      description: 'Medical equipment and supplies',
    },
    {
      code: 'OIL-001',
      nameEn: 'Oil & Gas Equipment',
      nameAr: '????? ????? ??????',
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
      nameAr: '??????? ?????????',
      description: 'Cement and concrete products',
      parentId: categories[0].id,
    },
    {
      code: 'IT-002',
      nameEn: 'Computers & Laptops',
      nameAr: '????? ?????????',
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
      nameAr: '???? ?????? ???????',
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
      status: VendorStatus.ACTIVE,
      performanceScore: 4.5,
    },
    {
      vendorCode: 'VEN-002',
      nameEn: 'Bahwan Engineering Company',
      nameAr: '???? ????? ???????',
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
      status: VendorStatus.ACTIVE,
      performanceScore: 4.8,
    },
    {
      vendorCode: 'VEN-003',
      nameEn: 'Al Hashar Group',
      nameAr: '?????? ??????',
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
      status: VendorStatus.ACTIVE,
      performanceScore: 4.7,
    },
    {
      vendorCode: 'VEN-004',
      nameEn: 'Zubair Corporation',
      nameAr: '????? ??????',
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
      status: VendorStatus.ACTIVE,
      performanceScore: 4.9,
    },
    {
      vendorCode: 'VEN-005',
      nameEn: 'Al Raisi Trading',
      nameAr: '????? ???????',
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
    { vendorId: vendors[0].id, categoryId: categories[0].id, isPrimary: true },
    { vendorId: vendors[1].id, categoryId: categories[4].id, isPrimary: true },
    { vendorId: vendors[2].id, categoryId: categories[0].id, isPrimary: true },
    { vendorId: vendors[3].id, categoryId: categories[1].id, isPrimary: true },
    { vendorId: vendors[3].id, categoryId: categories[2].id, isPrimary: false },
    { vendorId: vendors[4].id, categoryId: categories[2].id, isPrimary: true },
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

  // Material requisitions are no longer seeded here.
  // Keep references to existing PRs only for dependent demo data.
  const pr1 = await prisma.purchaseRequisition.findUnique({
    where: { prNumber: 'PR-2024-001' },
  })
  const pr2 = await prisma.purchaseRequisition.findUnique({
    where: { prNumber: 'PR-2024-002' },
  })
  const purchaseRequisitions = [pr1, pr2].filter(Boolean)

  // RFQs, Purchase Orders, Goods Receipts, and Invoices are no longer seeded here.

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
    console.log('Vendor documents may already exist, skipping...')
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
    console.log('Vendor evaluation may already exist, skipping...')
  }

  // Service request and related demo seeding intentionally removed.

  console.log('Seed completed successfully with Omani data!')
  console.log({
    categories: categories.length + subcategories.length,
    vendors: vendors.length,
    purchaseRequisitions: purchaseRequisitions.length,
  })

  // ===========================================
  // SEED KPI TARGETS
  // ===========================================
  console.log('\nSeeding KPI targets...')

  const defaultTargets = [
    { kpiKey: 'procurementCycleTime', target: 30 },
    { kpiKey: 'onTimeDeliveryRate', target: 95 },
    { kpiKey: 'vendorComplianceRate', target: 90 },
    { kpiKey: 'invoiceProcessingTime', target: 15 },
    { kpiKey: 'threeWayMatchSuccessRate', target: 85 },
    { kpiKey: 'costVarianceVsBudget', target: 5 },
    { kpiKey: 'vendorPerformanceScore', target: 80 },
    { kpiKey: 'pendingApprovalRate', target: 10 },
    { kpiKey: 'stockItemDeliveryAccuracy', target: 95 },
    { kpiKey: 'nonStockServiceQualityRating', target: 4.0 },
    { kpiKey: 'inventoryTurnoverRate', target: 4 },
    { kpiKey: 'dashboardUpdateTimeliness', target: 95 },
    { kpiKey: 'topVendorSpendContribution', target: 60 },
  ]

  for (const targetData of defaultTargets) {
    await prisma.kPITarget.upsert({
      where: { kpiKey: targetData.kpiKey },
      update: {},
      create: {
        kpiKey: targetData.kpiKey,
        target: targetData.target,
      },
    })
  }

  console.log(`Seeded ${defaultTargets.length} KPI targets`)
}

main()
  .catch((e) => {
    console.error('Seed failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
