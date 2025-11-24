import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// POST /api/rfq/[id]/evaluate - Evaluate RFQ responses
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { evaluations, evaluatedBy } = body;

    const rfq = await prisma.rFQ.findUnique({
      where: { id: params.id },
      include: {
        responses: {
          include: {
            vendor: true
          }
        }
      }
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    // Check if RFQ can be evaluated
    if (!['CLOSED', 'PUBLISHED', 'APPROVED'].includes(rfq.status)) {
      return NextResponse.json(
        { error: 'RFQ must be closed or published before evaluation' },
        { status: 400 }
      );
    }

    if (rfq.responses.length === 0) {
      return NextResponse.json(
        { error: 'No responses to evaluate' },
        { status: 400 }
      );
    }

    // Validate evaluations
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return NextResponse.json(
        { error: 'Evaluations array is required' },
        { status: 400 }
      );
    }

    // Update responses with scores in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedResponses = [];

      // Get RFQ evaluation criteria
      const criteria = rfq.evaluationCriteria ? JSON.parse(rfq.evaluationCriteria) : { technical: 40, commercial: 30, delivery: 20, experience: 10 };
      
      for (const evaluation of evaluations) {
        const { responseId, technicalScore, commercialScore, deliveryScore, experienceScore, comments } = evaluation;

        // Validate scores
        const scores = [technicalScore, commercialScore, deliveryScore, experienceScore].filter(s => s !== undefined && s !== null);
        for (const score of scores) {
          if (score < 0 || score > 100) {
            throw new Error('Scores must be between 0 and 100');
          }
        }

        // Check if response exists
        const response = rfq.responses.find(r => r.id === responseId);
        if (!response) {
          throw new Error(`Response ${responseId} not found`);
        }

        // Calculate overall weighted score
        let overallScore = 0;
        if (criteria.technical && technicalScore !== undefined && technicalScore !== null) {
          overallScore += (technicalScore * criteria.technical) / 100;
        }
        if (criteria.commercial && commercialScore !== undefined && commercialScore !== null) {
          overallScore += (commercialScore * criteria.commercial) / 100;
        }
        if (criteria.delivery && deliveryScore !== undefined && deliveryScore !== null) {
          overallScore += (deliveryScore * criteria.delivery) / 100;
        }
        if (criteria.experience && experienceScore !== undefined && experienceScore !== null) {
          overallScore += (experienceScore * criteria.experience) / 100;
        }

        // Update response with scores
        const updatedResponse = await tx.rFQResponse.update({
          where: { id: responseId },
          data: {
            technicalScore: technicalScore ?? null,
            commercialScore: commercialScore ?? null,
            deliveryScore: deliveryScore ?? null,
            experienceScore: experienceScore ?? null,
            overallScore: Math.round(overallScore * 100) / 100,
            status: 'REVIEWED'
          },
          include: {
            vendor: true
          }
        });

        updatedResponses.push({
          ...updatedResponse,
          evaluationComments: comments
        });
      }

      return updatedResponses;
    });

    // Calculate rankings
    const rankedResponses = result.map(response => {
      return {
        ...response,
        // Calculate price competitiveness (lower price = higher score)
        priceCompetitiveness: calculatePriceScore(response.totalAmount, result)
      };
    }).sort((a, b) => b.overallScore - a.overallScore);

    // Assign rankings
    rankedResponses.forEach((response, index) => {
      response.rank = index + 1;
    });

    // Create evaluation summary
    const evaluationSummary = {
      totalResponses: rankedResponses.length,
      evaluatedBy,
      evaluatedAt: new Date(),
      topResponse: rankedResponses[0],
      averageScores: {
        technical: rankedResponses.reduce((sum, r) => sum + (r.technicalScore || 0), 0) / rankedResponses.length,
        commercial: rankedResponses.reduce((sum, r) => sum + (r.commercialScore || 0), 0) / rankedResponses.length,
        delivery: rankedResponses.reduce((sum, r) => sum + (r.deliveryScore || 0), 0) / rankedResponses.length,
        experience: rankedResponses.reduce((sum, r) => sum + (r.experienceScore || 0), 0) / rankedResponses.length,
        overall: rankedResponses.reduce((sum, r) => sum + r.overallScore, 0) / rankedResponses.length
      },
      priceRange: {
        lowest: Math.min(...rankedResponses.map(r => Number(r.totalAmount))),
        highest: Math.max(...rankedResponses.map(r => Number(r.totalAmount))),
        average: rankedResponses.reduce((sum, r) => sum + Number(r.totalAmount), 0) / rankedResponses.length
      }
    };

    return NextResponse.json({
      message: 'RFQ evaluation completed successfully',
      evaluationSummary,
      rankedResponses
    });

  } catch (error) {
    console.error('Error evaluating RFQ:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to evaluate RFQ' },
      { status: 500 }
    );
  }
}

// Helper function to calculate price competitiveness score
function calculatePriceScore(amount: any, allResponses: any[]): number {
  const prices = allResponses.map(r => Number(r.totalAmount));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  if (minPrice === maxPrice) return 100; // All same price
  
  // Invert the score so lower price gets higher score
  const normalizedScore = ((maxPrice - Number(amount)) / (maxPrice - minPrice)) * 100;
  return Math.round(normalizedScore * 100) / 100;
}

// GET /api/rfq/[id]/evaluate - Get evaluation results
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: params.id },
      include: {
        responses: {
          include: {
            vendor: true
          },
          orderBy: [
            { technicalScore: 'desc' },
            { commercialScore: 'desc' },
            { totalAmount: 'asc' }
          ]
        }
      }
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ not found' },
        { status: 404 }
      );
    }

    // Check if responses have been evaluated
    const evaluatedResponses = rfq.responses.filter(r => 
      r.technicalScore !== null && r.commercialScore !== null
    );

    if (evaluatedResponses.length === 0) {
      return NextResponse.json({
        message: 'No evaluations found',
        responses: rfq.responses
      });
    }

    // Calculate rankings and scores
    const rankedResponses = evaluatedResponses.map(response => {
      const technicalWeight = 0.6;
      const commercialWeight = 0.4;
      
      const weightedScore = 
        (response.technicalScore * technicalWeight) + 
        (response.commercialScore * commercialWeight);

      return {
        ...response,
        weightedScore,
        priceCompetitiveness: calculatePriceScore(response.totalAmount, evaluatedResponses)
      };
    }).sort((a, b) => b.weightedScore - a.weightedScore);

    rankedResponses.forEach((response, index) => {
      response.rank = index + 1;
    });

    return NextResponse.json({
      rfq,
      evaluationResults: {
        totalEvaluated: rankedResponses.length,
        totalResponses: rfq.responses.length,
        rankedResponses
      }
    });

  } catch (error) {
    console.error('Error fetching evaluation results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation results' },
      { status: 500 }
    );
  }
}
