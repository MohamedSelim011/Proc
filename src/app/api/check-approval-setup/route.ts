import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Check 1: Approval Rules for SERVICE_CONTRACT
    const rules = await prisma.approvalRule.findMany({
      where: {
        documentType: 'SERVICE_CONTRACT',
        isActive: true
      },
      include: {
        routings: {
          orderBy: { level: 'asc' }
        }
      }
    });

    // Check 2: Users with required roles
    const headOfProcurement = await prisma.user.findMany({
      where: {
        role: 'HEAD_OF_PROCUREMENT',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    const billingEngineers = await prisma.user.findMany({
      where: {
        role: 'BILLING_ENGINEER',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    // Check 3: All approval rules
    const allRules = await prisma.approvalRule.findMany({
      select: {
        id: true,
        documentType: true,
        name: true,
        isActive: true,
        priority: true
      },
      orderBy: {
        documentType: 'asc'
      }
    });

    // Diagnosis
    const hasRules = rules.length > 0;
    const hasHeadOfProcurement = headOfProcurement.length > 0;
    const hasBillingEngineer = billingEngineers.length > 0;
    
    let diagnosis = '';
    let problems = [];
    
    if (!hasRules) {
      problems.push({
        issue: 'No SERVICE_CONTRACT approval rule found',
        solution: 'Run quick-fix-approval-rule.sql in your database'
      });
    }
    if (!hasHeadOfProcurement) {
      problems.push({
        issue: 'No users with HEAD_OF_PROCUREMENT role',
        solution: 'Update a user to have HEAD_OF_PROCUREMENT role'
      });
    }
    if (!hasBillingEngineer) {
      problems.push({
        issue: 'No users with BILLING_ENGINEER role',
        solution: 'Update a user to have BILLING_ENGINEER role'
      });
    }

    if (problems.length === 0) {
      diagnosis = '✅ All requirements met! Contract approval should work.';
    } else {
      diagnosis = `❌ Found ${problems.length} issue(s) preventing contract approval`;
    }

    return NextResponse.json({
      success: problems.length === 0,
      diagnosis,
      problems,
      details: {
        serviceContractRules: {
          count: rules.length,
          rules: rules.map(r => ({
            id: r.id,
            name: r.name,
            priority: r.priority,
            routingLevels: r.routings.map(rt => ({
              level: rt.level,
              role: rt.approverRole,
              raciType: rt.raciType
            }))
          }))
        },
        users: {
          headOfProcurement: {
            count: headOfProcurement.length,
            users: headOfProcurement.map(u => ({
              name: u.name,
              email: u.email
            }))
          },
          billingEngineers: {
            count: billingEngineers.length,
            users: billingEngineers.map(u => ({
              name: u.name,
              email: u.email
            }))
          }
        },
        allApprovalRules: allRules.map(r => ({
          documentType: r.documentType,
          name: r.name,
          isActive: r.isActive
        }))
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error checking approval setup:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
