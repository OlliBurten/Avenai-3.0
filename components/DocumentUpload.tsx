'use client'

import { useState, useCallback, useRef } from 'react'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { 
  UploadCloud, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  RefreshCw
} from 'lucide-react'

interface UploadFile {
  id: string
  file: File
  status: 'queued' | 'uploading' | 'processing' | 'indexed' | 'failed'
  progress: number
  error?: string
  documentId?: string
}

interface DocumentUploadProps {
  datasetId: string
  onIndexedCountChange?: (count: number) => void
}

const statusConfig = {
  queued: { 
    label: 'Queued', 
    icon: Loader2, 
    className: 'bg-gray-50 text-gray-700',
    iconClassName: 'text-gray-500'
  },
  uploading: { 
    label: 'Uploading', 
    icon: Loader2, 
    className: 'bg-blue-50 text-blue-700',
    iconClassName: 'text-blue-500 animate-spin'
  },
  processing: { 
    label: 'Processing', 
    icon: Loader2, 
    className: 'bg-yellow-50 text-yellow-700',
    iconClassName: 'text-yellow-500 animate-spin'
  },
  indexed: { 
    label: 'Indexed', 
    icon: CheckCircle2, 
    className: 'bg-green-50 text-green-700',
    iconClassName: 'text-green-500'
  },
  failed: { 
    label: 'Failed', 
    icon: AlertTriangle, 
    className: 'bg-red-50 text-red-700',
    iconClassName: 'text-red-500'
  }
}

const acceptedTypes = {
  'application/pdf': 'PDF',
  'text/markdown': 'Markdown',
  'text/plain': 'Text',
  'application/json': 'JSON',
  'text/yaml': 'YAML',
  'application/x-yaml': 'YAML'
}

const maxFileSize = 10 * 1024 * 1024 // 10MB

export default function DocumentUpload({ datasetId, onIndexedCountChange }: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout>()

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size must be less than ${Math.round(maxFileSize / 1024 / 1024)}MB`
    }
    
    if (!acceptedTypes[file.type as keyof typeof acceptedTypes]) {
      return 'Unsupported file type. Use PDF, Markdown, TXT, JSON, or YAML.'
    }
    
    return null
  }

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: UploadFile[] = []
    const errors: string[] = []

    newFiles.forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          status: 'queued',
          progress: 0
        })
      }
    })

    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    addFiles(selectedFiles)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [addFiles])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const retryFile = useCallback((id: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id 
        ? { ...f, status: 'queued', progress: 0, error: undefined }
        : f
    ))
  }, [])

  const uploadFiles = useCallback(async () => {
    const queuedFiles = files.filter(f => f.status === 'queued')
    if (queuedFiles.length === 0) return

    setIsUploading(true)

    try {
      const formData = new FormData()
        formData.append('datasetId', datasetId)
      
      queuedFiles.forEach(uploadFile => {
        formData.append('files', uploadFile.file)
      })

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        queuedFiles.some(qf => qf.id === f.id) 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ))

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      if (result.ok && result.documents) {
        // Update files with document IDs and start processing
        setFiles(prev => prev.map(f => {
          const docId = result.documents.find((d: any) => d.fileName === f.file.name)?.id
          return queuedFiles.some(qf => qf.id === f.id) 
            ? { ...f, status: 'processing', progress: 50, documentId: docId }
            : f
        }))

        // Start polling for status updates
        startPolling(result.documents.map((d: any) => d.id))
      }
    } catch (error) {
        console.error('Upload error:', error)
      setFiles(prev => prev.map(f => 
        queuedFiles.some(qf => qf.id === f.id) 
          ? { ...f, status: 'failed', error: 'Upload failed' }
          : f
      ))
    } finally {
      setIsUploading(false)
    }
  }, [files, datasetId])

  const startPolling = useCallback((documentIds: string[]) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/status?ids=${documentIds.join(',')}`)
        const result = await response.json()
        
        if (result.ok && result.items) {
          setFiles(prev => prev.map(f => {
            const statusItem = result.items.find((item: any) => item.id === f.documentId)
            if (statusItem) {
              const newStatus = statusItem.status
              const newProgress = newStatus === 'indexed' ? 100 : newStatus === 'failed' ? 0 : 75
              
              return {
                ...f,
                status: newStatus,
                progress: newProgress,
                error: statusItem.error
              }
            }
            return f
          }))

          // Check if all files are done processing
          const allDone = result.items.every((item: any) => 
            item.status === 'indexed' || item.status === 'failed'
          )

          if (allDone) {
            clearInterval(pollingRef.current)
            
            // Update indexed count
            const indexedCount = result.items.filter((item: any) => item.status === 'indexed').length
            onIndexedCountChange?.(indexedCount)
          }
        }
      } catch (error) {
        console.error('Status polling error:', error)
      }
    }, 2000) // Poll every 2 seconds
  }, [onIndexedCountChange])

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const getFileType = (file: File) => {
    return acceptedTypes[file.type as keyof typeof acceptedTypes] || 'Unknown'
  }

  const hasQueuedFiles = files.some(f => f.status === 'queued')
  const indexedCount = files.filter(f => f.status === 'indexed').length

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-8 transition-colors ${
          isDragOver 
            ? 'border-indigo-400 bg-indigo-50' 
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
      >
        <div className="text-center">
          <Icon as={UploadCloud} className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drop files here or click to browse
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            PDF, Markdown, TXT, JSON, YAML • up to 10MB each
          </p>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={isUploading}
          >
            Browse Files
          </Button>
          
        <input
          ref={fileInputRef}
          type="file"
            multiple
            accept=".pdf,.md,.txt,.json,.yaml,.yml"
            onChange={handleFileSelect}
          className="hidden"
        />
        </div>
      </div>
        
      {/* File List */}
      {files.length > 0 && (
          <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Files ({files.length})
            </h4>
            {hasQueuedFiles && (
              <Button
                onClick={uploadFiles}
                disabled={isUploading}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isUploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'queued').length} files`}
              </Button>
            )}
            </div>
            
          <div className="space-y-2">
            {files.map((file) => {
              const status = statusConfig[file.status]
              const StatusIcon = status.icon
              
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                >
                  <div className="flex items-center gap-3">
                    <Icon as={FileText} className="h-5 w-5 text-gray-400" />
            <div>
                      <div className="font-medium text-gray-900">{file.file.name}</div>
                      <div className="text-sm text-gray-500">
                        {getFileType(file.file)} • {formatFileSize(file.file.size)}
            </div>
          </div>
      </div>

                  <div className="flex items-center gap-3">
                    {/* Progress Bar */}
                    {file.status === 'uploading' && (
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
              />
            </div>
          )}

                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      <Icon as={StatusIcon} className={`h-3 w-3 ${status.iconClassName}`} />
                      {status.label}
                    </div>

                    {/* Error Message */}
                    {file.error && (
                      <div className="text-xs text-red-600 max-w-32 truncate">
                        {file.error}
        </div>
      )}

                    {/* Actions */}
                    <div className="flex gap-1">
                      {file.status === 'failed' && (
          <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryFile(file.id)}
                        >
                          <Icon as={RefreshCw} className="h-4 w-4" />
          </Button>
      )}

          <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Icon as={X} className="h-4 w-4" />
          </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Success Message */}
      {indexedCount > 0 && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <div className="flex items-center gap-2">
            <Icon as={CheckCircle2} className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {indexedCount} file{indexedCount !== 1 ? 's' : ''} ready for chat
            </span>
          </div>
        </div>
      )}
    </div>
  )
}