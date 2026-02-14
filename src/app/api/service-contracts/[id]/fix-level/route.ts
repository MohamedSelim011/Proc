import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Fix approval level for stuck contracts
 * POST /api/service-contracts/[id]/fix-level
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        approval: {
          include: {
            approvalHistory: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })

    if (!contract || !contract.approval) {
      return NextResponse.json(
        { success: false, error: 'Contract or approval not found' },
        { status: 404 }
      )
    }

    // Find highest approved level
    const approvedLevels = contract.approval.approvalHistory
      .filter(h => h.action === 'APPROVED')
      .map(h => h.level)

    const highestApprovedLevel = approvedLevels.length > 0 ? Math.max(...approvedLevels) : 0
    const correctLevel = highestApprovedLevel + 1

    // Update approval level
    await prisma.approval.update({
      where: { id: contract.approval.id },
      data: {
        level: correctLevel,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Approval level updated from ${contract.approval.level} to ${correctLevel}`,
      data: {
        contractId: id,
        oldLevel: contract.approval.level,
        newLevel: correctLevel,
        approvedLevels: approvedLevels,
      },
    })
  } catch (error) {
    console.error('Error fixing approval level:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
