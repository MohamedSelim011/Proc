import { prisma } from '@/lib/db'
import { ServiceContractStatus } from '@prisma/client'

/**
 * Contract Version Management Service
 * Handles versioning, history tracking, and comparison of service contracts
 */

export interface ContractVersionData {
  contractNumber: string
  vendorId: string
  contractType: string
  startDate: Date
  endDate: Date
  totalValue: number
  serviceAmount?: number
  currency: string
  paymentTerms: string
  slaTerms?: any
  penaltyClause?: string
  performanceBond?: number
  retentionAmount?: number
  insuranceRequirements?: any
  status: ServiceContractStatus
}

export interface CreateVersionInput {
  contractId: string
  changeReason?: string
  changeDescription?: string
  createdBy: string
  createdByName?: string
}

/**
 * Create a new version snapshot of a contract
 */
export async function createContractVersion(input: CreateVersionInput) {
  const { contractId, changeReason, changeDescription, createdBy, createdByName } = input

  // Get the current contract data
  const contract = await prisma.serviceContract.findUnique({
    where: { id: contractId },
    include: {
      vendor: {
        select: { nameEn: true },
      },
    },
  })

  if (!contract) {
    throw new Error(`Contract ${contractId} not found`)
  }

  // Get the next version number
  const latestVersion = await prisma.serviceContractVersion.findFirst({
    where: { contractId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  })

  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1

  // Create the version snapshot
  const version = await prisma.serviceContractVersion.create({
    data: {
      contractId,
      versionNumber: nextVersionNumber,
      contractNumber: contract.contractNumber,
      vendorId: contract.vendorId,
      contractType: contract.contractType,
      startDate: contract.startDate,
      endDate: contract.endDate,
      totalValue: contract.totalValue,
      serviceAmount: contract.serviceAmount,
      currency: contract.currency,
      paymentTerms: contract.paymentTerms,
      slaTerms: contract.slaTerms,
      penaltyClause: contract.penaltyClause,
      performanceBond: contract.performanceBond,
      retentionAmount: contract.retentionAmount,
      insuranceRequirements: contract.insuranceRequirements,
      status: contract.status,
      changeReason,
      changeDescription,
      createdBy,
      createdByName,
      approvalStatus: 'PENDING',
    },
  })

  // Update the contract's version number
  await prisma.serviceContract.update({
    where: { id: contractId },
    data: { versionNumber: nextVersionNumber },
  })

  return version
}

/**
 * Get all versions of a contract
 */
export async function getContractVersions(contractId: string) {
  const versions = await prisma.serviceContractVersion.findMany({
    where: { contractId },
    orderBy: { versionNumber: 'desc' },
  })

  return versions
}

/**
 * Get a specific version of a contract
 */
export async function getContractVersion(contractId: string, versionNumber: number) {
  const version = await prisma.serviceContractVersion.findUnique({
    where: {
      contractId_versionNumber: {
        contractId,
        versionNumber,
      },
    },
  })

  return version
}

/**
 * Compare two versions of a contract
 */
export async function compareContractVersions(
  contractId: string,
  fromVersion: number,
  toVersion: number
) {
  const [oldVer, newVer] = await Promise.all([
    getContractVersion(contractId, fromVersion),
    getContractVersion(contractId, toVersion),
  ])

  if (!oldVer || !newVer) {
    throw new Error('One or both versions not found')
  }

  const changes: Array<{
    field: string
    oldValue: any
    newValue: any
    changed: boolean
  }> = []

  // Compare key fields
  const fieldsToCompare = [
    'contractType',
    'startDate',
    'endDate',
    'totalValue',
    'serviceAmount',
    'currency',
    'paymentTerms',
    'penaltyClause',
    'performanceBond',
    'retentionAmount',
    'status',
  ]

  for (const field of fieldsToCompare) {
    const oldValue = (oldVer as any)[field]
    const newValue = (newVer as any)[field]
    
    const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue)
    
    changes.push({
      field,
      oldValue,
      newValue,
      changed,
    })
  }

  return {
    fromVersion: oldVer,
    toVersion: newVer,
    changes,
    hasChanges: changes.some((c) => c.changed),
  }
}

