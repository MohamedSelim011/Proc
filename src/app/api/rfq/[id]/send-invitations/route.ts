import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendRFQInvitationToVendors } from '@/lib/email-service';
import { v4 as uuidv4 } from 'uuid';

// POST /api/rfq/[id]/send-invitations - Send RFQ invitations to selected vendors
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { vendorIds } = body;

    // Fetch RFQ with PR and items
    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        pr: {
          include: {
            items: {
              include: {
                item: true
              }
            }
          }
        },
        invitedVendors: {
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

    // Only send invitations for approved or published RFQs
    if (!['APPROVED', 'PUBLISHED'].includes(rfq.status)) {
      return NextResponse.json(
        { error: 'RFQ must be approved before sending invitations' },
        { status: 400 }
      );
    }

    // Get vendors to invite
    let vendorsToInvite: any[] = [];
    
    if (vendorIds && vendorIds.length > 0) {
      // Use provided vendor IDs
      vendorsToInvite = await prisma.vendor.findMany({
        where: {
          id: {
            in: vendorIds
          }
        }
      });
    } else {
      // Use invited vendors from RFQVendor table
      vendorsToInvite = rfq.invitedVendors.map(inv => inv.vendor);
    }

    if (vendorsToInvite.length === 0) {
      return NextResponse.json(
        { error: 'No vendors to invite. Please add vendors to this RFQ first.' },
        { status: 400 }
      );
    }

    // Create or update RFQResponse records with unique tokens for each vendor
    const vendorsWithTokens = await Promise.all(
      vendorsToInvite.map(async (vendor) => {
        // Check if response already exists
        let response = await prisma.rFQResponse.findUnique({
          where: {
            rfqId_vendorId: {
              rfqId: id,
              vendorId: vendor.id
            }
          }
        });

        // Generate unique token
        const token = uuidv4();

        if (response) {
          // Update existing response with new token
          response = await prisma.rFQResponse.update({
            where: { id: response.id },
            data: {
              submissionToken: token,
              tokenSentAt: new Date(),
              tokenUsed: false
            }
          });
        } else {
          // Create new response record
          response = await prisma.rFQResponse.create({
            data: {
              rfqId: id,
              vendorId: vendor.id,
              submissionToken: token,
              tokenSentAt: new Date(),
              tokenUsed: false,
              status: 'SUBMITTED',
              submittedVia: 'EMAIL_LINK'
            }
          });
        }

        return {
          email: vendor.email || '',
          name: vendor.nameEn,
          submissionToken: token
        };
      })
    );

    // Filter out vendors without email
    const vendorsToEmail = vendorsWithTokens.filter(v => v.email);

    if (vendorsToEmail.length === 0) {
      return NextResponse.json(
        { error: 'No vendors have email addresses configured' },
        { status: 400 }
      );
    }

    // Get base URL from request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Prepare items for email
    const items = rfq.pr?.items.map(item => ({
      name: item.item.nameEn,
      quantity: item.quantity,
      specifications: item.specifications || undefined
    })) || [];

    // Send emails
    const result = await sendRFQInvitationToVendors({
      rfqId: rfq.id,
      rfqNumber: rfq.rfqNumber,
      title: rfq.title,
      description: rfq.description || '',
      closingDate: rfq.closingDate,
      items,
      termsAndConditions: rfq.termsAndConditions || undefined,
      vendors: vendorsToEmail,
      baseUrl
    });

    // Update RFQ status to PUBLISHED if it was APPROVED
    if (rfq.status === 'APPROVED') {
      await prisma.rFQ.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          updatedAt: new Date()
        }
      });
    }

    // Create process audit entry
    await prisma.processAudit.create({
      data: {
        processType: 'RFQ_INVITATIONS_SENT',
        documentId: rfq.id,
        documentType: 'RFQ',
        action: 'INVITATIONS_SENT',
        performedBy: body.sentBy || 'SYSTEM',
        details: {
          rfqNumber: rfq.rfqNumber,
          vendorsInvited: vendorsToEmail.length,
          successCount: result.success,
          failedCount: result.failed,
          errors: result.errors
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      message: 'RFQ invitations sent successfully',
      success: result.success,
      failed: result.failed,
      errors: result.errors,
      totalVendors: vendorsToEmail.length
    });
  } catch (error) {
    console.error('Error sending RFQ invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send RFQ invitations' },
      { status: 500 }
    );
  }
}

