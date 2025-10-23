"use client";

import React from "react";
import { Highlight } from "prism-react-renderer";
import { Copy, Check } from "lucide-react";

// Transparent light theme: keep token colors, but NO background
const transparentLightTheme = {
  plain: {
    color: "#0f172a", // slate-900
    backgroundColor: "transparent",
  },
  styles: [] as any[], // rely on default Prism token classes; background stays transparent
};

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string | "text";
}) {
  const langLabel = (language || "text").toString();
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="not-prose my-4 relative overflow-auto max-h-[420px] rounded-xl border border-zinc-200 bg-zinc-50">
      {/* Header — light-only */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-white sticky top-0 z-10">
        <span className="inline-flex items-center gap-2 text-xs text-zinc-600">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {langLabel.toUpperCase()}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code — transparent surface, auto-wrap, single outer card only */}
      <Highlight
        theme={transparentLightTheme}
        code={code}
        language={(language as any) || "markup"}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} m-0 p-3 text-[13px] leading-6 whitespace-pre-wrap break-words font-mono`}
            style={{ ...(style as React.CSSProperties) }}
          >
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line }); // no key here
              return (
                <div key={i} {...lineProps}>
                  {line.map((token, j) => {
                    const tokenProps = getTokenProps({ token }); // no key here
                    return <span key={j} {...tokenProps} />;
                  })}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
