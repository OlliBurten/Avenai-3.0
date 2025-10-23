"use client";
import * as React from "react";
import { UploadCloud, FileText, Eye, Trash2, RotateCcw, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useDocuments, useDatasetSSE, Document } from "@/lib/client/useDatasetData";

interface QueueItem {
  tempId: string;
  name: string;
  size: number;
  progress: number;
  state: "queued" | "uploading" | "processing" | "indexing" | "completed" | "failed";
  docId?: string;
  error?: string;
  animated?: boolean;
}

interface DocumentUploadProps {
  datasetId: string;
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

export function DocumentUpload({ datasetId }: DocumentUploadProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  
  // Use React Query for documents and SSE for real-time updates
  const { data: documentsData } = useDocuments(datasetId);
  useDatasetSSE(datasetId);
  
  const documents = documentsData?.documents || [];
  const completedCount = documents.filter(doc => doc.status === "COMPLETED").length;
  const canChat = completedCount > 0;

  // Memoize completed document IDs to prevent infinite loops
  const completedDocIds = React.useMemo(() => 
    documents
      .filter(doc => doc.status === "COMPLETED" || doc.status === "FAILED")
      .map(doc => doc.id),
    [documents]
  );

  // Auto-remove finished queue items when documents are updated
  React.useEffect(() => {
    setQueue(prev => {
      const newQueue = prev.filter(item => 
        !completedDocIds.includes(item.docId || '') && 
        item.state !== "completed" && 
        item.state !== "failed"
      );
      // Only update if the queue actually changed
      return newQueue.length !== prev.length ? newQueue : prev;
    });
  }, [completedDocIds]);

  const removeFromQueue = (tempId: string) => {
    setQueue(prev => prev.filter(item => item.tempId !== tempId));
  };

  const retryUpload = async (tempId: string, file: File) => {
    setQueue(prev => prev.map(item => 
      item.tempId === tempId 
        ? { ...item, state: "queued", progress: 0, error: undefined }
        : item
    ));

    try {
      const result = await uploadFile(datasetId, file, (progress) => {
        setQueue(prev => prev.map(item => 
          item.tempId === tempId 
            ? { ...item, progress, state: "uploading" }
            : item
        ));
      });

      if (result.ok && result.docId) {
        setQueue(prev => prev.map(item => 
          item.tempId === tempId 
            ? { ...item, state: "processing", progress: 100, docId: result.docId }
            : item
        ));
      } else {
        setQueue(prev => prev.map(item => 
          item.tempId === tempId 
            ? { ...item, state: "failed", error: result.error }
            : item
        ));
      }
    } catch (error) {
      setQueue(prev => prev.map(item => 
        item.tempId === tempId 
          ? { ...item, state: "failed", error: String(error) }
          : item
      ));
    }
  };

  function onPick() { 
    inputRef.current?.click(); 
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    
    setIsUploading(true);
    
    // Limit to 3 concurrent uploads
    const files = Array.from(fileList).slice(0, 3);
    
    for (const file of files) {
      const tempId = crypto.randomUUID();
      
      // Add to queue immediately
      const queueItem: QueueItem = {
        tempId,
        name: file.name,
        size: file.size,
        progress: 0,
        state: "queued",
      };
      
      setQueue(prev => [...prev, queueItem]);

      try {
        const result = await uploadFile(datasetId, file, (progress) => {
          setQueue(prev => prev.map(item => 
            item.tempId === tempId 
              ? { ...item, progress, state: "uploading" }
              : item
          ));
        });

        if (result.ok && result.docId) {
          setQueue(prev => prev.map(item => 
            item.tempId === tempId 
              ? { ...item, state: "processing", progress: 100, docId: result.docId }
              : item
          ));
        } else {
          setQueue(prev => prev.map(item => 
            item.tempId === tempId 
              ? { ...item, state: "failed", error: result.error }
              : item
          ));
        }
      } catch (error) {
        setQueue(prev => prev.map(item => 
          item.tempId === tempId 
            ? { ...item, state: "failed", error: String(error) }
            : item
        ));
      }
    }
    
    setIsUploading(false);
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileType = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'PDF';
      case 'md': return 'Markdown';
      case 'txt': return 'Text';
      case 'json': return 'JSON';
      case 'yaml':
      case 'yml': return 'YAML';
      default: return ext?.toUpperCase() || 'Unknown';
    }
  };

  const getStateColor = (state: QueueItem["state"]) => {
    switch (state) {
      case "queued":
        return "bg-slate-100 text-slate-700";
      case "uploading":
        return "bg-blue-100 text-blue-700";
      case "processing":
        return "bg-amber-100 text-amber-700";
      case "indexing":
        return "bg-purple-100 text-purple-700";
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      case "failed":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStateIcon = (state: QueueItem["state"], animated?: boolean) => {
    switch (state) {
      case "queued":
        return <FileText className="h-4 w-4" />;
      case "uploading":
        return <Loader2 className={`h-4 w-4 ${animated ? 'animate-spin' : ''}`} />;
      case "processing":
        return <Loader2 className={`h-4 w-4 ${animated ? 'animate-spin' : ''}`} />;
      case "indexing":
        return <Loader2 className={`h-4 w-4 ${animated ? 'animate-spin' : ''}`} />;
      case "completed":
        return <CheckCircle2 className={`h-4 w-4 ${animated ? 'animate-pulse' : ''}`} />;
      case "failed":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <section className="rounded-2xl border border-slate-200 p-5">
        <div
          onClick={onPick}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
          className="h-44 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50/50 cursor-pointer hover:border-primary/30 hover:ring-2 hover:ring-primary/30 hover:bg-slate-100/50 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <div className="text-center">
            <UploadCloud className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-900 mb-1">Drop files here or click to browse</p>
            <p className="text-sm text-slate-500">PDF, MD, TXT, JSON, YAML (OpenAPI) • up to 10MB each</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            name="file"
            className="hidden"
            onChange={(e) => handleFiles(e.currentTarget.files)}
            accept=".pdf,.md,.txt,.json,.yaml,.yml"
            multiple
          />
        </div>
      </section>

      {/* Upload Queue - Only show in-progress items */}
      {queue.length > 0 && (
        <section className="rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-medium text-slate-900 mb-3">Uploading files</h3>
          {queue.map((item) => (
            <div key={item.tempId} className="flex items-center gap-3 py-2 transition-all duration-300 ease-in-out">
              <div className="flex-shrink-0">
                {getStateIcon(item.state, item.animated)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                  <span className="text-xs text-slate-500">{formatFileSize(item.size)}</span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                {item.error && (
                  <p className="text-xs text-red-600 mt-1 animate-pulse">{item.error}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {item.state === "failed" && (
                  <>
                    <button 
                      onClick={() => {
                        // We'd need to store the original file to retry
                        // For now, just remove and let user re-upload
                        removeFromQueue(item.tempId);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Retry"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => removeFromQueue(item.tempId)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
                {item.state !== "failed" && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${getStateColor(item.state)}`}>
                    {item.state}
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}