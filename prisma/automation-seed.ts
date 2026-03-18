import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAutomationData() {
  console.log('🤖 Seeding automation data...');

  try {
    console.log('Workflow definitions skipped (workflow models removed)');

    // Create Automation Triggers
    const triggers = await Promise.all([
      // Low Inventory Trigger
      prisma.automationTrigger.create({
        data: {
          name: 'Low Inventory Alert',
          triggerType: 'INVENTORY_LEVEL',
          conditions: {
            field: 'currentStock',
            operator: 'less_than',
            value: 'reorderPoint'
          },
          actions: [
            {
              type: 'CREATE_PR',
              data: {
                itemType: 'STOCK',
                priority: 'HIGH',
                justification: 'Automatic reorder due to low inventory levels',
                requesterId: 'system',
                departmentId: 'procurement'
              }
            },
            {
              type: 'SEND_NOTIFICATION',
              data: {
                type: 'EMAIL',
                recipient: 'procurement.manager@company.com',
                subject: 'Low Inventory Alert - Automatic PR Created',
                body: 'A purchase requisition has been automatically created due to low inventory levels.'
              }
            }
          ]
        }
      }),

      // Budget Threshold Trigger
      prisma.automationTrigger.create({
        data: {
          name: 'High Value PR Alert',
          triggerType: 'BUDGET_THRESHOLD',
          conditions: {
            field: 'estimatedCost',
            operator: 'greater_than',
            value: 50000
          },
          actions: [
            {
              type: 'SEND_NOTIFICATION',
              data: {
                type: 'EMAIL',
                recipient: 'ceo@company.com',
                subject: 'High Value Purchase Requisition Alert',
                body: 'A high-value purchase requisition has been submitted and requires executive attention.'
              }
            },
            {
              type: 'START_WORKFLOW',
              data: {
                workflowType: 'EXECUTIVE_APPROVAL'
              }
            }
          ]
        }
      }),

      // Document Creation Trigger
      prisma.automationTrigger.create({
        data: {
          name: 'PR Submission Auto-Workflow',
          triggerType: 'DOCUMENT_CREATION',
          conditions: {
            field: 'status',
            operator: 'equals',
            value: 'SUBMITTED'
          },
          actions: [
            {
              type: 'START_WORKFLOW',
              data: {
                workflowType: 'PR_APPROVAL'
              }
            }
          ]
        }
      })
    ]);

    console.log('✅ Automation triggers created');

    // Create Approval Matrix
    const approvalMatrix = await Promise.all([
      prisma.approvalMatrix.create({
        data: {
          id: 'pr-dept-manager',
          documentType: 'PR',
          amountMin: 0,
          amountMax: 5000,
          approverRole: 'DEPARTMENT_MANAGER',
          approverLevel: 1
        }
      }),
      prisma.approvalMatrix.create({
        data: {
          id: 'pr-finance-manager',
          documentType: 'PR',
          amountMin: 1000,
          amountMax: 50000,
          approverRole: 'FINANCE_MANAGER',
          approverLevel: 2
        }
      }),
      prisma.approvalMatrix.create({
        data: {
          id: 'pr-general-manager',
          documentType: 'PR',
          amountMin: 10000,
          amountMax: null,
          approverRole: 'GENERAL_MANAGER',
          approverLevel: 3
        }
      }),
      prisma.approvalMatrix.create({
        data: {
          id: 'po-procurement-manager',
          documentType: 'PO',
          amountMin: 0,
          amountMax: null,
          approverRole: 'PROCUREMENT_MANAGER',
          approverLevel: 1
        }
      }),
      prisma.approvalMatrix.create({
        data: {
          id: 'po-finance-manager',
          documentType: 'PO',
          amountMin: 5000,
          amountMax: null,
          approverRole: 'FINANCE_MANAGER',
          approverLevel: 2
        }
      })
    ]);

    console.log('✅ Approval matrix created');

    // Create sample notifications
    const notifications = await Promise.all([
      prisma.notificationQueue.create({
        data: {
          type: 'EMAIL',
          recipient: 'dept.manager@company.com',
          subject: 'Purchase Requisition Approval Required',
          body: 'You have a new purchase requisition waiting for your approval.',
          templateData: {
            documentType: 'PR',
            documentId: 'sample-pr-001',
            amount: 2500,
            requestor: 'John Doe'
          }
        }
      }),
      prisma.notificationQueue.create({
        data: {
          type: 'EMAIL',
          recipient: 'finance.manager@company.com',
          subject: 'High Value Purchase Order Alert',
          body: 'A high-value purchase order has been created and requires your review.',
          templateData: {
            documentType: 'PO',
            documentId: 'sample-po-001',
            amount: 15000,
            vendor: 'ABC Suppliers'
          }
        }
      })
    ]);

    console.log('✅ Sample notifications created');

    console.log('🎉 Automation data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding automation data:', error);
    throw error;
  }
}

// Run the seed function
seedAutomationData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

