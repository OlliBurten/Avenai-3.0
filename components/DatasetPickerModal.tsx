"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  FolderOpen, 
  FileText, 
  Search,
  RefreshCw
} from 'lucide-react'

interface Dataset {
  id: string
  name: string
  description?: string
  docCount: number
  updatedAt: string
  createdAt: string
}

interface DatasetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDataset: (datasetId: string, datasetName: string) => void;
  title?: string;
  description?: string;
}

export default function DatasetPickerModal({ 
  isOpen, 
  onClose, 
  onSelectDataset,
  title = "Select Dataset",
  description = "Choose a dataset to upload your documents"
}: DatasetPickerModalProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDatasets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/datasets', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.ok && data.datasets) {
          setDatasets(data.datasets);
        } else {
          setError('Failed to load datasets');
          setDatasets([]);
        }
      } else if (response.status === 401) {
        setError('Please sign in to access datasets');
        setDatasets([]);
      } else {
        const errorText = await response.text();
        setError(`Failed to load datasets: ${response.status} ${errorText}`);
        setDatasets([]);
      }
    } catch (err) {
      console.error('[DatasetPickerModal] Error:', err);
      setError('Network error: Unable to load datasets');
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && datasets.length === 0) {
      fetchDatasets();
    }
  }, [isOpen]);

  const filteredDatasets = datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dataset.description && dataset.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectDataset = (datasetId: string, datasetName: string) => {
    onSelectDataset(datasetId, datasetName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            ×
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDatasets}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="text-red-600 font-semibold">{error}</div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading datasets...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && datasets.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No datasets found</h3>
                <p className="text-gray-600 mb-6">
                  Create your first dataset to organize your documents.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      onClose();
                      window.location.href = '/datasets';
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Dataset
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/datasets'}
                  >
                    Go to Datasets
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Search Results */}
          {!loading && !error && datasets.length > 0 && filteredDatasets.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No datasets match your search</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search terms or create a new dataset.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      onClose();
                      window.location.href = '/datasets';
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Dataset
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Datasets List */}
          {!loading && !error && filteredDatasets.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredDatasets.map((dataset) => (
                <Card 
                  key={dataset.id} 
                  className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300"
                  onClick={() => handleSelectDataset(dataset.id, dataset.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FolderOpen className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{dataset.name}</h3>
                          <p className="text-sm text-gray-600">
                            {dataset.description || 'No description'}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              <FileText className="h-3 w-3 inline mr-1" />
                              {dataset.docCount} documents
                            </span>
                            <span className="text-xs text-gray-500">
                              Updated {new Date(dataset.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Click to select
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
