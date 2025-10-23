"use client";
import { useState, useEffect } from "react";

type Status = "online" | "connecting" | "degraded" | "offline";

type StatusIndicatorProps = {
  showLabel?: boolean;
};

export default function StatusIndicator({ showLabel = false }: StatusIndicatorProps) {
  const [status, setStatus] = useState<Status>("connecting");
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  // Health check function
  const checkHealth = async () => {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        // Determine status based on response time
        if (responseTime < 1000) {
          setStatus("online");
        } else if (responseTime < 3000) {
          setStatus("degraded");
        } else {
          setStatus("degraded");
        }
      } else {
        setStatus("offline");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setStatus("degraded"); // Timeout = degraded
      } else {
        setStatus("offline");
      }
    }

    setLastCheckTime(Date.now());
  };

  // Initial check and periodic polling
  useEffect(() => {
    checkHealth(); // Initial check

    // Poll every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  // Get color and styles based on status
  const getStatusStyles = () => {
    switch (status) {
      case "online":
        return {
          bg: "bg-emerald-500",
          shadow: "shadow-emerald-500/15",
          label: "Online",
          pulse: false,
        };
      case "connecting":
        return {
          bg: "bg-zinc-400",
          shadow: "shadow-zinc-400/15",
          label: "Connecting",
          pulse: true,
        };
      case "degraded":
        return {
          bg: "bg-amber-500",
          shadow: "shadow-amber-500/15",
          label: "Slow",
          pulse: false,
        };
      case "offline":
        return {
          bg: "bg-red-500",
          shadow: "shadow-red-500/15",
          label: "Offline",
          pulse: false,
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className="flex items-center gap-2" title={`Status: ${styles.label}`}>
      <span 
        className={`size-2.5 rounded-full ${styles.bg} shadow-[0_0_0_3px] ${styles.shadow} ${
          styles.pulse ? "animate-pulse" : ""
        }`}
      />
      {showLabel && (
        <span className="text-xs text-zinc-600">{styles.label}</span>
      )}
    </div>
  );
}
