import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { respondToConsultation } from '@/lib/consultation-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const consultationId = params.id
    const body = await request.json()
    const { comments, recommendation } = body

    if (!comments) {
      return NextResponse.json(
        { error: 'Comments are required' },
        { status: 400 }
      )
    }

    await respondToConsultation(
      consultationId,
      session.user.id,
      comments,
      recommendation
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error responding to consultation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to respond to consultation' },
      { status: error.message.includes('Unauthorized') ? 403 : 500 }
    )
  }
}
