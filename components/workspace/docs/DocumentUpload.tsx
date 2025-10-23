"use client";
import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, X, CheckCircle2, AlertTriangle, Loader2, Files } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueueItem {
  tempId: string;
  name: string;
  size: number;
  progress: number;
  state: "queued" | "uploading" | "created" | "processing" | "indexing" | "completed" | "failed";
  docId?: string;
  error?: string;
  fileType: string;
}

interface DocumentUploadProps {
  datasetId: string;
  onQueued: (rows: Array<{ id: string; name: string; size: number; type: string; status: string; updatedAt: string; downloadUrl: string }>) => void;
  onIndexed: (updated: Array<{ id: string; name: string; size: number; type: string; status: string; updatedAt: string; downloadUrl: string }>) => void;
}

function uploadFile(datasetId: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<{ ok: boolean; docId?: string; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    xhr.open("POST", `/api/documents?datasetId=${datasetId}`);
    xhr.upload.onprogress = (e) => { 
      if (e.lengthComputable) onProgress(Math.round((e.loaded/e.total)*100)); 
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        resolve({ 
          ok: xhr.status < 300 && json?.ok !== false, 
          docId: json?.document?.id, 
          error: json?.error 
        });
      } catch {
        resolve({ ok: false, error: "Invalid server response" });
      }
    };
    xhr.onerror = () => resolve({ ok: false, error: "Network error" });
    xhr.send(form);
  });
}

export default function DocumentUpload({ datasetId, onQueued, onIndexed }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Poll for document status updates
  useEffect(() => {
    const pollDocumentStatus = async () => {
      const createdItems = queue.filter(item => item.state === "created" && item.docId);
      if (createdItems.length === 0) return;

      try {
        const response = await fetch(`/api/documents?datasetId=${datasetId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        const documents = data.documents || [];

        createdItems.forEach(item => {
          const doc = documents.find((d: any) => d.id === item.docId);
          if (doc) {
            const newStatus = doc.status;
            const isCompleted = newStatus === "COMPLETED";
            const isFailed = newStatus === "FAILED";

            if (isCompleted || isFailed) {
              // Update parent with final status
              onIndexed([{
                id: item.docId!,
                name: item.name,
                size: item.size,
                type: item.fileType,
                status: newStatus,
                updatedAt: new Date().toISOString(),
                downloadUrl: '', // TODO: Add actual download URL
              }]);

              // Remove from queue after brief success display
              setTimeout(() => {
                setQueue(prev => prev.filter(q => q.tempId !== item.tempId));
              }, isCompleted ? 1500 : 3000);
            } else {
              // Update queue status
              setQueue(prev => prev.map(q => 
                q.tempId === item.tempId ? { 
                  ...q, 
                  state: newStatus.toLowerCase() as QueueItem["state"]
                } : q
              ));
            }
          }
        });
      } catch (error) {
        console.error("Failed to poll document status:", error);
      }
    };

    const interval = setInterval(pollDocumentStatus, 2000);
    return () => clearInterval(interval);
  }, [queue, datasetId, onIndexed]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: QueueItem[] = Array.from(files).map(file => ({
      tempId: `temp-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      progress: 0,
      state: "queued",
      fileType: file.type.split('/')[1]?.toUpperCase() || 'Unknown',
    }));

    setQueue(prev => [...newItems, ...prev]);
    setIsUploading(true);

    // Process each file
    for (const item of newItems) {
      const file = Array.from(files).find(f => f.name === item.name);
      if (!file) continue;

      // Update to uploading state
      setQueue(prev => prev.map(q => 
        q.tempId === item.tempId ? { ...q, state: "uploading" } : q
      ));

      try {
        const result = await uploadFile(datasetId, file, (progress) => {
          setQueue(prev => prev.map(q => 
            q.tempId === item.tempId ? { ...q, progress } : q
          ));
        });

        if (result.ok && result.docId) {
          // Update to created state and notify parent immediately
          setQueue(prev => prev.map(q => 
            q.tempId === item.tempId ? { 
              ...q, 
              state: "created", 
              docId: result.docId,
              progress: 100 
            } : q
          ));

          // Notify parent of new document (moves to DocumentsTable)
          onQueued([{
            id: result.docId,
            name: item.name,
            size: item.size,
            type: item.fileType,
            status: "PROCESSING",
            updatedAt: new Date().toISOString(),
            downloadUrl: '', // TODO: Add actual download URL
          }]);

          // Remove from queue after brief display
          setTimeout(() => {
            setQueue(prev => prev.filter(q => q.tempId !== item.tempId));
          }, 1000);
        } else {
          // Handle error
          setQueue(prev => prev.map(q => 
            q.tempId === item.tempId ? { 
              ...q, 
              state: "failed", 
              error: result.error || "Upload failed" 
            } : q
          ));
        }
      } catch (error) {
        setQueue(prev => prev.map(q => 
          q.tempId === item.tempId ? { 
            ...q, 
            state: "failed", 
            error: "Upload failed" 
          } : q
        ));
      }
    }

    setIsUploading(false);
  };

  const getStateIcon = (state: QueueItem["state"]) => {
    switch (state) {
      case "queued":
        return <FileText className="h-4 w-4" />;
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "created":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "processing":
      case "indexing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStateColor = (state: QueueItem["state"]) => {
    switch (state) {
      case "queued":
        return "bg-gray-100 text-gray-700";
      case "uploading":
        return "bg-blue-100 text-blue-700";
      case "created":
        return "bg-green-100 text-green-700";
      case "processing":
        return "bg-yellow-100 text-yellow-700";
      case "indexing":
        return "bg-purple-100 text-purple-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-gray-300 hover:border-brand-400 hover:bg-gray-50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <UploadCloud className={`h-8 w-8 ${isDragging ? "text-brand-500" : "text-gray-400"}`} />
            <Files className={`h-8 w-8 ${isDragging ? "text-brand-500" : "text-gray-400"}`} />
          </div>
          <p className={`text-sm font-medium mb-1 ${isDragging ? "text-brand-600" : "text-gray-600"}`}>
            {isDragging ? "Drop your files here" : "Drop multiple files here or click to upload"}
          </p>
          <p className="text-xs text-gray-500">
            PDF, TXT, MD files supported • Multiple files allowed
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Upload Queue</h4>
          {queue.map((item) => (
            <div
              key={item.tempId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${getStateColor(item.state)}`}
            >
              {getStateIcon(item.state)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs opacity-75">
                  {(item.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex items-center gap-2">
                {item.state === "uploading" && (
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.state === "created" && (
                  <span className="text-xs text-green-600 font-medium">Created</span>
                )}
                {item.error && (
                  <span className="text-xs text-red-600">{item.error}</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQueue(prev => prev.filter(q => q.tempId !== item.tempId))}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
