"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const TYPE_MS = 22;       // typing speed per char
const LINE_PAUSE = 700;   // pause after each line
const STEP_PAUSE = 1500;  // pause after last line of a step

const LANGS = ["javascript", "python", "go", "ruby"];

const STEPS = [
  {
    title: "Upload OpenAPI → instant docs",
    lines: [
      "$ avenai upload openapi.yaml",
      "Processed: 48 endpoints",
      "Docs generated ✔",
    ],
  },
  {
    title: "Developer asks Copilot",
    // the third line will be programmatically composed to include a rotating lang
    lines: [
      "dev › How do I create a user?",
      "copilot › Use POST /v1/users with bearer auth",
      "", // placeholder for → code snippet ready for: <lang>
    ],
  },
  {
    title: "Analytics → real-time visibility",
    lines: [
      "time_to_first_call: 2.3m",
      "success_rate_24h: 94%",
      "top_blocker: missing_api_key",
    ],
  },
];

export default function CodeTypingDemo() {
  const [step, setStep] = useState(0);
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const [paused, setPaused] = useState(false);
  const [langIndex, setLangIndex] = useState(0);

  const raf = useRef<number | null>(null);
  const timer = useRef<number | null>(null);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Compose dynamic language line for step 2
  const dynamicLines = STEPS.map((s, si) => {
    if (si !== 1) return s.lines;
    const lang = LANGS[langIndex % LANGS.length];
    return [
      s.lines[0],
      s.lines[1],
      `→ code snippet ready for: ${lang}`,
    ];
  });

  const currentText = useMemo(
    () => dynamicLines[step][line],
    [dynamicLines, step, line]
  );

  const clearTimers = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  };

  useEffect(() => {
    if (prefersReduced || paused) return;

    clearTimers();

    const typeNextChar = () => {
      setChars((c) => {
        if (c + 1 <= currentText.length) {
          timer.current = window.setTimeout(() => {
            raf.current = requestAnimationFrame(typeNextChar);
          }, TYPE_MS);
          return c + 1;
        }

        const isLastLine = line === dynamicLines[step].length - 1;

        timer.current = window.setTimeout(() => {
          if (!isLastLine) {
            setLine((l) => l + 1);
            setChars(0);
          } else {
            // rotate language when we finish step 1 (index 1)
            if (step === 1) setLangIndex((i) => (i + 1) % LANGS.length);

            setStep((s) => (s + 1) % dynamicLines.length);
            setLine(0);
            setChars(0);
          }
        }, isLastLine ? STEP_PAUSE : LINE_PAUSE);

        return c;
      });
    };

    raf.current = requestAnimationFrame(typeNextChar);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentText, step, line, paused, prefersReduced]);

  const minHeight = 220;

  return (
    <div
      className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-xs font-medium text-slate-500">
          {STEPS[step].title}
          {paused && <span className="ml-2 text-slate-400">(paused)</span>}
        </span>
      </div>

      <pre
        className="relative overflow-hidden rounded-b-2xl bg-slate-950 p-4 text-[13px] leading-relaxed text-slate-100"
        style={{ minHeight }}
        aria-live="polite"
      >
        <code className="font-mono">
          {dynamicLines[step].slice(0, line).map((ln, i) => (
            <div key={i}>{ln}</div>
          ))}
          <div>
            {prefersReduced ? currentText : currentText.slice(0, chars)}
            {!prefersReduced && (
              <span
                className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-slate-100/80 align-middle"
                aria-hidden
              />
            )}
          </div>
        </code>
        <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-16 bg-gradient-to-t from-slate-950 to-transparent" />
      </pre>
    </div>
  );
}
