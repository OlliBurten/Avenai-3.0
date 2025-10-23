import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DocumentProcessor } from '@/lib/document-processor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // Get organization from user membership
    const membership = await prisma.memberships.findFirst({
      where: { userId: (session.user as any).id },
      include: { org: true }
    })
    
    const orgId = membership?.org?.id
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const rawText = typeof body?.text === 'string' ? body.text : undefined

    const params = await context.params
    const doc = await prisma.document.findFirst({
      where: { id: params.id, organizationId: orgId },
      select: { id: true, title: true }
    })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.document.update({ where: { id: doc.id }, data: { status: 'PROCESSING' } })
    const processor = new DocumentProcessor()
    const { chunkCount, embedded } = await processor.processDocument(doc.id, rawText, orgId, undefined, doc.title)
    await prisma.document.update({ where: { id: doc.id }, data: { status: 'COMPLETED' } })

    return NextResponse.json({ success: true, chunkCount, embedded })
  } catch (e: any) {
    console.error('Reprocess failed:', e)
    return NextResponse.json({ error: 'Failed', detail: e?.message || String(e) }, { status: 500 })
  }
}
