import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') || (session.user as any).organizationId;

    // Get documents with their chunks
    const documents = await prisma.document.findMany({
      where: {
        organizationId: orgId
      },
      select: {
        id: true,
        title: true,
        status: true,
        indexedChunks: true,
        coverage: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        datasetId: true,
        _count: {
          select: {
            documentChunks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Get chunk counts from Pinecone metadata
    const chunkDetails = await prisma.documentChunk.findMany({
      where: {
        documentId: { in: documents.map(d => d.id) }
      },
      select: {
        documentId: true,
        chunkIndex: true,
        content: true
      }
    });

    // Group chunks by document
    const chunksByDoc = chunkDetails.reduce((acc, chunk) => {
      if (!acc[chunk.documentId]) {
        acc[chunk.documentId] = [];
      }
      acc[chunk.documentId].push(chunk);
      return acc;
    }, {} as Record<string, any[]>);

    const result = documents.map(doc => ({
      ...doc,
      actualChunks: chunksByDoc[doc.id]?.length || 0,
      sampleChunk: chunksByDoc[doc.id]?.[0]?.content?.substring(0, 100) || null
    }));

    return NextResponse.json({ 
      documents: result,
      totalDocuments: documents.length,
      orgId 
    });

  } catch (error) {
    console.error('Debug documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
