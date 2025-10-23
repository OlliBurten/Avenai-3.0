"use client";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { MessageItem } from "@/app/(components)/chat/MessageItem";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: ReactNode; // already-rendered markdown allowed
  messageId?: string; // For feedback tracking
};

export function MessageList({ messages, datasetId }: { messages: ChatMessage[]; datasetId?: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="w-full mx-auto max-w-3xl">
      {messages.map(m => (
        <div key={m.id} className="py-3">
          <MessageItem m={m} datasetId={datasetId} />
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

