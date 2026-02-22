import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFileFromS3 } from '@/lib/s3-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params;
    const download = request.nextUrl.searchParams.get('download') === '1';

    const document = await prisma.rFQDocument.findFirst({
      where: {
        id: documentId,
        rfqId: id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let file: { bytes: Uint8Array; contentType: string; contentLength: number } | null = null;
    try {
      file = await getFileFromS3(document.storageKey);
    } catch (s3Error) {
      if (/^https?:\/\//i.test(document.fileUrl)) {
        const fallback = await fetch(document.fileUrl);
        if (fallback.ok) {
          const bytes = new Uint8Array(await fallback.arrayBuffer());
          file = {
            bytes,
            contentType: fallback.headers.get('content-type') || document.fileType || 'application/octet-stream',
            contentLength: bytes.length,
          };
        }
      }

      if (!file) {
        throw s3Error;
      }
    }

    const contentDispositionType = download ? 'attachment' : 'inline';
    return new NextResponse(file.bytes, {
      status: 200,
      headers: {
        'Content-Type': document.fileType || file.contentType,
        'Content-Length': String(file.contentLength),
        'Content-Disposition': `${contentDispositionType}; filename="${encodeURIComponent(document.documentName)}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error reading RFQ document file:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to read document file: ${message}` }, { status: 500 });
  }
}
