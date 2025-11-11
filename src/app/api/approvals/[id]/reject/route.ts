import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { rejectDocument } from '@/lib/approval-service'

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

    const approvalId = params.id
    const body = await request.json()
    const { comments } = body

    if (!comments) {
      return NextResponse.json(
        { error: 'Comments are required when rejecting' },
        { status: 400 }
      )
    }

    await rejectDocument(approvalId, session.user.id, comments)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error rejecting document:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject document' },
      { status: error.message.includes('Unauthorized') ? 403 : 500 }
    )
  }
}
