import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { UserRole } from '@prisma/client'

// GET all users (with filters)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const department = searchParams.get('department')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}

    if (role) {
      where.role = role
    }

    if (department) {
      where.department = department
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        employeeId: true,
        department: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        approvalLimit: true,
        mustChangePassword: true,
        mobile: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasAccess = await hasPermission(
      session.user.role as UserRole,
      PERMISSIONS.USERS_CREATE
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      email,
      name,
      employeeId,
      department,
      role,
      mobile,
      approvalLimit,
      password,
      mustChangePassword = true,
    } = body

    // Validate required fields
    if (!email || !name || !employeeId || !department || !role || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        employeeId,
        department,
        role,
        mobile: mobile || null,
        approvalLimit: approvalLimit ? parseFloat(approvalLimit) : null,
        isActive: true,
        mustChangePassword,
        createdBy: session.user.id,
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
        action: 'USER_CREATED',
        module: 'user_management',
        resourceType: 'User',
        resourceId: user.id,
        newValue: {
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
