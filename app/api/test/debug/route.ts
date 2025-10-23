// app/api/test/debug/route.ts
// Debug endpoint to check dataset and chunks

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('datasetId') || 'cmh1c687x0001d8hiq6wop6a1';
    
    console.log('Debug: Checking dataset:', datasetId);
    
    // Check if dataset exists
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        _count: {
          select: {
            documents: true
          }
        }
      }
    });
    
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }
    
    // Check documents in dataset
    const documents = await prisma.document.findMany({
      where: { datasetId },
      select: {
        id: true,
        title: true,
        status: true,
        _count: {
          select: {
            documentChunks: true
          }
        }
      }
    });
    
    // Check total chunks
    const totalChunks = await prisma.documentChunk.count({
      where: {
        document: {
          datasetId
        }
      }
    });
    
    return NextResponse.json({
      dataset,
      documents,
      totalChunks,
      summary: {
        datasetExists: !!dataset,
        documentCount: documents.length,
        totalChunks,
        documentsWithChunks: documents.filter(d => d._count.documentChunks > 0).length
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



