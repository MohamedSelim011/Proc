import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { uploadFileToS3 } from '@/lib/s3-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const documents = await prisma.serviceRFPDocument.findMany({
      where: { rfpId: id },
      orderBy: { uploadedAt: 'desc' },
    });

    const mapped = documents.map((doc) => ({
      ...doc,
      fileUrl: `/api/services/rfp/${id}/documents/${doc.id}/file`,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching Service RFP documents:', error);
    return NextResponse.json({ error: 'Failed to fetch Service RFP documents' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType') as string) || null;
    const uploadedBy = (formData.get('uploadedBy') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const rfp = await prisma.serviceRFP.findUnique({
      where: { id },
      select: { id: true, rfpNumber: true },
    });

    if (!rfp) {
      return NextResponse.json({ error: 'Service RFP not found' }, { status: 404 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadFileToS3({
      fileBuffer,
      contentType: file.type,
      originalFileName: file.name,
      folder: `service-rfp/${id}`,
    });

    const document = await prisma.serviceRFPDocument.create({
      data: {
        rfpId: id,
        documentType,
        documentName: file.name,
        fileUrl: uploadResult.url,
        storageKey: uploadResult.key,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        uploadedBy,
      },
    });

    const accessUrl = `/api/services/rfp/${id}/documents/${document.id}/file`;
    const savedDocument = await prisma.serviceRFPDocument.update({
      where: { id: document.id },
      data: { fileUrl: accessUrl },
    });

    return NextResponse.json(savedDocument, { status: 201 });
  } catch (error) {
    console.error('Error uploading Service RFP document:', error);
    return NextResponse.json({ error: 'Failed to upload Service RFP document' }, { status: 500 });
  }
}
