import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'

/**
 * Get all approval rules
 * GET /api/admin/approval-rules
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    let user;
    try {
      user = requireAuth(request);
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all approval rules with routing count
    const rules = await prisma.approvalRule.findMany({
      include: {
        _count: {
          select: {
            routings: true
          }
        }
      },
      orderBy: [
        { documentType: 'asc' },
        { priority: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      rules
    })
  } catch (error) {
    console.error('Error fetching approval rules:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch approval rules'
      },
      { status: 500 }
    )
  }
}
