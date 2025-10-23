import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Get all documents for this organization
    const documents = await prisma.document.findMany({
      where: {
        organizationId: organizationId,
        status: "COMPLETED"
      },
      include: {
        documentChunks: true
      }
    })

    // Get all chunks for this organization
    const chunks = await prisma.documentChunk.findMany({
      where: {
        document: {
          organizationId: organizationId,
          status: "COMPLETED"
        }
      },
      include: {
        document: true
      }
    })

    return NextResponse.json({
      organizationId,
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        status: doc.status,
        chunkCount: doc.documentChunks.length,
        chunks: doc.documentChunks.map(chunk => ({
          id: chunk.id,
          content: chunk.content.substring(0, 100) + '...',
          chunkIndex: chunk.chunkIndex
        }))
      })),
      totalChunks: chunks.length,
      allChunks: chunks.map(chunk => ({
        id: chunk.id,
        documentTitle: chunk.document.title,
        content: chunk.content.substring(0, 200) + '...',
        chunkIndex: chunk.chunkIndex
      }))
    })
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
