import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// POST /api/upload - Upload files
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const uploadType = formData.get('type') as string || 'general';
    const entityId = formData.get('entityId') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file types and sizes
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const uploadedFiles = [];

    for (const file of files) {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed` },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = path.extname(file.name);
      const fileName = `${timestamp}_${randomString}${fileExtension}`;

      // Create upload directory structure
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', uploadType);
      const entityDir = entityId ? path.join(uploadDir, entityId) : uploadDir;

      if (!existsSync(entityDir)) {
        await mkdir(entityDir, { recursive: true });
      }

      // Save file
      const filePath = path.join(entityDir, fileName);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      await writeFile(filePath, buffer);

      // Generate public URL
      const publicUrl = entityId 
        ? `/uploads/${uploadType}/${entityId}/${fileName}`
        : `/uploads/${uploadType}/${fileName}`;

      uploadedFiles.push({
        originalName: file.name,
        fileName,
        filePath: publicUrl,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

// GET /api/upload - Get upload configuration and limits
export async function GET() {
  try {
    const config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        {
          type: 'application/pdf',
          extension: '.pdf',
          description: 'PDF Document'
        },
        {
          type: 'image/jpeg',
          extension: '.jpg,.jpeg',
          description: 'JPEG Image'
        },
        {
          type: 'image/png',
          extension: '.png',
          description: 'PNG Image'
        },
        {
          type: 'image/gif',
          extension: '.gif',
          description: 'GIF Image'
        },
        {
          type: 'application/msword',
          extension: '.doc',
          description: 'Word Document (Legacy)'
        },
        {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          extension: '.docx',
          description: 'Word Document'
        },
        {
          type: 'application/vnd.ms-excel',
          extension: '.xls',
          description: 'Excel Spreadsheet (Legacy)'
        },
        {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extension: '.xlsx',
          description: 'Excel Spreadsheet'
        }
      ],
      uploadTypes: [
        {
          type: 'vendor',
          description: 'Vendor Documents',
          subTypes: ['license', 'certificate', 'contract', 'evaluation']
        },
        {
          type: 'purchase-order',
          description: 'Purchase Order Documents',
          subTypes: ['po', 'amendment', 'acknowledgment']
        },
        {
          type: 'invoice',
          description: 'Invoice Documents',
          subTypes: ['invoice', 'receipt', 'payment-proof']
        },
        {
          type: 'goods-receipt',
          description: 'Goods Receipt Documents',
          subTypes: ['delivery-note', 'quality-report', 'photos']
        },
        {
          type: 'rfq',
          description: 'RFQ Documents',
          subTypes: ['rfq', 'response', 'evaluation', 'award']
        },
        {
          type: 'general',
          description: 'General Documents',
          subTypes: ['misc', 'reports', 'correspondence']
        }
      ]
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error getting upload config:', error);
    return NextResponse.json(
      { error: 'Failed to get upload configuration' },
      { status: 500 }
    );
  }
}
