import { useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";

export interface Document {
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

export function useDocuments(datasetId: string) {
  return useQuery({
    queryKey: ["documents", datasetId],
    queryFn: async () => {
      const res = await fetch(`/api/documents?datasetId=${datasetId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json() as Promise<{ documents: Document[] }>;
    },
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
    refetchIntervalInBackground: false, // Stop polling when tab is hidden
    staleTime: 0, // Always consider data stale (allow immediate refetching)
  });
}

export function useDatasetSSE(datasetId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    // Additional polling layer for immediate UI updates
    const pollInterval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["documents", datasetId] });
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [datasetId, qc]);
}
