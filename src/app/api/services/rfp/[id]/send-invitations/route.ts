import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendServiceRFPInvitationToVendors } from '@/lib/email-service';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sentBy } = body;

    // Fetch the Service RFP with all details
    const rfp = await prisma.serviceRFP.findUnique({
      where: { id },
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
        },
        invitedVendors: {
          include: {
            vendor: true
          }
        },
        responses: true
      }
    });

    if (!rfp) {
      return NextResponse.json(
        { error: 'Service RFP not found' },
        { status: 404 }
      );
    }

    // Only send invitations for DRAFT, APPROVED or PUBLISHED RFPs
    if (!['DRAFT', 'APPROVED', 'PUBLISHED'].includes(rfp.status)) {
      return NextResponse.json(
        { error: 'Service RFP must be in DRAFT, APPROVED or PUBLISHED status before sending invitations' },
        { status: 400 }
      );
    }

    if (!rfp.invitedVendors || rfp.invitedVendors.length === 0) {
      return NextResponse.json(
        { error: 'No vendors have been invited to this Service RFP' },
        { status: 400 }
      );
    }

    // Generate submission tokens for each vendor
    const vendorData = await Promise.all(
      rfp.invitedVendors.map(async (invitation) => {
        // Check if response already exists
        const existingResponse = rfp.responses.find(
          (r) => r.vendorId === invitation.vendorId
        );

        let token = existingResponse?.submissionToken;
        
        if (!token) {
          // Generate new token
          token = crypto.randomBytes(32).toString('hex');
          
          // Create response record with token - PENDING status until they submit
          await prisma.serviceRFPResponse.create({
            data: {
              rfpId: rfp.id,
              vendorId: invitation.vendorId,
              submissionToken: token,
              tokenSentAt: new Date(),
              status: 'PENDING', // PENDING until vendor actually submits
              tokenUsed: false
            }
          });
        }

        const submissionLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/rfp/submit/${rfp.id}/${token}`;
        
        return {
          email: invitation.vendor.email,
          name: invitation.vendor.nameEn,
          submissionToken: token
        };
      })
    );

    // Send emails to all vendors
    const emailResults = await sendServiceRFPInvitationToVendors({
      rfpId: rfp.id,
      rfpNumber: rfp.rfpNumber,
      title: rfp.title,
      description: rfp.description || '',
      closingDate: rfp.closingDate,
      scopeOfWork: rfp.pr?.servicePR?.serviceScope || '',
      items: rfp.pr?.servicePR?.items || [],
      evaluationCriteria: rfp.evaluationCriteria ? JSON.parse(rfp.evaluationCriteria as string) : [],
      termsAndConditions: rfp.termsAndConditions ? JSON.parse(rfp.termsAndConditions as string) : {},
      vendors: vendorData,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
    });

    // Update RFP status to PUBLISHED
    await prisma.serviceRFP.update({
      where: { id: rfp.id },
      data: { status: 'PUBLISHED' }
    });

    // Create audit entry
    await prisma.processAudit.create({
      data: {
        processType: 'SERVICE_RFP_INVITATION_SENT',
        documentId: rfp.id,
        documentType: 'SERVICE_RFP',
        action: 'INVITATIONS_SENT',
        performedBy: sentBy || 'SYSTEM',
        details: {
          vendorCount: vendorData.length,
          successCount: emailResults.success,
          failureCount: emailResults.failed
        }
      }
    });

    return NextResponse.json(
      {
        message: 'Service RFP invitations sent successfully',
        success: emailResults.success,
        failed: emailResults.failed,
        total: vendorData.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending Service RFP invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send Service RFP invitations' },
      { status: 500 }
    );
  }
}
