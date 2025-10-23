// app/api/test/simple/route.ts
// Simple test endpoint for smoke tests

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Simple test request body:', body);
    
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

    // Simple mock response for testing
    const mockResponse = `Mock response for: ${query}`;
    
    // Determine format based on query content
    let format = 'text';
    let intent = 'DEFAULT';
    
    if (query.toLowerCase().includes('json') || query.toLowerCase().includes('{')) {
      format = 'json';
      intent = 'JSON';
    } else if (query.toLowerCase().includes('table') || query.toLowerCase().includes('components')) {
      format = 'table';
      intent = 'TABLE';
    } else if (query.toLowerCase().includes('endpoint') || query.toLowerCase().includes('url')) {
      intent = 'ENDPOINT';
    } else if (query.toLowerCase().includes('email') || query.toLowerCase().includes('contact')) {
      intent = 'CONTACT';
    } else if (query.toLowerCase().includes('integrate') || query.toLowerCase().includes('workflow')) {
      format = 'steps';
      intent = 'WORKFLOW';
    }

    return NextResponse.json({
      response: mockResponse,
      intent,
      format,
      confidence: 'High',
      chunks: 1,
      sources: [{
        id: 'mock-chunk',
        content: 'Mock chunk content...',
        metadata: {}
      }]
    });

  } catch (error) {
    console.error('Simple test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



