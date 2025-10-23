// components/ProblemSection.tsx
"use client";
import { useEffect, useRef, useState } from "react";

type InViewOpts = { rootMargin?: string; once?: boolean };
function useInView<T extends HTMLElement>(opts: InViewOpts = { rootMargin: "-10% 0px", once: true }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (opts.once) obs.disconnect();
        } else if (!opts.once) {
          setInView(false);
        }
      },
      { root: null, rootMargin: opts.rootMargin ?? "-10% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [opts.rootMargin, opts.once]);
  return { ref, inView };
}

// simple count up hook (integer)
function useCountUp(target: number, duration = 1000, startWhen = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!startWhen) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setVal(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, startWhen]);
  return val;
}

export default function ProblemSection() {
  const { ref: sectionRef, inView } = useInView<HTMLDivElement>({ rootMargin: "-15% 0px", once: true });

  const cardClasses =
    "backdrop-blur-xl bg-white/70 ring-1 ring-black/5 shadow-xl rounded-2xl p-6 sm:p-7 w-full";

  const itemBase =
    "relative pl-10 pb-10 last:pb-0 before:absolute before:left-4 before:top-7 before:h-full before:w-px before:bg-slate-200 last:before:hidden";
  const badgeBase =
    "absolute left-0 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-1 ring-black/5";

  const appear = (i: number) =>
    `transition-all duration-700 ease-out ${
      inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    } delay-[${i * 75}ms]`;

  return (
    <section
      id="problem"
      ref={sectionRef}
      className="relative isolate bg-slate-50/60 py-20 sm:py-24 lg:py-28"
      aria-labelledby="problem-title"
    >
      {/* subtle top gradient wash */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-white to-transparent" />
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Title */}
        <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-14">
          <h2
            id="problem-title"
            className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            APIs don't lose customers on sales calls —
            <br className="hidden sm:block" />
            <span className="text-slate-900"> they lose them during onboarding.</span>
          </h2>
          <div className="mt-4 text-slate-600">
            <ul className="text-muted-foreground space-y-1">
              <li>• Poor docs → developer drop-off</li>
              <li>• Weeks to integrate → churn</li>
              <li>• Every failed onboarding = lost revenue</li>
            </ul>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left: timeline */}
          <div className="lg:col-span-7">
            <ol className="relative">
              <li className={`${itemBase} ${appear(0)}`}>
                <span className={`${badgeBase} bg-rose-50 text-rose-600`}>
                  {/* doc icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 3h5l5 5v13a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm5 1.5V9h4.5" />
                  </svg>
                </span>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                  Developers drop off when docs lack depth or clarity.
                </h3>
                <p className="mt-2 text-slate-600">
                  Generic docs don't explain your specific workflows, leading to confusion and
                  abandonment.
                </p>
                <p className="mt-3 text-[15px] text-slate-500 italic">
                  <span className="not-italic font-medium text-slate-600">Signal:</span> higher{" "}
                  <span className="font-semibold text-slate-700">time-to-first-call</span> → higher{" "}
                  <span className="font-semibold text-slate-700">churn risk</span>.
                </p>
              </li>

              <li className={`${itemBase} ${appear(1)}`}>
                <span className={`${badgeBase} bg-amber-50 text-amber-600`}>
                  {/* clock icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8v5l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z" />
                  </svg>
                </span>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                  Weeks are lost chasing errors across unclear workflows.
                </h3>
                <p className="mt-2 text-slate-600">
                  Developers spend days debugging instead of building, delaying their integration.
                </p>
                <p className="mt-3 text-[15px] text-slate-500 italic">
                  <span className="not-italic font-medium text-slate-600">Signal:</span> higher{" "}
                  <span className="font-semibold text-slate-700">time-to-first-call</span> → higher{" "}
                  <span className="font-semibold text-slate-700">churn risk</span>.
                </p>
              </li>

              <li className={`${itemBase} ${appear(2)}`}>
                <span className={`${badgeBase} bg-yellow-50 text-yellow-600`}>
                  {/* warning icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4m0 4h.01" />
                  </svg>
                </span>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                  Support tickets pile up, slowing revenue and increasing churn.
                </h3>
                <p className="mt-2 text-slate-600">
                  Every ticket is friction during onboarding — and a leading indicator of churn.
                </p>
                <p className="mt-3 text-[15px] text-slate-500 italic">
                  <span className="not-italic font-medium text-slate-600">Signal:</span> higher{" "}
                  <span className="font-semibold text-slate-700">time-to-first-call</span> → higher{" "}
                  <span className="font-semibold text-slate-700">churn risk</span>.
                </p>
              </li>
            </ol>
          </div>

          {/* Right: Impact card */}
          <div className="lg:col-span-5">
            <div
              className={`${cardClasses} ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} transition-all duration-700`}
            >
              <p className="text-[12px] font-semibold tracking-widest text-slate-500">
                ONBOARDING IMPACT
              </p>

              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-baseline justify-between">
                  <span>Time lost per integration</span>
                  <strong className="tabular-nums">2–6 weeks</strong>
                </li>
                <li className="flex items-baseline justify-between">
                  <span>Ticket volume during onboarding</span>
                  <strong className="tabular-nums">+35–60%</strong>
                </li>
                <li className="flex items-baseline justify-between">
                  <span>Churn correlation (lagging)</span>
                  <strong>High</strong>
                </li>
              </ul>

              <p className="text-sm text-muted-foreground mt-3">
                Avenai reduces <em>time-to-first-call</em> and surfaces <em>blockers</em> before they become tickets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}