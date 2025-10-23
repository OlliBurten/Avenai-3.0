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

    // Fetch document statistics
    const documents = await prisma.document.findMany({
      where: { datasetId },
      select: {
        status: true,
        fileSize: true,
        indexedChunks: true,
        coverage: true,
      },
    });

    // Calculate statistics
    const total = documents.length;
    const completed = documents.filter((doc) => doc.status === 'COMPLETED').length;
    const processing = documents.filter((doc) => 
      doc.status === 'PROCESSING' || doc.status === 'INDEXING' || doc.status === 'UPLOADING'
    ).length;
    const failed = documents.filter((doc) => doc.status === 'FAILED').length;

    const totalSize = documents.reduce((sum, doc) => {
      return sum + Number(doc.fileSize || 0);
    }, 0);

    const totalChunks = documents.reduce((sum, doc) => {
      return sum + (doc.indexedChunks || 0);
    }, 0);

    // Calculate average coverage (only for completed documents with coverage data)
    const docsWithCoverage = documents.filter((doc) => 
      doc.status === 'COMPLETED' && doc.coverage !== null && doc.coverage !== undefined
    );
    const avgCoverage = docsWithCoverage.length > 0
      ? Math.round(
          docsWithCoverage.reduce((sum, doc) => sum + (doc.coverage || 0), 0) / docsWithCoverage.length
        )
      : 0;

    const stats = {
      total,
      completed,
      processing,
      failed,
      totalSize,
      totalChunks,
      avgCoverage,
    };

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching document stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document stats' },
      { status: 500 }
    );
  }
}

