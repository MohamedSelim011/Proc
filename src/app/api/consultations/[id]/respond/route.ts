import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { comments } = body

    if (!comments) {
      return NextResponse.json(
        { error: 'Comments are required' },
        { status: 400 }
      )
    }

    // Find the consultation
    const consultation = await prisma.approvalConsultation.findUnique({
      where: { id },
    })

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    // Verify the user is the consulted party
    if (consultation.consultedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify it's pending
    if (consultation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Consultation is not pending' },
        { status: 400 }
      )
    }

    // Update consultation
    await prisma.approvalConsultation.update({
      where: { id },
      data: {
        status: 'RESPONDED',
        comments,
        respondedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, message: 'Consultation responded successfully' })
  } catch (error) {
    console.error('Error responding to consultation:', error)
    return NextResponse.json(
      { error: 'Failed to respond to consultation' },
      { status: 500 }
    )
  }
}
