import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import { UserRole, RACIType } from '@prisma/client'

/**
 * Create standard approval rule for SERVICE_CONTRACT
 * POST /api/admin/approval-rules/create-contract-rule
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    let user;
    try {
      user = requireAuth(request);
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Check if rule already exists
    const existingRule = await prisma.approvalRule.findFirst({
      where: {
        documentType: 'SERVICE_CONTRACT',
        name: 'Service Contract Approval - Standard'
      }
    })

    if (existingRule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contract approval rule already exists'
        },
        { status: 400 }
      )
    }

    // Create approval rule with routing levels
    const rule = await prisma.approvalRule.create({
      data: {
        name: 'Service Contract Approval - Standard',
        description: 'Standard approval workflow for service contracts: Head of Procurement → Billing Engineer',
        documentType: 'SERVICE_CONTRACT',
        isActive: true,
        priority: 1,
        conditions: {
          minAmount: 0,
          maxAmount: null
        },
        createdBy: user.id,
        routings: {
          create: [
            {
              level: 1,
              approverRole: UserRole.HEAD_OF_PROCUREMENT,
              raciType: RACIType.ACCOUNTABLE,
              isOptional: false,
              timeoutHours: 48
            },
            {
              level: 2,
              approverRole: UserRole.BILLING_ENGINEER,
              raciType: RACIType.ACCOUNTABLE,
              isOptional: false,
              timeoutHours: 24
            }
          ]
        }
      },
      include: {
        routings: {
          orderBy: {
            level: 'asc'
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Contract approval rule created successfully',
      rule
    })
  } catch (error: any) {
    console.error('Error creating contract approval rule:', error)
    
    // Check for specific errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'A rule with these details already exists'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create approval rule'
      },
      { status: 500 }
    )
  }
}
