import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getRolePermissionsDetailed, hasPermission } from '@/lib/permissions'
import { UserRole } from '@prisma/client'

// GET current user's permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    const permissions = await getRolePermissionsDetailed(role)

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

// POST check if user has a specific permission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { permissionCode } = await request.json()

    if (!permissionCode) {
      return NextResponse.json(
        { error: 'permissionCode is required' },
        { status: 400 }
      )
    }

    const role = session.user.role as UserRole
    const allowed = await hasPermission(role, permissionCode)

    return NextResponse.json({ allowed })
  } catch (error) {
    console.error('Error checking permission:', error)
    return NextResponse.json(
      { error: 'Failed to check permission' },
      { status: 500 }
    )
  }
}
