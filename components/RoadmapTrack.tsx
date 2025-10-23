"use client";
import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bot, BookOpen, BarChart3 } from "lucide-react";

type Status = "now" | "next" | "later";
type Milestone = {
  title: string;
  desc: string;
  eta: string;                 // "Live", "3–6 mo", "12–18 mo"
  status: Status;              // now | next | later
  icon: React.ComponentType<{ className?: string }>;
};

/** ---------- EDIT CONTENT ONLY BELOW IF NEEDED ---------- */
const MS: Milestone[] = [
  {
    title: "Deeper Copilot Guidance",
    desc: "Inline error fixes, SDK generation, and workflow hints so developers never stall.",
    eta: "Live → 3 mo",
    status: "now",
    icon: Bot,
  },
  {
    title: "AI-Generated Docs",
    desc: "Stripe-quality docs automatically built from OpenAPI + notes, always in sync.",
    eta: "3–6 mo",
    status: "next",
    icon: BookOpen,
  },
  {
    title: "Integration Analytics",
    desc: "Time-to-first-call, top blockers, and churn-risk signals across onboarding.",
    eta: "12–18 mo",
    status: "later",
    icon: BarChart3,
  },
];
/** ------------------------------------------------------ */

const order: Record<Status,"now"|"next"|"later"> = { now:"now", next:"next", later:"later" };

export default function RoadmapTrack() {
  const prefersReduced = useReducedMotion();

  // Ensure order: now → next → later
  const items = [...MS].sort((a,b) =>
    a.status === "now" ? -1 :
    b.status === "now" ? 1  :
    a.status === "next" ? -1 :
    b.status === "next" ? 1  : 0
  );

  const activeIndex = items.findIndex(m => m.status === "now"); // 0 by design
  const progressPct = items.length <= 1 ? 0 : (activeIndex / (items.length - 1)) * 100;

  return (
    <section className="relative overflow-hidden">
      {/* bg tint */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-slate-50" />
        <div className="absolute -top-40 right-[-14rem] h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200/35 to-purple-200/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Where Avenai is going</h2>
          <p className="mt-4 text-lg text-slate-600">Pilots shape our roadmap: from AI copilots and analytics today → to full onboarding automation tomorrow.</p>
        </div>

        <div className="mt-16">
          <div className="relative mx-auto max-w-6xl">
            {/* progress rail */}
            <div aria-hidden className="absolute left-0 right-0 top-[calc(100%+22px)] h-1 rounded bg-slate-200" />
            <motion.div
              aria-hidden
              initial={{ width: 0 }}
              whileInView={{ width: `${progressPct}%` }}
              viewport={{ once: true, amount: 0.4 }}
              transition={prefersReduced ? undefined : { duration: 1, ease: "easeOut" }}
              className="absolute left-0 top-[calc(100%+22px)] h-1 rounded bg-gradient-to-r from-indigo-600 to-purple-600"
              style={{ width: prefersReduced ? `${progressPct}%` : undefined }}
            />

            {/* 3 big cards */}
            <ul className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {items.map((m, i) => {
                const isNow  = m.status === "now";
                const isNext = m.status === "next";
                const accent =
                  isNow ? "from-indigo-600 to-purple-600"
                  : isNext ? "from-indigo-300 to-purple-300"
                  : "from-slate-200 to-slate-200";

                const statusLabel = isNow ? "Now" : isNext ? "Next" : "Later";
                const statusTone =
                  isNow  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : isNext? "bg-slate-50  text-slate-700  border-slate-200"
                  :         "bg-slate-50  text-slate-600  border-slate-200";

                return (
                  <li key={m.title}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.45, delay: 0.05 * i, ease: "easeOut" }}
                      className={[
                        "relative rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition",
                        "overflow-hidden",                 // ← ensure inner bar clips to radius
                        isNow ? "hover:-translate-y-0.5 hover:shadow-md" : "",
                      ].join(" ")}
                    >
                      {/* top accent bar (inside the card for perfect clip) */}
                      <div
                        aria-hidden
                        className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${accent}`}
                      />

                      <div className="flex items-start justify-between gap-3">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusTone}`}>
                          {statusLabel}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
                          {m.eta}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <m.icon className="h-6 w-6 text-slate-700" />
                        <h3 className="text-xl font-semibold text-slate-900">{m.title}</h3>
                      </div>

                      <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{m.desc}</p>
                    </motion.div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-slate-500">
            Timelines are indicative; enterprise feedback can influence order of delivery.
          </p>
        </div>
      </div>
    </section>
  );
}

