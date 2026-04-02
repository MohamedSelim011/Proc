import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ count: 0 })
  } catch (error) {
    console.error('Error fetching unread notification count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unread notification count' },
      { status: 500 }
    )
  }
}
