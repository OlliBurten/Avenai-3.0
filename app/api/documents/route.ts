import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { broadcastDataset } from "@/lib/events";
import { DocumentStatus } from "@prisma/client";
import { fileStorageService } from "@/lib/storage/file-service";

// Quality metrics generation
function generateQualityMetrics(fileType: string, fileName: string) {
  const metrics: any = {};
  
  switch (fileType) {
    case 'pdf':
      metrics.extractor = Math.random() > 0.3 ? 'pdf-text' : 'pdf-ocr';
      metrics.pages = Math.floor(Math.random() * 50) + 1;
      metrics.coverage = Math.floor(Math.random() * 40) + 60; // 60-100%
      metrics.warnings = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0;
      metrics.indexedChunks = Math.floor(Math.random() * 200) + 50;
      break;
    case 'md':
    case 'txt':
      metrics.extractor = 'markdown';
      metrics.coverage = 100;
      metrics.indexedChunks = Math.floor(Math.random() * 100) + 20;
      break;
    case 'json':
      metrics.extractor = 'json';
      metrics.coverage = 100;
      metrics.indexedChunks = Math.floor(Math.random() * 50) + 10;
      break;
    case 'yaml':
    case 'yml':
      metrics.extractor = 'yaml';
      metrics.coverage = 100;
      metrics.indexedChunks = Math.floor(Math.random() * 30) + 5;
      break;
    default:
      metrics.extractor = 'unknown';
      metrics.coverage = Math.floor(Math.random() * 40) + 60;
      metrics.indexedChunks = Math.floor(Math.random() * 50) + 10;
  }
  
  return metrics;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let organizationId: string;

    if (session?.user?.id) {
      const userId = session.user.id;
      const membership = await prisma.memberships.findFirst({
        where: { userId: userId! },
        include: { org: true }
      });

      if (!membership?.org) {
        return NextResponse.json({ ok: false, error: "No organization found" }, { status: 400 });
      }

      organizationId = membership.org.id;
    } else {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const datasetId = searchParams.get('datasetId');
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const cursor = searchParams.get('cursor') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const whereClause: any = {
      organizationId: organizationId
    };

    if (datasetId) {
      whereClause.datasetId = datasetId;
    }

    if (q) {
      whereClause.title = {
        contains: q,
        mode: 'insensitive'
      };
    }

    if (type && type !== 'All') {
      whereClause.contentType = {
        contains: type.toLowerCase()
      };
    }

    if (status && status !== 'All') {
      whereClause.status = status.toUpperCase();
    }

    // Get documents with pagination
    const documents = await prisma.document.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        datasetId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        contentType: true,
        fileSize: true,
        coverage: true,
        indexedChunks: true,
        errorMessage: true,
        tags: true,
        metadata: true,
        storageUrl: true,
        storageKey: true,
        _count: {
          select: {
            documentChunks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 })
    });

    // Convert to the expected format with both legacy and new fields
    const serializedDocuments = documents.map(doc => ({
      id: doc.id,
      name: doc.title,
      title: doc.title,
      datasetId: doc.datasetId,
      type: doc.contentType?.split('/')[1]?.toUpperCase() || 'Unknown',
      contentType: doc.contentType,
      size: doc.fileSize ? Number(doc.fileSize) : 0,
      fileSize: doc.fileSize ? Number(doc.fileSize) : 0,
      status: doc.status,
      coverage: doc.coverage,
      pages: null,
      extractor: null,
      warnings: 0,
      indexedChunks: doc.indexedChunks,
      errorMessage: doc.errorMessage,
      tags: doc.tags,
      metadata: doc.metadata,
      storageUrl: doc.storageUrl,
      storageKey: doc.storageKey,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      downloadUrl: `/api/documents/${doc.id}/download`,
      _count: {
        documentChunks: Number(doc._count.documentChunks)
      }
    }));

    return NextResponse.json({
      ok: true,
      documents: serializedDocuments,
      pagination: {
        hasMore: documents.length === limit,
        nextCursor: documents.length === limit ? documents[documents.length - 1].id : null
      }
    });

  } catch (error: any) {
    console.error('Documents GET error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? "Failed to fetch documents" 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Use getServerSession for database sessions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Get user's organization via membership
    const membership = await prisma.memberships.findFirst({
      where: { userId },
      select: { orgId: true }
    });

    if (!membership) {
      return NextResponse.json({ ok: false, error: "No organization found" }, { status: 404 });
    }

    const organizationId = membership.orgId;

    const { searchParams } = new URL(req.url);
    const datasetId = searchParams.get("datasetId");
    if (!datasetId) {
      return NextResponse.json({ ok: false, error: "Missing datasetId" }, { status: 400 });
    }

    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
    }

    // Validate file size (optional)
    if ((file as any).size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "File too large (max 10MB)" }, { status: 413 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf', 
      'text/markdown', 
      'text/x-markdown',
      'application/x-markdown',
      'text/plain', 
      'application/json', 
      'application/x-yaml', 
      'text/yaml',
      'text/x-yaml',
      'application/yaml'
    ];
    const fileType = (file as any).type;
    const fileName = (file as any).name || '';
    
    // Check by MIME type or file extension as fallback
    const isValidType = allowedTypes.includes(fileType) || 
      fileName.toLowerCase().endsWith('.md') ||
      fileName.toLowerCase().endsWith('.txt') ||
      fileName.toLowerCase().endsWith('.pdf') ||
      fileName.toLowerCase().endsWith('.json') ||
      fileName.toLowerCase().endsWith('.yaml') ||
      fileName.toLowerCase().endsWith('.yml');
      
    if (!isValidType) {
      return NextResponse.json({ 
        ok: false, 
        error: `File type not supported. Detected: ${fileType || 'unknown'}. Supported: PDF, MD, TXT, JSON, YAML` 
      }, { status: 400 });
    }

    // Upload file to storage
    console.log('📤 Uploading file to storage:', {
      fileName: (file as any).name,
      size: (file as any).size,
      type: fileType,
      datasetId,
    });

    const uploadedFile = await fileStorageService.uploadDocument(
      file,
      organizationId,
      datasetId,
      userId
    );

    // Broadcast document created event
    broadcastDataset(datasetId, { 
      type: "document.created", 
      document: { id: uploadedFile.id, name: (file as any).name, status: "UPLOADING" }
    });

    // Process the document asynchronously
    setTimeout(async () => {
      try {
        // Move to PROCESSING
        await prisma.document.update({
          where: { id: uploadedFile.id },
          data: { 
            status: "PROCESSING" as DocumentStatus,
            updatedAt: new Date()
          }
        });

        // Broadcast processing started
        broadcastDataset(datasetId, { 
          type: "document.updated", 
          documentId: uploadedFile.id, 
          status: "PROCESSING" 
        });

        // Get file content from storage for processing
        const fileData = await fileStorageService.getFile(uploadedFile.id);
        
        // Extract text based on file type
        // Extract document content using doc-worker (V2 with V1 fallback)
        const { extractDocument, convertV2ToV1Text } = await import('@/lib/doc-worker-client');
        
        let extractionResult;
        let extractedText: string;
        const fileName = (file as any).name.toLowerCase();
        
        if (fileName.endsWith('.pdf')) {
          // Use doc-worker for PDF extraction (tries V2, falls back to V1)
          try {
            extractionResult = await extractDocument(
              fileData.buffer.buffer as ArrayBuffer,  // Convert Buffer to ArrayBuffer
              (file as any).name,
              'application/pdf'
            );
            
            // Convert to text format for backward compatibility
            if (extractionResult.version === 'v2' && extractionResult.items) {
              extractedText = convertV2ToV1Text(extractionResult.items);
              console.log('📄 PDF extraction (doc-worker V2):', {
                documentId: uploadedFile.id,
                fileName: (file as any).name,
                items: extractionResult.items.length,
                pages: extractionResult.pages,
                textLength: extractedText.length,
                sampleMetadata: extractionResult.items[0]
              });
            } else {
              extractedText = extractionResult.text || '';
              console.log('📄 PDF extraction (doc-worker V1):', {
                documentId: uploadedFile.id,
                fileName: (file as any).name,
                pages: extractionResult.pages,
                textLength: extractedText.length
              });
            }
          } catch (docWorkerError: any) {
            console.warn('⚠️ Doc worker unavailable, falling back to raw text extraction:', docWorkerError.message);
            // Fallback: Try to extract what we can from raw PDF
            extractedText = fileData.buffer.toString('utf-8')
              .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable chars
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
            extractionResult = { text: extractedText, pages: 0, version: 'v1' };
          }
        } else {
          // For text-based files, use UTF-8 decoding
          extractedText = fileData.buffer.toString('utf-8');
          extractionResult = { text: extractedText, pages: 1, version: 'v1' };
          
          console.log('📄 Text extraction:', {
            documentId: uploadedFile.id,
            fileName: (file as any).name,
            textLength: extractedText.length,
            textPreview: extractedText.substring(0, 200) + '...',
          });
        }

        if (!extractedText || extractedText.trim().length < 10) {
          throw new Error('Failed to extract meaningful text from file');
        }

        // Move to INDEXING
        await prisma.document.update({
          where: { id: uploadedFile.id },
          data: { 
            status: "INDEXING" as DocumentStatus,
            pages: extractionResult.pages || null,
            updatedAt: new Date()
          }
        });

        // Process the document with DocumentProcessor
        const { DocumentProcessor } = await import('@/lib/document-processor');
        const processor = new DocumentProcessor();
        
        let result;
        
        // Use V2 processor if we have structured items, otherwise use V1
        if (extractionResult.version === 'v2' && extractionResult.items) {
          console.log('📄 Using DocumentProcessor V2 (metadata-rich):', {
            documentId: uploadedFile.id,
            items: extractionResult.items.length
          });
          
          result = await processor.processDocumentV2(
            uploadedFile.id,
            extractionResult.items,
            organizationId,
            datasetId,
            (file as any).name
          );
        } else {
          console.log('📄 Using DocumentProcessor V1 (legacy):', {
            documentId: uploadedFile.id,
            textLength: extractedText.length
          });
          
          result = await processor.processDocument(
            uploadedFile.id,
            extractedText,
            organizationId,
            datasetId,
            (file as any).name
          );
        }
        
        // Update document with processing results
        await prisma.document.update({
          where: { id: uploadedFile.id },
          data: { 
            status: "COMPLETED" as DocumentStatus,
            indexedChunks: result.chunkCount,
            coverage: Math.min(100, Math.max(0, Math.round((result.embedded / result.chunkCount) * 100))),
            updatedAt: new Date()
          }
        });

        // Broadcast completion
        broadcastDataset(datasetId, { 
          type: "document.updated", 
          documentId: uploadedFile.id, 
          status: "COMPLETED",
          coverage: Math.min(100, Math.max(0, Math.round((result.embedded / result.chunkCount) * 100))),
          indexedChunks: result.chunkCount
        });

        console.log('✅ Document processing completed:', {
          documentId: uploadedFile.id,
          fileName: (file as any).name,
          chunks: result.chunkCount,
          embedded: result.embedded,
        });

      } catch (error) {
        console.error("Error processing document:", error);
        await prisma.document.update({
          where: { id: uploadedFile.id },
          data: { 
            status: "FAILED" as DocumentStatus,
            errorMessage: error instanceof Error ? error.message : "Processing failed",
            updatedAt: new Date()
          }
        });

        broadcastDataset(datasetId, { 
          type: "document.updated", 
          documentId: uploadedFile.id, 
          status: "FAILED",
          error: error instanceof Error ? error.message : "Processing failed"
        });
      }
    }, 100); // Small delay to ensure the response is sent first

    return NextResponse.json({ 
      ok: true, 
      document: {
        id: uploadedFile.id,
        name: (file as any).name,
        status: "UPLOADING",
        url: uploadedFile.url,
        size: uploadedFile.size
      }
    });

  } catch (error: any) {
    console.error('Documents POST error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? "Failed to upload document" 
    }, { status: 500 });
  }
}
