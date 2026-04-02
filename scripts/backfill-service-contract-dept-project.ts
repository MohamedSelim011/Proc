import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const contracts = await prisma.serviceContract.findMany({
    where: {
      OR: [{ departmentId: null }, { projectId: null }],
    },
    select: {
      id: true,
      departmentId: true,
      projectId: true,
      servicePR: {
        select: {
          departmentId: true,
          projectId: true,
        },
      },
    },
  })

  let updated = 0

  for (const contract of contracts) {
    const deptId = contract.departmentId ?? contract.servicePR?.departmentId ?? null
    const projId = contract.projectId ?? contract.servicePR?.projectId ?? null

    if (deptId === contract.departmentId && projId === contract.projectId) continue

    await prisma.serviceContract.update({
      where: { id: contract.id },
      data: {
        departmentId: deptId,
        projectId: projId,
      },
    })
    updated += 1
  }

  console.log(`Backfill complete. Updated ${updated} contract(s).`)
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
