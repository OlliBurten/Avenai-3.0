"use client";
import * as React from "react";
import { CheckCircle2, Brain, Sparkles, FileText, Database } from "lucide-react";

interface DatasetSummaryProps {
  datasetName: string;
  totalDocs: number;
  indexedDocs: number;
  avgCoverage: number;
  storageUsed: string;
  isReady: boolean;
}

export function DatasetSummary({ 
  datasetName, 
  totalDocs, 
  indexedDocs, 
  avgCoverage, 
  storageUsed, 
  isReady 
}: DatasetSummaryProps) {
  const [showBanner, setShowBanner] = React.useState(isReady);

  React.useEffect(() => {
    if (isReady) {
      setShowBanner(true);
      // Auto-hide banner after 5 seconds
      const timer = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  return (
    <>
      {/* AI Agent Trained Banner */}
      {showBanner && (
        <div className="mb-6 animate-in slide-in-from-top-2 duration-500">
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-emerald-900">
                  AI Agent Trained Successfully! 🎉
                </h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Your documents are now indexed and ready for intelligent Q&A. The AI can answer questions about your content with high accuracy.
                </p>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="flex-shrink-0 p-1 text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Summary Card */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{datasetName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {isReady ? 'Ready for AI-powered Q&A' : 'Processing documents...'}
              </p>
            </div>
          </div>
          
          {isReady && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              AI Ready
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-slate-50">
            <FileText className="h-5 w-5 mx-auto mb-2 text-slate-600" />
            <div className="text-lg font-semibold text-gray-900">{totalDocs}</div>
            <div className="text-xs text-gray-600">Total Documents</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-blue-50">
            <Database className="h-5 w-5 mx-auto mb-2 text-blue-600" />
            <div className="text-lg font-semibold text-gray-900">{indexedDocs}</div>
            <div className="text-xs text-gray-600">Indexed</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-purple-50">
            <Sparkles className="h-5 w-5 mx-auto mb-2 text-purple-600" />
            <div className="text-lg font-semibold text-gray-900">{avgCoverage}%</div>
            <div className="text-xs text-gray-600">Avg Coverage</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-green-50">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-green-600" />
            <div className="text-lg font-semibold text-gray-900">{storageUsed}</div>
            <div className="text-xs text-gray-600">Storage Used</div>
          </div>
        </div>

        {/* Progress Indicator */}
        {!isReady && totalDocs > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Processing Progress</span>
              <span>{indexedDocs}/{totalDocs} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(indexedDocs / totalDocs) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
