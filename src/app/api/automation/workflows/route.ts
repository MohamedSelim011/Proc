import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/automation/workflows - Get workflow definitions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentType = searchParams.get('documentType') || '';
    const isActive = searchParams.get('isActive');

    const where: any = {};
    
    if (documentType) {
      where.documentType = documentType;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const workflows = await prisma.workflowDefinition.findMany({
      where,
      include: {
        instances: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        _count: {
          select: {
            instances: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// POST /api/automation/workflows - Create workflow definition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      workflowType,
      documentType,
      triggerConditions,
      approvalSteps,
      notifications
    } = body;

    if (!name || !workflowType || !documentType || !approvalSteps) {
      return NextResponse.json(
        { error: 'Name, workflow type, document type, and approval steps are required' },
        { status: 400 }
      );
    }

    const workflow = await prisma.workflowDefinition.create({
      data: {
        name,
        description,
        workflowType,
        documentType,
        triggerConditions: triggerConditions || {},
        approvalSteps,
        notifications: notifications || {}
      }
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
