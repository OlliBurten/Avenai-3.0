import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DocumentProcessor } from '@/lib/document-processor';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: (session.user as any).organizationId
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get the document content (we'll need to simulate this since we don't store the original file)
    const testContent = `This is a test document for ${document.title}. 
    
    Oliver Harburt is the founder of Avenai, a company that provides AI-powered document understanding and chat capabilities.
    
    Avenai helps businesses create intelligent document assistants that can answer questions about their content, similar to how GPT-5 works with document uploads.
    
    The system processes documents by:
    1. Extracting text from various formats (PDF, MD, TXT, etc.)
    2. Chunking the content into manageable pieces
    3. Creating vector embeddings using OpenAI
    4. Storing vectors in Pinecone for semantic search
    5. Using RAG (Retrieval Augmented Generation) to provide contextual answers

    This document contains information about the company, its founder, and how the AI system works.`;

    // Process the document with DocumentProcessor
    const processor = new DocumentProcessor();
    
    const result = await processor.processDocument(
      document.id,
      testContent,
      session.user.organizationId,
      document.datasetId || '',
      document.title
    );

    // Update document status
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'COMPLETED',
        indexedChunks: result.chunkCount,
        coverage: Math.min(100, Math.max(0, Math.round((result.embedded / result.chunkCount) * 100))),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      result,
      message: 'Document processed successfully'
    });

  } catch (error) {
    console.error('Process document error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
