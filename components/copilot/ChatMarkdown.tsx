"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import { CopyButton } from "./CopyButton";
import type { ComponentPropsWithoutRef } from "react";

// Tailwind-friendly typography + spacing classes
const base = "prose prose-neutral max-w-none";
const rhythm =
  "[&_h1]:mt-6 [&_h1]:mb-2.5 [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:mt-5 [&_h3]:mb-2 " +
  "[&_p]:mt-2 [&_p]:mb-3 [&_ul]:my-3 [&_ol]:my-3 [&_li]:my-1.5 " +
  "[&_table]:my-4 [&_table]:w-full [&_table]:text-sm " +
  "[&_th]:text-left [&_th]:font-semibold [&_td]:align-top " +
  "[&_pre]:my-4 [&_code]:text-[0.92em]";

type Props = {
  children: string;
  className?: string;
  // optional: switch theme based on app setting
  theme?: "light" | "dark";
};

export default function ChatMarkdown({ children, className = "", theme }: Props) {
  // Configure rehype-pretty-code once per render
  const rehype = useMemo(
    () => [
      // @ts-ignore - options typing is loose from the plugin
      [
        rehypePrettyCode,
        {
          theme: {
            light: "github-light",
            dark: "github-dark",
          },
          keepBackground: false,
          defaultLang: "txt",
          // Map tokens to CSS variables so you can retheme later
          tokensMap: {
            // examples: "property": "attr-name", etc.
          },
        },
      ],
    ],
    []
  );

  return (
    <div
      className={`${base} ${rhythm} ${
        theme === "dark" ? "prose-invert" : ""
      } ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={rehype as any}
        components={{
          // Tables: make them responsive + zebra rows
          table: (props: ComponentPropsWithoutRef<"table">) => (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="min-w-full">{props.children}</table>
            </div>
          ),
          thead: (props: ComponentPropsWithoutRef<"thead">) => (
            <thead className="bg-[var(--muted)]/40">{props.children}</thead>
          ),
          tbody: (props: ComponentPropsWithoutRef<"tbody">) => (
            <tbody className="[&_tr:nth-child(even)]:bg-black/5 dark:[&_tr:nth-child(even)]:bg-white/5">
              {props.children}
            </tbody>
          ),
          tr: (props: ComponentPropsWithoutRef<"tr">) => <tr>{props.children}</tr>,

          // Links: open in new tab for chat context
          a: (props: ComponentPropsWithoutRef<"a">) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            />
          ),

          // Images: constrain size and add styling
          img: (props: ComponentPropsWithoutRef<"img">) => (
            <img
              {...props}
              className="max-w-full h-auto rounded-lg shadow-sm border border-[var(--border)] my-2"
              loading="lazy"
            />
          ),

          // Inline code
          code({ inline, className, children, ...rest }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
            const text = String(children ?? "");
            if (inline) {
              return (
                <code
                  className="rounded-md px-1.5 py-0.5 border border-[var(--border)] bg-[var(--muted)]/30"
                  {...rest}
                >
                  {text}
                </code>
              );
            }

            // For fenced blocks, rehype-pretty-code wraps content in <pre><code>
            return (
              <code className={className} {...rest}>
                {text}
              </code>
            );
          },

          // Wrap <pre> to add a header with language + Copy button
          pre({ children, ...rest }: ComponentPropsWithoutRef<"pre">) {
            // Find the <code> element among children (safer than React.Children.only)
            const codeEl = React.Children.toArray(children).find(
              (child) => React.isValidElement(child) && child.type === "code"
            ) as React.ReactElement | undefined;

            if (!codeEl) {
              // Fallback if no code element found
              return (
                <pre
                  {...rest}
                  className="overflow-auto p-3 text-[13px] leading-6 bg-transparent rounded-2xl border border-[var(--border)] my-4"
                >
                  {children}
                </pre>
              );
            }

            // Extract language more robustly
            const lang = (() => {
              // Try data-language first (rehype-pretty-code sets this)
              if (codeEl.props?.["data-language"]) {
                return codeEl.props["data-language"] as string;
              }
              
              // Try data-raw attribute for language info
              if (codeEl.props?.["data-raw"]) {
                const raw = codeEl.props["data-raw"] as string;
                const match = raw.match(/^```(\w+)/);
                if (match) return match[1];
              }
              
              // Fallback: extract from className with regex
              const className = codeEl.props?.className as string;
              if (className) {
                const match = className.match(/language-(\w+)/);
                if (match) return match[1];
              }
              
              return "text";
            })();

            // Extract raw text more reliably
            const raw = (() => {
              // Try data-raw attribute first (most reliable)
              if (codeEl.props?.["data-raw"]) {
                return codeEl.props["data-raw"] as string;
              }
              
              // Fallback to children extraction
              const children = codeEl.props?.children;
              if (typeof children === "string") {
                return children;
              }
              
              if (Array.isArray(children)) {
                return children
                  .map((child) => {
                    if (typeof child === "string") return child;
                    if (React.isValidElement(child)) {
                      const props = child.props as { children?: React.ReactNode };
                      if (props.children) {
                        return String(props.children);
                      }
                    }
                    return "";
                  })
                  .join("");
              }
              
              return "";
            })();

            return (
              <div 
                className="group rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden my-4"
                role="region"
                aria-labelledby={`code-header-${lang}`}
              >
                <div 
                  className="flex items-center justify-between px-3 py-2 text-xs bg-[var(--muted)]/40 border-b border-[var(--border)]"
                  id={`code-header-${lang}`}
                >
                  <span 
                    className="uppercase tracking-wide opacity-80"
                    aria-label={`Code block: ${lang}`}
                  >
                    {lang}
                  </span>
                  <CopyButton text={raw} />
                </div>
                <pre
                  {...rest}
                  className="overflow-auto p-3 text-[13px] leading-6 bg-transparent"
                >
                  {children}
                </pre>
              </div>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
