// app/api/documents/[id]/download/route.ts
// File download endpoint with proper authentication and access control

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { fileStorageService } from '@/lib/storage/file-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req });
    if (!token?.sub || !token.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get document with access control
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: String(token.organizationId),
      },
      select: {
        id: true,
        title: true,
        contentType: true,
        storageUrl: true,
        storageKey: true,
        status: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document is ready for download
    if (document.status !== 'COMPLETED' && document.status !== 'FAILED') {
      return NextResponse.json({ 
        error: 'Document is still being processed',
        status: document.status 
      }, { status: 202 });
    }

    // Get file from storage
    const fileData = await fileStorageService.getFile(documentId);

    // Return file with proper headers
    return new NextResponse(fileData.buffer as any, {
      status: 200,
      headers: {
        'Content-Type': fileData.contentType || document.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.title}"`,
        'Content-Length': fileData.buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'X-Document-ID': documentId,
      },
    });

  } catch (error) {
    console.error('File download error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to download file' 
    }, { status: 500 });
  }
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req });
    if (!token?.sub || !token.organizationId) {
      return new NextResponse(null, { status: 401 });
    }

    const documentId = params.id;
    if (!documentId) {
      return new NextResponse(null, { status: 400 });
    }

    // Get document metadata
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: String(token.organizationId),
      },
      select: {
        id: true,
        title: true,
        contentType: true,
        fileSize: true,
        status: true,
      },
    });

    if (!document) {
      return new NextResponse(null, { status: 404 });
    }

    // Return metadata headers
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': document.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.title}"`,
        'Content-Length': document.fileSize ? document.fileSize.toString() : '0',
        'X-Document-ID': documentId,
        'X-Document-Status': document.status,
      },
    });

  } catch (error) {
    console.error('File metadata error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
