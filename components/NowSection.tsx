"use client";
import { motion } from "framer-motion";
import {
  Database,
  Upload,
  Bot,
  BarChart3,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import KpiCounter from "@/components/KpiCounter";

const features = [
  { icon: Database, label: "Dataset Management" },
  { icon: Upload, label: "Document Uploads" },
  { icon: Bot, label: "AI Chat Copilot" },
  { icon: BarChart3, label: "Admin & Analytics" },
  { icon: CreditCard, label: "Subscriptions & Billing" },
  { icon: ShieldCheck, label: "Enterprise Security" },
];

export default function NowSection() {
  return (
    <section className="relative overflow-hidden">
      {/* soft bg tint */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-white" />
        <div className="absolute -bottom-32 right-[-12rem] h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl font-extrabold tracking-tight text-slate-900">
            What you can use right now with Avenai
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Upload docs, build datasets, answer developer questions with an AI copilot, and
            track onboarding health from day one.
          </p>
        </div>

        <div className="mt-16 grid items-start gap-14 lg:grid-cols-[minmax(0,1fr),520px]">
          {/* Illustration (left) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative"
          >
            <ProductMock />
          </motion.div>

          {/* Feature chips (right) */}
          <div>
            <div className="mx-auto grid max-w-[520px] grid-cols-2 gap-4 lg:mx-0">
              {features.map(({ icon: Icon, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.35, delay: 0.05 * i, ease: "easeOut" }}
                  className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2.5 shadow-sm backdrop-blur transition
hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(99,102,241,0.15)] hover:border-transparent
hover:outline hover:outline-2 hover:-outline-offset-1 hover:outline-transparent
hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 group-hover:text-indigo-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">{label}</span>
                </motion.div>
              ))}
            </div>

            {/* Supporting bullets */}
            <ul className="mt-8 space-y-2 text-slate-600">
              <li>• Import OpenAPI specs, PDFs, and guides</li>
              <li>• Ask onboarding questions and get code with context</li>
              <li>• Monitor queries, time-to-first-call, and top blockers</li>
            </ul>

            <div className="mt-6 text-sm text-slate-500">
              These features are live today and powering pilot customers.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Product illustration: browser chrome + chat + tiny stats */
function ProductMock() {
  return (
    <div className="relative">
      {/* main window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      >

        {/* fake browser bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-xs font-medium text-slate-500">Avenai — Onboarding</span>
        </div>

        {/* content */}
        <div className="grid grid-cols-[220px,1fr]">
          {/* left nav */}
          <div className="hidden flex-col gap-2 border-r border-slate-200 p-3 sm:flex">
            <NavItem active label="Datasets" />
            <NavItem label="Documents" />
            <NavItem label="AI Copilot" />
            <NavItem label="Analytics" />
            <NavItem label="Billing" />
            <NavItem label="Security" />
          </div>

          {/* main panel */}
          <div className="p-4">

            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              Developer asks:
              <span className="ml-2 font-mono text-slate-800">"How do I create a user?"</span>
            </div>

              <div className="mt-2.5 rounded-xl bg-slate-950 p-4 text-[13px] leading-[1.5] text-slate-100">
              <div>
                copilot › Use <span className="text-emerald-300">POST /v1/users</span> with bearer auth
              </div>
              <div className="mt-1 opacity-90">→ code snippet ready for: javascript</div>
              <div className="mt-3 rounded-lg bg-slate-900 p-3 font-mono text-[12px] leading-snug">
                fetch("/v1/users", &#123;&#125;
                <br />&nbsp;&nbsp;method: "POST",
                <br />&nbsp;&nbsp;headers: &#123; Authorization: `Bearer ...` &#125;,
                <br />&nbsp;&nbsp;body: JSON.stringify(&#123; name: "Jane" &#125;),
                <br />&#125;)
              </div>
            </div>

            {/* footer divider */}
            <div className="mt-4 h-px w-full bg-slate-200/70" />

            {/* KPI footer: 2 big cards */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  Time to first call
                </div>
                <div className="mt-1 flex items-end gap-2">
                  <div className="text-3xl font-semibold leading-none text-slate-900">
                    <KpiCounter from={1.1} to={2.3} decimals={1} />&nbsp;min
                  </div>
                  <div className="text-xs text-slate-500">p50 last 24h</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  Success rate
                </div>
                <div className="mt-1 flex items-end gap-2">
                  <div className="text-3xl font-semibold leading-none text-slate-900">
                    <KpiCounter from={82} to={94} suffix="%" />
                  </div>
                  <div className="text-xs text-slate-500">requests succeeding</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}

function NavItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className={[
        "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
      ].join(" ")}
    >
      <span>{label}</span>
      {active && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
    </div>
  );
}

function FloatChip({
  children,
  variants,
}: {
  children: React.ReactNode;
  variants?: any;
}) {
  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -2 }}
      className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur"
    >
      {children}
    </motion.div>
  );
}

