"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Clock, CheckCircle, AlertCircle, Trash2, Eye, Share2, RefreshCw, Download, Settings } from 'lucide-react'
import DocumentShare from './DocumentShare'
import { ProgressBar, CompactProgressBar } from './ProgressBar'
import { useDocumentProcessing } from '@/lib/hooks/useWebSocket'

interface Document {
  id: string
  title: string
  contentType?: string
  fileSize?: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  computedStatus?: string
  chunkCount?: number
  createdAt: string
  updatedAt: string
  metadata?: {
    extractor?: string
    textLen?: number
    printable?: number
    confidence?: number
  }
  datasetId?: string
}

interface DocumentListProps {
  refreshTrigger?: number
  onRefresh?: () => void
}

// Component for individual document processing status
// Component to establish SSE connection for all documents
function DocumentSSEConnection({ documentId }: { documentId: string }) {
  const { isConnected, error } = useDocumentProcessing(documentId) // This establishes the SSE connection
  
  // Log connection status for debugging
  React.useEffect(() => {
    if (isConnected) {
      console.log(`✅ SSE connection established for document ${documentId}`)
    } else if (error) {
      console.log(`❌ SSE connection failed for document ${documentId}:`, error)
    }
  }, [isConnected, error, documentId])
  
  return null // This component doesn't render anything
}

function DocumentProcessingStatus({ documentId, status }: { documentId: string, status: string }) {
  const {
    currentStage,
    currentProgress,
    currentMessage,
    isProcessing,
    isCompleted,
    isFailed,
    isConnected,
    error
  } = useDocumentProcessing(documentId)

  // Show progress for processing documents
  if (status === 'PROCESSING') {
    // If SSE is not connected, show a fallback progress indicator
    if (!isConnected) {
      return (
        <div className="mt-2">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span className="text-sm text-secondary-600">Processing document...</span>
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            {error ? `Error: ${error}` : 'Live updates unavailable - refreshing periodically'}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )
    }

    return (
      <div className="mt-2">
        <CompactProgressBar
          progress={currentProgress}
          message={currentMessage}
          stage={currentStage}
          isProcessing={isProcessing}
          isCompleted={isCompleted}
          isFailed={isFailed}
        />
      </div>
    )
  }

  // Show completion state briefly for completed documents
  if (status === 'COMPLETED' && isCompleted) {
    return (
      <div className="mt-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm text-green-600">Processing completed!</span>
        </div>
      </div>
    )
  }

  // Show failure state for failed documents
  if (status === 'FAILED' && isFailed) {
    return (
      <div className="mt-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm text-red-600">Processing failed</span>
        </div>
      </div>
    )
  }

  // Don't show anything for other states
  return null
}

