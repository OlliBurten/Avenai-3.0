"use client";
import { useEffect, useState } from "react";
import { MessageList, ChatMessage } from "./MessageList";

export default function CopilotFullscreen({
  messages,
  isOpen,
  isStreaming,
  onSend,
  onStop,
  onClose,
}: {
  messages: ChatMessage[];
  isOpen: boolean;
  isStreaming: boolean;
  onSend: (t: string) => void | Promise<void>;
  onStop: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", isOpen);
    return () => document.body.classList.remove("overflow-hidden");
  }, [isOpen]);

  const [input, setInput] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-4 sm:inset-x-8 md:inset-x-20 lg:inset-x-40 top-10 bottom-10 rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 px-4 sm:px-6 flex items-center justify-between border-b border-zinc-200">
          <div className="font-medium">AI Copilot <span className="text-xs text-zinc-500 ml-2">Expanded</span></div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-900 text-sm">Exit Full</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <MessageList messages={messages} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isStreaming) {
                  e.preventDefault();
                  if (input.trim()) {
                    onSend(input.trim());
                    setInput("");
                  }
                }
              }}
              placeholder="Ask about your dataset…"
              disabled={isStreaming}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isStreaming ? (
              <button
                onClick={onStop}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => {
                  if (input.trim()) {
                    onSend(input.trim());
                    setInput("");
                  }
                }}
                disabled={!input.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

