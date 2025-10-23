"use client";
import * as React from "react";

interface StatsProps {
  totalDocs: number;
  indexedDocs: number;
  avgCoverage: number;
  storageUsed: string;
}

export function Stats({ totalDocs, indexedDocs, avgCoverage, storageUsed }: StatsProps) {
  return (
    <div className="rounded-xl border bg-card/50 backdrop-blur p-3">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">Documents</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-600">Total</span>
          <span className="text-sm font-medium text-slate-900">{totalDocs}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-600">Indexed</span>
          <span className="text-sm font-medium text-slate-900">{indexedDocs}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-600">Coverage avg</span>
          <span className="text-sm font-medium text-slate-900">{avgCoverage}%</span>
        </div>
        {indexedDocs < totalDocs && totalDocs > 0 && (
          <p className="text-xs text-slate-500 mt-2">Waiting for indexing…</p>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Storage</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">Used</span>
            <span className="text-sm font-medium text-slate-900">{storageUsed}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">Available</span>
            <span className="text-sm font-medium text-slate-900">Unlimited</span>
          </div>
        </div>
      </div>
    </div>
  );
}
