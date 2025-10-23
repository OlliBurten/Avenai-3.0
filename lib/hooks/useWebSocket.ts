"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

export type ProcessingStage = 'UPLOADED' | 'EXTRACTING' | 'CHUNKING' | 'EMBEDDING' | 'STORING' | 'COMPLETED' | 'FAILED'

export interface ProcessingUpdate {
  documentId: string
  stage: ProcessingStage
  progress: number
  message: string
  timestamp: string
  error?: string
}

interface UseSSEOptions {
  documentId?: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

interface UseSSEReturn {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastUpdate: ProcessingUpdate | null
  connect: () => void
  disconnect: () => void
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    documentId,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<ProcessingUpdate | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isMountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!documentId) return

    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return
    }

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnecting(true)
    setError(null)

    try {
      const sseUrl = `/api/sse?documentId=${encodeURIComponent(documentId)}`
      console.log(`🔌 Attempting SSE connection to: ${sseUrl}`)
      const eventSource = new EventSource(sseUrl)
      eventSourceRef.current = eventSource

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && !isConnected) {
          console.warn(`SSE connection timeout for document ${documentId}`)
          eventSource.close()
          setIsConnecting(false)
          setError('Connection timeout - retrying...')
          
          // Retry connection
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                connect()
              }
            }, reconnectInterval)
          }
        }
      }, 10000) // 10 second timeout

      eventSource.onopen = () => {
        console.log(`🔌 SSE connected to document ${documentId}`)
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        reconnectAttemptsRef.current = 0
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
          connectionTimeoutRef.current = null
        }
        
        // Send a test message to verify connection
        console.log(`✅ SSE connection verified for document ${documentId}`)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'connected') {
            console.log(`📡 SSE connected to document ${data.documentId}`)
          } else if (data.stage) {
            setLastUpdate(data)
            console.log(`📡 Received processing update for ${documentId}:`, data)
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.warn(`SSE connection issue for document ${documentId}:`, error)
        setIsConnected(false)
        setIsConnecting(false)
        
        // Attempt to reconnect if not manually closed
        if (isMountedRef.current) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++
            console.log(`🔄 Attempting to reconnect SSE for ${documentId} (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                connect()
              }
            }, reconnectInterval)
          } else {
            console.warn(`SSE connection failed after ${maxReconnectAttempts} attempts for document ${documentId}`)
            setError('Connection lost - will retry periodically')
          }
        }
      }

    } catch (error) {
      console.error(`Error creating SSE for document ${documentId}:`, error)
      setError('Failed to create SSE connection')
      setIsConnecting(false)
    }
  }, [documentId, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    setError(null)
  }, [])

  // Auto-connect on mount and when documentId changes
  useEffect(() => {
    if (autoConnect && documentId) {
      // Connect immediately for better real-time updates
      if (isMountedRef.current) {
        connect()
      }
    }

    return () => {
      isMountedRef.current = false
      disconnect()
    }
  }, [autoConnect, documentId, connect, disconnect])

  // Force reconnect when documentId changes to ensure fresh connection
  useEffect(() => {
    if (documentId && autoConnect) {
      // Disconnect previous connection
      disconnect()
      // Connect to new document immediately
      if (isMountedRef.current) {
        connect()
      }
    }
  }, [documentId, autoConnect, connect, disconnect])

  return {
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    connect,
    disconnect
  }
}

// Hook specifically for document processing updates
export function useDocumentProcessing(documentId: string) {
  const { lastUpdate, isConnected, error } = useSSE({ documentId })
  
  const [processingHistory, setProcessingHistory] = useState<ProcessingUpdate[]>([])

  useEffect(() => {
    if (lastUpdate) {
      setProcessingHistory(prev => {
        const filtered = prev.filter(update => update.documentId !== lastUpdate.documentId)
        return [...filtered, lastUpdate]
      })
    }
  }, [lastUpdate])

  const getCurrentStage = useCallback(() => {
    return lastUpdate?.stage || 'UPLOADED'
  }, [lastUpdate])

  const getCurrentProgress = useCallback(() => {
    // If we have an update, use its progress
    if (lastUpdate) {
      return lastUpdate.progress
    }
    // If SSE is connected but no update yet, show 5% (uploaded)
    if (isConnected) {
      return 5
    }
    // If SSE is not connected, show 0%
    return 0
  }, [lastUpdate, isConnected])

  const getCurrentMessage = useCallback(() => {
    if (lastUpdate) {
      return lastUpdate.message
    }
    if (isConnected) {
      return 'Document uploaded, processing starting...'
    }
    return 'Connecting to processing updates...'
  }, [lastUpdate, isConnected])

  const isProcessing = useCallback(() => {
    const stage = getCurrentStage()
    return stage !== 'COMPLETED' && stage !== 'FAILED'
  }, [getCurrentStage])

  const isCompleted = useCallback(() => {
    return getCurrentStage() === 'COMPLETED'
  }, [getCurrentStage])

  const isFailed = useCallback(() => {
    return getCurrentStage() === 'FAILED'
  }, [getCurrentStage])

  return {
    currentStage: getCurrentStage(),
    currentProgress: getCurrentProgress(),
    currentMessage: getCurrentMessage(),
    isProcessing: isProcessing(),
    isCompleted: isCompleted(),
    isFailed: isFailed(),
    processingHistory,
    isConnected,
    error,
    lastUpdate
  }
}
