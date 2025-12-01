import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/db'

// GET /api/auth/permissions - Get permissions for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get permissions for the user's role
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: user.role as any,
        isActive: true,
      },
      include: {
        permission: {
          where: {
            isActive: true,
          },
        },
      },
    })

    const permissions = rolePermissions
      .filter(rp => rp.permission)
      .map(rp => ({
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
        action: rp.permission.action,
        conditions: rp.conditions,
      }))

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

// POST /api/auth/permissions - Check if user has specific permission
export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { permissionCode } = body

    if (!permissionCode) {
      return NextResponse.json(
        { error: 'permissionCode is required' },
        { status: 400 }
      )
    }

    // Check if user's role has this permission
    const hasPermission = await prisma.rolePermission.findFirst({
      where: {
        role: user.role as any,
        permission: {
          code: permissionCode,
          isActive: true,
        },
        isActive: true,
      },
    })

    return NextResponse.json({ hasPermission: !!hasPermission })
  } catch (error) {
    console.error('Error checking permission:', error)
    return NextResponse.json(
      { error: 'Failed to check permission' },
      { status: 500 }
    )
  }
}
