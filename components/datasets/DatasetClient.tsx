"use client";
import * as React from "react";
import { DocumentUpload } from "@/components/datasets/DocumentUpload";
import { DocumentsTable } from "@/components/datasets/DocumentsTable";
import { ActivityFeed } from "@/components/datasets/ActivityFeed";
import { Stats } from "@/components/datasets/Stats";
import { useDocuments, useDatasetSSE } from "@/lib/client/useDatasetData";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
// import { toast } from "sonner";

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

interface DatasetClientProps {
  datasetId: string;
  initialDocuments: Document[];
  initialEvents: ActivityEvent[];
  datasetName: string;
}

export function DatasetClient({ 
  datasetId, 
  initialDocuments, 
  initialEvents, 
  datasetName 
}: DatasetClientProps) {
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

  // Mock activity events (in real app, these would come from SSE)
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

  // Show success toast when first document becomes ready
  React.useEffect(() => {
    if (completedCount === 1 && initialDocuments.length === 0) {
      // toast.success("Dataset ready. Open chat.");
      console.log("Dataset ready. Open chat.");
    }
  }, [completedCount, initialDocuments.length]);

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      // toast.success("Document deleted");
      console.log("Document deleted");
    } catch (error) {
      // toast.error("Failed to delete document");
      console.error("Failed to delete document");
    }
  };

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
          onClick={() => window.location.href = `/chat?dataset=${datasetId}`}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Open Chat
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] lg:gap-x-8">
        {/* Main Content */}
        <main className="space-y-6 min-w-0">
          <DocumentUpload datasetId={datasetId} />
          <DocumentsTable documents={documents} onDelete={handleDeleteDocument} />
        </main>
        
        {/* Sticky Right Rail */}
        <aside className="lg:sticky lg:top-20 space-y-6 h-fit">
          <ActivityFeed events={mockEvents} />
          <Stats 
            totalDocs={documents.length}
            indexedDocs={completedCount}
            avgCoverage={avgCoverage}
            storageUsed={storageUsed}
          />
        </aside>
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

export default DatasetClient;
