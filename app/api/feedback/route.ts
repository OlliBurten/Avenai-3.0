// app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logTelemetry } from "@/lib/telemetry";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Chat feedback endpoint
 * Stores thumbs up/down feedback for learning
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, messageId, query, chunkIds, helpful, timestamp } = body;

    // Validate required fields
    if (!sessionId || typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store feedback in analytics events
    await prisma.analyticsEvent.create({
      data: {
        organizationId: 'system',  // You can extract from session if needed
        eventType: "chat_feedback",
        eventData: {
          sessionId,
          messageId,
          query,
          chunkIds: chunkIds || [],
          helpful,
          timestamp: timestamp || new Date().toISOString()
        },
      },
    });

    // Log telemetry for dashboards (optional - can be removed if not needed)
    // Commenting out for now as feedback is already stored in analyticsEvent
    /*
    logTelemetry({
      timestamp: new Date().toISOString(),
      organizationId: 'system',
      datasetId: 'unknown',
      query: query || '',
      top1Score: 0,
      cumTop2Score: 0,
      docsConsidered: (chunkIds || []).length,
      docsCited: (chunkIds || []).length,
      branch: helpful ? 'confident' : 'out_of_scope',
      retrievalTimeMs: 0,
      generationTimeMs: 0
    });
    */

    console.log('📊 Feedback received:', {
      sessionId: sessionId.substring(0, 12),
      helpful,
      chunkCount: (chunkIds || []).length
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
