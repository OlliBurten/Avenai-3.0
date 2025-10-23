"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import SourceModal from "./SourceModal";

interface Source {
  title?: string;
  filename?: string;
  page?: number;
  sectionPath?: string | null; // Section path for navigation
  sourceParagraph?: string; // Evidence snippet
  chunkId?: string; // For fetching full context
}

export default function SourceChips({ sources, datasetId }: { sources?: Source[]; datasetId?: string }) {
  const [showAll, setShowAll] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  
  if (!sources?.length) return null;
  
  // Deduplicate by filename/title
  const uniqueSources = Array.from(
    new Map(
      sources
        .filter(s => s.title || s.filename)
        .map(s => [s.filename || s.title, s])
    ).values()
  );
  
  if (uniqueSources.length === 0) return null;
  
  const MAX_VISIBLE = 3;
  const visibleSources = showAll ? uniqueSources : uniqueSources.slice(0, MAX_VISIBLE);
  const hiddenCount = uniqueSources.length - MAX_VISIBLE;
  
  const truncate = (str: string, maxLen: number = 30) => {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
  };
  
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {visibleSources.map((source, idx) => {
        // Strip .pdf extension
        const rawName = source.filename || source.title || 'Document';
        const displayName = rawName.replace(/\.pdf$/i, '');
        
        // Build display text with page and section
        let displayText = truncate(displayName, 25);
        if (source.page) {
          displayText += ` • p.${source.page}`;
        }
        if (source.sectionPath) {
          displayText += ` • ${truncate(source.sectionPath, 15)}`;
        }
        if (!source.page && !source.sectionPath) {
          displayText = truncate(displayName, 30);
        }
        
        const hasSnippet = source.sourceParagraph && source.sourceParagraph.length > 10;
        
        return (
          <div key={idx} className="relative inline-block">
            <button
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 border border-zinc-200 cursor-pointer hover:bg-blue-100 hover:border-blue-300 hover:text-blue-700 transition-colors"
              title={`Click to view full context from ${displayName}`}
              onClick={() => datasetId && setSelectedSource(source)}
              onMouseEnter={() => {
                console.log('Hovering source:', idx, 'hasSnippet:', hasSnippet);
                setHoveredIndex(idx);
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <FileText className="h-3 w-3" />
              <span>{displayText}</span>
            </button>
            
            {/* Popover with evidence snippet */}
            {hasSnippet && hoveredIndex === idx && (
              <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white rounded-lg shadow-2xl border-2 border-blue-500 z-50 animate-in fade-in duration-200">
                <div className="text-xs font-semibold text-zinc-800 mb-1.5">
                  {displayName}
                  {source.page && ` • Page ${source.page}`}
                </div>
                <div className="text-xs text-zinc-600 leading-relaxed">
                  {truncate(source.sourceParagraph || '', 150)}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-3 py-1 text-xs text-zinc-500 border border-zinc-200 hover:bg-zinc-100 transition-colors"
        >
          +{hiddenCount} more
        </button>
      )}
      
      {showAll && uniqueSources.length > MAX_VISIBLE && (
        <button
          onClick={() => setShowAll(false)}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-3 py-1 text-xs text-zinc-500 border border-zinc-200 hover:bg-zinc-100 transition-colors"
        >
          Show less
        </button>
      )}
      
      {/* Source Modal */}
      {selectedSource && datasetId && (
        <SourceModal
          source={selectedSource}
          datasetId={datasetId}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </div>
  );
}
