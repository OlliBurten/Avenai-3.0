import { NextRequest } from 'next/server'
import { sseConnections, processingUpdates } from '@/lib/sse-broadcast'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const documentId = url.searchParams.get('documentId')

  if (!documentId) {
    return new Response('Document ID required', { status: 400 })
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add connection to store
      if (!sseConnections.has(documentId)) {
        sseConnections.set(documentId, new Set())
      }
      sseConnections.get(documentId)!.add(controller)
      
      console.log(`📡 SSE connection established for document ${documentId}. Total connections: ${sseConnections.get(documentId)!.size}`)

      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        documentId,
        timestamp: new Date().toISOString()
      })}\n\n`)

      // Send any existing updates
      const existingUpdate = processingUpdates.get(documentId)
      if (existingUpdate) {
        controller.enqueue(`data: ${JSON.stringify(existingUpdate)}\n\n`)
      }

      // Clean up on close
      const cleanup = () => {
        const connections = sseConnections.get(documentId)
        if (connections) {
          connections.delete(controller)
          console.log(`📡 SSE connection closed for document ${documentId}. Remaining connections: ${connections.size}`)
          if (connections.size === 0) {
            sseConnections.delete(documentId)
            console.log(`📡 All SSE connections closed for document ${documentId}`)
          }
        }
      }

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}