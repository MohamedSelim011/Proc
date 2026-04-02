import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFileFromS3 } from '@/lib/s3-storage';

type ProposalAttachmentMeta = {
  storageKey?: string;
  sourceUrl?: string;
  fileName?: string;
  contentType?: string;
};

function parseAttachmentMeta(raw: string | null): ProposalAttachmentMeta | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProposalAttachmentMeta;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return null;
  }
  return null;
}

function extractStorageKeyFromUrl(fileUrl: string): string | null {
  const bucket = process.env.STORAGE_BUCKET_NAME?.trim();
  if (!bucket || !fileUrl) return null;

  const marker = `/${bucket}/`;
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  const key = fileUrl.slice(markerIndex + marker.length).replace(/^\/+/, '');
  return key ? decodeURIComponent(key) : null;
}

function inferFileName(fileUrl: string, meta: ProposalAttachmentMeta | null, responseId: string): string {
  if (meta?.fileName && meta.fileName.trim().length > 0) return meta.fileName.trim();

  const tail = fileUrl.split('?')[0].split('/').pop();
  if (tail && tail.trim().length > 0) return decodeURIComponent(tail);

  return `proposal-${responseId}.pdf`;
}

function inferContentType(fileUrl: string, meta: ProposalAttachmentMeta | null, fallback: string): string {
  if (meta?.contentType && meta.contentType.trim().length > 0) return meta.contentType;

  const normalized = fileUrl.toLowerCase();
  if (normalized.endsWith('.pdf')) return 'application/pdf';

  return fallback;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params;
    const download = request.nextUrl.searchParams.get('download') === '1';

    const response = await prisma.serviceRFPResponse.findFirst({
      where: {
        id: responseId,
        rfpId: id,
      },
      select: {
        id: true,
        proposalFileUrl: true,
        attachments: true,
      },
    });

    if (!response?.proposalFileUrl) {
      return NextResponse.json({ error: 'Proposal document not found' }, { status: 404 });
    }

    const proposalMeta = parseAttachmentMeta(response.attachments);
    const storageKey = proposalMeta?.storageKey || extractStorageKeyFromUrl(response.proposalFileUrl);

    let file: { bytes: Uint8Array; contentType: string; contentLength: number } | null = null;
    if (storageKey) {
      try {
        file = await getFileFromS3(storageKey);
      } catch (error) {
        console.warn('Failed to read proposal from S3 storage key, will fallback to URL fetch/redirect:', error);
      }
    }

    if (!file && /^https?:\/\//i.test(response.proposalFileUrl)) {
      const fallbackResponse = await fetch(response.proposalFileUrl);
      if (fallbackResponse.ok) {
        const bytes = new Uint8Array(await fallbackResponse.arrayBuffer());
        file = {
          bytes,
          contentType:
            fallbackResponse.headers.get('content-type') ||
            inferContentType(response.proposalFileUrl, proposalMeta, 'application/octet-stream'),
          contentLength: bytes.length,
        };
      }
    }

    if (file) {
      const fileName = inferFileName(response.proposalFileUrl, proposalMeta, response.id);
      const contentDispositionType = download ? 'attachment' : 'inline';

      return new NextResponse(file.bytes, {
        status: 200,
        headers: {
          'Content-Type': inferContentType(response.proposalFileUrl, proposalMeta, file.contentType),
          'Content-Length': String(file.contentLength),
          'Content-Disposition': `${contentDispositionType}; filename="${encodeURIComponent(fileName)}"`,
          'Cache-Control': 'private, max-age=300',
        },
      });
    }

    const selfPath = `/api/services/rfp/${id}/responses/${responseId}/proposal`;
    if (response.proposalFileUrl.startsWith(selfPath)) {
      return NextResponse.json({ error: 'Proposal file is unavailable' }, { status: 404 });
    }

    const redirectUrl = new URL(response.proposalFileUrl, request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error reading Service RFP response proposal file:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to read proposal file: ${message}` }, { status: 500 });
  }
}
