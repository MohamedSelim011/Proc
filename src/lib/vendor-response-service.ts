import { prisma } from '@/lib/db'
import { VendorResponseStatus } from '@prisma/client'
import crypto from 'crypto'
import { sendContractReviewToVendor } from '@/lib/email-service'
import { getAppBaseUrl } from '@/lib/app-base-url'

/**
 * Vendor Contract Response Service
 * Handles vendor acceptance/rejection of contracts via email
 */

export interface CreateVendorResponseInput {
  contractId: string
  versionNumber: number
  vendorEmail: string
  vendorName: string
  expiryDays?: number // Default: 30 days
}

export interface VendorResponseInput {
  responseToken: string
  responseType: 'ACCEPT' | 'REJECT'
  comments?: string
  respondedBy?: string
}

type VendorResponseRecord = NonNullable<
  Awaited<ReturnType<typeof getVendorResponseByToken>>
>

/**
 * Generate a secure token for vendor response
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create a vendor response request and send email
 */
export async function createVendorResponseRequest(input: CreateVendorResponseInput) {
  const { contractId, versionNumber, vendorEmail, vendorName, expiryDays = 30 } = input

  // Get contract details
  const contract = await prisma.serviceContract.findUnique({
    where: { id: contractId },
  })

  if (!contract) {
    throw new Error(`Contract ${contractId} not found`)
  }

  // Generate secure token
  const responseToken = generateSecureToken()

  // Calculate expiry date
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiryDays)

  // Create vendor response record
  const vendorResponse = await prisma.vendorContractResponse.create({
    data: {
      contractId,
      versionNumber,
      responseToken,
      vendorEmail,
      vendorName,
      status: VendorResponseStatus.PENDING,
      expiresAt,
    },
  })

  // Generate response links - point to frontend page, not API
  const baseUrl = getAppBaseUrl()
  const responsePageUrl = `${baseUrl}/contracts/vendor-response/${responseToken}`
  const acceptLink = responsePageUrl
  const rejectLink = responsePageUrl

  // Send email to vendor
  try {
    const emailResult = await sendContractReviewToVendor({
      vendorEmail,
      vendorName,
      contractNumber: contract.contractNumber,
      contractType: contract.contractType,
      totalValue: Number(contract.totalValue),
      currency: contract.currency,
      startDate: contract.startDate,
      endDate: contract.endDate,
      paymentTerms: contract.paymentTerms,
      acceptLink,
      rejectLink,
      expiryDate: expiresAt,
    })

    if (emailResult.success) {
      // Update email sent timestamp
      await prisma.vendorContractResponse.update({
        where: { id: vendorResponse.id },
        data: { emailSentAt: new Date() },
      })
    } else {
      console.error('Failed to send contract review email:', emailResult.error)
      throw new Error(`Failed to send email: ${emailResult.error}`)
    }
  } catch (error) {
    console.error('Error sending contract review email:', error)
    // Delete the response record if email fails
    await prisma.vendorContractResponse.delete({
      where: { id: vendorResponse.id },
    })
    throw error
  }

  return {
    ...vendorResponse,
    acceptLink,
    rejectLink,
  }
}

/**
 * Get vendor response by token
 */
export async function getVendorResponseByToken(token: string) {
  const response = await prisma.vendorContractResponse.findUnique({
    where: { responseToken: token },
    include: {
      contract: {
        include: {
          vendor: {
            select: {
              nameEn: true,
              nameAr: true,
              email: true,
            },
          },
        },
      },
    },
  })

  return response
}

/**
 * Validate if response token is still valid
 */
export async function validateResponseToken(token: string): Promise<{
  valid: boolean
  reason?: string
  response?: VendorResponseRecord
}> {
  const response = await getVendorResponseByToken(token)

  if (!response) {
    return { valid: false, reason: 'Invalid or expired token' }
  }

  if (response.status !== VendorResponseStatus.PENDING) {
    return { 
      valid: false, 
      reason: `This contract has already been ${response.status.toLowerCase()}`,
      response 
    }
  }

  if (new Date() > response.expiresAt) {
    // Mark as expired
    await prisma.vendorContractResponse.update({
      where: { id: response.id },
      data: { status: VendorResponseStatus.EXPIRED },
    })
    return { valid: false, reason: 'This response link has expired', response }
  }

  return { valid: true, response }
}

/**
 * Record vendor response (accept or reject)
 */
export async function recordVendorResponse(input: VendorResponseInput) {
  const { responseToken, responseType, comments, respondedBy } = input

  // Validate token
  const validation = await validateResponseToken(responseToken)
  if (!validation.valid) {
    throw new Error(validation.reason || 'Invalid token')
  }

  const response = validation.response!

  // Update response record
  const status =
    responseType === 'ACCEPT'
      ? VendorResponseStatus.ACCEPTED
      : VendorResponseStatus.REJECTED

  const updatedResponse = await prisma.vendorContractResponse.update({
    where: { id: response.id },
    data: {
      status,
      responseType,
      comments,
      respondedBy,
      respondedAt: new Date(),
    },
    include: {
      contract: {
        include: {
          vendor: true,
        },
      },
    },
  })

  // Update contract status based on response
  if (responseType === 'ACCEPT') {
    // Contract accepted by vendor - move to SIGNED status
    await prisma.serviceContract.update({
      where: { id: response.contractId },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
      },
    })
  } else {
    // Contract rejected - move back to DRAFT for revision
    await prisma.serviceContract.update({
      where: { id: response.contractId },
      data: {
        status: 'DRAFT',
      },
    })
  }

  return updatedResponse
}

