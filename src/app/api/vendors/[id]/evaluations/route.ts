import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/vendors/[id]/evaluations - Get vendor evaluations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evaluations = await prisma.vendorEvaluation.findMany({
      where: { vendorId: params.id },
      orderBy: { evaluationDate: 'desc' }
    });

    // Calculate average scores
    const avgScores = await prisma.vendorEvaluation.aggregate({
      where: { vendorId: params.id },
      _avg: {
        qualityScore: true,
        deliveryScore: true,
        priceScore: true,
        serviceScore: true,
        overallScore: true
      }
    });

    return NextResponse.json({
      evaluations,
      averageScores: avgScores._avg
    });
  } catch (error) {
    console.error('Error fetching vendor evaluations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor evaluations' },
      { status: 500 }
    );
  }
}

// POST /api/vendors/[id]/evaluations - Create vendor evaluation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Calculate overall score
    const overallScore = (
      body.qualityScore + 
      body.deliveryScore + 
      body.priceScore + 
      body.serviceScore
    ) / 4;

    const evaluation = await prisma.vendorEvaluation.create({
      data: {
        vendorId: params.id,
        qualityScore: body.qualityScore,
        deliveryScore: body.deliveryScore,
        priceScore: body.priceScore,
        serviceScore: body.serviceScore,
        overallScore: overallScore,
        comments: body.comments,
        evaluatedBy: body.evaluatedBy
      }
    });

    // Update vendor's performance score
    const avgScore = await prisma.vendorEvaluation.aggregate({
      where: { vendorId: params.id },
      _avg: {
        overallScore: true
      }
    });

    await prisma.vendor.update({
      where: { id: params.id },
      data: {
        performanceScore: avgScore._avg.overallScore
      }
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor evaluation' },
      { status: 500 }
    );
  }
}