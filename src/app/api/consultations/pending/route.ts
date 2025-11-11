import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getPendingConsultations, getPendingConsultationCount } from '@/lib/consultation-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('count') === 'true'

    if (countOnly) {
      const count = await getPendingConsultationCount(session.user.id)
      return NextResponse.json({ count })
    }

    const consultations = await getPendingConsultations(session.user.id)

    return NextResponse.json({ consultations })
  } catch (error) {
    console.error('Error fetching pending consultations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    )
  }
}
