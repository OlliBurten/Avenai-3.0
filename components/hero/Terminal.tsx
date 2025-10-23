/**
 * Hero Terminal Component
 * 
 * Fixed-height terminal display with scrolling text content
 */
export function HeroTerminal({ script }: { script: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-[#0B0F19] text-slate-100 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <span className="size-2 rounded-full bg-rose-400" />
        <span className="size-2 rounded-full bg-amber-400" />
        <span className="size-2 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs text-slate-300/70">Upload OpenAPI → instant docs</span>
      </div>

      {/* FIXED HEIGHT; TEXT SCROLLS INSIDE */}
      <div className="h-[240px] md:h-[280px] overflow-hidden">
        <pre className="px-4 py-3 text-[13px] leading-7 md:text-[14px] whitespace-pre-wrap font-mono">
          {script}
          <span className="inline-block w-2 align-baseline animate-[caret_1s_steps(1)_infinite] bg-slate-100 ml-0.5" />
        </pre>
      </div>
    </div>
  );
}
