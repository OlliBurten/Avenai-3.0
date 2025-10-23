// lib/documents/reprocess.ts
// Re-extract and re-embed existing documents

import { prisma } from "@/lib/prisma";
import { DocumentProcessor } from "@/lib/document-processor";

/**
 * Reprocess an existing document
 * Deletes old chunks, re-extracts text, re-chunks, and re-embeds
 */
export async function reprocessDocument(documentId: string): Promise<void> {
  console.log(`🔄 Reprocessing document: ${documentId}`);
  
  // 1. Get document metadata
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      organizationId: true,
      datasetId: true,
      storageUrl: true,
      storageKey: true,
      contentType: true
    }
  });
  
  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }
  
  console.log(`📄 Found document:`, {
    id: doc.id.substring(0, 8),
    title: doc.title,
    storageKey: doc.storageKey
  });
  
  // 2. Delete old chunks
  const deleteResult = await prisma.documentChunk.deleteMany({
    where: { documentId }
  });
  
  console.log(`🗑️  Deleted ${deleteResult.count} old chunks`);
  
  // 3. Download file from storage
  const DOC_WORKER_URL = process.env.DOC_WORKER_URL || 'http://localhost:8000';
  
  // Fetch file from storage using FileService
  let fileBuffer: Buffer;
  
  try {
    // Use the file service to get the file properly
    const { fileStorageService } = await import('@/lib/storage/file-service');
    const fileData = await fileStorageService.getFile(documentId);
    fileBuffer = fileData.buffer;
  } catch (error) {
    throw new Error(`Failed to access file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  console.log(`📥 Downloaded file: ${fileBuffer.length} bytes`);
  
  // 4. Extract text via doc-worker (V2 with V1 fallback)
  const { extractDocument, convertV2ToV1Text } = await import('@/lib/doc-worker-client');
  
  let extractionResult;
  let extractedText: string;
  
  if (doc.contentType === 'application/pdf' || doc.title.toLowerCase().endsWith('.pdf')) {
    try {
      extractionResult = await extractDocument(
        fileBuffer,
        doc.title,
        'application/pdf'
      );
      
      // Convert to text for backward compatibility
      if (extractionResult.version === 'v2' && extractionResult.items) {
        extractedText = convertV2ToV1Text(extractionResult.items);
        console.log(`📄 PDF extraction successful (V2):`, {
          items: extractionResult.items.length,
          pages: extractionResult.pages,
          textLength: extractedText.length,
          sampleMetadata: extractionResult.items[0]
        });
      } else {
        extractedText = extractionResult.text || '';
        console.log(`📄 PDF extraction successful (V1):`, {
          pages: extractionResult.pages,
          textLength: extractedText.length
        });
      }
    } catch (docWorkerError: any) {
      console.warn('⚠️ Doc worker unavailable, falling back to basic text extraction');
      
      // Simple fallback: extract readable text from PDF binary
      const textContent = fileBuffer.toString('utf-8')
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')  // Remove non-printable chars
        .replace(/\s+/g, ' ')                 // Normalize whitespace
        .replace(/PDF-\d+\.\d+/g, '')         // Remove PDF version markers
        .replace(/obj\s*<</g, '')             // Remove PDF object markers
        .replace(/endobj/g, '')               // Remove endobj markers
        .replace(/stream\s*[A-Za-z0-9+/=]*\s*endstream/g, '') // Remove stream data
        .replace(/BT\s+ET/g, '')              // Remove text objects
        .replace(/Tj\s*\([^)]*\)/g, '')       // Remove text content markers
        .trim();
      
      if (textContent.length > 100) {
        extractedText = textContent;
        extractionResult = { text: extractedText, pages: 1, version: 'v1' };
        console.log(`📄 Basic text extraction successful: ${extractedText.length} chars`);
      } else {
        throw new Error('Failed to extract meaningful text from PDF - doc-worker required');
      }
    }
  } else {
    // Text-based files
    extractedText = fileBuffer.toString('utf-8');
    extractionResult = { text: extractedText, pages: 1, version: 'v1' };
  }
  
  if (!extractedText || extractedText.trim().length < 10) {
    throw new Error('Failed to extract meaningful text from file');
  }
  
  console.log(`📝 Text extracted: ${extractedText.length} characters (version: ${extractionResult.version})`);
  
  // 5. Process (chunk + embed + store)
  const processor = new DocumentProcessor();
  let result;
  
  // Use V2 processor if we have structured items, otherwise use V1
  if (extractionResult.version === 'v2' && extractionResult.items) {
    console.log('📄 Using DocumentProcessor V2 for reprocessing');
    result = await processor.processDocumentV2(
      documentId,
      extractionResult.items,
      doc.organizationId,
      doc.datasetId || undefined,
      doc.title
    );
  } else {
    console.log('📄 Using DocumentProcessor V1 for reprocessing');
    result = await processor.processDocument(
      documentId,
      extractedText,
      doc.organizationId,
      doc.datasetId || undefined,
      doc.title
    );
  }
  
  console.log(`✅ Document reprocessed successfully:`, {
    documentId: doc.id.substring(0, 8),
    chunks: result.chunkCount,
    embedded: result.embedded
  });
  
  // 6. Update document status
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "COMPLETED",
      indexedChunks: result.chunkCount,
      coverage: Math.min(100, Math.max(0, Math.round((result.embedded / result.chunkCount) * 100))),
      errorMessage: null,
      updatedAt: new Date()
    }
  });
}

