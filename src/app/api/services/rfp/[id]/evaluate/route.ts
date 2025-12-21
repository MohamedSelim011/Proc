import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { responseId, scores } = body;

    if (!responseId || !scores) {
      return NextResponse.json(
        { error: 'Response ID and scores are required' },
        { status: 400 }
      );
    }

    // Find the RFP and response
    const rfp = await prisma.serviceRFP.findUnique({
      where: { id },
      include: { responses: true }
    });

    if (!rfp) {
      return NextResponse.json(
        { error: 'Service RFP not found' },
        { status: 404 }
      );
    }

    const response = await prisma.serviceRFPResponse.findUnique({
      where: { id: responseId }
    });

    if (!response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Prevent re-evaluation of already reviewed proposals
    if (response.status === 'REVIEWED' || response.status === 'SELECTED') {
      return NextResponse.json(
        { error: 'This proposal has already been evaluated and cannot be evaluated again' },
        { status: 400 }
      );
    }

    // Parse evaluation criteria to get weights
    const criteria = rfp.evaluationCriteria ? JSON.parse(rfp.evaluationCriteria as string) : [];
    
    // Map criteria names to database field names
    const fieldMapping: Record<string, string> = {
      'technicalcompliance': 'technicalScore',
      'technical': 'technicalScore',
      'commercialproposal': 'commercialScore',
      'commercial': 'commercialScore',
      'experience&references': 'experienceScore',
      'experience': 'experienceScore',
      'resourceavailability': 'deliveryScore',
      'delivery': 'deliveryScore',
      'resource': 'deliveryScore'
    };
    
    // Calculate overall weighted score
    let overallScore = 0;
    const updateData: any = {
      status: 'REVIEWED'
    };

    criteria.forEach((c: any) => {
      const key = c.name.toLowerCase().replace(/\s+/g, '');
      const score = scores[key] || 0;
      const weight = c.weight || 0;
      
      // Map to actual database field
      const dbField = fieldMapping[key];
      if (dbField) {
        updateData[dbField] = score;
      }
      
      // Calculate weighted contribution
      overallScore += (score * weight) / 100;
    });

    updateData.overallScore = overallScore.toString();

    // Update response with scores
    await prisma.serviceRFPResponse.update({
      where: { id: responseId },
      data: updateData
    });

    // Check if all submitted responses have been scored
    const allResponses = rfp.responses.filter(r => r.tokenUsed && r.proposalFileUrl);
    const allScored = allResponses.every(r => 
      r.id === responseId || r.status === 'REVIEWED' || r.status === 'SELECTED'
    );

    // If all responses are scored, update RFP status to EVALUATED
    if (allScored && (rfp.status === 'PUBLISHED' || rfp.status === 'SENT')) {
      await prisma.serviceRFP.update({
        where: { id },
        data: { status: 'EVALUATED' }
      });
    }

    return NextResponse.json({ 
      message: 'Scores submitted successfully',
      overallScore: overallScore.toFixed(2)
    });

  } catch (error) {
    console.error('Error submitting scores:', error);
    return NextResponse.json(
      { error: 'Failed to submit scores' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the RFP with responses
    const rfp = await prisma.serviceRFP.findUnique({
      where: { id },
      include: {
        responses: {
          include: {
            vendor: true
          }
        }
      }
    });

    if (!rfp) {
      return NextResponse.json(
        { error: 'Service RFP not found' },
        { status: 404 }
      );
    }

    // Return responses with scores
    const fieldMapping: Record<string, string> = {
      'technicalcompliance': 'technicalScore',
      'technical': 'technicalScore',
      'commercialproposal': 'commercialScore',
      'commercial': 'commercialScore',
      'experience&references': 'experienceScore',
      'experience': 'experienceScore',
      'resourceavailability': 'deliveryScore',
      'delivery': 'deliveryScore',
      'resource': 'deliveryScore'
    };
    
    const scoredResponses = rfp.responses.map(response => {
      const criteria = rfp.evaluationCriteria ? JSON.parse(rfp.evaluationCriteria as string) : [];
      const scores: any = {};
      
      criteria.forEach((c: any) => {
        const key = c.name.toLowerCase().replace(/\s+/g, '');
        const dbField = fieldMapping[key];
        if (dbField) {
          scores[key] = (response as any)[dbField] || null;
        }
      });

      return {
        id: response.id,
        vendor: response.vendor,
        scores,
        overallScore: response.overallScore,
        status: response.status
      };
    });

    return NextResponse.json({ responses: scoredResponses });

  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    );
  }
}

