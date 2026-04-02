import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// POST /api/service-milestones - Create new service milestones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, milestones } = body;

    if (!contractId || !milestones || !Array.isArray(milestones)) {
      return NextResponse.json(
        { error: 'Contract ID and milestones array are required' },
        { status: 400 }
      );
    }

    // Verify contract exists and get payment schedule
    const contract = await prisma.serviceContract.findUnique({
      where: { id: contractId },
      include: {
        servicePR: true
      }
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Service contract not found' },
        { status: 404 }
      );
    }

    const paymentSchedule = contract.servicePR?.paymentSchedule;
    if (paymentSchedule && paymentSchedule !== 'MILESTONE') {
      if (milestones.length !== 1) {
        return NextResponse.json(
          { error: 'Only one milestone is allowed for this payment schedule.' },
          { status: 400 }
        );
      }
      const maxValue = Number(contract.serviceAmount ?? contract.totalValue || 0);
      const milestoneAmount = Number(milestones[0]?.amount || 0);
      if (Math.abs(maxValue - milestoneAmount) > 0.01) {
        return NextResponse.json(
          { error: 'Milestone amount must match the service amount.' },
          { status: 400 }
        );
      }
    }

    const maxServiceAmount = Number(contract.serviceAmount ?? contract.totalValue || 0);
    const totalMilestoneAmount = milestones.reduce(
      (sum: number, m: any) => sum + Number(m.amount || 0),
      0
    );
    if (totalMilestoneAmount - maxServiceAmount > 0.01) {
      return NextResponse.json(
        { error: 'Total milestone amount cannot exceed the service amount.' },
        { status: 400 }
      );
    }

    // Create milestones
    const existingCount = await prisma.serviceMilestone.count({
      where: { contractId }
    });
    const createdMilestones = await Promise.all(
      milestones.map(async (milestone: any, index: number) => {
        return await prisma.serviceMilestone.create({
          data: {
            contractId,
            name: milestone.title,
            description: milestone.description,
            targetDate: new Date(milestone.dueDate),
            amount: milestone.amount,
            paymentPercentage:
              paymentSchedule && paymentSchedule !== 'MILESTONE' ? 100 : milestone.percentage,
            milestoneNumber: existingCount + index + 1,
            completionCriteria: milestone.description
          }
        });
      })
    );

    return NextResponse.json({
      message: 'Service milestones created successfully',
      milestones: createdMilestones
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating service milestones:', error);
    return NextResponse.json(
      { error: 'Failed to create service milestones' },
      { status: 500 }
    );
  }
}

// GET /api/service-milestones - Get milestones for a contract
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractId = searchParams.get('contractId');

    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract ID is required' },
        { status: 400 }
      );
    }

    const milestones = await prisma.serviceMilestone.findMany({
      where: { contractId },
      orderBy: { targetDate: 'asc' }
    });

    return NextResponse.json({
      milestones,
      total: milestones.length
    });

  } catch (error) {
    console.error('Error fetching service milestones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service milestones' },
      { status: 500 }
    );
  }
}

// PUT /api/service-milestones - Replace milestones for a contract
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, milestones } = body;

    if (!contractId || !milestones || !Array.isArray(milestones)) {
      return NextResponse.json(
        { error: 'Contract ID and milestones array are required' },
        { status: 400 }
      );
    }

    const contract = await prisma.serviceContract.findUnique({
      where: { id: contractId },
      include: { servicePR: true }
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Service contract not found' },
        { status: 404 }
      );
    }

    const paymentSchedule = contract.servicePR?.paymentSchedule;
    if (paymentSchedule && paymentSchedule !== 'MILESTONE') {
      if (milestones.length !== 1) {
        return NextResponse.json(
          { error: 'Only one milestone is allowed for this payment schedule.' },
          { status: 400 }
        );
      }
      const maxValue = Number(contract.serviceAmount ?? contract.totalValue || 0);
      const milestoneAmount = Number(milestones[0]?.amount || 0);
      if (Math.abs(maxValue - milestoneAmount) > 0.01) {
        return NextResponse.json(
          { error: 'Milestone amount must match the service amount.' },
          { status: 400 }
        );
      }
    }

    const maxServiceAmount = Number(contract.serviceAmount ?? contract.totalValue || 0);
    const totalMilestoneAmount = milestones.reduce(
      (sum: number, m: any) => sum + Number(m.amount || 0),
      0
    );
    if (totalMilestoneAmount - maxServiceAmount > 0.01) {
      return NextResponse.json(
        { error: 'Total milestone amount cannot exceed the service amount.' },
        { status: 400 }
      );
    }

    await prisma.serviceMilestone.deleteMany({
      where: { contractId }
    });

    const createdMilestones = await Promise.all(
      milestones.map(async (milestone: any, index: number) => {
        return await prisma.serviceMilestone.create({
          data: {
            contractId,
            name: milestone.title,
            description: milestone.description,
            targetDate: new Date(milestone.dueDate),
            amount: milestone.amount,
            paymentPercentage:
              paymentSchedule && paymentSchedule !== 'MILESTONE' ? 100 : milestone.percentage,
            milestoneNumber: index + 1,
            completionCriteria: milestone.description
          }
        });
      })
    );

    return NextResponse.json({
      message: 'Service milestones updated successfully',
      milestones: createdMilestones
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating service milestones:', error);
    return NextResponse.json(
      { error: 'Failed to update service milestones' },
      { status: 500 }
    );
  }
}
