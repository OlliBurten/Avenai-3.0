"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FileWarning, Clock, MessageSquareWarning } from "lucide-react";

const items = [
  {
    icon: FileWarning,
    title: "Developers drop off when docs lack depth or clarity.",
    desc: "Generic docs don't explain your specific workflows, leading to confusion and abandonment.",
    tint: "bg-rose-100 text-rose-600",
  },
  {
    icon: Clock,
    title: "Weeks are lost chasing errors across unclear workflows.",
    desc: "Developers spend days debugging instead of building, delaying their integration.",
    tint: "bg-amber-100 text-amber-700",
  },
  {
    icon: MessageSquareWarning,
    title: "Support tickets pile up, slowing revenue and increasing churn.",
    desc: "Every ticket is friction during onboarding — and a leading indicator of churn.",
    tint: "bg-yellow-100 text-yellow-700",
  },
];

export default function ProblemStrip() {
  const scope = useRef<HTMLDivElement | null>(null);
  const inView = useInView(scope, { once: true, margin: "-20% 0px" });

  return (
    <section className="relative overflow-hidden">
      {/* soft background tint */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-slate-50" />
        <div className="absolute -top-40 left-[-12rem] h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            APIs don't lose customers on sales calls —
            <br className="hidden sm:block" /> they lose them during onboarding.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Every lost week of onboarding equals lost revenue — and the next churn event.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr),360px] lg:gap-16">
          {/* Timeline */}
          <div ref={scope} className="relative pt-1">
            {/* animated connector line */}
            <motion.div
              className="absolute left-5 top-0 h-0 w-[2px] rounded bg-slate-200"
              animate={{ height: inView ? "100%" : 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
            <ul className="space-y-10">
              {items.map(({ icon: Icon, title, desc, tint }, i) => (
                <li key={title} className="relative pl-14">
                  {/* dot */}
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={inView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ delay: 0.15 + i * 0.15, type: "spring", stiffness: 240 }}
                    className={`absolute left-2 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white ${tint}`}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.span>

                  {/* text */}
                  <motion.h3
                    initial={{ y: 12, opacity: 0 }}
                    animate={inView ? { y: 0, opacity: 1 } : {}}
                    transition={{ delay: 0.2 + i * 0.15, duration: 0.45, ease: "easeOut" }}
                    className="text-lg font-semibold text-slate-900"
                  >
                    {title}
                  </motion.h3>

                  <motion.p
                    initial={{ y: 12, opacity: 0 }}
                    animate={inView ? { y: 0, opacity: 1 } : {}}
                    transition={{ delay: 0.28 + i * 0.15, duration: 0.45, ease: "easeOut" }}
                    className="mt-2 max-w-2xl text-slate-600"
                  >
                    {desc}
                  </motion.p>

                  {/* signal line */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.45 + i * 0.15 }}
                    className="mt-4 text-sm text-slate-500"
                  >
                    Signal: higher time-to-first-call → higher churn risk.
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>

          {/* Side metric block */}
          <aside className="lg:self-start lg:sticky lg:top-24 rounded-2xl border border-slate-200/70 bg-white/80 p-6 lg:p-7 shadow-sm backdrop-blur max-w-[380px]">
            <div className="text-[11px] font-semibold tracking-wide text-slate-500">
              ONBOARDING IMPACT
            </div>

            {/* Rows with fixed value column for perfect alignment */}
            <div className="mt-4 space-y-4">
              <MetricRow
                label="Time lost per integration"
                value="2–6 weeks"
              />
              <MetricRow
                label="Ticket volume during onboarding"
                value="+35–60%"
              />
              <MetricRow
                label="Churn correlation (lagging)"
                value="High"
              />
            </div>

            <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Avenai reduces time-to-first-call and surfaces blockers before they become tickets.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-8">
      <span className="max-w-[15rem] text-slate-600 leading-snug">
        {label}
      </span>
      <span className="w-32 shrink-0 text-right tabular-nums">
        <span className="bg-gradient-to-r from-indigo-600/90 to-purple-600/90 bg-clip-text text-transparent text-lg font-semibold tracking-tight">
          {value}
        </span>
      </span>
    </div>
  );
}

