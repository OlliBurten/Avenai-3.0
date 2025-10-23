"use client";
import { useState, useEffect } from "react";
import { X, FileText, Loader2 } from "lucide-react";

interface SourceModalProps {
  source: {
    title?: string;
    filename?: string;
    page?: number;
    sectionPath?: string | null;
    sourceParagraph?: string;
    chunkId?: string;
  };
  datasetId: string;
  onClose: () => void;
}

export default function SourceModal({ source, datasetId, onClose }: SourceModalProps) {
  const [fullContext, setFullContext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFullContext() {
      if (!source.chunkId) {
        setError("No chunk ID available");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/chunks/${source.chunkId}?datasetId=${datasetId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch chunk: ${response.statusText}`);
        }
        const data = await response.json();
        setFullContext(data.content || source.sourceParagraph || "No content available");
      } catch (err) {
        console.error("Error fetching full context:", err);
        setError("Failed to load full context");
        setFullContext(source.sourceParagraph || null);
      } finally {
        setLoading(false);
      }
    }

    fetchFullContext();
  }, [source.chunkId, datasetId, source.sourceParagraph]);

  const displayName = (source.filename || source.title || "Document").replace(/\.pdf$/i, "");

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {displayName}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              {source.page && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium border border-gray-200">
                  Page {source.page}
                </span>
              )}
              {source.sectionPath && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium border border-gray-200 truncate max-w-md">
                  {source.sectionPath}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm text-gray-500">Loading full context...</p>
            </div>
          ) : error && !fullContext ? (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  Source Context
                </p>
                <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {fullContext || "No content available"}
                </div>
              </div>
              
              {error && (
                <div className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  ⚠️ Showing cached snippet. Full context could not be loaded.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
          <p className="text-xs text-gray-500">
            This is the original text from the document that was used to generate the AI's answer.
          </p>
        </div>
      </div>
    </div>
  );
}

