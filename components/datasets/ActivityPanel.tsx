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

interface ActivityPanelProps {
  events: ActivityEvent[];
  totalDocs: number;
  indexedDocs: number;
  avgCoverage: number;
  storageUsed: string;
}

export function ActivityPanel({ events, totalDocs, indexedDocs, avgCoverage, storageUsed }: ActivityPanelProps) {
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
    <div className="space-y-4">
      {/* Activity Feed */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Activity</h3>
          <button className="text-xs text-slate-500 hover:text-slate-700">View all</button>
        </div>
        
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 leading-relaxed">{getEventText(event)}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatTime(event.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <ActivitySquare className="h-6 w-6 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No activity yet</p>
          </div>
        )}
      </div>

      {/* Documents Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Documents</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Total documents</span>
            <span className="font-medium text-slate-900">{totalDocs}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Indexed</span>
            <span className="font-medium text-slate-900">{indexedDocs}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Coverage avg</span>
            <span className="font-medium text-slate-900">{avgCoverage}%</span>
          </div>
          {indexedDocs < totalDocs && totalDocs > 0 && (
            <p className="text-xs text-slate-500 mt-2">Waiting for indexing…</p>
          )}
        </div>
      </div>

      {/* Storage Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Storage</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Used</span>
            <span className="font-medium text-slate-900">{storageUsed}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Available</span>
            <span className="font-medium text-slate-900">Unlimited</span>
          </div>
        </div>
      </div>
    </div>
  );
}