/**
 * Mark response as processed by internal team
 */
export async function markResponseProcessed(
  responseId: string,
  processedBy: string,
  internalNotes?: string
) {
  const response = await prisma.vendorContractResponse.update({
    where: { id: responseId },
    data: {
      status: VendorResponseStatus.PROCESSED,
      processedBy,
      processedAt: new Date(),
      internalNotes,
    },
  })

  return response
}

/**
 * Get all responses for a contract
 */
export async function getContractResponses(contractId: string) {
  const responses = await prisma.vendorContractResponse.findMany({
    where: { contractId },
    orderBy: { createdAt: 'desc' },
  })

  return responses
}

/**
 * Get pending responses (not yet responded)
 */
export async function getPendingResponses() {
  const responses = await prisma.vendorContractResponse.findMany({
    where: {
      status: VendorResponseStatus.PENDING,
      expiresAt: {
        gt: new Date(), // Not expired yet
      },
    },
    include: {
      contract: {
        select: {
          contractNumber: true,
          totalValue: true,
          currency: true,
        },
      },
    },
    orderBy: { expiresAt: 'asc' },
  })

  return responses
}

/**
 * Get expired responses
 */
export async function getExpiredResponses() {
  const responses = await prisma.vendorContractResponse.findMany({
    where: {
      OR: [
        {
          status: VendorResponseStatus.PENDING,
          expiresAt: {
            lt: new Date(),
          },
        },
        {
          status: VendorResponseStatus.EXPIRED,
        },
      ],
    },
    include: {
      contract: {
        select: {
          contractNumber: true,
          totalValue: true,
          currency: true,
        },
      },
    },
    orderBy: { expiresAt: 'desc' },
  })

  return responses
}

/**
 * Send reminder email for pending response
 */
export async function sendResponseReminder(responseId: string) {
  const response = await prisma.vendorContractResponse.findUnique({
    where: { id: responseId },
    include: {
      contract: true,
    },
  })

  if (!response || response.status !== VendorResponseStatus.PENDING) {
    throw new Error('Response not found or already processed')
  }

  if (new Date() > response.expiresAt) {
    throw new Error('Response has expired')
  }

  const baseUrl = getAppBaseUrl()
  const responsePageUrl = `${baseUrl}/contracts/vendor-response/${response.responseToken}`
  const acceptLink = responsePageUrl
  const rejectLink = responsePageUrl

  // Send reminder email
  const emailResult = await sendContractReviewToVendor({
    vendorEmail: response.vendorEmail,
    vendorName: response.vendorName || 'Valued Partner',
    contractNumber: response.contract.contractNumber,
    contractType: response.contract.contractType,
    totalValue: Number(response.contract.totalValue),
    currency: response.contract.currency,
    startDate: response.contract.startDate,
    endDate: response.contract.endDate,
    paymentTerms: response.contract.paymentTerms,
    acceptLink,
    rejectLink,
    expiryDate: response.expiresAt,
  })

  if (emailResult.success) {
    // Update reminder sent timestamp
    await prisma.vendorContractResponse.update({
      where: { id: responseId },
      data: { reminderSentAt: new Date() },
    })
  }

  return emailResult
}

/**
 * Cleanup expired responses (mark as expired)
 */
export async function cleanupExpiredResponses() {
  const result = await prisma.vendorContractResponse.updateMany({
    where: {
      status: VendorResponseStatus.PENDING,
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: VendorResponseStatus.EXPIRED,
    },
  })

  return result
}

/**
 * Get vendor response statistics
 */
export async function getVendorResponseStats(contractId?: string) {
  const where = contractId ? { contractId } : {}

  const [total, pending, accepted, rejected, expired, processed] = await Promise.all([
    prisma.vendorContractResponse.count({ where }),
    prisma.vendorContractResponse.count({
      where: { ...where, status: VendorResponseStatus.PENDING },
    }),
    prisma.vendorContractResponse.count({
      where: { ...where, status: VendorResponseStatus.ACCEPTED },
    }),
    prisma.vendorContractResponse.count({
      where: { ...where, status: VendorResponseStatus.REJECTED },
    }),
    prisma.vendorContractResponse.count({
      where: { ...where, status: VendorResponseStatus.EXPIRED },
    }),
    prisma.vendorContractResponse.count({
      where: { ...where, status: VendorResponseStatus.PROCESSED },
    }),
  ])

  const acceptanceRate = total > 0 ? (accepted / total) * 100 : 0
  const rejectionRate = total > 0 ? (rejected / total) * 100 : 0

  return {
    total,
    pending,
    accepted,
    rejected,
    expired,
    processed,
    acceptanceRate: acceptanceRate.toFixed(2) + '%',
    rejectionRate: rejectionRate.toFixed(2) + '%',
  }
}
