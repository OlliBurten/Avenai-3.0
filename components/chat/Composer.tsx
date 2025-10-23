import { useEffect, useRef, useState } from "react";
import { Send, Square, Loader2 } from "lucide-react";

type ComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isStreaming?: boolean;
  onStop?: () => void;
  placeholder?: string;
};

export default function Composer({
  value, onChange, onSend, isStreaming, onStop, placeholder = "Ask about your dataset..."
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [sending, setSending] = useState(false);

  // auto-resize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const max = 8 * 24; // ~8 lines * line-height
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const cmdOrCtrl = (e.metaKey || e.ctrlKey);
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) onSend();
      return;
    }
    if (cmdOrCtrl && e.key.toLowerCase() === "enter") {
      e.preventDefault();
      if (!isStreaming) onSend();
    }
  };

  // reset local "sending" when stream ends
  useEffect(() => {
    if (!isStreaming) setSending(false);
  }, [isStreaming]);

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div className="rounded-2xl border bg-card/90 backdrop-blur shadow-sm">
      <div className="flex items-end gap-2 p-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none px-3 py-2 leading-6 text-[15px] placeholder:text-zinc-400"
          placeholder={placeholder}
          aria-label="Type your message"
        />
        {!isStreaming ? (
          <button
            type="button"
            onClick={() => { setSending(true); onSend(); }}
            disabled={!canSend}
            className="shrink-0 inline-flex items-center justify-center rounded-xl px-3 py-2 bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600/90 transition"
            title="Send (Enter). Shift+Enter for newline."
          >
            {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            Send
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="shrink-0 inline-flex items-center justify-center rounded-xl px-3 py-2 bg-muted text-foreground hover:bg-muted/80 transition"
            title="Stop generating"
          >
            <Square className="mr-1 h-4 w-4" />
            Stop
          </button>
        )}
      </div>
      <div className="flex items-center justify-between px-3 pb-2">
        <span className="hidden xl:block text-xs text-zinc-500">
          Shift+Enter = newline • Cmd/Ctrl+Enter = send
        </span>
        {/* room for token/char counter or status */}
      </div>
    </div>
  );
}
