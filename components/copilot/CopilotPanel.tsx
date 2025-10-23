"use client";
import { useState } from "react";
import { MessageList, ChatMessage } from "./MessageList";

export default function CopilotPanel({
  datasetId,
  organizationId,
}: {
  datasetId: string;
  organizationId?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "hello",
      role: "assistant",
      content: (
        <p>Your API Onboarding Copilot is ready. Ask about authentication, endpoints, SDK setup, or errors. I'll cite your docs.</p>
      ),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  let controller: AbortController | null = null;

  const send = async (text: string) => {
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, user]);
    setIsStreaming(true);
    controller = new AbortController();

    const assistantId = crypto.randomUUID();
    const assistant: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: <p className="text-zinc-400">Thinking...</p>,
    };
    setMessages((m) => [...m, assistant]);

    try {
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          datasetId,
          organizationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Update the assistant message with the response
      setMessages((m) =>
        m.map(msg => msg.id === assistantId ? { 
          ...msg, 
          messageId: data.messageId, // Store for feedback tracking
          content: <div className="prose prose-sm max-w-none">{data.response || 'No response'}</div>
        } : msg)
      );
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setMessages((m) =>
          m.map(msg => msg.id === assistantId ? { 
            ...msg, 
            content: <p className="text-red-600">Error: {error.message}</p>
          } : msg)
        );
      }
    } finally {
      setIsStreaming(false);
      controller = null;
    }
  };

  const stop = () => {
    controller?.abort();
    setIsStreaming(false);
  };

  const [input, setInput] = useState("");

  return (
    <div className="h-full w-full rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 sm:px-4 pt-4 pb-6">
          <MessageList messages={messages} datasetId={datasetId} />
        </div>
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
                  send(input.trim());
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
              onClick={stop}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => {
                if (input.trim()) {
                  send(input.trim());
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
  );
}

