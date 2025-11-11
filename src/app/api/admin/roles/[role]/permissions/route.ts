import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { getRolePermissionsDetailed, clearPermissionCache } from '@/lib/permissions'
import { UserRole } from '@prisma/client'

// GET permissions for a specific role
export async function GET(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = params.role as UserRole

    const permissions = await getRolePermissionsDetailed(role)

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error fetching role permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role permissions' },
      { status: 500 }
    )
  }
}

// PUT update permissions for a specific role
export async function PUT(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admin can modify permissions
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const role = params.role as UserRole
    const { permissionIds } = await request.json()

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'permissionIds must be an array' },
        { status: 400 }
      )
    }

    // Delete existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { role },
    })

    // Create new role permissions
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId: string) => ({
        role,
        permissionId,
      })),
      skipDuplicates: true,
    })

    // Clear permission cache
    clearPermissionCache()

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ROLE_PERMISSIONS_UPDATED',
        module: 'permission_management',
        resourceType: 'RolePermission',
        resourceId: role,
        newValue: {
          role,
          permissionCount: permissionIds.length,
        },
      },
    })

    const updatedPermissions = await getRolePermissionsDetailed(role)

    return NextResponse.json({
      success: true,
      permissions: updatedPermissions,
    })
  } catch (error) {
    console.error('Error updating role permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update role permissions' },
      { status: 500 }
    )
  }
}
