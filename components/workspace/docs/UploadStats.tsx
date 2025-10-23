"use client";
import { useState, useEffect } from "react";
import { FileText, CheckCircle2, AlertCircle, Clock, TrendingUp, Upload } from "lucide-react";

interface UploadStatsProps {
  datasetId: string;
}

interface Stats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  totalSize: number;
  totalChunks: number;
  avgCoverage: number;
}

export default function UploadStats({ datasetId }: UploadStatsProps) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    totalSize: 0,
    totalChunks: 0,
    avgCoverage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/documents/stats?datasetId=${datasetId}`);
      if (!response.ok) {
        console.error("Failed to fetch upload stats:", response.status);
        return;
      }
      
      const data = await response.json();
      setStats(data.stats || stats);
    } catch (error) {
      console.error("Failed to fetch upload stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [datasetId]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-3 h-20"></div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Uploads",
      value: stats.total,
      icon: Upload,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Processing",
      value: stats.processing,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Failed",
      value: stats.failed,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Total Size",
      value: formatFileSize(stats.totalSize),
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Avg Coverage",
      value: `${stats.avgCoverage}%`,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Upload Statistics</h3>
        <button 
          onClick={fetchStats}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} rounded-lg p-3 border border-gray-200/50`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="space-y-1">
                <p className={`text-xl font-semibold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {stats.totalChunks > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-200/50">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-indigo-900">
                {stats.totalChunks.toLocaleString()} chunks indexed
              </p>
              <p className="text-xs text-indigo-600">
                Ready for AI-powered chat
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

