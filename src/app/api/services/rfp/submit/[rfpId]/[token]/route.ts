import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rfpId: string; token: string }> }
) {
  try {
    const { rfpId, token } = await params;

    // Find the response by submission token
    const response = await prisma.serviceRFPResponse.findUnique({
      where: { submissionToken: token },
      include: {
        rfp: {
          include: {
            pr: {
              include: {
                servicePR: {
                  include: {
                    items: {
                      include: {
                        serviceItem: {
                          include: {
                            serviceCategory: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        vendor: true
      }
    });

    if (!response || response.rfpId !== rfpId) {
      return NextResponse.json(
        { error: 'Invalid submission link' },
        { status: 404 }
      );
    }

    // Check if already submitted
    if (response.tokenUsed) {
      return NextResponse.json(
        { 
          error: 'You have already submitted a proposal for this RFP',
          alreadySubmitted: true 
        },
        { status: 400 }
      );
    }

    // Check if RFP is still open
    // closingDate is stored in the database, compare with current time
    const closingDate = new Date(response.rfp.closingDate);
    const now = new Date();
    const isOpen = closingDate > now;
    
    console.log('RFP closing date check (GET):', {
      closingDate: closingDate.toISOString(),
      now: now.toISOString(),
      isOpen,
      closingDateLocal: closingDate.toLocaleString(),
      nowLocal: now.toLocaleString()
    });

    return NextResponse.json({
      id: response.rfp.id,
      rfpNumber: response.rfp.rfpNumber,
      title: response.rfp.title,
      description: response.rfp.description,
      closingDate: response.rfp.closingDate,
      evaluationCriteria: response.rfp.evaluationCriteria,
      pr: response.rfp.pr,
      isOpen
    });

  } catch (error) {
    console.error('Error fetching RFP details:', error);
    return NextResponse.json(
      { error: 'Failed to load RFP details' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rfpId: string; token: string }> }
) {
  try {
    const { rfpId, token } = await params;

    // Find the response by submission token
    const response = await prisma.serviceRFPResponse.findUnique({
      where: { submissionToken: token },
      include: {
        rfp: true
      }
    });

    if (!response || response.rfpId !== rfpId) {
      return NextResponse.json(
        { error: 'Invalid submission link' },
        { status: 404 }
      );
    }

    // Check if already submitted
    if (response.tokenUsed) {
      return NextResponse.json(
        { error: 'You have already submitted a proposal for this RFP' },
        { status: 400 }
      );
    }

    // Check if RFP is still open
    // closingDate is stored in the database, compare with current time
    const closingDate = new Date(response.rfp.closingDate);
    const now = new Date();
    const isOpen = closingDate > now;
    
    console.log('RFP closing date check (POST):', {
      closingDate: closingDate.toISOString(),
      now: now.toISOString(),
      isOpen,
      closingDateLocal: closingDate.toLocaleString(),
      nowLocal: now.toLocaleString()
    });
    
    const rfpStatus = response.rfp.status;
    
    if (!isOpen || !['PUBLISHED', 'APPROVED', 'SENT'].includes(rfpStatus)) {
      return NextResponse.json(
        { error: 'This RFP is no longer accepting proposals' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const totalAmount = formData.get('totalAmount') as string;
    const validUntil = formData.get('validUntil') as string;
    const priceBreakdown = formData.get('priceBreakdown') as string;
    const technicalDetails = formData.get('technicalDetails') as string;
    const deliveryTerms = formData.get('deliveryTerms') as string;
    const notes = formData.get('notes') as string;
    const proposalFile = formData.get('proposalFile') as File;

    if (!totalAmount || !validUntil) {
      return NextResponse.json(
        { error: 'Total amount and valid until date are required' },
        { status: 400 }
      );
    }

    // Handle file upload
    let proposalFileUrl = '';
    if (proposalFile && proposalFile.size > 0) {
      const bytes = await proposalFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create upload directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'rfp-proposals');
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (err) {
        console.log('Upload directory already exists or created');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${rfpId}-${response.vendorId}-${timestamp}.pdf`;
      const filepath = join(uploadDir, filename);

      await writeFile(filepath, buffer);
      proposalFileUrl = `/uploads/rfp-proposals/${filename}`;
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Update the response
    await prisma.serviceRFPResponse.update({
      where: { id: response.id },
      data: {
        totalAmount: parseFloat(totalAmount),
        validUntil: new Date(validUntil),
        priceBreakdown,
        technicalDetails,
        deliveryTerms,
        notes,
        proposalFileUrl,
        submittedAt: new Date(),
        tokenUsed: true,
        submissionIp: ip,
        status: 'SUBMITTED'
      }
    });

    // Create audit trail
    await prisma.processAudit.create({
      data: {
        processType: 'SERVICE_RFP_RESPONSE_SUBMISSION',
        documentType: 'SERVICE_RFP_RESPONSE',
        documentId: response.id,
        action: 'PROPOSAL_SUBMITTED',
        performedBy: response.vendorId,
        details: JSON.stringify({
          rfpId,
          totalAmount,
          submittedVia: 'EMAIL_LINK'
        })
      }
    });

    return NextResponse.json({
      message: 'Proposal submitted successfully',
      responseId: response.id
    });

  } catch (error) {
    console.error('Error submitting proposal:', error);
    return NextResponse.json(
      { error: 'Failed to submit proposal' },
      { status: 500 }
    );
  }
}

