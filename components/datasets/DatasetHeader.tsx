"use client";
import { MessageSquare, MoreHorizontal } from "lucide-react";

interface DatasetHeaderProps {
  datasetId: string;
  canChat: boolean;
}

export function DatasetHeader({ datasetId, canChat }: DatasetHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {canChat && (
        <button
          onClick={() => window.location.href = `/chat?dataset=${datasetId}`}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Open Chat
        </button>
      )}
      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </div>
  );
}
