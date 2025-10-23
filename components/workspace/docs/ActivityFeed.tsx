"use client";
import { useState, useEffect } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, Clock, FileText, Activity } from "lucide-react";

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
  datasetId: string;
}

export default function ActivityFeed({ datasetId }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchActivityEvents = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      
      const response = await fetch(`/api/documents/activity?datasetId=${datasetId}`);
      if (!response.ok) {
        // Silently handle 404 or other errors - activity feed is optional
        if (response.status !== 404) {
          console.warn("Activity feed unavailable:", response.status);
        }
        setEvents([]);
        return;
      }
      
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      // Silently handle network errors - activity feed is optional
      // Don't log to avoid console noise during testing
      setEvents([]);
    } finally {
      setIsLoading(false);
      if (showRefreshing) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch initial activity events
    fetchActivityEvents(false);

    // Set up polling for real-time updates every 12 seconds
    const interval = setInterval(() => fetchActivityEvents(true), 12000);

    return () => clearInterval(interval);
  }, [datasetId]);

  const getEventIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "uploaded":
        return <UploadCloud className="h-4 w-4 text-blue-600" />;
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
      case "indexed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "ready":
        return <FileText className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventColor = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "uploaded":
        return "bg-blue-50 border-blue-200";
      case "processing":
        return "bg-yellow-50 border-yellow-200";
      case "indexed":
        return "bg-green-50 border-green-200";
      case "failed":
        return "bg-red-50 border-red-200";
      case "ready":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getEventMessage = (event: ActivityEvent) => {
    switch (event.type) {
      case "uploaded":
        return `Uploaded ${event.fileName}`;
      case "processing":
        return `Processing ${event.fileName}...`;
      case "indexed":
        return `Indexed ${event.fileName}`;
      case "failed":
        return `Failed to process ${event.fileName}`;
      case "ready":
        return `${event.fileName} is ready for chat`;
      default:
        return `Updated ${event.fileName}`;
    }
  };

  // Group events by "Today" and "Earlier"
  const groupEventsByDate = (events: ActivityEvent[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayEvents: ActivityEvent[] = [];
    const earlierEvents: ActivityEvent[] = [];
    
    events.forEach(event => {
      const eventDate = new Date(event.timestamp);
      if (eventDate >= today) {
        todayEvents.push(event);
      } else {
        earlierEvents.push(event);
      }
    });
    
    return { todayEvents, earlierEvents };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No recent activity</p>
        <p className="text-xs">Upload documents to see activity here</p>
      </div>
    );
  }

  // Sort events in reverse chronological order (newest first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  const { todayEvents, earlierEvents } = groupEventsByDate(sortedEvents);

  const renderEventGroup = (groupEvents: ActivityEvent[], title: string) => {
    if (groupEvents.length === 0) return null;
    
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
          {title}
        </h4>
        {groupEvents.map((event) => (
          <div
            key={event.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm ${getEventColor(event.type)}`}
          >
            {getEventIcon(event.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {getEventMessage(event)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">
                  {formatTimestamp(event.timestamp)}
                </p>
                {event.coverage && (
                  <span className="text-xs text-gray-500">
                    • {event.coverage}% coverage
                  </span>
                )}
                {event.chunks && (
                  <span className="text-xs text-gray-500">
                    • {event.chunks} chunks
                  </span>
                )}
              </div>
              {event.details && (
                <p className="text-xs text-gray-600 mt-1">{event.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {isRefreshing && (
        <div className="flex items-center gap-2 text-xs text-gray-500 pb-2">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Refreshing activity...</span>
        </div>
      )}
      {renderEventGroup(todayEvents, "Today")}
      {renderEventGroup(earlierEvents, "Earlier")}
    </div>
  );
}
