// app/api/documents/[id]/inspect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get organization from user membership
    const membership = await prisma.memberships.findFirst({
      where: { userId: (session.user as any).id },
      include: { org: true }
    })
    
    const organizationId = membership?.org?.id
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const params = await context.params
    const doc = await prisma.document.findFirst({
      where: { id: params.id, organizationId: organizationId },
      select: {
        id: true,
        title: true,
        status: true,
        datasetId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { documentChunks: true } }
      }
    })

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...doc,
      computedStatus: doc._count.documentChunks > 0 ? 'READY' : (doc.status ?? 'PENDING')
    })
  } catch (error: any) {
    console.error('Inspect endpoint error:', error)
    return NextResponse.json({ error: 'Failed to inspect document' }, { status: 500 })
  }
}