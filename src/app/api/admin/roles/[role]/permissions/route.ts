import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/db'

// GET /api/admin/roles/[role]/permissions - Get permissions for a role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const user = getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access this
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { role } = await params

    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: role as any,
        isActive: true,
      },
      include: {
        permission: true,
      },
    })

    return NextResponse.json(rolePermissions)
  } catch (error) {
    console.error('Error fetching role permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role permissions' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/roles/[role]/permissions - Update permissions for a role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const user = getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can access this
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { role } = await params
    const body = await request.json().catch(() => ({}))
    const { permissionIds } = body

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'permissionIds must be an array' },
        { status: 400 }
      )
    }

    // Deactivate all existing permissions for this role
    await prisma.rolePermission.updateMany({
      where: {
        role: role as any,
      },
      data: {
        isActive: false,
      },
    })

    // Create new role permissions
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          role: role as any,
          permissionId,
          isActive: true,
        })),
        skipDuplicates: true,
      })
    }

    // Get updated permissions
    const updatedPermissions = await prisma.rolePermission.findMany({
      where: {
        role: role as any,
        isActive: true,
      },
      include: {
        permission: true,
      },
    })

    return NextResponse.json(updatedPermissions)
  } catch (error) {
    console.error('Error updating role permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update role permissions' },
      { status: 500 }
    )
  }
}
