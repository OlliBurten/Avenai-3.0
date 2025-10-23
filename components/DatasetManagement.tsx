"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  FolderOpen, 
  FileText, 
  Upload, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Eye, 
  Share2, 
  Download, 
  Copy,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Search,
  Filter,
  Grid,
  List,
  ArrowUpDown
} from 'lucide-react'
import DocumentUpload from './DocumentUpload'

interface Dataset {
  id: string
  name: string
  description?: string
  type: string
  tags: string[]
  isActive: boolean
  createdAt: string
  documents: Array<{
    id: string
    title: string
    status: string
    createdAt: string
  }>
  _count: {
    documents: number
  }
}

interface Document {
  id: string
  title: string
  contentType: string
  status: string
  tags: string[]
  datasetId?: string
  fileSize?: number
  createdAt: string
}

export default function DatasetManagement() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'documents'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showStats, setShowStats] = useState(true)
  const [newDataset, setNewDataset] = useState({
    name: '',
    description: '',
    type: 'SERVICE',
    tags: [] as string[]
  })

  const fetchDatasets = async () => {
    try {
      const response = await fetch('/api/datasets')
      if (response.ok) {
        const data = await response.json()
        console.log('📊 DatasetManagement: API Response:', data)
        
        // Handle the new paginated API response structure
        const datasetsArray = data.data?.items || data.items || data.datasets || []
        console.log('📊 DatasetManagement: Setting datasets:', datasetsArray.length, 'datasets')
        
        setDatasets(datasetsArray)
      } else if (response.status === 401) {
        // User is not authenticated, redirect to login
        console.log('User not authenticated, redirecting to login...')
        window.location.href = '/auth/signin'
        return
      } else {
        console.error('Error fetching datasets:', response.statusText)
        // Show user-friendly error message
        alert(`Failed to load datasets: ${response.statusText}. Please try refreshing the page or contact support if the issue persists.`)
        // Set empty array to prevent infinite loading
        setDatasets([])
      }
    } catch (error) {
      console.error('Error fetching datasets:', error)
      // Show user-friendly error message
      alert(`Network error: Unable to load datasets. Please check your connection and try again.`)
      // Set empty array to prevent infinite loading
      setDatasets([])
    }
  }

  const fetchDocuments = async () => {
    try {
      console.log('📄 DatasetManagement: Fetching documents...')
      const response = await fetch('/api/documents')
      
      if (response.ok) {
        const data = await response.json()
        console.log('📄 DatasetManagement: API Response:', data)
        
        // Handle the new API response structure: { items: [...], total: N, page: 1, pageSize: 20 }
        const documentsArray = Array.isArray(data) ? data : data.items || data.documents || []
        console.log('📄 DatasetManagement: Setting documents:', documentsArray.length, 'documents')
        console.log('📄 DatasetManagement: Document details:', documentsArray.map((d: any) => ({ title: d.title, id: d.id, datasetId: d.datasetId })))
        
        setDocuments(documentsArray)
      } else if (response.status === 401) {
        // User is not authenticated, redirect to login
        console.log('User not authenticated, redirecting to login...')
        window.location.href = '/auth/signin'
        return
      } else {
        console.error('Error fetching documents:', response.statusText)
        // Show user-friendly error message
        alert(`Failed to load documents: ${response.statusText}. Please try refreshing the page or contact support if the issue persists.`)
        // Set empty array to prevent infinite loading
        setDocuments([])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      // Show user-friendly error message
      alert(`Network error: Unable to load documents. Please check your connection and try again.`)
      // Set empty array to prevent infinite loading
      setDocuments([])
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([fetchDatasets(), fetchDocuments()])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached, setting loading to false')
        setLoading(false)
      }
    }, 10000) // 10 second timeout
    
    loadData()
    
    return () => clearTimeout(timeoutId)
  }, [])

  const createDataset = async () => {
    if (!newDataset.name.trim()) {
      alert('Please enter a dataset name')
      return
    }

    try {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDataset),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📊 DatasetManagement: Created dataset:', data)
        
        setNewDataset({ name: '', description: '', type: 'SERVICE', tags: [] })
        setShowCreateForm(false)
        
        // Refresh the datasets list
        await fetchDatasets()
        
        // Show success message
        alert('Dataset created successfully!')
      } else if (response.status === 401) {
        // User is not authenticated, redirect to login
        window.location.href = '/auth/signin'
        return
      } else {
        let errorMessage = 'Unknown error occurred'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error?.message || errorData.message || errorMessage
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError)
          errorMessage = response.statusText || 'Server error'
        }
        
        console.error('Error creating dataset:', errorMessage)
        
        // Show user-friendly error message
        if (response.status === 409) {
          alert(`A dataset with the name "${newDataset.name}" already exists. Please choose a different name.`)
        } else if (response.status === 400) {
          alert(`Error: ${errorMessage}. Please check your input and try again.`)
        } else {
          alert(`Error creating dataset: ${errorMessage}`)
        }
      }
    } catch (error) {
      console.error('Error creating dataset:', error)
      alert('Error creating dataset. Please try again.')
    }
  }

  const deleteDataset = async (datasetId: string) => {
    if (!confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/datasets?id=${datasetId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDatasets()
        if (selectedDataset === datasetId) {
          setSelectedDataset(null)
        }
      } else if (response.status === 401) {
        // User is not authenticated, redirect to login
        window.location.href = '/auth/signin'
        return
      } else {
        try {
          const errorData = await response.json()
          console.error('Error deleting dataset:', errorData.error)
          alert(`Error deleting dataset: ${errorData.error}`)
        } catch (jsonError) {
          // Handle cases where response doesn't contain JSON
          console.error('Error deleting dataset:', response.statusText)
          alert(`Error deleting dataset: ${response.status} ${response.statusText}`)
        }
      }
    } catch (error) {
      console.error('Error deleting dataset:', error)
      alert('Error deleting dataset. Please try again.')
    }
  }

  const getDocumentsForDataset = (datasetId: string) => {
    if (!Array.isArray(documents)) {
      console.warn('Documents is not an array:', documents)
      return []
    }
    return documents.filter(doc => doc.datasetId === datasetId)
  }

  // Filter and sort datasets
  const filteredAndSortedDatasets = datasets
    .filter(dataset => 
      dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dataset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dataset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'documents':
          comparison = getDocumentsForDataset(a.id).length - getDocumentsForDataset(b.id).length
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Calculate statistics
  const stats = {
    totalDatasets: datasets.length,
    totalDocuments: documents.length,
    activeDatasets: datasets.filter(d => getDocumentsForDataset(d.id).length > 0).length,
    totalSize: documents.reduce((acc, doc) => acc + Number(doc.fileSize || 0), 0), // Use actual fileSize
    avgDocumentsPerDataset: datasets.length > 0 ? Math.round(documents.length / datasets.length) : 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'PROCESSING': return 'bg-yellow-100 text-yellow-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDocuments() // Refresh the documents list
      } else {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          // Response is not JSON, use status text
        }
        alert(`Error deleting document: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document. Please try again.')
    }
  }

  const handleDownloadDocument = async (document: Document) => {
    try {
      // For now, we'll just show an alert since we don't have a download endpoint
      alert(`Download functionality for "${document.title}" would be implemented here`)
    } catch (error) {
      console.error('Download error:', error)
      alert('Download failed')
    }
  }

  const handleViewDocument = async (document: Document) => {
    try {
      // For now, we'll just show an alert since we don't have a view endpoint
      alert(`View functionality for "${document.title}" would be implemented here`)
    } catch (error) {
      console.error('View error:', error)
      alert('View failed')
    }
  }

  const handleShareDocument = async (document: Document) => {
    try {
      // For now, we'll just show an alert since we don't have a share endpoint
      alert(`Share functionality for "${document.title}" would be implemented here`)
    } catch (error) {
      console.error('Share error:', error)
      alert('Share failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading datasets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Datasets</h1>
          <p className="text-gray-600 mt-1">Organize your API documentation into focused datasets for better AI responses</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowStats(!showStats)}
            className="flex items-center space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span>{showStats ? 'Hide' : 'Show'} Stats</span>
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Dataset
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Datasets</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalDatasets}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalDocuments}</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Datasets</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeDatasets}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Docs/Dataset</p>
                <p className="text-2xl font-bold text-orange-700">{stats.avgDocumentsPerDataset}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-700" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Size</p>
                <p className="text-2xl font-bold text-indigo-600">{(stats.totalSize / 1024 / 1024).toFixed(1)}MB</p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filter Bar */}
      {datasets.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search datasets by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field as any)
                  setSortOrder(order as any)
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                aria-label="Sort datasets by"
              >
                <option value="created-desc">Newest First</option>
                <option value="created-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="documents-desc">Most Documents</option>
                <option value="documents-asc">Least Documents</option>
              </select>
              <div className="flex border border-gray-300 rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                  aria-label="Switch to grid view"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                  aria-label="Switch to list view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Create Dataset Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Create New Dataset</CardTitle>
              <CardDescription>
                Create a new dataset to organize your API documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dataset Name
                </label>
                <Input
                  value={newDataset.name}
                  onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
                  placeholder="e.g., BankID Norway"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={newDataset.description}
                  onChange={(e) => setNewDataset({ ...newDataset, description: e.target.value })}
                  placeholder="Brief description of this dataset..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createDataset}
                  disabled={!newDataset.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create Dataset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {datasets.length === 0 && !showCreateForm && (
        <Card className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="h-10 w-10 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-3">Ready to organize your documentation?</div>
            <p className="text-gray-600 mb-8 max-w-lg mx-auto text-lg">
              Create your first dataset to organize your API documentation. 
              Datasets help the AI provide more focused and accurate responses by grouping related content.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Dataset
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowStats(true)}
                className="text-lg px-8 py-3"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                View Statistics
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="font-semibold text-gray-900 mb-1">Organize Content</div>
                <p className="text-sm text-gray-600">Group related documents together</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="font-semibold text-gray-900 mb-1">Better AI Responses</div>
                <p className="text-sm text-gray-600">More accurate and focused answers</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-orange-700" />
                </div>
                <div className="font-semibold text-gray-900 mb-1">Team Collaboration</div>
                <p className="text-sm text-gray-600">Share datasets with your team</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results State */}
      {datasets.length > 0 && filteredAndSortedDatasets.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No datasets found</h3>
            <p className="text-gray-600 mb-6">
              No datasets match your search criteria. Try adjusting your search terms.
            </p>
            <Button 
              variant="outline"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Datasets Grid/List */}
      {filteredAndSortedDatasets.length > 0 && (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-4"
        }>
          {filteredAndSortedDatasets.map((dataset) => {
            const datasetDocuments = getDocumentsForDataset(dataset.id)
            const isSelected = selectedDataset === dataset.id
            
            return (
              <Card 
                key={dataset.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                } ${viewMode === 'list' ? 'flex items-center p-4' : ''}`}
                onClick={() => setSelectedDataset(isSelected ? null : dataset.id)}
              >
                {viewMode === 'grid' ? (
                  <>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                            {dataset.name}
                          </CardTitle>
                          {dataset.description && (
                            <CardDescription className="text-sm text-gray-600 line-clamp-2">
                              {dataset.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Badge variant="secondary" className="text-xs">
                            {datasetDocuments.length} docs
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteDataset(dataset.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {/* Dataset Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <span>Created {new Date(dataset.createdAt).toLocaleDateString()}</span>
                        <span className="capitalize">{dataset.type.toLowerCase()}</span>
                      </div>

                      {/* Documents Preview */}
                      {datasetDocuments.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-sm font-medium text-gray-700">
                            <FileText className="h-4 w-4 mr-1" />
                            Recent Documents
                          </div>
                          <div className="space-y-1">
                            {datasetDocuments.slice(0, 3).map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 truncate flex-1">{doc.title}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`ml-2 ${getStatusColor(doc.status)}`}
                                >
                                  {doc.status}
                                </Badge>
                              </div>
                            ))}
                            {datasetDocuments.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{datasetDocuments.length - 3} more documents
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No documents yet</p>
                        </div>
                      )}
                    </CardContent>
                  </>
                ) : (
                  // List view
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FolderOpen className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{dataset.name}</h3>
                        <p className="text-sm text-gray-600">{dataset.description || 'No description'}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">
                            {datasetDocuments.length} documents
                          </span>
                          <span className="text-xs text-gray-500">
                            Created {new Date(dataset.createdAt).toLocaleDateString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {dataset.type.toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: Implement duplicate functionality
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteDataset(dataset.id)
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Selected Dataset Details */}
      {selectedDataset && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {datasets.find(d => d.id === selectedDataset)?.name}
                </CardTitle>
                <CardDescription>
                  Upload and manage documents for this dataset
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDataset(null)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="text-lg font-medium text-gray-900 mb-4 text-center">
                Upload documents to {datasets.find(d => d.id === selectedDataset)?.name}
              </div>
              <DocumentUpload 
                datasetId={selectedDataset}
              />
            </div>

            {/* Documents List */}
            <div>
              <div className="text-lg font-medium text-gray-900 mb-4">Documents</div>
              {getDocumentsForDataset(selectedDataset).length > 0 ? (
                <div className="space-y-3">
                  {getDocumentsForDataset(selectedDataset).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{doc.title}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(doc.status)}
                        >
                          {doc.status}
                        </Badge>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {doc.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {doc.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{doc.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="flex items-center space-x-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                            title="Download document"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                            title="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShareDocument(doc)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                            title="Share document"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                  <p className="text-sm text-gray-400">Use the upload area above to add documents</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}