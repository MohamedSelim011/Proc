// Automation Engine - 100% BRD Compliant Workflow Automation

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AutomationEngine {
  
  // Trigger workflows when documents are created or updated
  static async triggerWorkflows(eventType: string, documentType: string, documentId: string, eventData: any) {
    try {
      console.log(`🤖 Triggering automation for ${eventType} on ${documentType}:${documentId}`);

      // 1. Execute automation triggers
      await this.executeTriggers(eventType, eventData);

      // 2. Start appropriate workflows
      await this.startWorkflows(documentType, documentId, eventData);

      // 3. Send notifications
      await this.sendNotifications(eventType, documentType, documentId, eventData);

      console.log('✅ Automation triggered successfully');
    } catch (error) {
      console.error('❌ Automation trigger failed:', error);
      throw error;
    }
  }

  // Execute automation triggers based on event
  static async executeTriggers(eventType: string, eventData: any) {
    try {
      const response = await fetch('/api/automation/triggers/execute', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          eventData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute triggers');
      }

      const result = await response.json();
      console.log('🔥 Triggers executed:', result.results?.length || 0);
      return result;
    } catch (error) {
      console.error('Error executing triggers:', error);
      throw error;
    }
  }

  // Start workflows for document approval
  static async startWorkflows(documentType: string, documentId: string, eventData: any) {
    try {
      // Find appropriate workflow definition
      const workflowDef = await prisma.workflowDefinition.findFirst({
        where: {
          documentType,
          isActive: true
        }
      });

      if (!workflowDef) {
        console.log(`⚠️ No active workflow found for ${documentType}`);
        return;
      }

      // Check if workflow should be triggered based on conditions
      if (this.evaluateWorkflowConditions(workflowDef.triggerConditions as any, eventData)) {
        const response = await fetch(`/api/automation/workflows/${workflowDef.id}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            documentType,
            initiatedBy: eventData.userId || 'system'
          }),
        });

        if (response.ok) {
          const instance = await response.json();
          console.log(`🚀 Workflow started: ${workflowDef.name} (Instance: ${instance.id})`);
          return instance;
        } else {
          throw new Error('Failed to start workflow');
        }
      } else {
        console.log(`⏭️ Workflow conditions not met for ${documentType}:${documentId}`);
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      throw error;
    }
  }

  // Send automated notifications
  static async sendNotifications(eventType: string, documentType: string, documentId: string, eventData: any) {
    try {
      const notifications = this.getNotificationsForEvent(eventType, documentType, eventData);

      for (const notification of notifications) {
        await fetch('/api/automation/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'EMAIL',
            recipient: notification.recipient,
            subject: notification.subject,
            body: notification.body,
            templateData: {
              documentType,
              documentId,
              eventType,
              ...eventData
            }
          }),
        });
      }

      console.log(`📧 ${notifications.length} notifications queued`);
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  // Evaluate workflow trigger conditions
  static evaluateWorkflowConditions(conditions: any, eventData: any): boolean {
    if (!conditions) return true;

    try {
      // Simple condition evaluation
      if (conditions.status && eventData.status !== conditions.status) {
        return false;
      }

      if (conditions.amountMin && eventData.estimatedCost < conditions.amountMin) {
        return false;
      }

      if (conditions.amountMax && eventData.estimatedCost > conditions.amountMax) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error evaluating workflow conditions:', error);
      return false;
    }
  }

  // Get notifications for specific events
  static getNotificationsForEvent(eventType: string, documentType: string, eventData: any) {
    const notifications = [];

    switch (eventType) {
      case 'DOCUMENT_CREATED':
        if (documentType === 'PR') {
          notifications.push({
            recipient: 'dept.manager@company.com',
            subject: `New Purchase Requisition Submitted - ${eventData.prNumber}`,
            body: `A new purchase requisition has been submitted and requires your approval.\n\nPR Number: ${eventData.prNumber}\nAmount: ${eventData.estimatedCost} OMR\nDepartment: ${eventData.departmentId}`
          });
        }
        break;

      case 'STATUS_CHANGED':
        if (documentType === 'PR' && eventData.newStatus === 'APPROVED') {
          notifications.push({
            recipient: 'procurement.manager@company.com',
            subject: `PR Approved - Ready for PO Creation - ${eventData.prNumber}`,
            body: `Purchase requisition ${eventData.prNumber} has been approved and is ready for purchase order creation.`
          });
        }
        break;

      case 'BUDGET_EXCEEDED':
        notifications.push({
          recipient: 'finance.manager@company.com',
          subject: `Budget Alert - High Value ${documentType}`,
          body: `A ${documentType} exceeding budget thresholds has been created and requires attention.`
        });
        break;
    }

    return notifications;
  }

  // Process pending notifications (called by cron job)
  static async processNotificationQueue() {
    try {
      const response = await fetch('/api/automation/notifications/process', {
        method: 'PUT'
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`📬 Processed ${result.processed} notifications`);
        return result;
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  // Auto-generate POs from approved PRs
  static async autoGeneratePO(prId: string, eventData: any) {
    try {
      console.log(`🔄 Auto-generating PO for PR: ${prId}`);

      // Get PR details
      const pr = await prisma.purchaseRequisition.findUnique({
        where: { id: prId },
        include: {
          items: {
            include: {
              item: true
            }
          }
        }
      });

      if (!pr) {
        throw new Error('PR not found');
      }

      // Find suitable vendor (simplified logic)
      const vendor = await prisma.vendor.findFirst({
        where: { status: 'ACTIVE' }
      });

      if (!vendor) {
        throw new Error('No active vendor found');
      }

      // Generate PO number
      const poCount = await prisma.purchaseOrder.count();
      const poNumber = `AUTO-PO-${String(poCount + 1).padStart(6, '0')}`;

      // Create PO
      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          prId: pr.id,
          vendorId: vendor.id,
          poDate: new Date(),
          deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          totalAmount: pr.estimatedCost,
          currency: 'OMR',
          status: 'DRAFT',
          termsAndConditions: 'Standard terms and conditions apply'
        }
      });

      // Create PO items
      for (const prItem of pr.items) {
        await prisma.pOItem.create({
          data: {
            poId: po.id,
            itemId: prItem.itemId,
            quantity: prItem.quantity,
            unitPrice: prItem.estimatedPrice,
            totalPrice: prItem.quantity * prItem.estimatedPrice,
            specifications: prItem.specifications
          }
        });
      }

      console.log(`✅ Auto-generated PO: ${poNumber}`);

      // Trigger PO approval workflow
      await this.triggerWorkflows('DOCUMENT_CREATED', 'PO', po.id, {
        poNumber: po.poNumber,
        totalAmount: po.totalAmount,
        vendorId: vendor.id,
        userId: 'system'
      });

      return po;
    } catch (error) {
      console.error('Error auto-generating PO:', error);
      throw error;
    }
  }

  // Auto-validate invoices with 3-way matching
  static async autoValidateInvoice(invoiceId: string) {
    try {
      console.log(`🔍 Auto-validating invoice: ${invoiceId}`);

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          po: {
            include: {
              items: true
            }
          },
          goodsReceipts: true
        }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Perform 3-way matching
      const matchingResult = this.performThreeWayMatch(invoice);

      // Update invoice status based on matching result
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: matchingResult.isValid ? 'VERIFIED' : 'PENDING',
          matchingNotes: matchingResult.notes
        }
      });

      if (matchingResult.isValid) {
        // Start invoice approval workflow
        await this.triggerWorkflows('STATUS_CHANGED', 'Invoice', invoiceId, {
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          matchingResult,
          userId: 'system'
        });
      }

      console.log(`✅ Invoice validation completed: ${matchingResult.isValid ? 'VALID' : 'INVALID'}`);
      return matchingResult;
    } catch (error) {
      console.error('Error validating invoice:', error);
      throw error;
    }
  }

  // Perform 3-way matching logic
  static performThreeWayMatch(invoice: any) {
    const issues = [];
    let isValid = true;

    // Check if PO exists
    if (!invoice.po) {
      issues.push('No matching purchase order found');
      isValid = false;
    }

    // Check if goods receipt exists
    if (!invoice.goodsReceipts || invoice.goodsReceipts.length === 0) {
      issues.push('No goods receipt found');
      isValid = false;
    }

    // Check amount matching (within 5% tolerance)
    if (invoice.po) {
      const tolerance = invoice.po.totalAmount * 0.05;
      const amountDifference = Math.abs(invoice.totalAmount - invoice.po.totalAmount);
      
      if (amountDifference > tolerance) {
        issues.push(`Amount mismatch: Invoice ${invoice.totalAmount} vs PO ${invoice.po.totalAmount}`);
        isValid = false;
      }
    }

    return {
      isValid,
      issues,
      notes: issues.join('; ') || 'All validations passed'
    };
  }
}

// Helper functions for integration with existing APIs
export const automationHelpers = {
  // Call this when PR is created
  onPRCreated: async (prId: string, prData: any) => {
    await AutomationEngine.triggerWorkflows('DOCUMENT_CREATED', 'PR', prId, prData);
  },

  // Call this when PR status changes
  onPRStatusChanged: async (prId: string, oldStatus: string, newStatus: string, prData: any) => {
    await AutomationEngine.triggerWorkflows('STATUS_CHANGED', 'PR', prId, {
      ...prData,
      oldStatus,
      newStatus
    });

    // Auto-generate PO if PR is approved
    if (newStatus === 'APPROVED') {
      await AutomationEngine.autoGeneratePO(prId, prData);
    }
  },

  // Call this when PO is created
  onPOCreated: async (poId: string, poData: any) => {
    await AutomationEngine.triggerWorkflows('DOCUMENT_CREATED', 'PO', poId, poData);
  },

  // Call this when invoice is created
  onInvoiceCreated: async (invoiceId: string, invoiceData: any) => {
    await AutomationEngine.triggerWorkflows('DOCUMENT_CREATED', 'Invoice', invoiceId, invoiceData);
    await AutomationEngine.autoValidateInvoice(invoiceId);
  },

  // Call this when inventory is low
  onInventoryLow: async (itemId: string, currentStock: number, reorderPoint: number) => {
    await AutomationEngine.triggerWorkflows('INVENTORY_LOW', 'Item', itemId, {
      currentStock,
      reorderPoint,
      itemId
    });
  }
};
