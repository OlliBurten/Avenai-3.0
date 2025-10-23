"use client";
import React from "react";
import { Clipboard, Check } from "lucide-react";
import Markdown from "@/components/ui/Markdown";

type SourceTag = "md" | "pdf" | "doc" | "html" | "txt";

export type Citation = { tag: SourceTag; n: number; title?: string };

type Props = {
  title?: string;                 // e.g. "Answer"
  summary?: string;               // plain text or markdown (brief)
  steps?: string[];               // list of steps
  endpoints?: { method: string; path: string }[];
  code?: { lang?: string; body: string; label?: string }[]; // multiple blocks
  notes?: string[];               // bullets / caveats
  citations?: Citation[];         // renders as colored pills
  footerNote?: string;            // "Missing" / follow-ups
};

export default function AnswerCard({
  title = "Answer",
  summary,
  steps = [],
  endpoints = [],
  code = [],
  notes = [],
  citations = [],
  footerNote,
}: Props) {
  const [copied, setCopied] = React.useState(false);
  const copyAll = React.useCallback(() => {
    const blob = [
      summary ? `Summary:\n${summary}` : "",
      steps.length ? `\nSteps:\n- ${steps.join("\n- ")}` : "",
      endpoints.length
        ? `\nEndpoints:\n${endpoints
            .map((e) => `• ${e.method.toUpperCase()} ${e.path}`)
            .join("\n")}`
        : "",
      code.length
        ? `\nCode:\n${code
            .map((c) => `\`\`\`${c.lang ?? ""}\n${c.body}\n\`\`\``)
            .join("\n\n")}`
        : "",
      notes.length ? `\nNotes:\n- ${notes.join("\n- ")}` : "",
      citations.length
        ? `\nCitations: ${citations
            .map((c) => `[${c.tag}:#${c.n}]${c.title ? ` ${c.title}` : ""}`)
            .join("  ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();
    navigator.clipboard.writeText(blob);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [summary, steps, endpoints, code, notes, citations]);

  return (
    <section className="group relative w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-5 py-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <button
          onClick={copyAll}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
          aria-label="Copy answer"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </header>

      {/* Body */}
      <div className="prose prose-sm max-w-none px-5 py-4 text-gray-800">
        {summary && (
          <div className="mb-4">
            <Markdown>{summary}</Markdown>
          </div>
        )}

        {!!steps.length && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-semibold text-gray-900">Steps</div>
            <ol className="m-0 list-decimal space-y-1 pl-5">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        {!!endpoints.length && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-semibold text-gray-900">Endpoints</div>
            <ul className="m-0 list-none space-y-1 p-0">
              {endpoints.map((e, i) => (
                <li
                  key={i}
                  className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[12px]"
                >
                  <span className="mr-2 inline-block rounded-sm bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-700">
                    {e.method.toUpperCase()}
                  </span>
                  {e.path}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!!code.length && (
          <div className="mb-4 space-y-3">
            <div className="mb-2 text-sm font-semibold text-gray-900">Code</div>
            {code.map((c, i) => (
              <CodeBlock key={i} lang={c.lang} body={c.body} label={c.label} />
            ))}
          </div>
        )}

        {!!notes.length && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-semibold text-gray-900">Notes</div>
            <div className="prose prose-sm max-w-none">
              <Markdown>{notes.map(n => `- ${n}`).join('\n')}</Markdown>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {citations?.map((c, i) => (
            <span
              key={`${c.tag}-${c.n}-${i}`}
              className={[
                "inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold",
                c.tag === "md" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
                c.tag === "pdf" && "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                c.tag === "doc" && "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
                c.tag === "html" && "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
                c.tag === "txt" && "bg-gray-50 text-gray-700 ring-1 ring-gray-200",
              ]
                .filter(Boolean)
                .join(" ")}
              title={c.title ?? ""}
            >
              [{c.tag}:#{c.n}] {c.title ? ` ${c.title}` : ""}
            </span>
          ))}
        </div>

        {footerNote && (
          <p className="m-0 text-[12px] text-gray-500">
            {footerNote}
          </p>
        )}
      </footer>
    </section>
  );
}

function CodeBlock({ lang, body, label }: { lang?: string; body: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(() => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [body]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200">
      <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5">
        <span className="text-[11px] font-medium text-gray-600">
          {label ?? lang ?? "code"}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-50"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[420px] overflow-auto bg-[#0b1020] p-3 text-[12px] leading-relaxed text-[#e6e6e6]">
        <code className={`language-${lang ?? "plaintext"}`}>{body}</code>
      </pre>
    </div>
  );
}
