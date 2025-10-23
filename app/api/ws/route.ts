import { NextRequest } from 'next/server'
import { initializeWebSocketServer } from '@/lib/websocket'

// This is a placeholder for the WebSocket API route
// The actual WebSocket server will be initialized in the main server file
export async function GET(request: NextRequest) {
  return new Response('WebSocket endpoint - use ws:// protocol', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}

export async function POST(request: NextRequest) {
  return new Response('WebSocket endpoint - use ws:// protocol', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
