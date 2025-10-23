/**
 * Debug Endpoint: Chunk Metadata Inspector
 * 
 * Returns a sample of chunks with their metadata for verification
 * 
 * Usage:
 *   GET /api/debug/chunks?documentId=<id>
 *   GET /api/debug/chunks?datasetId=<id>
 *   GET /api/debug/chunks?documentId=<id>&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Auth check (development bypass)
    const session = await getServerSession(authOptions);
    
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    const datasetId = searchParams.get('datasetId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const format = searchParams.get('format') || 'compact'; // 'compact' | 'full'

    if (!documentId && !datasetId) {
      return NextResponse.json(
        { error: 'documentId or datasetId required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {};
    if (documentId) where.documentId = documentId;
    if (datasetId) where.document = { datasetId };

    // Get chunks with metadata
    const chunks = await prisma.documentChunk.findMany({
      where,
      select: {
        id: true,
        chunkIndex: true,
        content: true,
        sectionPath: true,
        metadata: true,
        document: {
          select: {
            id: true,
            title: true,
            datasetId: true
          }
        }
      },
      orderBy: { chunkIndex: 'asc' },
      take: limit
    });

    // Calculate metadata coverage stats
    const totalChunks = await prisma.documentChunk.count({ where });
    const withSectionPath = await prisma.documentChunk.count({
      where: {
        ...where,
        sectionPath: { not: null }
      }
    });
    const withElementType = await prisma.documentChunk.count({
      where: {
        ...where,
        metadata: {
          path: ['element_type'],
          not: null
        }
      }
    });
    const withVerbatim = await prisma.documentChunk.count({
      where: {
        ...where,
        metadata: {
          path: ['has_verbatim'],
          equals: true
        }
      }
    });

    // Get element type distribution
    let elementTypeDistribution;
    
    if (documentId) {
      elementTypeDistribution = await prisma.$queryRaw<
        Array<{ element_type: string; count: bigint }>
      >`
        SELECT 
          COALESCE(metadata->>'element_type', 'unknown') as element_type,
          COUNT(*) as count
        FROM document_chunks
        WHERE "documentId" = ${documentId}
        GROUP BY 1
        ORDER BY 2 DESC
      `;
    } else {
      elementTypeDistribution = await prisma.$queryRaw<
        Array<{ element_type: string; count: bigint }>
      >`
        SELECT 
          COALESCE(c.metadata->>'element_type', 'unknown') as element_type,
          COUNT(*) as count
        FROM document_chunks c
        JOIN documents d ON d.id = c."documentId"
        WHERE d."datasetId" = ${datasetId}
        GROUP BY 1
        ORDER BY 2 DESC
      `;
    }

    // Format output
    if (format === 'compact') {
      const compactChunks = chunks.map(chunk => ({
        idx: chunk.chunkIndex,
        section_path: chunk.sectionPath || null,
        element_type: (chunk.metadata as any)?.element_type || 'unknown',
        has_verbatim: (chunk.metadata as any)?.has_verbatim || false,
        page: (chunk.metadata as any)?.page || null,
        len: chunk.content.length,
        preview: chunk.content.substring(0, 100) + '...',
        documentTitle: chunk.document.title
      }));

      return NextResponse.json({
        stats: {
          total: totalChunks,
          withSectionPath,
          withElementType,
          withVerbatim,
          sectionPathCoverage: totalChunks > 0 ? ((withSectionPath / totalChunks) * 100).toFixed(1) + '%' : '0%',
          elementTypeCoverage: totalChunks > 0 ? ((withElementType / totalChunks) * 100).toFixed(1) + '%' : '0%',
          verbatimCoverage: totalChunks > 0 ? ((withVerbatim / totalChunks) * 100).toFixed(1) + '%' : '0%'
        },
        elementTypeDistribution: elementTypeDistribution.map(row => ({
          type: row.element_type,
          count: Number(row.count)
        })),
        chunks: compactChunks,
        limit,
        totalChunks
      });
    } else {
      // Full format - return complete chunk data
      return NextResponse.json({
        stats: {
          total: totalChunks,
          withSectionPath,
          withElementType,
          withVerbatim,
          sectionPathCoverage: totalChunks > 0 ? ((withSectionPath / totalChunks) * 100).toFixed(1) + '%' : '0%',
          elementTypeCoverage: totalChunks > 0 ? ((withElementType / totalChunks) * 100).toFixed(1) + '%' : '0%'
        },
        elementTypeDistribution: elementTypeDistribution.map(row => ({
          type: row.element_type,
          count: Number(row.count)
        })),
        chunks: chunks.map(chunk => ({
          id: chunk.id,
          chunkIndex: chunk.chunkIndex,
          sectionPath: chunk.sectionPath,
          metadata: chunk.metadata,
          contentLength: chunk.content.length,
          contentPreview: chunk.content.substring(0, 200),
          document: chunk.document
        })),
        limit,
        totalChunks
      });
    }
  } catch (error: any) {
    console.error('Debug chunks endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

