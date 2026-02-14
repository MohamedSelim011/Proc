import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Quick fix endpoint to assign required approval roles to users
 * This endpoint assigns:
 * - HEAD_OF_PROCUREMENT to the procurement manager
 * - BILLING_ENGINEER to the finance manager
 */
export async function POST() {
  try {
    // Update procurement manager to HEAD_OF_PROCUREMENT
    const headOfProc = await prisma.user.update({
      where: { email: 'procmgr@wujha.com' },
      data: { role: 'HEAD_OF_PROCUREMENT' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    // Update finance manager to BILLING_ENGINEER
    const billingEng = await prisma.user.update({
      where: { email: 'finance@wujha.com' },
      data: { role: 'BILLING_ENGINEER' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User roles updated successfully!',
      updates: [
        {
          user: headOfProc.name,
          email: headOfProc.email,
          newRole: headOfProc.role
        },
        {
          user: billingEng.name,
          email: billingEng.email,
          newRole: billingEng.role
        }
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
