import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/vendors/[id]/documents - Get vendor documents
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documents = await prisma.vendorDocument.findMany({
      where: { vendorId: params.id },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching vendor documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor documents' },
      { status: 500 }
    );
  }
}

// POST /api/vendors/[id]/documents - Upload vendor document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const document = await prisma.vendorDocument.create({
      data: {
        vendorId: params.id,
        documentType: body.documentType,
        documentName: body.documentName,
        fileUrl: body.fileUrl,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null
      }
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor document:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor document' },
      { status: 500 }
    );
  }
}

// DELETE /api/vendors/[id]/documents/[documentId] - Delete vendor document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    await prisma.vendorDocument.delete({
      where: { 
        id: documentId,
        vendorId: params.id 
      }
    });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor document:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor document' },
      { status: 500 }
    );
  }
}