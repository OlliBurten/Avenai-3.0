'use client'

import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface Document {
  id: string
  title: string
  status: 'queued' | 'uploading' | 'processing' | 'indexed' | 'failed'
  createdAt: string
  updatedAt: string
  size?: number
  type?: string
}

interface DocumentsTableProps {
  documents: Document[]
  onView?: (doc: Document) => void
  onDelete?: (doc: Document) => void
  onDownload?: (doc: Document) => void
}

const statusConfig = {
  queued: { 
    label: 'Queued', 
    icon: Clock, 
    className: 'bg-gray-50 text-gray-700' 
  },
  uploading: { 
    label: 'Uploading', 
    icon: Loader2, 
    className: 'bg-blue-50 text-blue-700' 
  },
  processing: { 
    label: 'Processing', 
    icon: Loader2, 
    className: 'bg-yellow-50 text-yellow-700' 
  },
  indexed: { 
    label: 'Indexed', 
    icon: CheckCircle2, 
    className: 'bg-green-50 text-green-700' 
  },
  failed: { 
    label: 'Failed', 
    icon: AlertTriangle, 
    className: 'bg-red-50 text-red-700' 
  }
}

export default function DocumentsTable({ 
  documents, 
  onView, 
  onDelete, 
  onDownload 
}: DocumentsTableProps) {
  const [filter, setFilter] = useState<'all' | 'indexed' | 'processing' | 'failed'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'md' | 'txt' | 'openapi'>('all')

  const filteredDocs = documents.filter(doc => {
    const statusMatch = filter === 'all' || doc.status === filter
    const typeMatch = typeFilter === 'all' || doc.type?.toLowerCase() === typeFilter
    return statusMatch && typeMatch
  })

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Icon as={FileText} className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-500">Upload your first document to get started.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Documents</CardTitle>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Status</option>
              <option value="indexed">Indexed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="md">Markdown</option>
              <option value="txt">Text</option>
              <option value="openapi">OpenAPI</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const status = statusConfig[doc.status]
            const StatusIcon = status.icon
            
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Icon as={FileText} className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{doc.title}</div>
                    <div className="text-sm text-gray-500">
                      {doc.type?.toUpperCase()} • {formatFileSize(doc.size)} • {formatDate(doc.updatedAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={status.className}>
                    <Icon as={StatusIcon} className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                  
                  <div className="flex gap-1">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(doc)}
                      >
                        <Icon as={Eye} className="h-4 w-4" />
                      </Button>
                    )}
                    {onDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload(doc)}
                      >
                        <Icon as={Download} className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(doc)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Icon as={Trash2} className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {filteredDocs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No documents match the current filters.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
