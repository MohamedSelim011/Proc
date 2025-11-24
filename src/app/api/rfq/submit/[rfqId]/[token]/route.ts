import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

// POST /api/rfq/submit/[rfqId]/[token] - Submit vendor proposal via unique link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rfqId: string; token: string }> }
) {
  try {
    const { rfqId, token } = await params;
    const formData = await request.formData();

    // Find the RFQ response by token
    const rfqResponse = await prisma.rFQResponse.findUnique({
      where: {
        submissionToken: token
      },
      include: {
        rfq: true,
        vendor: true
      }
    });

    if (!rfqResponse) {
      return NextResponse.json(
        { error: 'Invalid submission link' },
        { status: 404 }
      );
    }

    // Verify RFQ ID matches
    if (rfqResponse.rfqId !== rfqId) {
      return NextResponse.json(
        { error: 'Invalid submission link' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (rfqResponse.tokenUsed) {
      return NextResponse.json(
        { error: 'This submission link has already been used. Each vendor can only submit once.' },
        { status: 400 }
      );
    }

    // Check if RFQ is still open (allow PUBLISHED status)
    if (!['PUBLISHED', 'APPROVED'].includes(rfqResponse.rfq.status)) {
      return NextResponse.json(
        { error: `This RFQ is no longer accepting submissions. Current status: ${rfqResponse.rfq.status}` },
        { status: 400 }
      );
    }

    // Check if submission deadline has passed
    const closingDate = new Date(rfqResponse.rfq.closingDate);
    if (new Date() > closingDate) {
      return NextResponse.json(
        { error: `The submission deadline has passed. Deadline was: ${closingDate.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Extract form data
    const totalAmount = formData.get('totalAmount') as string;
    const validUntil = formData.get('validUntil') as string;
    const priceBreakdown = formData.get('priceBreakdown') as string;
    const technicalDetails = formData.get('technicalDetails') as string;
    const deliveryTerms = formData.get('deliveryTerms') as string;
    const notes = formData.get('notes') as string;
    const proposalFile = formData.get('proposalFile') as File;

    // Validate required fields
    if (!totalAmount || !proposalFile) {
      return NextResponse.json(
        { error: 'Total amount and proposal file are required' },
        { status: 400 }
      );
    }

    // Validate file type (only PDF)
    if (!proposalFile.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (proposalFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must not exceed 10MB' },
        { status: 400 }
      );
    }

    // Create upload directory structure: uploads/rfq-proposals/[rfqId]/[vendorId]/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'rfq-proposals', rfqId, rfqResponse.vendorId);
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFilename = proposalFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `proposal_${timestamp}_${sanitizedFilename}`;
    const filepath = path.join(uploadDir, filename);

    // Write file to disk
    const bytes = await proposalFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Store relative path for database (relative to public directory)
    const relativeFilePath = `/uploads/rfq-proposals/${rfqId}/${rfqResponse.vendorId}/${filename}`;

    // Get client IP address
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Update RFQ response with submission data
    const updatedResponse = await prisma.rFQResponse.update({
      where: {
        id: rfqResponse.id
      },
      data: {
        totalAmount: parseFloat(totalAmount),
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        priceBreakdown: priceBreakdown || null,
        technicalDetails: technicalDetails || null,
        deliveryTerms: deliveryTerms || null,
        notes: notes || null,
        proposalFileUrl: relativeFilePath,
        submittedAt: new Date(),
        tokenUsed: true,
        submissionIp: ip,
        status: 'SUBMITTED'
      },
      include: {
        vendor: true,
        rfq: true
      }
    });

    // Create process audit entry
    await prisma.processAudit.create({
      data: {
        processType: 'RFQ_PROPOSAL_SUBMITTED',
        documentId: rfqId,
        documentType: 'RFQ',
        action: 'PROPOSAL_SUBMITTED',
        performedBy: rfqResponse.vendorId,
        details: {
          rfqNumber: rfqResponse.rfq.rfqNumber,
          vendorName: rfqResponse.vendor.nameEn,
          totalAmount: parseFloat(totalAmount),
          fileName: filename,
          fileSize: proposalFile.size,
          submissionMethod: 'EMAIL_LINK'
        },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      message: 'Proposal submitted successfully',
      response: {
        id: updatedResponse.id,
        rfqNumber: updatedResponse.rfq.rfqNumber,
        vendorName: updatedResponse.vendor.nameEn,
        totalAmount: updatedResponse.totalAmount,
        submittedAt: updatedResponse.submittedAt
      }
    });
  } catch (error) {
    console.error('Error submitting RFQ proposal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to submit proposal: ${errorMessage}. Please try again.` },
      { status: 500 }
    );
  }
}

// GET /api/rfq/submit/[rfqId]/[token] - Verify token and get RFQ details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rfqId: string; token: string }> }
) {
  try {
    const { rfqId, token } = await params;

    // Find the RFQ response by token
    const rfqResponse = await prisma.rFQResponse.findUnique({
      where: {
        submissionToken: token
      },
      include: {
        rfq: {
          include: {
            pr: {
              include: {
                items: {
                  include: {
                    item: true
                  }
                }
              }
            }
          }
        },
        vendor: true
      }
    });

    if (!rfqResponse) {
      return NextResponse.json(
        { error: 'Invalid submission link' },
        { status: 404 }
      );
    }

    // Verify RFQ ID matches
    if (rfqResponse.rfqId !== rfqId) {
      return NextResponse.json(
        { error: 'Invalid submission link' },
        { status: 400 }
      );
    }

    // Check if already submitted
    const alreadySubmitted = rfqResponse.tokenUsed;

    // Check if RFQ is still open
    const isOpen = rfqResponse.rfq.status === 'PUBLISHED' && new Date() <= rfqResponse.rfq.closingDate;

    return NextResponse.json({
      rfq: {
        id: rfqResponse.rfq.id,
        rfqNumber: rfqResponse.rfq.rfqNumber,
        title: rfqResponse.rfq.title,
        description: rfqResponse.rfq.description,
        closingDate: rfqResponse.rfq.closingDate,
        termsAndConditions: rfqResponse.rfq.termsAndConditions,
        items: rfqResponse.rfq.pr?.items.map(item => ({
          name: item.item.nameEn,
          quantity: item.quantity,
          estimatedPrice: item.estimatedPrice,
          specifications: item.specifications
        })) || []
      },
      vendor: {
        name: rfqResponse.vendor.nameEn
      },
      alreadySubmitted,
      isOpen,
      submittedAt: rfqResponse.submittedAt
    });
  } catch (error) {
    console.error('Error fetching RFQ submission details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RFQ details' },
      { status: 500 }
    );
  }
}

