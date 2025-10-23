"use client";
import * as React from "react";
import { CheckCircle2, ListChecks, UploadCloud, AlertTriangle, FileText, ActivitySquare } from "lucide-react";

interface ActivityEvent {
  id: string;
  type: "uploaded" | "processing" | "indexed" | "failed" | "ready";
  fileName: string;
  timestamp: string;
  details?: string;
  coverage?: number;
  chunks?: number;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const getEventIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "uploaded":
        return <UploadCloud className="h-4 w-4 text-blue-600" />;
      case "processing":
        return <FileText className="h-4 w-4 text-yellow-600" />;
      case "indexed":
        return <ListChecks className="h-4 w-4 text-purple-600" />;
      case "ready":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <ActivitySquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventText = (event: ActivityEvent) => {
    switch (event.type) {
      case "uploaded":
        return `Uploaded ${event.fileName}`;
      case "processing":
        return `Processing ${event.fileName}`;
      case "indexed":
        return `Indexed ${event.chunks || 0} chunks from ${event.fileName}`;
      case "ready":
        return `${event.fileName} ready for chat${event.coverage ? ` (${event.coverage}% coverage)` : ''}`;
      case "failed":
        return `Failed to process ${event.fileName}`;
      default:
        return event.fileName;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="rounded-xl border bg-card/50 backdrop-blur p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
        <button className="text-xs text-slate-500 hover:text-slate-700">View all</button>
      </div>
      
      {events.length > 0 ? (
        <div className="space-y-2">
          {events.slice(0, 4).map((event) => (
            <div key={event.id} className="flex items-start gap-2">
              <div className="mt-0.5">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-900 leading-relaxed">{getEventText(event)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatTime(event.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <ActivitySquare className="h-5 w-5 mx-auto mb-2 text-slate-300" />
          <p className="text-xs text-slate-500">No activity yet. Upload a document to get started.</p>
        </div>
      )}
    </div>
  );
}
