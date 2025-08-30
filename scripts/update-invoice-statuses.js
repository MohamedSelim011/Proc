const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateInvoiceStatuses() {
  try {
    console.log('Updating existing invoice statuses...');
    
    // Update PENDING to DRAFT
    const pendingResult = await prisma.invoice.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'DRAFT' }
    });
    console.log(`Updated ${pendingResult.count} invoices from PENDING to DRAFT`);
    
    // Update VERIFIED to SUBMITTED
    const verifiedResult = await prisma.invoice.updateMany({
      where: { status: 'VERIFIED' },
      data: { status: 'SUBMITTED' }
    });
    console.log(`Updated ${verifiedResult.count} invoices from VERIFIED to SUBMITTED`);
    
    console.log('Invoice status updates completed successfully!');
  } catch (error) {
    console.error('Error updating invoice statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateInvoiceStatuses(); 