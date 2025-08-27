import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/automation/workflows/[id]/start - Start a workflow instance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { documentId, documentType, initiatedBy } = body;

    if (!documentId || !documentType || !initiatedBy) {
      return NextResponse.json(
        { error: 'Document ID, document type, and initiator are required' },
        { status: 400 }
      );
    }

    // Get workflow definition
    const workflowDef = await prisma.workflowDefinition.findUnique({
      where: { id }
    });

    if (!workflowDef) {
      return NextResponse.json(
        { error: 'Workflow definition not found' },
        { status: 404 }
      );
    }

    if (!workflowDef.isActive) {
      return NextResponse.json(
        { error: 'Workflow is not active' },
        { status: 400 }
      );
    }

    const approvalSteps = workflowDef.approvalSteps as any[];
    
    const result = await prisma.$transaction(async (tx) => {
      // Create workflow instance
      const instance = await tx.workflowInstance.create({
        data: {
          workflowDefId: id,
          documentId,
          documentType,
          totalSteps: approvalSteps.length,
          assignedTo: approvalSteps[0]?.approverId,
          assignedAt: new Date()
        }
      });

      // Create workflow steps
      for (let i = 0; i < approvalSteps.length; i++) {
        const step = approvalSteps[i];
        await tx.workflowStep.create({
          data: {
            instanceId: instance.id,
            stepNumber: i + 1,
            stepName: step.name,
            approverId: step.approverId,
            approverRole: step.role,
            dueDate: step.dueDays ? new Date(Date.now() + step.dueDays * 24 * 60 * 60 * 1000) : null
          }
        });
      }

      // Create audit trail
      await tx.processAudit.create({
        data: {
          processType: 'WORKFLOW_STARTED',
          documentId,
          documentType,
          action: 'WORKFLOW_INITIATED',
          performedBy: initiatedBy,
          details: {
            workflowId: id,
            workflowName: workflowDef.name,
            instanceId: instance.id
          }
        }
      });

      // Queue notification for first approver
      if (approvalSteps[0]) {
        await tx.notificationQueue.create({
          data: {
            type: 'EMAIL',
            recipient: approvalSteps[0].email,
            subject: `${workflowDef.name} - Approval Required`,
            body: `You have a new ${documentType} waiting for your approval. Document ID: ${documentId}`,
            templateData: {
              workflowName: workflowDef.name,
              documentId,
              documentType,
              approverName: approvalSteps[0].name
            }
          }
        });
      }

      return instance;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error starting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to start workflow' },
      { status: 500 }
    );
  }
}
