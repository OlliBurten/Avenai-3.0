// app/(components)/documents/ReextractButton.tsx
"use client";
import React, { useState } from "react";

export const ReextractButton: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReextract() {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/documents/${documentId}/reextract`, {
        method: "POST"
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      
      setDone(true);
      
      // Refresh page after 2 seconds to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (e: any) {
      setError(e?.message ?? "Failed to reprocess");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleReextract}
        disabled={loading || done}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        title="Re-extract text and re-embed document with latest extraction features"
      >
        {loading ? "Reprocessing..." : done ? "✓ Reprocessed" : "Re-extract & Re-embed"}
      </button>
      
      {error && (
        <span className="text-xs text-rose-600">{error}</span>
      )}
      
      {done && (
        <span className="text-xs text-emerald-600">
          ✓ Queued. Refreshing...
        </span>
      )}
    </div>
  );
};

