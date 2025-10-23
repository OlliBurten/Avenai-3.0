// app/api/documents/[id]/reingest/route.ts
// API endpoint for re-ingesting a single document

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { reprocessDocument } from '@/lib/documents/reprocess';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;

    // 2. Get document and verify ownership
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        organizationId: true,
        datasetId: true,
        status: true
      }
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // 3. Check if user has access (member of organization)
    const userId = (session.user as any).id;
    const membership = await prisma.memberships.findFirst({
      where: { 
        userId,
        orgId: document.organizationId
      },
      select: { role: true }
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 4. Parse options from request body
    const body = await request.json().catch(() => ({}));
    const pipeline = body.pipeline || 'auto';
    const embeddingBatch = body.embeddingBatch || 128;

    // Set environment variables for processing
    if (pipeline === 'v2') {
      process.env.DOC_WORKER_V2 = 'true';
    } else if (pipeline === 'v1') {
      process.env.DOC_WORKER_V2 = 'false';
    }
    
    if (embeddingBatch) {
      process.env.EMBEDDING_BATCH_SIZE = embeddingBatch.toString();
    }

    console.log(`🔄 API Re-ingestion started: ${documentId}`, {
      title: document.title,
      pipeline,
      embeddingBatch
    });

    // 5. Update status to PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: { 
        status: 'PROCESSING',
        errorMessage: null
      }
    });

    // 6. Re-process document
    const startTime = Date.now();
    
    try {
      await reprocessDocument(documentId);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // 7. Get updated document with metadata coverage
      const updatedDoc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          title: true,
          status: true,
          indexedChunks: true,
          coverage: true
        }
      });

      // 8. Get metadata coverage
      const stats = await prisma.$queryRaw<Array<{
        total: bigint;
        with_section_path: bigint;
        with_element_type: bigint;
        with_verbatim: bigint;
      }>>`
        SELECT 
          COUNT(*) as total,
          COUNT(section_path) as with_section_path,
          COUNT(CASE WHEN metadata->>'element_type' IS NOT NULL THEN 1 END) as with_element_type,
          COUNT(CASE WHEN (metadata->>'has_verbatim')::boolean = true THEN 1 END) as with_verbatim
        FROM document_chunks
        WHERE "documentId" = ${documentId}
      `;

      const row = stats[0];
      const total = Number(row?.total || 0);
      const withSection = Number(row?.with_section_path || 0);
      const withElement = Number(row?.with_element_type || 0);
      const withVerbatim = Number(row?.with_verbatim || 0);

      const metadata = {
        sectionPathCoverage: total > 0 ? ((withSection / total) * 100).toFixed(1) + '%' : '0%',
        elementTypeCoverage: total > 0 ? ((withElement / total) * 100).toFixed(1) + '%' : '0%',
        verbatimCoverage: total > 0 ? ((withVerbatim / total) * 100).toFixed(1) + '%' : '0%'
      };

      console.log(`✅ API Re-ingestion complete: ${documentId}`, {
        duration: `${duration}s`,
        chunks: total,
        metadata
      });

      return NextResponse.json({
        success: true,
        document: updatedDoc,
        metadata,
        duration: `${duration}s`
      });
      
    } catch (processingError: any) {
      console.error(`❌ API Re-ingestion failed: ${documentId}`, processingError);
      
      // Update document with error
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: processingError.message || 'Re-ingestion failed'
        }
      });

      return NextResponse.json(
        {
          success: false,
          error: processingError.message || 'Re-ingestion failed'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ API Re-ingestion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}


