import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { approveDocument } from '@/lib/approval-service'

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

    await approveDocument(approvalId, session.user.id, comments)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error approving document:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve document' },
      { status: error.message.includes('Unauthorized') ? 403 : 500 }
    )
  }
}
