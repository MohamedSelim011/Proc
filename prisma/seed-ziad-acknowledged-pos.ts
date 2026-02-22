import { POStatus, PrismaClient, VendorStatus } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_TARGET_COUNT = 7
const SEEDED_BY = 'seed:ziad-acknowledged-po'

function toNumber(input?: string): number | null {
  if (!input) return null
  const n = Number(input)
  return Number.isFinite(n) ? n : null
}

function formatDateToken(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

async function findOrCreateZiadVendor() {
  const existing = await prisma.vendor.findFirst({
    where: {
      OR: [
        { nameEn: { equals: 'Ziad', mode: 'insensitive' } },
        { nameEn: { contains: 'Ziad', mode: 'insensitive' } },
      ],
    },
  })

  if (existing) return existing

  const stamp = Date.now().toString().slice(-8)
  return prisma.vendor.create({
    data: {
      vendorCode: `VEN-ZIAD-${stamp}`,
      nameEn: 'Ziad',
      nameAr: 'زياد',
      crNumber: `CRZ${stamp}`,
      taxId: `OMZ${stamp}123`,
      vatNumber: `OMZ${stamp}456`,
      primaryContactName: 'Ziad',
      email: `ziad.vendor.${stamp}@example.com`,
      mobile: '+968 9000 1234',
      address: {
        street: 'Al Khuwair',
        building: 'Business Tower',
        city: 'Muscat',
        governorate: 'Muscat',
        postalCode: '112',
        country: 'Oman',
      },
      businessType: 'Sole Proprietorship',
      yearEstablished: 2016,
      numberOfEmployees: 25,
      omanizationPercentage: 65,
      status: VendorStatus.ACTIVE,
    },
  })
}

async function getSeedItems() {
  const items = await prisma.item.findMany({
    select: { id: true, nameEn: true },
    orderBy: { createdAt: 'asc' },
    take: 12,
  })

  if (items.length > 0) return items

  const stamp = Date.now().toString().slice(-6)
  const category = await prisma.category.create({
    data: {
      code: `MISC-${stamp}`,
      nameEn: 'Miscellaneous',
      nameAr: 'متفرقات',
      description: 'Fallback category for seed data',
    },
  })

  const fallback = await prisma.item.create({
    data: {
      itemCode: `ITEM-ZIAD-${stamp}`,
      nameEn: 'General Supply Item',
      nameAr: 'عنصر توريد عام',
      description: 'Fallback item for PO seed script',
      categoryId: category.id,
      unitOfMeasure: 'EA',
      minStockLevel: 10,
      maxStockLevel: 200,
      reorderPoint: 20,
    },
    select: { id: true, nameEn: true },
  })

  return [fallback]
}

async function main() {
  const requested = toNumber(process.argv[2])
  const targetCount = requested && requested > 0 ? Math.floor(requested) : DEFAULT_TARGET_COUNT

  const vendor = await findOrCreateZiadVendor()
  const itemsPool = await getSeedItems()

  const existingSeeded = await prisma.purchaseOrder.count({
    where: {
      vendorId: vendor.id,
      status: POStatus.ACKNOWLEDGED,
      createdBy: SEEDED_BY,
    },
  })

  const toCreate = Math.max(0, targetCount - existingSeeded)
  if (toCreate === 0) {
    console.log(
      `No new records needed. Found ${existingSeeded} seeded acknowledged POs for vendor "${vendor.nameEn}".`
    )
    return
  }

  const now = new Date()
  const dateToken = formatDateToken(now)

  for (let i = 0; i < toCreate; i++) {
    const idx = existingSeeded + i + 1
    const selectedItems = [itemsPool[i % itemsPool.length], itemsPool[(i + 2) % itemsPool.length]]

    const poItems = selectedItems.map((item, j) => {
      const quantity = 3 + ((i + j) % 5)
      const unitPrice = 25 + (i + j) * 7
      const totalPrice = quantity * unitPrice
      return {
        itemId: item.id,
        quantity,
        unitPrice: unitPrice.toString(),
        totalPrice: totalPrice.toString(),
      }
    })

    const totalAmount = poItems.reduce((sum, row) => sum + Number(row.totalPrice), 0)
    const orderDate = new Date(now.getTime() - (12 - i) * 24 * 60 * 60 * 1000)
    const deliveryDate = new Date(now.getTime() + (7 + i) * 24 * 60 * 60 * 1000)
    const acknowledgedAt = new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000)

    await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-ZIAD-${dateToken}-${String(idx).padStart(3, '0')}`,
        vendorId: vendor.id,
        orderDate,
        deliveryDate,
        deliveryAddress: {
          type: 'BUSINESS',
          building: 'Ziad Main Office',
          street: 'Sultan Qaboos Street',
          city: 'Muscat',
          governorate: 'Muscat',
          postalCode: '112',
          country: 'Oman',
          note: 'Seeded acknowledged PO delivery location',
        },
        paymentTerms: 'Net 30',
        status: POStatus.ACKNOWLEDGED,
        totalAmount: totalAmount.toString(),
        invoicedAmount: '0',
        currency: 'OMR',
        createdBy: SEEDED_BY,
        acknowledgedAt,
        acknowledgedBy: vendor.email,
        items: {
          create: poItems,
        },
      },
    })

    console.log(
      `Created PO ${idx}/${toCreate} for vendor "${vendor.nameEn}" with status ACKNOWLEDGED (amount ${totalAmount} OMR).`
    )
  }

  const finalCount = await prisma.purchaseOrder.count({
    where: {
      vendorId: vendor.id,
      status: POStatus.ACKNOWLEDGED,
      createdBy: SEEDED_BY,
    },
  })

  console.log(
    `Done. Seeded acknowledged POs for "${vendor.nameEn}": ${finalCount} (created by ${SEEDED_BY}).`
  )
}

main()
  .catch((error) => {
    console.error('Failed to seed acknowledged POs for Ziad:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
