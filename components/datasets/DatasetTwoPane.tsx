"use client";
import * as React from "react";
import { DocumentUpload } from "@/components/datasets/DocumentUpload";
import { DocumentsTable } from "@/components/datasets/DocumentsTable";
import { ActivityFeed } from "@/components/datasets/ActivityFeed";
import { Stats } from "@/components/datasets/Stats";
import { useDocuments, useDatasetSSE } from "@/lib/client/useDatasetData";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import WidgetPreview from "@/components/WidgetPreview";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: "UPLOADING" | "PROCESSING" | "INDEXING" | "COMPLETED" | "FAILED";
  coverage?: number;
  pages?: number;
  extractor?: string;
  warnings?: number;
  indexedChunks?: number;
  errorMessage?: string;
  updatedAt: string;
  downloadUrl: string;
}

interface ActivityEvent {
  id: string;
  type: "uploaded" | "processing" | "indexed" | "failed" | "ready";
  fileName: string;
  timestamp: string;
  details?: string;
  coverage?: number;
  chunks?: number;
}

interface DatasetTwoPaneProps {
  datasetId: string;
  initialDocuments: Document[];
  initialEvents: ActivityEvent[];
  datasetName: string;
}

export function DatasetTwoPane({ 
  datasetId, 
  initialDocuments, 
  initialEvents, 
  datasetName 
}: DatasetTwoPaneProps) {
  const { data: documentsData } = useDocuments(datasetId);
  useDatasetSSE(datasetId);
  
  const documents = documentsData?.documents || initialDocuments;
  const completedCount = documents.filter(doc => doc.status === "COMPLETED").length;
  const processingCount = documents.filter(doc => doc.status === "PROCESSING" || doc.status === "INDEXING").length;
  const canChat = completedCount > 0;

  // Calculate metrics
  const avgCoverage = documents.length > 0 
    ? Math.round(documents.reduce((sum, doc) => sum + (doc.coverage || 0), 0) / documents.length)
    : 0;
  
  const storageUsed = documents.length > 0
    ? `${(documents.reduce((sum, doc) => {
        const docSize = doc.size || (doc as any).fileSize || 0;
        return sum + Number(docSize);
      }, 0) / (1024 * 1024)).toFixed(1)}MB`
    : "0MB";

  // Mock activity events
  const mockEvents = documents.map(doc => ({
    id: doc.id,
    type: doc.status === "COMPLETED" ? "ready" as const : 
          doc.status === "FAILED" ? "failed" as const :
          doc.status === "INDEXING" ? "indexed" as const :
          doc.status === "PROCESSING" ? "processing" as const : "uploaded" as const,
    fileName: doc.name,
    timestamp: doc.updatedAt,
    coverage: doc.coverage || undefined,
    chunks: doc.indexedChunks || undefined,
  })).slice(0, 10);

  // Chat state
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<any[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      console.log("Document deleted");
    } catch (error) {
      console.error("Failed to delete document");
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: message,
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          datasetId,
          sessionId: 'dataset-chat',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: data.response || "I couldn't process your request.",
        meta: {
          confidence: data.confidence,
          confidenceLevel: data.confidenceLevel,
          sources: data.sources,
          dataset: datasetId,
        },
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "Sorry, I encountered an error. Please try again.",
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-8 pb-12">
      {/* Dataset Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{datasetName}</h1>
        <p className="text-sm text-gray-600 mt-1">
          Active • {documents.length} document{documents.length !== 1 ? 's' : ''} • {completedCount} indexed
        </p>
      </div>

      {/* Status Header Strip */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <StatusChip 
            label="Upload" 
            state={documents.length > 0 ? "ok" : "idle"} 
            note={`${documents.length} completed`} 
          />
          <StatusChip 
            label="Index" 
            state={completedCount === documents.length && documents.length > 0 ? "ok" : processingCount > 0 ? "busy" : "idle"} 
            note={`${completedCount}/${documents.length}`} 
          />
          <StatusChip 
            label="Ready" 
            state={completedCount === documents.length && documents.length > 0 ? "ok" : "idle"} 
            note={completedCount === documents.length && documents.length > 0 ? "All set!" : "Add a document"} 
          />
        </div>
        <Button 
          disabled={!canChat} 
          className="min-w-[120px]"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          {isChatOpen ? 'Close Chat' : 'Test Chat'}
        </Button>
      </div>

      {/* Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Pane: Documents */}
        <div className="space-y-6">
          <DocumentUpload datasetId={datasetId} />
          <DocumentsTable documents={documents} onDelete={handleDeleteDocument} />
        </div>
        
        {/* Right Pane: Chat */}
        <div className="space-y-6">
          <ActivityFeed events={mockEvents} />
          <Stats 
            totalDocs={documents.length}
            indexedDocs={completedCount}
            avgCoverage={avgCoverage}
            storageUsed={storageUsed}
          />
          
          {/* Chat Widget */}
          {isChatOpen && canChat && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Test Chat</h3>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Ask questions about your uploaded documents
                </p>
              </div>
              
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">Start a conversation about your documents</p>
                  </div>
                )}
                
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      
                      {/* Confidence and Sources for Assistant Messages */}
                      {message.role === 'assistant' && message.meta && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              <span>Confidence:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                message.meta.confidenceLevel === 'high' ? 'bg-green-100 text-green-700' :
                                message.meta.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {message.meta.confidenceLevel?.toUpperCase() || 'MEDIUM'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-4 border-t border-slate-200">
                <div className="flex items-end space-x-2">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(inputValue);
                      }
                    }}
                    placeholder="Ask about your documents..."
                    className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusChip({ label, state, note }: { 
  label: string; 
  state: "ok" | "busy" | "idle"; 
  note: string;
}) {
  const stateStyles = {
    ok: "bg-emerald-50 text-emerald-700",
    busy: "bg-amber-50 text-amber-700", 
    idle: "bg-slate-50 text-slate-600"
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${stateStyles[state]}`}>
        {label}
      </div>
      <p className="text-xs text-gray-600">{note}</p>
    </div>
  );
}
