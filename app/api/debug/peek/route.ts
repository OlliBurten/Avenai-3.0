import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { searchSimilarDocuments } from '@/lib/pgvector'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || 'bankid'
  const datasetId = url.searchParams.get('datasetId') || undefined

  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  // Get organization from user membership
  const membership = await prisma.membership.findFirst({
    where: { userId: (session.user as any).id },
    include: { org: true }
  })
  
  const orgId = membership?.org?.id
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const pine = await searchSimilarDocuments(q, orgId, datasetId)
  const pineSample = (pine || []).slice(0, 3).map((m: any) => ({
    score: m.score,
    title: m?.metadata?.title || m?.metadata?.source || 'Document',
    chunkIndex: m?.metadata?.chunkIndex ?? null,
    contentSample: (m?.metadata?.content || '').slice(0, 240)
  }))

  const db = await prisma.documentChunk.findMany({
    where: { document: { organizationId: orgId, ...(datasetId ? { datasetId } : {}) } },
    include: { document: true },
    take: 3,
    orderBy: { createdAt: 'desc' }
  })
  const dbSample = db.map(ch => ({
    title: ch.document?.title || 'Document',
    chunkIndex: ch.chunkIndex,
    contentSample: ch.content.slice(0, 240)
  }))

  return NextResponse.json({
    ok: true,
    query: q,
    datasetId: datasetId || null,
    pinecone: { count: pine?.length || 0, sample: pineSample },
    prisma: { count: db.length, sample: dbSample }
  })
}