export default function DocumentList({ refreshTrigger, onRefresh }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [shareDocumentId, setShareDocumentId] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [rebuildingIds, setRebuildingIds] = useState<Set<string>>(new Set())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const retryCountRef = useRef(0)
  const maxRetries = 3

  const fetchDocuments = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)
      
      console.log('Document fetch called with showLoading:', showLoading)
      console.log('Making API call to /api/documents')
      
      const response = await fetch('/api/documents', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText)
        // Handle server errors more gracefully
        if (response.status === 500) {
          console.warn('Server error during document fetch, retrying...')
          // Retry after a delay for server errors
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchDocuments(false)
            }
          }, 2000)
          return
        }
        if (response.status === 401) {
          console.error('❌ Unauthorized - session expired')
          setError('Session expired. Please refresh the page.')
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('API Response:', data)
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (response.ok) {
        // Handle both array and object responses
        const documentsArray = Array.isArray(data) ? data : data.items || data.documents || []
        console.log('Fetched documents:', documentsArray.length, 'documents')
        console.log('Documents array:', documentsArray)
        console.log('Data structure:', {
          isArray: Array.isArray(data),
          hasItems: 'items' in data,
          hasDocuments: 'documents' in data,
          itemsValue: data.items,
          documentsValue: data.documents
        })
        documentsArray.forEach((doc: Document) => {
          console.log(`Document ${doc.id}: ${doc.status} (${doc.chunkCount || 0} chunks)`)
        })
        
        console.log('Setting documents state with:', documentsArray)
        setDocuments(documentsArray)
        console.log('Documents state updated')
        retryCountRef.current = 0 // Reset retry count on success
        
        // Check if any documents are still processing
        const hasProcessingDocuments = documentsArray.some((doc: Document) => doc.status === 'PROCESSING')
        
        // Manage polling based on processing status
        if (hasProcessingDocuments && !isPolling) {
          console.log('Starting polling for processing documents')
          setIsPolling(true)
          // Clear any existing interval first
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
          }
          pollingIntervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
              console.log('🔄 Polling for document updates...')
              fetchDocuments(false) // Don't show loading for polling
            }
          }, 2000) // Faster polling for processing documents
        } else if (!hasProcessingDocuments && isPolling) {
          console.log('Stopping polling - no processing documents')
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setIsPolling(false)
        }
      } else {
        throw new Error(data.error || 'Failed to fetch documents')
      }
    } catch (error) {
      console.error('Fetch documents error:', error)
      
      // Implement retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++
        console.log(`Retrying fetch (attempt ${retryCountRef.current}/${maxRetries})`)
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchDocuments(false)
          }
        }, 1000 * retryCountRef.current) // Exponential backoff
        return
      }
      
      setError(error instanceof Error ? error.message : 'Failed to fetch documents')
      
      // Stop polling on error
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      setIsPolling(false)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [isPolling])

  // Initial fetch
  useEffect(() => {
    console.log('DocumentList mounted, fetching documents...')
    console.log('Component state:', { loading, error, documents: documents.length })
    fetchDocuments()
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Refresh when trigger changes (from parent component)
  useEffect(() => {
    if (refreshTrigger && isMountedRef.current) {
      // Refresh immediately and also after a delay to catch the document
      fetchDocuments()
      const refreshTimeout = setTimeout(() => {
        fetchDocuments()
      }, 200)
      
      return () => clearTimeout(refreshTimeout)
    }
  }, [refreshTrigger])

  const handleRebuild = async (documentId: string) => {
    setRebuildingIds(prev => new Set(prev).add(documentId))

    try {
      const response = await fetch('/api/embeddings/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      })

      const result = await response.json()
      
      if (result.success) {
        // Refresh the document list
        fetchDocuments()
      } else {
        alert(`Rebuild failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Rebuild error:', error)
      alert('Failed to rebuild embeddings')
    } finally {
      setRebuildingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(documentId)
        return newSet
      })
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    setDeletingIds(prev => new Set(prev).add(documentId))

    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setDocuments(documents.filter(doc => doc.id !== documentId))
        
        // Trigger parent refresh if callback provided
        if (onRefresh) {
          onRefresh()
        }
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete document')
      }
    } catch (error) {
      console.error('Delete document error:', error)
      alert('Failed to delete document')
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(documentId)
        return newSet
      })
    }
  }

  const handleDownload = async (document: Document) => {
    try {
      // For now, we'll just show an alert since we don't have a download endpoint
      // In a real implementation, you'd create a download endpoint
      alert(`Download functionality for "${document.title}" would be implemented here`)
    } catch (error) {
      console.error('Download error:', error)
      alert('Download failed')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />
      case 'COMPLETED':
      case 'READY':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-secondary-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return 'text-yellow-600'
      case 'COMPLETED':
      case 'READY':
        return 'text-green-600'
      case 'FAILED':
        return 'text-red-600'
      default:
        return 'text-secondary-600'
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'PROCESSING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'COMPLETED':
      case 'READY':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes)
    if (size === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileTypeIcon = (contentType: string) => {
    if (contentType.includes('pdf')) {
      return 'PDF'
    } else if (contentType.includes('text') || contentType.includes('markdown')) {
      return 'TXT'
    } else if (contentType.includes('json')) {
      return 'JSON'
    } else if (contentType.includes('html')) {
      return 'HTML'
    }
    return 'FILE'
  }

  if (loading && documents.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-200">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <span className="ml-3 text-secondary-600">Loading documents...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-200">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={() => fetchDocuments()} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => typeof window !== 'undefined' && window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
      <div className="px-6 py-4 border-b border-secondary-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-secondary-900">Documents</h2>
            <p className="text-sm text-secondary-600">
              {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {isPolling && (
              <div className="flex items-center space-x-2 text-xs text-secondary-500">
                <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Auto-refreshing...</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDocuments()}
              className="flex items-center space-x-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {(() => {
        console.log('Render check - documents.length:', documents.length)
        console.log('Render check - documents:', documents)
        return documents.length === 0
      })() ? (
        <div className="p-8 text-center">
          <FileText className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <p className="text-secondary-600 mb-2">No documents uploaded yet</p>
          <p className="text-sm text-secondary-500">
            Upload your first document to get started
          </p>
        </div>
      ) : (
        <div className="divide-y divide-secondary-200">
          {documents.map((document) => (
            <div key={document.id} className="p-6 hover:bg-secondary-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="text-2xl">
                    {getFileTypeIcon(document.contentType || 'application/pdf')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-secondary-900 truncate">
                      {document.title}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-secondary-500">
                      <span className="capitalize">
                        {document.contentType ? document.contentType.split('/')[1] || document.contentType : 'PDF'}
                      </span>
                      <span>{formatFileSize(document.fileSize || '0')}</span>
                      <span>{document.chunkCount || 0} chunks</span>
                    </div>
                    
                    {/* Enhanced Quality Metrics */}
                    {document.metadata && (
                      <div className="mt-2 flex items-center space-x-3 text-xs">
                        {document.metadata.textLen && (
                          <span className="text-secondary-600">
                            Text: {document.metadata.textLen.toLocaleString()} chars
                          </span>
                        )}
                        {document.metadata.printable && (
                          <span className={`px-2 py-1 rounded ${
                            document.metadata.printable >= 0.8 ? 'bg-green-100 text-green-700' :
                            document.metadata.printable >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            Letters: {(document.metadata.printable * 100).toFixed(0)}%
                          </span>
                        )}
                        {document.metadata.extractor && (
                          <span className="text-secondary-500">
                            Method: {document.metadata.extractor}
                          </span>
                        )}
                        {document.metadata.printable && document.metadata.printable < 0.3 && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                            Low quality - try OCR
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Establish SSE connection for all documents */}
                    <DocumentSSEConnection documentId={document.id} />
                    
                    {/* Processing Progress */}
                    <DocumentProcessingStatus 
                      documentId={document.id} 
                      status={document.status} 
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className={getStatusBadge(document.computedStatus ?? document.status)}>
                      {(document.computedStatus ?? document.status).charAt(0) + (document.computedStatus ?? document.status).slice(1).toLowerCase()}
                    </span>
                    {document.chunkCount && document.chunkCount > 0 && (
                      <span className="text-xs text-secondary-500">
                        ({document.chunkCount} chunks)
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-secondary-500">
                    {formatDate(document.createdAt)}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document)}
                      className="text-secondary-400 hover:text-secondary-600"
                      title="Download document"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-secondary-400 hover:text-secondary-600"
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShareDocumentId(document.id)}
                      className="text-secondary-400 hover:text-blue-600"
                      title="Share document"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRebuild(document.id)}
                      disabled={rebuildingIds.has(document.id) || document.status === 'PROCESSING'}
                      className="text-secondary-400 hover:text-blue-600 disabled:opacity-50"
                      title="Rebuild embeddings"
                    >
                      {rebuildingIds.has(document.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                      ) : (
                        <Settings className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(document.id)}
                      disabled={deletingIds.has(document.id)}
                      className="text-secondary-400 hover:text-red-600 disabled:opacity-50"
                      title="Delete document"
                    >
                      {deletingIds.has(document.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Share Modal */}
      {shareDocumentId && (
        <DocumentShare
          documentId={shareDocumentId}
          documentTitle={documents.find(d => d.id === shareDocumentId)?.title || 'Document'}
          onClose={() => setShareDocumentId(null)}
        />
      )}
    </div>
  )
}