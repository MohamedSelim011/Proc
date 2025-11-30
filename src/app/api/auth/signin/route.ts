import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
      );
      return NextResponse.json(
        { error: { message: `Account is locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute(s).` } },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: { message: 'Your account has been deactivated. Please contact your administrator.' } },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const lockDuration = failedAttempts >= 5 ? 30 : 0;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: lockDuration > 0
            ? new Date(Date.now() + lockDuration * 60 * 1000)
            : null,
        },
      });

      if (failedAttempts >= 5) {
        return NextResponse.json(
          { error: { message: 'Account locked due to multiple failed login attempts. Please try again in 30 minutes.' } },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: { message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        module: 'authentication',
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: null,
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'REQUESTOR', // Fallback to REQUESTOR if role is null
        department: user.department,
        employeeId: user.employeeId,
      },
      jwtSecret,
      { expiresIn: '8h' }
    );

    // Return JSON response with user data and token
    // Client will handle the redirect
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'REQUESTOR',
        department: user.department,
        employeeId: user.employeeId,
      },
      token,
      homePath: '/procurement/dashboard',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { message: 'An error occurred during sign in' } },
      { status: 500 }
    );
  }
}

