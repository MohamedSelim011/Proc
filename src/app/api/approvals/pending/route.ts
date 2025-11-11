import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getPendingApprovalsForUser, getPendingApprovalCount } from '@/lib/approval-service'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('count') === 'true'

    if (countOnly) {
      const count = await getPendingApprovalCount(
        session.user.id,
        session.user.role as UserRole
      )
      return NextResponse.json({ count })
    }

    const approvals = await getPendingApprovalsForUser(
      session.user.id,
      session.user.role as UserRole
    )

    return NextResponse.json({ approvals })
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    )
  }
}
