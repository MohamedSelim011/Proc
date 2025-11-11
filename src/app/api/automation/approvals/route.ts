import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/automation/approvals - Get pending approvals for user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const approverId = searchParams.get('approverId');
    const status = searchParams.get('status') || 'PENDING';

    if (!approverId) {
      return NextResponse.json(
        { error: 'Approver ID is required' },
        { status: 400 }
      );
    }

    const pendingApprovals = await prisma.workflowStep.findMany({
      where: {
        approverId,
        status: status as any
      },
      include: {
        instance: {
          include: {
            workflowDef: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Enrich with document details
    const enrichedApprovals = await Promise.all(
      pendingApprovals.map(async (approval) => {
        let documentDetails = null;
        
        try {
          switch (approval.instance.documentType) {
            case 'PR':
              documentDetails = await prisma.purchaseRequisition.findUnique({
                where: { id: approval.instance.documentId },
                include: { items: true }
              });
              break;
            case 'PO':
              documentDetails = await prisma.purchaseOrder.findUnique({
                where: { id: approval.instance.documentId },
                include: { vendor: true, items: true }
              });
              break;
            case 'Invoice':
              documentDetails = await prisma.invoice.findUnique({
                where: { id: approval.instance.documentId },
                include: { vendor: true, po: true }
              });
              break;
          }
        } catch (error) {
          console.error(`Error fetching document details for ${approval.instance.documentType}:`, error);
        }

        return {
          ...approval,
          documentDetails
        };
      })
    );

    return NextResponse.json({ approvals: enrichedApprovals });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}

// POST /api/automation/approvals - Process approval action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stepId, action, comments, approverId } = body;

    if (!stepId || !action || !approverId) {
      return NextResponse.json(
        { error: 'Step ID, action, and approver ID are required' },
        { status: 400 }
      );
    }

    if (!['APPROVED', 'REJECTED', 'ESCALATED'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVED, REJECTED, or ESCALATED' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get the workflow step
      const step = await tx.workflowStep.findUnique({
        where: { id: stepId },
        include: {
          instance: {
            include: {
              workflowDef: true,
              steps: {
                orderBy: { stepNumber: 'asc' }
              }
            }
          }
        }
      });

      if (!step) {
        throw new Error('Workflow step not found');
      }

      if (step.approverId !== approverId) {
        throw new Error('Unauthorized: You are not assigned to this approval step');
      }

      if (step.status !== 'PENDING') {
        throw new Error('This step has already been processed');
      }

      // Update the current step
      const updatedStep = await tx.workflowStep.update({
        where: { id: stepId },
        data: {
          status: action === 'APPROVED' ? 'APPROVED' : action === 'REJECTED' ? 'REJECTED' : 'ESCALATED',
          actionTaken: action,
          comments,
          processedAt: new Date()
        }
      });

      // Create audit trail
      await tx.processAudit.create({
        data: {
          processType: 'APPROVAL_ACTION',
          documentId: step.instance.documentId,
          documentType: step.instance.documentType,
          action,
          performedBy: approverId,
          details: {
            stepId,
            stepName: step.stepName,
            comments,
            workflowInstanceId: step.instanceId
          }
        }
      });

      let workflowCompleted = false;
      let nextStep = null;

      if (action === 'APPROVED') {
        // Check if this is the last step
        const isLastStep = step.stepNumber === step.instance.totalSteps;
        
        if (isLastStep) {
          // Complete the workflow
          await tx.workflowInstance.update({
            where: { id: step.instanceId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          });
          workflowCompleted = true;

          // Update document status
          await updateDocumentStatus(tx, step.instance.documentId, step.instance.documentType, 'APPROVED');
        } else {
          // Move to next step
          const nextStepNumber = step.stepNumber + 1;
          nextStep = step.instance.steps.find(s => s.stepNumber === nextStepNumber);
          
          if (nextStep) {
            await tx.workflowStep.update({
              where: { id: nextStep.id },
              data: {
                status: 'PENDING'
              }
            });

            await tx.workflowInstance.update({
              where: { id: step.instanceId },
              data: {
                currentStep: nextStepNumber,
                assignedTo: nextStep.approverId,
                assignedAt: new Date()
              }
            });

            // Queue notification for next approver
            await tx.notificationQueue.create({
              data: {
                type: 'EMAIL',
                recipient: nextStep.approverId, // In real app, get email from user table
                subject: `${step.instance.workflowDef.name} - Approval Required`,
                body: `You have a new ${step.instance.documentType} waiting for your approval. Document ID: ${step.instance.documentId}`,
                templateData: {
                  workflowName: step.instance.workflowDef.name,
                  documentId: step.instance.documentId,
                  documentType: step.instance.documentType,
                  approverName: nextStep.approverId
                }
              }
            });
          }
        }
      } else if (action === 'REJECTED') {
        // Complete workflow as rejected
        await tx.workflowInstance.update({
          where: { id: step.instanceId },
          data: {
            status: 'CANCELLED',
            completedAt: new Date()
          }
        });

        // Update document status
        await updateDocumentStatus(tx, step.instance.documentId, step.instance.documentType, 'REJECTED');

        // Notify requestor
        await tx.notificationQueue.create({
          data: {
            type: 'EMAIL',
            recipient: 'requestor@example.com', // In real app, get from document
            subject: `${step.instance.workflowDef.name} - Request Rejected`,
            body: `Your ${step.instance.documentType} has been rejected. Reason: ${comments}`,
            templateData: {
              workflowName: step.instance.workflowDef.name,
              documentId: step.instance.documentId,
              documentType: step.instance.documentType,
              rejectionReason: comments
            }
          }
        });
      }

      return {
        step: updatedStep,
        workflowCompleted,
        nextStep: nextStep ? {
          id: nextStep.id,
          stepName: nextStep.stepName,
          approverId: nextStep.approverId
        } : null
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process approval' },
      { status: 500 }
    );
  }
}

// Helper function to update document status
async function updateDocumentStatus(tx: any, documentId: string, documentType: string, status: string) {
  try {
    switch (documentType) {
      case 'PR':
        await tx.purchaseRequisition.update({
          where: { id: documentId },
          data: { status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED' }
        });
        break;
      case 'PO':
        await tx.purchaseOrder.update({
          where: { id: documentId },
          data: { status: status === 'APPROVED' ? 'APPROVED' : 'CANCELLED' }
        });
        break;
      case 'Invoice':
        await tx.invoice.update({
          where: { id: documentId },
          data: { status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED' }
        });
        break;
    }
  } catch (error) {
    console.error('Error updating document status:', error);
  }
}
