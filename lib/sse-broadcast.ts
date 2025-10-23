// lib/sse-broadcast.ts
import { NextRequest } from 'next/server'

// Simple in-memory store for SSE connections
const sseConnections = new Map<string, Set<ReadableStreamDefaultController>>()

// Store processing updates
const processingUpdates = new Map<string, any>()

// Function to broadcast updates to all subscribers
export function broadcastProcessingUpdate(update: any) {
  const { documentId } = update
  
  // Store the latest update
  processingUpdates.set(documentId, update)
  
  // Get all connections for this document
  const connections = sseConnections.get(documentId)
  
  if (!connections || connections.size === 0) {
    console.log(`📡 No SSE subscribers for document ${documentId}`)
    return
  }
  
  console.log(`📡 Broadcasting update to ${connections.size} subscribers for document ${documentId}`)

  const message = `data: ${JSON.stringify(update)}\n\n`
  let sentCount = 0
  const deadConnections: ReadableStreamDefaultController[] = []

  for (const controller of Array.from(connections)) {
    try {
      controller.enqueue(message)
      sentCount++
    } catch (error) {
      console.error('Error sending SSE message:', error)
      deadConnections.push(controller)
    }
  }

  // Clean up dead connections
  for (const deadController of deadConnections) {
    connections.delete(deadController)
  }

  console.log(`📡 Broadcasted SSE update for document ${documentId} to ${sentCount} clients`)
}

// Cleanup function
export function cleanupSSEConnections() {
  sseConnections.clear()
  processingUpdates.clear()
  console.log('🧹 SSE connections cleaned up')
}

// Export the connections map for the route to use
export { sseConnections, processingUpdates }
