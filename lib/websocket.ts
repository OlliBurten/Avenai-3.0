import { NextRequest } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Socket } from 'net'

// WebSocket server instance (singleton)
let wss: WebSocketServer | null = null

// Store active connections by document ID
const documentConnections = new Map<string, Set<WebSocket>>()

// Processing stages with estimated progress
export const PROCESSING_STAGES = {
  UPLOADED: { stage: 'uploaded', progress: 10, message: 'Document uploaded successfully' },
  EXTRACTING: { stage: 'extracting', progress: 25, message: 'Extracting text content...' },
  CHUNKING: { stage: 'chunking', progress: 50, message: 'Creating semantic chunks...' },
  EMBEDDING: { stage: 'embedding', progress: 75, message: 'Generating embeddings...' },
  STORING: { stage: 'storing', progress: 90, message: 'Storing in database...' },
  COMPLETED: { stage: 'completed', progress: 100, message: 'Processing completed!' },
  FAILED: { stage: 'failed', progress: 0, message: 'Processing failed' }
} as const

export type ProcessingStage = keyof typeof PROCESSING_STAGES

export interface ProcessingUpdate {
  documentId: string
  stage: ProcessingStage
  progress: number
  message: string
  timestamp: string
  error?: string
}

// Initialize WebSocket server
export function initializeWebSocketServer(server: any) {
  if (wss) return wss

  wss = new WebSocketServer({ 
    server,
    path: '/api/ws',
    verifyClient: (info: { origin: string; secure: boolean; req: IncomingMessage }) => {
      // Add authentication verification here if needed
      return true
    }
  })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('🔌 WebSocket connection established')
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message)
        
        if (data.type === 'subscribe' && data.documentId) {
          // Subscribe to document updates
          if (!documentConnections.has(data.documentId)) {
            documentConnections.set(data.documentId, new Set())
          }
          documentConnections.get(data.documentId)!.add(ws)
          
          console.log(`📡 Client subscribed to document ${data.documentId}`)
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'subscribed',
            documentId: data.documentId,
            timestamp: new Date().toISOString()
          }))
        }
        
        if (data.type === 'unsubscribe' && data.documentId) {
          // Unsubscribe from document updates
          const connections = documentConnections.get(data.documentId)
          if (connections) {
            connections.delete(ws)
            if (connections.size === 0) {
              documentConnections.delete(data.documentId)
            }
          }
          
          console.log(`📡 Client unsubscribed from document ${data.documentId}`)
        }
      } catch (error) {
        console.error('WebSocket message error:', error)
      }
    })

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed')
      
      // Remove from all document subscriptions
      for (const [documentId, connections] of Array.from(documentConnections.entries())) {
        connections.delete(ws)
        if (connections.size === 0) {
          documentConnections.delete(documentId)
        }
      }
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
    })
  })

  console.log('🚀 WebSocket server initialized')
  return wss
}

// Broadcast processing update to all subscribers
export function broadcastProcessingUpdate(update: ProcessingUpdate) {
  const connections = documentConnections.get(update.documentId)
  
  if (!connections || connections.size === 0) {
    console.log(`📡 No subscribers for document ${update.documentId}`)
    return
  }

  const message = JSON.stringify({
    type: 'processing_update',
    ...update
  })

  let sentCount = 0
  const deadConnections: WebSocket[] = []

  for (const ws of Array.from(connections)) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
        sentCount++
      } else {
        deadConnections.push(ws)
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error)
      deadConnections.push(ws)
    }
  }

  // Clean up dead connections
  for (const deadWs of deadConnections) {
    connections.delete(deadWs)
  }

  console.log(`📡 Broadcasted update for document ${update.documentId} to ${sentCount} clients`)
}

// Get current stage info
export function getStageInfo(stage: ProcessingStage) {
  return PROCESSING_STAGES[stage]
}

// Create processing update
export function createProcessingUpdate(
  documentId: string, 
  stage: ProcessingStage, 
  error?: string
): ProcessingUpdate {
  const stageInfo = getStageInfo(stage)
  
  return {
    documentId,
    stage,
    progress: stageInfo.progress,
    message: error ? `Error: ${error}` : stageInfo.message,
    timestamp: new Date().toISOString(),
    error
  }
}

// Cleanup function
export function cleanupWebSocketServer() {
  if (wss) {
    wss.close()
    wss = null
    documentConnections.clear()
    console.log('🧹 WebSocket server cleaned up')
  }
}
