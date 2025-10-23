"use client";
import { useState, useEffect } from "react";
import { UploadCloud, FileText, ActivitySquare, Settings, ChevronDown, ChevronUp, Sparkles, RotateCcw, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import SharedChatState from "./SharedChatState";
import DocumentUpload from "./docs/DocumentUpload";
import ActivityFeed from "./docs/ActivityFeed";
import { Button } from "@/components/ui/button";

type DocRow = { 
  id: string; 
  name: string; 
  size: number; 
  type: string; 
  status: string; 
  updatedAt: string; 
  downloadUrl: string;
  indexedChunks?: number;
};

export default function WorkspaceShell({
  dataset,
  initialDocuments
}: {
  dataset: { 
    id: string; 
    name: string; 
    purpose: string; 
    counts: { documents: number } 
  };
  initialDocuments: DocRow[];
}) {
  const [docs, setDocs] = useState<DocRow[]>(initialDocuments);
  const [showUpload, setShowUpload] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [reingestingIds, setReingestingIds] = useState<Set<string>>(new Set());
  
  // Auto-refresh documents when processing
  useEffect(() => {
    const hasProcessingDocs = docs.some(doc => 
      doc.status === 'PROCESSING' || reingestingIds.has(doc.id)
    );
    
    if (!hasProcessingDocs) return;
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/activity?datasetId=${dataset.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.documents) {
            setDocs(data.documents);
          }
        }
      } catch (error) {
        console.error('Failed to refresh documents:', error);
      }
    }, 2000); // Refresh every 2 seconds
    
    return () => clearInterval(interval);
  }, [docs, reingestingIds, dataset.id]);
  
  // Settings state
  const [supportEmail, setSupportEmail] = useState('');
  const [showResponseMetadata, setShowResponseMetadata] = useState(false);
  const [showCoverageNotices, setShowCoverageNotices] = useState(true);
  
  // Load support email from localStorage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(`dataset_support_email_${dataset.id}`);
    if (savedEmail) {
      setSupportEmail(savedEmail);
    }
  }, [dataset.id]);
  
  // Chat reset handler
  const [chatKey, setChatKey] = useState(0);
  const handleResetChat = () => {
    if (confirm('Reset chat and start a new conversation?')) {
      setChatKey(prev => prev + 1);
    }
  };

  // Re-ingest handler
  const handleReingest = async (id: string, name: string) => {
    if (!confirm(`Re-extract and re-embed "${name}"?\n\nThis will delete existing chunks and re-process the document with Doc-Worker V2.`)) {
      return;
    }

    // Immediately update UI to show processing state
    setReingestingIds(prev => new Set(prev).add(id));
    setDocs(prev => prev.map(doc => 
      doc.id === id ? { ...doc, status: "PROCESSING" as any } : doc
    ));

    try {
      const response = await fetch(`/api/documents/${id}/reingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline: "v2",
          embeddingBatch: 128,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the document in the list
        setDocs(prev => prev.map(doc => 
          doc.id === id 
            ? { ...doc, status: data.document?.status || "COMPLETED", indexedChunks: data.document?.indexedChunks || doc.indexedChunks }
            : doc
        ));
        
        alert(`✅ Re-ingestion complete!\n\n${data.document?.indexedChunks || 0} chunks indexed\nSection Path: ${data.metadata?.sectionPathCoverage || '0%'}\nElement Type: ${data.metadata?.elementTypeCoverage || '0%'}\nDuration: ${data.duration || 'N/A'}`);
      } else {
        // Update to failed state
        setDocs(prev => prev.map(doc => 
          doc.id === id ? { ...doc, status: "FAILED" as any, errorMessage: data.error } : doc
        ));
        alert(`❌ Re-ingestion failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error("Failed to reingest document:", error);
      // Update to failed state
      setDocs(prev => prev.map(doc => 
        doc.id === id ? { ...doc, status: "FAILED" as any, errorMessage: error.message } : doc
      ));
      alert(`❌ Re-ingestion error: ${error.message || 'Network error'}`);
    } finally {
      setReingestingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-gray-50 p-6">
      <div className="flex h-full border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Left Sidebar - 30% */}
        <aside className="w-[30%] min-w-[320px] max-w-[400px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        {/* Dataset Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="mb-3">
            <h1 className="text-xl font-bold text-gray-900">{dataset.name}</h1>
            <p className="text-sm text-gray-500">{dataset.purpose}</p>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Active</span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{dataset.counts.documents} documents</span>
          </div>
        </div>

        {/* Upload Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <UploadCloud className="h-5 w-5 text-[#7F56D9]" />
              <span className="font-medium text-gray-900">Upload Documents</span>
            </div>
            {showUpload ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {showUpload && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <DocumentUpload
                datasetId={dataset.id}
                onQueued={(rows) => setDocs(prev => [...rows, ...prev])}
                onIndexed={(updated) => setDocs(prev =>
                  prev.map(p => updated.find(u => u.id === p.id) ?? p)
                )}
              />
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setShowDocuments(!showDocuments)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-[#7F56D9]" />
              <span className="font-medium text-gray-900">Documents ({docs.length})</span>
            </div>
            {showDocuments ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {showDocuments && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 max-h-[400px] overflow-y-auto">
              {/* Compact Document List */}
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-[#7F56D9] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-900 truncate">{doc.name}</span>
                          {doc.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                          {doc.status === 'PROCESSING' && <div className="w-3 h-3 border-2 border-[#7F56D9] border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                          {doc.status === 'FAILED' && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="uppercase">{doc.type}</span>
                          <span>•</span>
                          <span>{(doc.size / 1024).toFixed(1)} KB</span>
                          {doc.status === 'PROCESSING' && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">Re-processing...</span>
                            </>
                          )}
                          {reingestingIds.has(doc.id) && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">Starting...</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReingest(doc.id, doc.name)}
                          disabled={reingestingIds.has(doc.id) || doc.status === "PROCESSING"}
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Re-extract and re-embed with Doc-Worker V2"
                        >
                          <RefreshCw className={`h-3 w-3 ${reingestingIds.has(doc.id) ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {docs.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No documents yet</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Activity & Stats Section */}
        <div className="flex-1">
          <button
            onClick={() => setShowActivity(!showActivity)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ActivitySquare className="h-5 w-5 text-[#7F56D9]" />
              <span className="font-medium text-gray-900">Activity & Stats</span>
            </div>
            {showActivity ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {showActivity && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
              {/* Upload Stats */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 mb-3">Upload Summary</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {docs.filter(d => d.status === 'COMPLETED').length}
                    </div>
                    <div className="text-xs text-gray-500">Ready</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {docs.filter(d => d.status === 'PROCESSING').length}
                    </div>
                    <div className="text-xs text-gray-500">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {docs.filter(d => d.status === 'FAILED').length}
                    </div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total Storage</span>
                    <span className="font-medium text-gray-900">
                      {(docs.reduce((sum, d) => sum + d.size, 0) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total Chunks</span>
                    <span className="font-medium text-gray-900">
                      {docs.reduce((sum, d) => sum + (d.indexedChunks || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Recent Activity</h4>
                <ActivityFeed datasetId={dataset.id} />
              </div>
            </div>
          )}
        </div>
        </aside>

        {/* Main Chat Area - 70% */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
        <div className="bg-gradient-to-r from-[#F9F5FF] to-[#EEF4FF] border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Copilot</h2>
              <p className="text-sm text-gray-600">Test your copilot's intelligence</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetChat}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-white/60 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Chat
              </button>
              <button
                onClick={() => setShowResponseMetadata(!showResponseMetadata)}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  showResponseMetadata 
                    ? 'bg-[#7F56D9] text-white' 
                    : 'text-gray-700 hover:bg-white/60'
                }`}
              >
                <Settings className="w-4 h-4" />
                Debug Mode
              </button>
            </div>
          </div>
        </div>

          {/* Chat Panel */}
          <div className="flex-1 overflow-hidden bg-white min-h-0">
            <SharedChatState 
              key={chatKey}
              resetTrigger={chatKey}
              datasetId={dataset.id}
              supportEmail={supportEmail}
              showResponseMetadata={showResponseMetadata}
              showCoverageNotices={showCoverageNotices}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
