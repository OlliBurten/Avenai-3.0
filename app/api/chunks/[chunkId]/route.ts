// app/api/chunks/[chunkId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chunkId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('datasetId');

    if (!datasetId) {
      return NextResponse.json({ error: 'datasetId required' }, { status: 400 });
    }

    const { chunkId } = await params;
    
    console.log('🔍 [Chunk API] Fetching chunk:', { chunkId, datasetId, orgId: (session.user as any).organizationId });

    // Fetch the chunk with access control
    const chunk = await prisma.documentChunk.findUnique({
      where: {
        id: chunkId,
      },
      select: {
        id: true,
        content: true,
        chunkIndex: true,
        metadata: true,
        sectionPath: true,
        document: {
          select: {
            id: true,
            title: true,
            pages: true,
            datasetId: true,
            dataset: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    // Verify access control
    if (!chunk) {
      console.log('❌ [Chunk API] Chunk not found:', chunkId);
      return NextResponse.json({ error: 'Chunk not found' }, { status: 404 });
    }
    
    if (chunk.document.datasetId !== datasetId) {
      console.log('❌ [Chunk API] Dataset mismatch:', { expected: datasetId, actual: chunk.document.datasetId });
      return NextResponse.json({ error: 'Dataset mismatch' }, { status: 404 });
    }
    
    if (chunk.document.dataset.organizationId !== (session.user as any).organizationId) {
      console.log('❌ [Chunk API] Org mismatch:', { expected: (session.user as any).organizationId, actual: chunk.document.dataset.organizationId });
      return NextResponse.json({ error: 'Organization mismatch' }, { status: 404 });
    }
    
    console.log('✅ [Chunk API] Chunk found and authorized:', { chunkId, title: chunk.document.title, contentLength: chunk.content.length });

    // Extract page number from metadata if available
    const page = chunk.metadata && typeof chunk.metadata === 'object' && 'page' in chunk.metadata
      ? (chunk.metadata as any).page
      : null;

    return NextResponse.json({
      id: chunk.id,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      sectionPath: chunk.sectionPath,
      page,
      document: {
        id: chunk.document.id,
        title: chunk.document.title,
        pages: chunk.document.pages,
      },
    });
  } catch (error) {
    console.error('Error fetching chunk:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

