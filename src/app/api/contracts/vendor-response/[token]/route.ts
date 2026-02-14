import { NextRequest, NextResponse } from 'next/server'
import {
  getVendorResponseByToken,
  validateResponseToken,
  recordVendorResponse,
} from '@/lib/vendor-response-service'
import {
  generateVendorAcceptedEmail,
  generateVendorRejectedEmail,
  sendEmail,
} from '@/lib/email-service'

/**
 * Public API Route for Vendor Contract Response
 * No authentication required - security via unique token
 */

// GET: Display contract details for vendor review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') // 'accept' or 'reject'

    // Validate token
    const validation = await validateResponseToken(token)

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.reason || 'Invalid or expired token',
        },
        { status: 400 }
      )
    }

    const response = validation.response!

    // If action is provided, show confirmation page data
    if (action === 'accept' || action === 'reject') {
      return NextResponse.json({
        success: true,
        action,
        contract: {
          contractNumber: response.contract.contractNumber,
          contractType: response.contract.contractType,
          vendorName: response.contract.vendor.nameEn || response.contract.vendor.nameAr,
          totalValue: Number(response.contract.totalValue),
          currency: response.contract.currency,
          startDate: response.contract.startDate,
          endDate: response.contract.endDate,
          paymentTerms: response.contract.paymentTerms,
          slaTerms: response.contract.slaTerms,
          penaltyClause: response.contract.penaltyClause,
          performanceBond: response.contract.performanceBond
            ? Number(response.contract.performanceBond)
            : null,
          retentionAmount: response.contract.retentionAmount
            ? Number(response.contract.retentionAmount)
            : null,
          insuranceRequirements: response.contract.insuranceRequirements,
        },
        response: {
          versionNumber: response.versionNumber,
          vendorEmail: response.vendorEmail,
          vendorName: response.vendorName,
          expiresAt: response.expiresAt,
        },
        token,
      })
    }

    // Default: return contract details for review
    return NextResponse.json({
      success: true,
      contract: {
        contractNumber: response.contract.contractNumber,
        contractType: response.contract.contractType,
        vendorName: response.contract.vendor.nameEn || response.contract.vendor.nameAr,
        totalValue: Number(response.contract.totalValue),
        currency: response.contract.currency,
        startDate: response.contract.startDate,
        endDate: response.contract.endDate,
        paymentTerms: response.contract.paymentTerms,
        slaTerms: response.contract.slaTerms,
        penaltyClause: response.contract.penaltyClause,
        performanceBond: response.contract.performanceBond
          ? Number(response.contract.performanceBond)
          : null,
        retentionAmount: response.contract.retentionAmount
          ? Number(response.contract.retentionAmount)
          : null,
        insuranceRequirements: response.contract.insuranceRequirements,
      },
      response: {
        versionNumber: response.versionNumber,
        vendorEmail: response.vendorEmail,
        vendorName: response.vendorName,
        expiresAt: response.expiresAt,
      },
      token,
    })
  } catch (error) {
    console.error('Error fetching vendor response:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch contract details',
      },
      { status: 500 }
    )
  }
}

// POST: Submit vendor response (accept or reject)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { action, comments, respondedBy } = body

    if (!action || (action !== 'accept' && action !== 'reject')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be "accept" or "reject"',
        },
        { status: 400 }
      )
    }

    if (action === 'reject' && !comments) {
      return NextResponse.json(
        {
          success: false,
          error: 'Comments are required when rejecting a contract',
        },
        { status: 400 }
      )
    }

    // Record vendor response
    const vendorResponse = await recordVendorResponse({
      responseToken: token,
      responseType: action === 'accept' ? 'ACCEPT' : 'REJECT',
      comments,
      respondedBy,
    })

    // Send notification email to internal team
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const contractUrl = `${baseUrl}/procurement/services/contracts/${vendorResponse.contractId}`

    if (action === 'accept') {
      // Vendor accepted - send acceptance notification
      const { html, text } = generateVendorAcceptedEmail({
        contractNumber: vendorResponse.contract.contractNumber,
        vendorName: vendorResponse.contract.vendor.nameEn || vendorResponse.contract.vendor.nameAr,
        respondedAt: vendorResponse.respondedAt!,
        contractUrl,
      })

      await sendEmail({
        to: process.env.SMTP_FROM_EMAIL || '',
        subject: `✓ Contract Accepted: ${vendorResponse.contract.contractNumber}`,
        html,
        text,
      })
    } else {
      // Vendor rejected - send rejection notification with comments
      const { html, text } = generateVendorRejectedEmail({
        contractNumber: vendorResponse.contract.contractNumber,
        vendorName: vendorResponse.contract.vendor.nameEn || vendorResponse.contract.vendor.nameAr,
        comments: comments || 'No comments provided',
        respondedAt: vendorResponse.respondedAt!,
        contractUrl,
      })

      await sendEmail({
        to: process.env.SMTP_FROM_EMAIL || '',
        subject: `⚠️ Contract Changes Requested: ${vendorResponse.contract.contractNumber}`,
        html,
        text,
      })
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'accept'
          ? 'Thank you! You have successfully accepted the contract.'
          : 'Thank you! Your comments have been submitted. Our team will review your feedback and get back to you.',
      response: {
        status: vendorResponse.status,
        respondedAt: vendorResponse.respondedAt,
        contractNumber: vendorResponse.contract.contractNumber,
      },
    })
  } catch (error) {
    console.error('Error recording vendor response:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to record response',
      },
      { status: 500 }
    )
  }
}
