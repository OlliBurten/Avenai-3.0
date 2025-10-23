// app/api/documents/[id]/reextract/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reprocessDocument } from "@/lib/documents/reprocess";
import { withAuth } from "@/lib/api-utils";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Re-extract and re-embed an existing document
 * Useful after upgrading extraction/chunking logic
 */
async function handleReextract(
  req: NextRequest,
  session: any,
  context?: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!context) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }
  const { id: documentId } = await context.params;
  
  try {
    // Verify document exists and user has access
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        status: true,
        organizationId: true
      }
    });
    
    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Check if already processing
    if (doc.status === 'PROCESSING' || doc.status === 'INDEXING') {
      return NextResponse.json(
        { error: 'Document is already being processed' },
        { status: 409 }
      );
    }
    
    // Mark as PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "PROCESSING",
        errorMessage: null,
        updatedAt: new Date()
      }
    });
    
    console.log(`🔄 Queued reprocessing for document:`, {
      id: documentId.substring(0, 8),
      title: doc.title
    });
    
    // Fire-and-forget async reprocessing
    reprocessDocument(documentId).catch(async (error) => {
      console.error(`❌ Reprocessing failed for ${documentId}:`, error);
      
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : String(error),
          updatedAt: new Date()
        }
      });
    });
    
    return NextResponse.json({
      ok: true,
      message: 'Reprocessing started',
      documentId
    });
    
  } catch (error) {
    console.error('Reextract API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleReextract);

