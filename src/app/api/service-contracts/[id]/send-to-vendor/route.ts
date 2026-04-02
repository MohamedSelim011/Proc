import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVendorResponseRequest } from '@/lib/vendor-response-service'
import { requireAuth } from '@/lib/jwt'

/**
 * Send Contract to Vendor for Review/Acceptance
 * POST /api/service-contracts/[id]/send-to-vendor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    try {
      requireAuth(request);
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { expiryDays = 30 } = body

    // Get the contract
    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        vendor: true,
        approval: true,
      },
    })

    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Check if contract is approved
    if (!contract.approval || contract.approval.status !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Contract must be fully approved before sending to vendor',
        },
        { status: 400 }
      )
    }

    // Check if contract is in APPROVED status
    if (contract.status !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: `Contract must be in APPROVED status. Current status: ${contract.status}`,
        },
        { status: 400 }
      )
    }

    const existingResponse = await prisma.vendorContractResponse.findFirst({
      where: {
        contractId: id,
        versionNumber: contract.versionNumber,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingResponse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vendor review has already been sent for this contract version',
        },
        { status: 400 }
      )
    }

    // Create vendor response request and send email
    const vendorName = contract.vendor.nameEn || contract.vendor.nameAr || 'Vendor';
    const vendorResponse = await createVendorResponseRequest({
      contractId: id,
      versionNumber: contract.versionNumber,
      vendorEmail: contract.vendor.email,
      vendorName,
      expiryDays,
    })

    return NextResponse.json({
      success: true,
      message: `Contract sent to ${vendorName} for review`,
      vendorResponse: {
        email: vendorResponse.vendorEmail,
        expiresAt: vendorResponse.expiresAt,
        status: vendorResponse.status,
      },
    })
  } catch (error) {
    console.error('Error sending contract to vendor:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send contract to vendor',
      },
      { status: 500 }
    )
  }
}
