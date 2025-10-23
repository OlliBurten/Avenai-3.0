// app/api/test/chat/route.ts
// Test endpoint for smoke tests - uses real RAG system with proper auth

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { retrieveSimple } from '@/lib/chat/retrieval-simple';
import { generateProgrammaticResponse } from '@/lib/programmatic-responses';
import { detectIntent } from '@/lib/chat/intent';

async function handler(req: NextRequest, session: any) {
  try {
    const body = await req.json();
    console.log('Smoke test request body:', body);
    
    const { message, datasetId } = body;
    
    if (!message || !datasetId) {
      return NextResponse.json({ error: 'Missing message or datasetId' }, { status: 400 });
    }

    // Ensure message is a string
    const query = String(message);
    console.log('Query after conversion:', query, 'Type:', typeof query);
    
    if (!query.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    // Detect intent
    console.log('About to detect intent with query:', query, 'Type:', typeof query);
    const intent = detectIntent(query);
    console.log('Detected intent:', intent);
    
    // Get the correct organization ID for the dataset
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { organizationId: true }
    });
    
    if (!dataset) {
      throw new Error('Dataset not found');
    }
    
    // Use the dataset's organization ID
    const organizationId = dataset.organizationId;
    
    console.log('Session info:', {
      userId: session.user.id,
      organizationId: session.organizationId,
      datasetOrganizationId: organizationId,
      datasetId
    });

    // Retrieve relevant chunks using real RAG system
    const retrievalResult = await retrieveSimple({
      query,
      datasetId,
      userId: session.user.id,
      organizationId: organizationId, // Use dataset's organization ID
      intent,
      k: 15
    });

    console.log('Retrieval result:', {
      contexts: retrievalResult.contexts?.length || 0,
      meta: retrievalResult.meta,
      hasContexts: !!retrievalResult.contexts
    });

    // Check if retrieval was successful
    if (!retrievalResult.contexts) {
      throw new Error('Retrieval failed - no contexts returned');
    }

    // Generate response using real LLM
    const response = await generateProgrammaticResponse(
      query, // message parameter
      retrievalResult.contexts, // context parameter
      {
        intent,
        topScore: retrievalResult.meta?.top1,
        isPartialConfidence: false
      }
    );

    console.log('Generated response:', response?.substring(0, 100) + '...');

    // Check if response generation was successful
    if (!response) {
      throw new Error('Response generation failed - no response returned');
    }

    // Determine format based on response content
    let format = 'text';
    if (response.includes('{') && response.includes('}')) {
      format = 'json';
    } else if (response.includes('|') || response.includes('•') || response.match(/^\d+\./m)) {
      format = 'table';
    } else if (response.match(/^\d+\./m)) {
      format = 'steps';
    }

    // Calculate confidence from retrieval metadata
    const confidence = retrievalResult.meta?.confidenceLevel || 'Unknown';

    return NextResponse.json({
      response,
      intent,
      format,
      confidence,
      chunks: retrievalResult.contexts.length,
      sources: retrievalResult.contexts.map(c => ({
        id: c.id,
        content: c.content.substring(0, 100) + '...',
        metadata: c.metadata
      })),
      meta: retrievalResult.meta
    });

  } catch (error) {
    console.error('Smoke test chat error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuth(handler);
