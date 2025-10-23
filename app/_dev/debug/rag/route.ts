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
  const membership = await prisma.memberships.findFirst({
    where: { userId: (session.user as any).id },
    include: { org: true }
  })
  
  const orgId = membership?.org?.id
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const pc = await searchSimilarDocuments(q, orgId, datasetId)
  const pineconeMatches = pc?.length || 0

  const chunkCountDataset = await prisma.documentChunk.count({
    where: { document: { organizationId: orgId, ...(datasetId ? { datasetId } : {}) } },
  })
  const chunkCountOrg = await prisma.documentChunk.count({
    where: { document: { organizationId: orgId } },
  })

  return NextResponse.json({
    ok: true,
    query: q,
    selectedDatasetId: datasetId || null,
    pineconeMatches,
    prisma: { chunkCountDataset, chunkCountOrg },
  })
}