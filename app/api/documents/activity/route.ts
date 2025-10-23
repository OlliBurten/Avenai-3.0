import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get datasetId from query params
    const { searchParams } = new URL(req.url);
    const datasetId = searchParams.get('datasetId');

    if (!datasetId) {
      return NextResponse.json({ error: 'datasetId is required' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    
    // Get user's organization via membership
    const membership = await prisma.memberships.findFirst({
      where: { userId },
      select: { orgId: true }
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const organizationId = membership.orgId;

    // Verify dataset belongs to user's organization
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset || dataset.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Dataset not found or access denied' }, { status: 404 });
    }

    // Fetch recent documents with their activity
    const documents = await prisma.document.findMany({
      where: { datasetId },
      orderBy: { updatedAt: 'desc' },
      take: 50, // Get last 50 documents
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        indexedChunks: true,
        metadata: true,
        errorMessage: true,
      },
    });

    // Transform documents into activity events
    const events = documents.map((doc) => {
      // Determine event type based on document status
      let eventType: "uploaded" | "processing" | "indexed" | "failed" | "ready";
      let timestamp = doc.updatedAt.toISOString();
      
      switch (doc.status) {
        case 'COMPLETED':
          eventType = 'ready';
          break;
        case 'INDEXING':
          eventType = 'indexed';
          break;
        case 'PROCESSING':
          eventType = 'processing';
          break;
        case 'FAILED':
          eventType = 'failed';
          break;
        case 'UPLOADING':
        default:
          eventType = 'uploaded';
          timestamp = doc.createdAt.toISOString();
          break;
      }

      // Extract metadata
      const metadata = doc.metadata as any;
      const coverage = metadata?.coverage || metadata?.printable || undefined;
      const chunks = doc.indexedChunks || undefined;

      return {
        id: doc.id,
        type: eventType,
        fileName: doc.title,
        timestamp,
        details: doc.errorMessage || undefined,
        coverage,
        chunks,
      };
    });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}