/**
 * Mark a version as approved
 */
export async function approveContractVersion(
  contractId: string,
  versionNumber: number,
  approvedBy: string
) {
  const version = await prisma.serviceContractVersion.update({
    where: {
      contractId_versionNumber: {
        contractId,
        versionNumber,
      },
    },
    data: {
      approvalStatus: 'APPROVED',
      approvedBy,
      approvedAt: new Date(),
    },
  })

  return version
}

/**
 * Mark a version as rejected
 */
export async function rejectContractVersion(
  contractId: string,
  versionNumber: number,
  approvedBy: string
) {
  const version = await prisma.serviceContractVersion.update({
    where: {
      contractId_versionNumber: {
        contractId,
        versionNumber,
      },
    },
    data: {
      approvalStatus: 'REJECTED',
      approvedBy,
      approvedAt: new Date(),
    },
  })

  return version
}

/**
 * Get version history with changes summary
 */
export async function getContractVersionHistory(contractId: string) {
  const versions = await getContractVersions(contractId)

  if (versions.length === 0) {
    return []
  }

  const history = []

  for (let i = 0; i < versions.length; i++) {
    const currentVersion = versions[i]
    const previousVersion = versions[i + 1] // Next in array (older version)

    let changesSummary: string[] = []

    if (previousVersion) {
      const comparison = await compareContractVersions(
        contractId,
        previousVersion.versionNumber,
        currentVersion.versionNumber
      )

      changesSummary = comparison.changes
        .filter((c) => c.changed)
        .map((c) => `${c.field} changed`)
    }

    history.push({
      version: currentVersion,
      changesSummary,
      isFirstVersion: i === versions.length - 1,
      isLatestVersion: i === 0,
    })
  }

  return history
}

/**
 * Restore a contract to a previous version
 */
export async function restoreContractVersion(
  contractId: string,
  versionNumber: number,
  restoredBy: string,
  restoredByName?: string
) {
  const version = await getContractVersion(contractId, versionNumber)

  if (!version) {
    throw new Error(`Version ${versionNumber} not found for contract ${contractId}`)
  }

  // Update the contract with the version data
  await prisma.serviceContract.update({
    where: { id: contractId },
    data: {
      contractType: version.contractType,
      startDate: version.startDate,
      endDate: version.endDate,
      totalValue: version.totalValue,
      serviceAmount: version.serviceAmount ?? version.totalValue,
      currency: version.currency,
      paymentTerms: version.paymentTerms,
      slaTerms: version.slaTerms,
      penaltyClause: version.penaltyClause,
      performanceBond: version.performanceBond,
      retentionAmount: version.retentionAmount,
      insuranceRequirements: version.insuranceRequirements,
      status: ServiceContractStatus.DRAFT, // Always restore as DRAFT for safety
    },
  })

  // Create a new version to track the restoration
  const newVersion = await createContractVersion({
    contractId,
    changeReason: `Restored from version ${versionNumber}`,
    changeDescription: `Contract restored to version ${versionNumber} by ${restoredByName || restoredBy}`,
    createdBy: restoredBy,
    createdByName: restoredByName,
  })

  return newVersion
}

/**
 * Get contract version statistics
 */
export async function getContractVersionStats(contractId: string) {
  const versions = await getContractVersions(contractId)

  const stats = {
    totalVersions: versions.length,
    currentVersion: versions[0]?.versionNumber || 0,
    approvedVersions: versions.filter((v) => v.approvalStatus === 'APPROVED').length,
    rejectedVersions: versions.filter((v) => v.approvalStatus === 'REJECTED').length,
    pendingVersions: versions.filter((v) => v.approvalStatus === 'PENDING').length,
    firstCreatedAt: versions[versions.length - 1]?.createdAt,
    lastCreatedAt: versions[0]?.createdAt,
  }

  return stats
}
