import { NextRequest, NextResponse } from 'next/server'
import {
  getContractVersionHistory,
  getContractVersionStats,
  compareContractVersions,
} from '@/lib/contract-version-service'

/**
 * Get Contract Version History
 * GET /api/service-contracts/[id]/versions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const compareFrom = searchParams.get('compareFrom')
    const compareTo = searchParams.get('compareTo')

    // If comparison is requested
    if (compareFrom && compareTo) {
      const comparison = await compareContractVersions(
        id,
        parseInt(compareFrom),
        parseInt(compareTo)
      )

      return NextResponse.json({
        success: true,
        comparison,
      })
    }

    // Get version history and stats
    const [history, stats] = await Promise.all([
      getContractVersionHistory(id),
      getContractVersionStats(id),
    ])

    return NextResponse.json({
      success: true,
      history,
      stats,
    })
  } catch (error) {
    console.error('Error fetching contract versions:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch contract versions',
      },
      { status: 500 }
    )
  }
}
