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

    // Only send invitations for DRAFT, APPROVED, PUBLISHED or SENT RFPs
    if (!['DRAFT', 'APPROVED', 'PUBLISHED', 'SENT'].includes(rfp.status)) {
      return NextResponse.json(
        { error: 'Service RFP must be in DRAFT, APPROVED, PUBLISHED or SENT status before sending invitations' },
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
        // Validate vendor has email
        if (!invitation.vendor.email) {
          console.warn(`Vendor ${invitation.vendor.nameEn} (ID: ${invitation.vendorId}) does not have an email address`);
          return null;
        }

        // Check if response already exists
        const existingResponse = rfp.responses.find(
          (r) => r.vendorId === invitation.vendorId
        );

        let token = existingResponse?.submissionToken;
        
        if (!token) {
          // Generate new token
          token = crypto.randomBytes(32).toString('hex');
          
          // Create response record with token - will be SUBMITTED (default) when vendor actually submits
          await prisma.serviceRFPResponse.create({
            data: {
              rfpId: rfp.id,
              vendorId: invitation.vendorId,
              submissionToken: token,
              tokenSentAt: new Date(),
              tokenUsed: false
            }
          });
        }
        
        return {
          email: invitation.vendor.email,
          name: invitation.vendor.nameEn,
          submissionToken: token
        };
      })
    );

    // Filter out vendors without email addresses
    const validVendorData = vendorData.filter((v): v is { email: string; name: string; submissionToken: string } => v !== null);

    if (validVendorData.length === 0) {
      return NextResponse.json(
        { error: 'No vendors with valid email addresses found. Please ensure all invited vendors have email addresses.' },
        { status: 400 }
      );
    }

    // Parse evaluation criteria
    let evaluationCriteria: Array<{ name: string; weight: number }> = [];
    try {
      if (rfp.evaluationCriteria) {
        const parsed = JSON.parse(rfp.evaluationCriteria as string);
        evaluationCriteria = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error parsing evaluation criteria:', error);
      evaluationCriteria = [];
    }

    // Parse and format terms and conditions
    let termsAndConditionsString: string = '';
    try {
      if (rfp.termsAndConditions) {
        const termsAndConditions = JSON.parse(rfp.termsAndConditions as string);
        
        // Format the object into a readable string
        const formattedTerms: string[] = [];
        
        if (termsAndConditions.serviceLevelAgreements) {
          formattedTerms.push(`Service Level Agreements:\n${termsAndConditions.serviceLevelAgreements}`);
        }
        if (termsAndConditions.penaltyClause) {
          formattedTerms.push(`Penalty Clause:\n${termsAndConditions.penaltyClause}`);
        }
        if (termsAndConditions.insuranceRequirements) {
          formattedTerms.push(`Insurance Requirements:\n${termsAndConditions.insuranceRequirements}`);
        }
        if (termsAndConditions.liabilityTerms) {
          formattedTerms.push(`Liability Terms:\n${termsAndConditions.liabilityTerms}`);
        }
        if (termsAndConditions.confidentialityClause) {
          formattedTerms.push(`Confidentiality Clause:\n${termsAndConditions.confidentialityClause}`);
        }
        if (termsAndConditions.paymentTerms) {
          formattedTerms.push(`Payment Terms:\n${termsAndConditions.paymentTerms}`);
        }
        if (termsAndConditions.contractDuration) {
          formattedTerms.push(`Contract Duration:\n${termsAndConditions.contractDuration}`);
        }
        
        termsAndConditionsString = formattedTerms.join('\n\n');
      }
    } catch (error) {
      console.error('Error parsing terms and conditions:', error);
      termsAndConditionsString = '';
    }

    console.log(`Sending invitations to ${validVendorData.length} vendors for RFP ${rfp.rfpNumber}`);
    const baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_URL || request.headers.get('origin');
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Base URL not found' },
        { status: 500 }
      );
    }
    // Send emails to all vendors
    const emailResults = await sendServiceRFPInvitationToVendors({
      rfpId: rfp.id,
      rfpNumber: rfp.rfpNumber,
      title: rfp.title,
      description: rfp.description || '',
      closingDate: rfp.closingDate,
      scopeOfWork: rfp.pr?.servicePR?.serviceScope || '',
      evaluationCriteria: evaluationCriteria,
      termsAndConditions: termsAndConditionsString || undefined,
      vendors: validVendorData,
      baseUrl
    });

    console.log(`Email sending results: ${emailResults.success} successful, ${emailResults.failed} failed`);
    if (emailResults.errors.length > 0) {
      console.error('Email sending errors:', emailResults.errors);
    }

    // Update RFP status to SENT if at least one email was sent successfully
    if (emailResults.success > 0) {
      await prisma.serviceRFP.update({
        where: { id: rfp.id },
        data: { status: 'SENT' }
      });
    }

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
        total: validVendorData.length,
        errors: emailResults.errors || []
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
