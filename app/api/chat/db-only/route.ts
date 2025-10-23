import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateProgrammaticResponse } from '@/lib/programmatic-responses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const session = await getSession()
    const orgId = (session?.user as any)?.organizationId
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, datasetId } = await request.json()
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    // Only DB chunks, dataset-scoped; then org-wide fallback
    let chunks = await prisma.documentChunk.findMany({
      where: { document: { organizationId: orgId, ...(datasetId ? { datasetId } : {}) } },
      include: { document: true },
      take: 30,
      orderBy: { createdAt: 'desc' },
    })
    if (chunks.length === 0) {
      chunks = await prisma.documentChunk.findMany({
        where: { document: { organizationId: orgId } },
        include: { document: true },
        take: 30,
        orderBy: { createdAt: 'desc' },
      })
    }

    if (chunks.length === 0) {
      return NextResponse.json({
        success: true,
        response: "I don't have processed content yet. Use the inspector or reprocess your document.",
        debug: { dbChunks: 0, datasetId: datasetId || null },
        latencyMs: Date.now() - t0,
      })
    }

    const normalizedChunks = chunks.map(chunk => ({
      title: chunk.document.title,
      chunkIndex: 0, // We don't have chunk index in this context
      content: chunk.content
    }))

    const answer = await generateProgrammaticResponse(message, normalizedChunks)
    return NextResponse.json({
      success: true,
      response: answer,
      debug: { dbChunks: chunks.length, datasetId: datasetId || null },
      latencyMs: Date.now() - t0,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to process chat message', detail: e?.message || String(e) },
      { status: 500 }
    )
  }
}
