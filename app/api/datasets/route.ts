import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DatasetType } from "@prisma/client";

export async function GET(req: Request) {
  const reqId = crypto.randomUUID();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Find user's organization through memberships
    const membership = await prisma.memberships.findFirst({
      where: { userId },
      include: { org: true },
    });

    if (!membership?.org) {
      return NextResponse.json({ ok: false, error: 'No organization found' }, { status: 400 });
    }

    const orgId = membership.org.id;

    // Get datasets for the organization
    const datasets = await prisma.dataset.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        type: true,
        tags: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        documents: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform datasets to include document count
    const datasetsWithCount = datasets.map(dataset => ({
      id: dataset.id,
      name: dataset.name,
      type: dataset.type,
      tags: dataset.tags,
      isActive: dataset.isActive,
      docCount: dataset.documents.length,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
    }));

    return NextResponse.json({ 
      ok: true, 
      datasets: datasetsWithCount 
    });

  } catch (error) {
    console.error('[DATASETS_LIST]', { 
      err: error, 
      reqId 
    });
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to list datasets' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const reqId = crypto.randomUUID();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json().catch(() => null);
    
    if (!body?.name || typeof body.name !== 'string') {
      return NextResponse.json({ ok: false, error: 'Dataset name is required' }, { status: 400 });
    }

    // Find user's organization
    const membership = await prisma.memberships.findFirst({
      where: { userId },
      include: { org: true },
    });

    if (!membership?.org) {
      return NextResponse.json({ ok: false, error: 'No organization found' }, { status: 400 });
    }

    // Process tags - convert string to array if needed
    let tags = [];
    if (body.tags) {
      if (typeof body.tags === 'string') {
        // Split comma-separated string into array and trim whitespace
        tags = body.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      } else if (Array.isArray(body.tags)) {
        tags = body.tags;
      }
    }

    // Map frontend type values to Prisma enum values
    const typeMapping: Record<string, string> = {
      'Documentation': 'DOCUMENTATION',
      'API': 'API_GUIDE',
      'Internal': 'REFERENCE',
      'DOCUMENTATION': 'DOCUMENTATION',
      'API_GUIDE': 'API_GUIDE',
      'REFERENCE': 'REFERENCE',
      'SERVICE': 'SERVICE',
      'PRODUCT': 'PRODUCT',
      'INTEGRATION': 'INTEGRATION',
      'SDK': 'SDK',
      'TUTORIAL': 'TUTORIAL'
    };

    const datasetType = typeMapping[body.type] || 'DOCUMENTATION';

    // Create new dataset
    const dataset = await prisma.dataset.create({
      data: {
        name: body.name.trim(),
        organizationId: membership.org.id,
        type: datasetType as DatasetType,
        tags: tags,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        tags: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ 
      ok: true, 
      dataset: {
        ...dataset,
        docCount: 0, // New dataset has no documents yet
      }
    });

  } catch (error) {
    console.error('[DATASETS_CREATE]', { 
      err: error, 
      reqId 
    });
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to create dataset' 
    }, { status: 500 });
  }
}