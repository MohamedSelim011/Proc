import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Verify contract exists
    const contract = await prisma.serviceContract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Service contract not found' },
        { status: 404 }
      );
    }

    // Create milestones
    const createdMilestones = await Promise.all(
      milestones.map(async (milestone: any) => {
        return await prisma.serviceMilestone.create({
          data: {
            contractId,
            name: milestone.title,
            description: milestone.description,
            targetDate: new Date(milestone.dueDate),
            amount: milestone.amount,
            paymentPercentage: milestone.percentage,
            status: milestone.status || 'PENDING',
            milestoneNumber: 1, // This should be calculated based on existing milestones
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