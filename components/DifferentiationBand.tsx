"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen, MessageSquare, Bot, BarChart3, Workflow, Check, Minus, CircleDot, ChevronRight,
} from "lucide-react";

type State = "yes" | "partial" | "no";

export default function DifferentiationBand() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* soft background tint */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-white" />
        <div className="absolute -bottom-32 left-[-14rem] h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200/35 to-purple-200/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            Competitors do pieces. Avenai owns the journey.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Docs tools host content. Support tools answer tickets. Copilots help code. Only Avenai unifies the full onboarding journey.
          </p>
        </div>

        {/* Comparison band */}
        <div className="mt-14 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm backdrop-blur">
          <div className="grid items-stretch gap-0 lg:grid-cols-[1.05fr,1.05fr,1.6fr]">
            {/* Docs platforms */}
            <Column
              title="Docs platforms"
              subtitle="ReadMe / GitBook"
              rows={[
                { icon: BookOpen, label: "Docs hosting", state: "yes" },
                { icon: Bot, label: "AI onboarding guidance", state: "no" },
                { icon: BarChart3, label: "Onboarding analytics", state: "no" },
                { icon: Workflow, label: "Workflow automation", state: "no" },
              ]}
            />

            {/* Support platforms */}
            <Column
              title="Support platforms"
              subtitle="Zendesk / Intercom"
              rows={[
                { icon: MessageSquare, label: "Ticketing", state: "yes" },
                { icon: Bot, label: "AI guidance", state: "partial" },
                { icon: BarChart3, label: "Onboarding analytics", state: "no" },
                { icon: Workflow, label: "Workflow automation", state: "no" },
              ]}
              seam
            />

            {/* Avenai ribbon (dominant) */}
            <AvenaiRibbon prefersReduced={prefersReduced ?? false} />
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-slate-500">
          From docs → guidance → analytics → automation. One platform, measurable onboarding success.
        </p>
      </div>
    </section>
  );
}

/* ============== Pieces ============== */

function Column({
  title,
  subtitle,
  rows,
  seam = false,
}: {
  title: string;
  subtitle: string;
  rows: { icon: React.ComponentType<{ className?: string }>; label: string; state: State }[];
  seam?: boolean;
}) {
  return (
    <div className="relative bg-white">
      {seam && (
        <div
          aria-hidden
          className="absolute left-0 top-0 hidden h-full w-px bg-slate-200 lg:block"
        />
      )}

      <div className="px-6 py-6">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </div>
        <div className="mt-1 text-sm font-medium text-slate-900">{subtitle}</div>
      </div>

      <ul className="px-6 pb-6 space-y-2">
        {rows.map(({ icon: Icon, label, state }) => (
          <li
            key={label}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2"
          >
            <span className="flex items-center gap-2 text-slate-800">
              <Icon className="h-4 w-4 text-slate-600" />
              <span className="text-sm">{label}</span>
            </span>
            <StatePill state={state} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatePill({ state }: { state: State }) {
  if (state === "yes")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" /> Included
      </span>
    );
  if (state === "partial")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <CircleDot className="h-3.5 w-3.5" /> Partial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
      <Minus className="h-3.5 w-3.5" /> Missing
    </span>
  );
}

function AvenaiRibbon({ prefersReduced }: { prefersReduced: boolean }) {
  const steps = [
    { icon: BookOpen, label: "Docs" },
    { icon: Bot, label: "AI Guidance" },
    { icon: BarChart3, label: "Analytics" },
    { icon: Workflow, label: "Automation" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative isolate overflow-hidden"
    >
      {/* gradient backing */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-600 to-purple-600" />
      <div
        className="absolute inset-0 -z-10 opacity-40 mix-blend-soft-light"
        style={{
          backgroundImage:
            "radial-gradient(40% 60% at 30% 20%, rgba(255,255,255,0.5), transparent)",
        }}
      />

      <div className="p-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide/loose opacity-90">
              Avenai
            </div>
            <h3 className="text-lg font-semibold">Full Onboarding OS</h3>
          </div>
          <a
            href="#get-started"
            className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90 px-3 py-1 text-sm font-medium transition"
          >
            Get Started <ChevronRight className="ml-1 inline h-4 w-4 align-[-2px]" />
          </a>
        </div>

        {/* Capability pills (all included) */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {steps.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/20 backdrop-blur"
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-white/90" />
                <span className="text-sm">{label}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-200/20 px-2 py-0.5 text-xs font-medium text-emerald-100">
                <Check className="h-3.5 w-3.5" /> Included
              </span>
            </div>
          ))}
        </div>

        {/* journey rail */}
        <div className="mt-5">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true, amount: 0.5 }}
            transition={
              prefersReduced ? undefined : { duration: 1, ease: "easeOut" }
            }
            className="h-1 rounded bg-white/40"
            style={{ width: prefersReduced ? "100%" : undefined }}
          />
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {steps.map(({ icon: Icon, label }, i) => (
              <motion.li
                key={label}
                initial={{ y: 8, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: 0.05 * i, ease: "easeOut" }}
                className="flex items-center gap-2 rounded-lg bg-white/12 px-3 py-2 ring-1 ring-white/25 backdrop-blur hover:bg-white/18"
              >
                <Icon className="h-4 w-4 text-white/90" />
                <span className="text-sm">{label}</span>
              </motion.li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-white/90">
            One flow from docs → guidance → analytics → automation. Reduce time-to-first-call and churn risk.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
