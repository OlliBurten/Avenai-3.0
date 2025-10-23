import React, { useEffect, useMemo, useRef, useState } from "react";

type Scene = {
  title?: string;
  lines: string[];
};

type Props = {
  scenes: Scene[];
  heightClass?: string;  // e.g. "h-[220px] lg:h-[260px]"
  typingSpeedMs?: number;  // per char
  linePauseMs?: number;    // after each line
  scenePauseMs?: number;   // after a scene
};

export default function TerminalLooper({
  scenes,
  heightClass = "h-[220px] lg:h-[260px]",
  typingSpeedMs = 16,
  linePauseMs = 450,
  scenePauseMs = 1000,
}: Props) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [lineIdx, setLineIdx]   = useState(0);
  const [typed, setTyped]       = useState("");
  const [charIdx, setCharIdx]   = useState(0);

  const scene = scenes[sceneIdx];
  const linesUpToCurrent = useMemo(() => {
    const prev = scene.lines.slice(0, Math.max(0, lineIdx));
    return prev.join("\n");
  }, [scene, lineIdx]);

  const currentLine = scene.lines[lineIdx] ?? "";
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // typewriter loop
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (charIdx < currentLine.length) {
        setCharIdx(charIdx + 1);
        setTyped(currentLine.slice(0, charIdx + 1));
        rafRef.current = window.setTimeout(tick, typingSpeedMs) as unknown as number;
        return;
      }

      // finished this line
      window.setTimeout(() => {
        if (cancelled) return;

        const nextLine = lineIdx + 1;
        if (nextLine < scene.lines.length) {
          setLineIdx(nextLine);
          setCharIdx(0);
          setTyped("");
          return;
        }

        // finished scene -> pause, then next scene
        window.setTimeout(() => {
          if (cancelled) return;
          setSceneIdx((s) => (s + 1) % scenes.length);
          setLineIdx(0);
          setCharIdx(0);
          setTyped("");
        }, scenePauseMs);
      }, linePauseMs);
    };

    rafRef.current = window.setTimeout(tick, typingSpeedMs) as unknown as number;

    return () => {
      cancelled = true;
      if (rafRef.current) window.clearTimeout(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIdx, lineIdx, charIdx, currentLine, typingSpeedMs, linePauseMs, scenePauseMs]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm shadow-sm w-full">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-[12px] text-slate-500">
        <span className="inline-flex gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="ml-2">{scene.title ?? "Avenai — Onboarding"}</span>
      </div>

      {/* terminal body — fixed height, no layout shift */}
      <div className={`bg-[#070b14] ${heightClass} overflow-hidden rounded-b-2xl`}>
        <pre className="h-full w-full px-6 py-5 font-mono text-[15px] leading-7 text-[#e6edf3] whitespace-pre-wrap">
{linesUpToCurrent}
{linesUpToCurrent ? "\n" : ""}
{typed}
<span className="inline-block w-2 h-5 align-middle bg-[#e6edf3] ml-0.5 animate-caret" />
        </pre>
      </div>
    </div>
  );
}
