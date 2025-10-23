"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // no-op
    }
  }

  return (
    <button
      onClick={onCopy}
      className="rounded-md px-2 py-1 border border-[var(--border)] bg-white/60 dark:bg-black/40 hover:bg-white/90 dark:hover:bg-black/60 transition text-xs"
      aria-label="Copy code"
      type="button"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
