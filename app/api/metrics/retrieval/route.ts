/**
 * Retrieval Metrics API
 * Returns aggregated metrics for monitoring dashboard
 */

import { NextResponse } from 'next/server';
import { getMetricsAggregation, printMetricsDashboard } from '@/lib/telemetry/retrieval-metrics';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/metrics/retrieval
 * Returns aggregated retrieval metrics
 */
export async function GET() {
  try {
    // Optional: Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'FOUNDER') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get aggregated metrics
    const metrics = getMetricsAggregation();

    // Also print to server console
    if (process.env.NODE_ENV === 'development') {
      printMetricsDashboard();
    }

    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Metrics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

