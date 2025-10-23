// app/api/admin/rag-diagnose/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runFullDiagnostic } from '@/lib/admin/ragDiag';
import { z } from 'zod';
import { OrgRole } from '@prisma/client';

const diagnoseSchema = z.object({
  orgId: z.string(),
  datasetIds: z.array(z.string()).optional(),
  query: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orgId, datasetIds, query } = diagnoseSchema.parse(body);

    // Verify user has admin role and access to this org
    const userRole = (session.user as any).role as string;
    if (!['ADMIN', 'OWNER'].includes(userRole)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if ((session.user as any).organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.info('RAG_DIAGNOSTIC_START', { orgId, datasetIds, query });

    const result = await runFullDiagnostic(orgId, datasetIds, query);

    console.info('RAG_DIAGNOSTIC_COMPLETE', { 
      orgId, 
      datasetCount: result.datasets.length,
      actionsTaken: result.actionsTaken.length,
      flags: result.flags
    });

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('RAG diagnostic error:', error);
    return NextResponse.json({ 
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
