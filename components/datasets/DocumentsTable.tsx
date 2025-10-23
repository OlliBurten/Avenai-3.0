"use client";
import * as React from "react";
import { FileText, Eye, Download, Link, Trash2, CheckCircle2, AlertTriangle, Loader2, ListChecks, UploadCloud, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface DocumentsTableProps {
  documents: Document[];
  onDelete?: (documentId: string) => void;
}

export function DocumentsTable({ documents, onDelete }: DocumentsTableProps) {
  const [filterType, setFilterType] = React.useState<string>("All");
  const [filterStatus, setFilterStatus] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState<string>("");

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "UPLOADING":
        return <UploadCloud className="h-4 w-4" />;
      case "PROCESSING":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "INDEXING":
        return <ListChecks className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "FAILED":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "UPLOADING":
        return "bg-slate-100 text-slate-700";
      case "PROCESSING":
        return "bg-amber-100 text-amber-700";
      case "INDEXING":
        return "bg-amber-100 text-amber-700";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-700";
      case "FAILED":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const truncateFileName = (fileName: string, maxLength: number = 30) => {
    if (fileName.length <= maxLength) return fileName;
    const start = fileName.substring(0, 15);
    const end = fileName.substring(fileName.length - 15);
    return `${start}...${end}`;
  };

  const filteredDocuments = documents.filter(doc => {
    const typeMatch = filterType === "All" || doc.type.toLowerCase() === filterType.toLowerCase();
    const statusMatch = filterStatus === "All" || doc.status === filterStatus.toUpperCase();
    const searchMatch = debouncedSearchQuery === "" || doc.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    return typeMatch && statusMatch && searchMatch;
  });

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No documents yet</h3>
        <p className="text-sm text-slate-500 mb-4">Upload your first document to get started</p>
        <Button variant="outline" size="sm">
          Browse files
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="All">All Types</option>
            <option value="PDF">PDF</option>
            <option value="MD">Markdown</option>
            <option value="TXT">Text</option>
            <option value="JSON">JSON</option>
            <option value="YAML">YAML</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="All">All Status</option>
            <option value="PROCESSING">Processing</option>
            <option value="INDEXING">Indexing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
          <Button variant="outline" size="sm">
            View all
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Name</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5 w-20">Type</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5 w-24">Size</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5 w-28">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5 w-20">Coverage</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5 w-24">Updated</th>
                <th className="w-24 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors focus-within:bg-slate-50">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        {doc.status === "FAILED" && doc.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">{doc.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-slate-600">{doc.type}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm text-slate-600">{formatFileSize(doc.size)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {getStatusIcon(doc.status)}
                      {doc.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {doc.coverage !== undefined ? (
                      <span className="text-sm text-slate-600">{doc.coverage}%</span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm text-slate-600">{formatDate(doc.updatedAt)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-x-3">
                      <button
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        href={doc.downloadUrl}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
                        title="Copy link"
                        onClick={() => {
                          const url = `${window.location.origin}/datasets/${window.location.pathname.split('/')[2]}?doc=${doc.id}`;
                          navigator.clipboard.writeText(url);
                        }}
                      >
                        <Link className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20 rounded"
                        title="Delete"
                        onClick={() => onDelete?.(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
