import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deleteFileFromS3 } from '@/lib/s3-storage';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params;

    const document = await prisma.purchaseOrderDocument.findFirst({
      where: {
        id: documentId,
        poId: id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    try {
      await deleteFileFromS3(document.storageKey);
    } catch (error) {
      const errorName = (error as { name?: string })?.name;
      // If object is already missing in bucket, still allow DB cleanup.
      if (errorName !== 'NoSuchKey') {
        console.error('Failed to delete file from S3:', error);
        return NextResponse.json(
          { error: 'Failed to delete document from S3 bucket. Database record was not removed.' },
          { status: 500 }
        );
      }
    }

    await prisma.purchaseOrderDocument.delete({
      where: { id: document.id },
    });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting PO document:', error);
    return NextResponse.json({ error: 'Failed to delete PO document' }, { status: 500 });
  }
}
