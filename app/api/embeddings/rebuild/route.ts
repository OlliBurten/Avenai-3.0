/**
 * Rebuild Embeddings API Route
 * 
 * Re-processes a document: re-chunks, regenerates embeddings, and upserts to Pinecone
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentProcessor } from "@/lib/document-processor";
import { indexUDoc } from "@/lib/rag/embeddings";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    // Get organization from user membership
    const membership = await prisma.memberships.findFirst({
      where: { userId: (session.user as any).id },
      include: { org: true }
    });
    
    const organizationId = membership?.org?.id;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Get the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Update status to processing
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    try {
      // Re-process the document
      const processor = new DocumentProcessor();
      const result = await processor.processDocument(
        documentId,
        "", // No raw text available for rebuild - processor will handle this
        organizationId,
        document.datasetId || undefined,
        document.title
      );

      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...(document.metadata as object || {}),
            chunkCount: result.chunkCount,
            embedded: result.embedded,
            processingTime: Date.now(),
            rebuilt: true
          }
        }
      });

      return NextResponse.json({
        success: true,
        documentId,
        status: 'COMPLETED',
        chunkCount: result.chunkCount,
        embedded: result.embedded
      });

    } catch (error) {
      console.error('Rebuild failed:', error);
      
      // Update document status to error
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          status: 'FAILED',
          metadata: {
            ...(document.metadata as object || {}),
            error: error instanceof Error ? error.message : 'Unknown error',
            rebuilt: true
          }
        }
      });

      return NextResponse.json({
        success: false,
        documentId,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Rebuild API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
