import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useDocumentStatus(datasetId: string) {
  const queryClient = useQueryClient();

  const handleStatusUpdate = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "document.status") {
        // Invalidate documents query to trigger refetch
        queryClient.invalidateQueries({ 
          queryKey: ["documents", datasetId] 
        });

        // Also invalidate dataset query if it exists
        queryClient.invalidateQueries({ 
          queryKey: ["dataset", datasetId] 
        });
      }
    } catch (error) {
      console.error("Error parsing SSE message:", error);
    }
  }, [datasetId, queryClient]);

  useEffect(() => {
    if (!datasetId) return;

    const eventSource = new EventSource(`/api/documents/status?datasetId=${datasetId}`);
    
    eventSource.onmessage = handleStatusUpdate;
    
    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      // Fallback to polling if SSE fails
      const fallbackInterval = setInterval(() => {
        queryClient.invalidateQueries({ 
          queryKey: ["documents", datasetId] 
        });
      }, 5000);

      // Clean up fallback polling when component unmounts
      return () => clearInterval(fallbackInterval);
    };

    return () => {
      eventSource.close();
    };
  }, [datasetId, handleStatusUpdate]);
}
