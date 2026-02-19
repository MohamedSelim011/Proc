import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const endpoint = process.env.STORAGE_ENDPOINT_URL;
const region = process.env.STORAGE_REGION || 'auto';
const bucket = process.env.STORAGE_BUCKET_NAME;
const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;

function ensureConfig() {
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 storage configuration is missing in environment variables');
  }
}

function buildPublicUrl(key: string) {
  ensureConfig();
  const normalizedEndpoint = endpoint!.replace(/\/+$/, '');
  return `${normalizedEndpoint}/${bucket}/${key}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getClient() {
  ensureConfig();
  return new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
}

export async function uploadFileToS3(params: {
  fileBuffer: Buffer;
  contentType: string;
  originalFileName: string;
  folder: string;
}) {
  const client = getClient();
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).slice(2, 10);
  const safeName = sanitizeFileName(params.originalFileName);
  const key = `${params.folder}/${timestamp}-${randomPart}-${safeName}`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket!,
        Key: key,
        Body: params.fileBuffer,
        ContentType: params.contentType || 'application/octet-stream',
        ACL: 'public-read',
      })
    );
  } catch (error) {
    // Some S3-compatible providers disable ACLs; retry without ACL.
    await client.send(
      new PutObjectCommand({
        Bucket: bucket!,
        Key: key,
        Body: params.fileBuffer,
        ContentType: params.contentType || 'application/octet-stream',
      })
    );
    console.warn('S3 upload retried without ACL:', error);
  }

  return {
    key,
    url: buildPublicUrl(key),
  };
}

export async function deleteFileFromS3(storageKey: string) {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket!,
      Key: storageKey,
    })
  );
}

export async function getFileFromS3(storageKey: string) {
  const client = getClient();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket!,
      Key: storageKey,
    })
  );

  if (!result.Body) {
    throw new Error('File body is empty');
  }

  let bytes: Uint8Array;
  const body = result.Body as unknown as {
    transformToByteArray?: () => Promise<Uint8Array>;
    arrayBuffer?: () => Promise<ArrayBuffer>;
    [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>;
  };

  if (typeof body.transformToByteArray === 'function') {
    bytes = await body.transformToByteArray();
  } else if (typeof body.arrayBuffer === 'function') {
    bytes = new Uint8Array(await body.arrayBuffer());
  } else if (body[Symbol.asyncIterator]) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    bytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
  } else {
    throw new Error('Unsupported S3 body stream type');
  }

  return {
    bytes,
    contentType: result.ContentType || 'application/octet-stream',
    contentLength: Number(result.ContentLength || bytes.length),
  };
}
