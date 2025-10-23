/**
 * Universal Document Ingestion API
 * 
 * Single endpoint for processing all document types with the new
 * universal document processing pipeline.
 */

import { NextRequest, NextResponse } from "next/server";
import { processUpload } from "@/lib/pipeline";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentProcessor } from "@/lib/document-processor";
import { checkSubscriptionLimit, createLimitExceededResponse } from "@/lib/subscription-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  console.log('📄 POST /api/uploads/ingest started');
  
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get organization from user membership
    const membership = await prisma.membership.findFirst({
      where: { userId: (session.user as any).id },
      include: { org: true }
    });
    
    const organizationId = membership?.org?.id;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Check subscription limits
    const limitCheck = await checkSubscriptionLimit(organizationId, 'documents', prisma);
    if (!limitCheck.allowed) {
      const errorResponse = createLimitExceededResponse('documents', limitCheck.current, limitCheck.limit, limitCheck.tier);
      return NextResponse.json(errorResponse, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as unknown as File | null;
    const datasetId = form.get("datasetId") as string | null;
    
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    console.log('📄 Processing file:', { 
      filename: file.name, 
      size: file.size, 
      type: file.type,
      datasetId: datasetId || 'null',
      organizationId: organizationId 
    });

    const buf = Buffer.from(await file.arrayBuffer());
    
    // Process with UDoc pipeline
    const udoc = await processUpload(buf, file.name);
    console.log('📄 UDoc processing completed:', {
      extractor: udoc.meta.extractor,
      coverage: udoc.meta.quality.coveragePct,
      textLength: udoc.md.length,
      warnings: udoc.meta.quality.warnings
    });

    // Create document record
    const document = await prisma.document.create({
      data: {
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        organizationId: organizationId,
        datasetId: datasetId || undefined,
        status: 'PROCESSING',
        contentType: file.type,
        fileSize: BigInt(file.size),
        metadata: {
          extractor: udoc.meta.extractor,
          quality: udoc.meta.quality,
          textLength: udoc.md.length,
          warnings: udoc.meta.quality.warnings
        }
      }
    });

    console.log('📄 Document created:', { id: document.id, status: document.status });

    // Process document for embeddings (async)
    const processor = new DocumentProcessor();
    try {
      const processed = await processor.processDocument(
        document.id, 
        udoc.md, 
        organizationId, 
        datasetId || undefined, 
        document.title
      );

      // Update document status
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...(document.metadata as object || {}),
            chunkCount: processed.chunkCount,
            embedded: processed.embedded,
            processingTime: Date.now() - t0
          }
        }
      });

      console.log('📄 Document processing completed:', {
        id: document.id,
        chunks: processed.chunkCount,
        embedded: processed.embedded,
        time: Date.now() - t0
      });

    } catch (procErr: any) {
      console.error('📄 Document processing failed:', procErr);
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'FAILED',
                  metadata: {
                    ...(document.metadata as object || {}),
                    processingError: String(procErr),
                    processingTime: Date.now() - t0
                  }
        }
      });
    }

    return NextResponse.json({ 
      ok: true, 
      udoc,
      documentId: document.id,
      status: document.status
    });

  } catch (e: any) {
    console.error('📄 UDoc ingestion failed:', e);
    return NextResponse.json({ 
      ok: false, 
      error: String(e?.message || e) 
    }, { status: 500 });
  }
}
