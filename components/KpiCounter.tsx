"use client";
import { useEffect, useRef, useState } from "react";

export default function KpiCounter({
  from = 0,
  to,
  suffix = "",
  duration = 1200, // ms
  decimals = 0,
  className = "",
}: {
  from?: number;
  to: number;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const [value, setValue] = useState(from);
  const elRef = useRef<HTMLSpanElement | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          const start = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / duration);
            const next = from + (to - from) * p;
            setValue(next);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [started, duration, from, to]);

  const formatted =
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();

  return (
    <span ref={elRef} className={className}>
      {formatted}
      {suffix}
    </span>
  );
}
