import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { UserRole } from '@prisma/client'

// POST reset user password
export async function POST(
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
      PERMISSIONS.USERS_RESET_PASSWORD
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { newPassword } = body

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      )
    }

    // Validate password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        {
          error:
            'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
        },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update user password
    await prisma.$transaction([
      // Add current password to history
      prisma.passwordHistory.create({
        data: {
          userId: user.id,
          passwordHash: user.password,
        },
      }),
      // Update user password and set mustChangePassword flag
      prisma.user.update({
        where: { id: params.id },
        data: {
          password: hashedPassword,
          mustChangePassword: true,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // Log the action
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PASSWORD_RESET_BY_ADMIN',
          module: 'user_management',
          resourceType: 'User',
          resourceId: params.id,
          newValue: {
            resetBy: session.user.email,
            mustChangePassword: true,
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. User must change password on next login.',
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
