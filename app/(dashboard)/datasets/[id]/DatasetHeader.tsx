"use client";
import { MessageSquare, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export function DatasetHeader({
  name,
  docCount,
  indexedCount,
  canChat,
  datasetId,
}: {
  name: string; 
  docCount: number; 
  indexedCount: number; 
  canChat: boolean; 
  datasetId: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
          <span className="text-neutral-400">•</span>
          <span>{docCount} documents</span>
          <span className="text-neutral-400">•</span>
          <span>{indexedCount} indexed</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={canChat ? `/chat?dataset=${datasetId}` : "#"}
          aria-disabled={!canChat}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium shadow-sm transition
            ${canChat
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-neutral-200 text-neutral-500 cursor-not-allowed"}`}
          title={canChat ? "Open chat" : "Add and index a document to start chatting"}
        >
          <Icon as={MessageSquare} className="h-4 w-4 text-current" />
          Open Chat
        </Link>

        <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200/70 bg-white shadow-sm hover:bg-neutral-50">
          <Icon as={MoreHorizontal} />
        </button>
      </div>
    </div>
  );
}
