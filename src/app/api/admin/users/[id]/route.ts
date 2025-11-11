import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { UserRole } from '@prisma/client'

// GET user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasAccess = await hasPermission(
      session.user.role as UserRole,
      PERMISSIONS.USERS_READ
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        employeeId: true,
        department: true,
        role: true,
        mobile: true,
        approvalLimit: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        lastLoginIP: true,
        failedLoginAttempts: true,
        passwordChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get audit logs for this user
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { userId: params.id }, // Actions by this user
          { resourceId: params.id, resourceType: 'User' }, // Actions on this user
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Get password history
    const passwordHistory = await prisma.passwordHistory.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      user,
      auditLogs,
      passwordHistory,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasAccess = await hasPermission(
      session.user.role as UserRole,
      PERMISSIONS.USERS_UPDATE
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      employeeId,
      department,
      role,
      mobile,
      approvalLimit,
      isActive,
      mustChangePassword,
    } = body

    // Get old user data for audit log
    const oldUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!oldUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: name || oldUser.name,
        employeeId: employeeId || oldUser.employeeId,
        department: department || oldUser.department,
        role: role || oldUser.role,
        mobile: mobile !== undefined ? mobile : oldUser.mobile,
        approvalLimit:
          approvalLimit !== undefined
            ? approvalLimit
              ? parseFloat(approvalLimit)
              : null
            : oldUser.approvalLimit,
        isActive: isActive !== undefined ? isActive : oldUser.isActive,
        mustChangePassword:
          mustChangePassword !== undefined
            ? mustChangePassword
            : oldUser.mustChangePassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        employeeId: true,
        department: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_UPDATED',
        module: 'user_management',
        resourceType: 'User',
        resourceId: user.id,
        oldValue: {
          name: oldUser.name,
          role: oldUser.role,
          department: oldUser.department,
          isActive: oldUser.isActive,
        },
        newValue: {
          name: user.name,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
        },
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasAccess = await hasPermission(
      session.user.role as UserRole,
      PERMISSIONS.USERS_DELETE
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 })
    }

    // Prevent deleting yourself
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_DEACTIVATED',
        module: 'user_management',
        resourceType: 'User',
        resourceId: params.id,
        oldValue: { isActive: true },
        newValue: { isActive: false },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
