import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending consultations where the user is the consulted party
    const pendingConsultations = await prisma.approvalConsultation.findMany({
      where: {
        consultedUserId: user.id,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(pendingConsultations)
  } catch (error) {
    console.error('Error fetching pending consultations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending consultations' },
      { status: 500 }
    )
  }
}
