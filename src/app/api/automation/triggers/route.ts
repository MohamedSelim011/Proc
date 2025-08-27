import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/automation/triggers - Get automation triggers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const triggerType = searchParams.get('triggerType');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    
    if (triggerType) {
      where.triggerType = triggerType;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const triggers = await prisma.automationTrigger.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ triggers });
  } catch (error) {
    console.error('Error fetching triggers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch triggers' },
      { status: 500 }
    );
  }
}

// POST /api/automation/triggers - Create automation trigger
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      triggerType,
      conditions,
      actions,
      targetWorkflow
    } = body;

    if (!name || !triggerType || !conditions || !actions) {
      return NextResponse.json(
        { error: 'Name, trigger type, conditions, and actions are required' },
        { status: 400 }
      );
    }

    const trigger = await prisma.automationTrigger.create({
      data: {
        name,
        triggerType,
        conditions,
        actions,
        targetWorkflow
      }
    });

    return NextResponse.json(trigger, { status: 201 });
  } catch (error) {
    console.error('Error creating trigger:', error);
    return NextResponse.json(
      { error: 'Failed to create trigger' },
      { status: 500 }
    );
  }
}

// POST /api/automation/triggers/execute - Execute triggers (called by system events)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, eventData } = body;

    if (!eventType || !eventData) {
      return NextResponse.json(
        { error: 'Event type and data are required' },
        { status: 400 }
      );
    }

    // Get active triggers that match the event type
    const triggers = await prisma.automationTrigger.findMany({
      where: {
        isActive: true,
        triggerType: mapEventTypeToTriggerType(eventType)
      }
    });

    const results = [];

    for (const trigger of triggers) {
      try {
        // Evaluate trigger conditions
        if (evaluateTriggerConditions(trigger.conditions as any, eventData)) {
          // Execute trigger actions
          const actionResults = await executeTriggerActions(trigger.actions as any, eventData, trigger.targetWorkflow);
          
          // Update trigger statistics
          await prisma.automationTrigger.update({
            where: { id: trigger.id },
            data: {
              lastTriggered: new Date(),
              triggerCount: { increment: 1 }
            }
          });

          results.push({
            triggerId: trigger.id,
            triggerName: trigger.name,
            executed: true,
            actions: actionResults
          });
        }
      } catch (error) {
        console.error(`Error executing trigger ${trigger.id}:`, error);
        results.push({
          triggerId: trigger.id,
          triggerName: trigger.name,
          executed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error executing triggers:', error);
    return NextResponse.json(
      { error: 'Failed to execute triggers' },
      { status: 500 }
    );
  }
}

// Helper functions
function mapEventTypeToTriggerType(eventType: string): string {
  const mapping: Record<string, string> = {
    'INVENTORY_LOW': 'INVENTORY_LEVEL',
    'BUDGET_EXCEEDED': 'BUDGET_THRESHOLD',
    'DOCUMENT_CREATED': 'DOCUMENT_CREATION',
    'STATUS_CHANGED': 'STATUS_CHANGE'
  };
  return mapping[eventType] || eventType;
}

function evaluateTriggerConditions(conditions: any, eventData: any): boolean {
  try {
    // Simple condition evaluation - in production, use a proper rule engine
    if (conditions.field && conditions.operator && conditions.value !== undefined) {
      const fieldValue = getNestedValue(eventData, conditions.field);
      
      switch (conditions.operator) {
        case 'equals':
          return fieldValue === conditions.value;
        case 'greater_than':
          return Number(fieldValue) > Number(conditions.value);
        case 'less_than':
          return Number(fieldValue) < Number(conditions.value);
        case 'contains':
          return String(fieldValue).includes(String(conditions.value));
        default:
          return false;
      }
    }

    // Multiple conditions with AND/OR logic
    if (conditions.logic && conditions.rules) {
      const results = conditions.rules.map((rule: any) => evaluateTriggerConditions(rule, eventData));
      
      if (conditions.logic === 'AND') {
        return results.every(Boolean);
      } else if (conditions.logic === 'OR') {
        return results.some(Boolean);
      }
    }

    return true; // Default to true if no conditions specified
  } catch (error) {
    console.error('Error evaluating conditions:', error);
    return false;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

async function executeTriggerActions(actions: any[], eventData: any, targetWorkflow?: string): Promise<any[]> {
  const results = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'CREATE_PR':
          const pr = await createAutomaticPR(action.data, eventData);
          results.push({ type: 'CREATE_PR', success: true, data: pr });
          break;

        case 'SEND_NOTIFICATION':
          await queueNotification(action.data, eventData);
          results.push({ type: 'SEND_NOTIFICATION', success: true });
          break;

        case 'START_WORKFLOW':
          if (targetWorkflow) {
            // Start workflow would be implemented here
            results.push({ type: 'START_WORKFLOW', success: true, workflowId: targetWorkflow });
          }
          break;

        case 'UPDATE_STATUS':
          await updateDocumentStatus(action.data, eventData);
          results.push({ type: 'UPDATE_STATUS', success: true });
          break;

        default:
          results.push({ type: action.type, success: false, error: 'Unknown action type' });
      }
    } catch (error) {
      results.push({ 
        type: action.type, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return results;
}

async function createAutomaticPR(actionData: any, eventData: any): Promise<any> {
  // Create PR based on trigger data
  const prData = {
    prNumber: `AUTO-PR-${Date.now()}`,
    requesterId: actionData.requesterId || 'system',
    departmentId: actionData.departmentId || eventData.departmentId,
    itemType: actionData.itemType || 'STOCK',
    priority: actionData.priority || 'NORMAL',
    estimatedCost: actionData.estimatedCost || 0,
    budgetCode: actionData.budgetCode || eventData.budgetCode,
    justification: actionData.justification || 'Automatically generated based on trigger conditions'
  };

  return await prisma.purchaseRequisition.create({
    data: prData
  });
}

async function queueNotification(actionData: any, eventData: any): Promise<void> {
  await prisma.notificationQueue.create({
    data: {
      type: actionData.type || 'EMAIL',
      recipient: actionData.recipient,
      subject: actionData.subject || 'Automated Notification',
      body: actionData.body || 'This is an automated notification.',
      templateData: {
        ...actionData.templateData,
        eventData
      }
    }
  });
}

async function updateDocumentStatus(actionData: any, eventData: any): Promise<void> {
  const { documentType, documentId, newStatus } = actionData;
  
  switch (documentType) {
    case 'PR':
      await prisma.purchaseRequisition.update({
        where: { id: documentId || eventData.documentId },
        data: { status: newStatus }
      });
      break;
    case 'PO':
      await prisma.purchaseOrder.update({
        where: { id: documentId || eventData.documentId },
        data: { status: newStatus }
      });
      break;
    case 'Invoice':
      await prisma.invoice.update({
        where: { id: documentId || eventData.documentId },
        data: { status: newStatus }
      });
      break;
  }
}
