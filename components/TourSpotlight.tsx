"use client";
import React, { useEffect, useRef } from "react";

type Props = { target: HTMLElement | null };

export default function TourSpotlight({ target }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !target) return;
    const update = () => {
      const r = target.getBoundingClientRect();
      // pad the hole a bit
      const pad = 8;
      const x = Math.max(0, r.left - pad);
      const y = Math.max(0, r.top - pad + window.scrollY);
      const w = r.width + pad * 2;
      const h = r.height + pad * 2;

      // Use CSS mask to cut a hole (spotlight)
      ref.current!.style.setProperty(
        "--mask",
        `radial-gradient(12px at ${x}px ${y}px, transparent 0 0),
         radial-gradient(${Math.max(w,h)}px ${Math.max(w,h)}px at ${x+w/2}px ${y+h/2}px, transparent 0, #000 1px)`
      );
      // Position the visible ring around the target (absolutely positioned)
      ref.current!.style.setProperty("--ring-left", `${x}px`);
      ref.current!.style.setProperty("--ring-top", `${y}px`);
      ref.current!.style.setProperty("--ring-width", `${w}px`);
      ref.current!.style.setProperty("--ring-height", `${h}px`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, [target]);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{ pointerEvents: "none" }}
      className="fixed inset-0 z-[9998]"
    >
      {/* Dim background with a MASKED hole (no blur on target) */}
      <div
        className="absolute inset-0 bg-black/60"
        style={{
          WebkitMaskImage: "var(--mask)",
          maskImage: "var(--mask)",
          WebkitMaskComposite: "destination-out",
          maskComposite: "exclude",
        }}
      />
      {/* Clean ring on top of the REAL button */}
      <div
        className="absolute rounded-xl"
        style={{
          left: "var(--ring-left)",
          top: "var(--ring-top)",
          width: "var(--ring-width)",
          height: "var(--ring-height)",
          boxShadow:
            "0 0 0 3px rgba(99,102,241,.9), 0 0 0 8px rgba(99,102,241,.35)",
          zIndex: 9999,
        }}
      />
    </div>
  );
}
