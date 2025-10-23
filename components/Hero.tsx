"use client";

import Link from "next/link";
import { TerminalCarousel } from "./hero/TerminalCarousel";
import AvenaiLogo from "@/components/brand/AvenaiLogo";


export default function Hero() {

  return (
    <section id="hero" className="relative isolate pt-16 lg:pt-20 min-h-[82vh]">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          {/* LEFT — copy */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/40 dark:bg-white/5 px-3 py-1.5 backdrop-blur">
              <AvenaiLogo className="h-5 text-violet-500" variant="glyph" />
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                AI-native Onboarding OS
              </span>
            </div>

            <h1 className="mt-5 text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl">
              Join the Avenai
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6f6bff] via-[#7a5cff] to-[#9b4dff]">Pilot Program</span>
            </h1>

            <p className="mt-5 max-w-xl text-slate-600">
              We're partnering with a small number of API-first companies to refine the next generation of onboarding copilots.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/pilot"
                className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90 inline-flex items-center justify-center px-5 py-3 text-[15px] font-semibold transition"
              >
                Join the Pilot
              </Link>
              <Link
                href="/demo"
                className="rounded-full border-2 hover:bg-gradient-to-r hover:from-[#7F56D9] hover:to-[#9E77ED] hover:text-white inline-flex items-center justify-center px-5 py-3 text-[15px] font-semibold text-slate-900 transition"
              >
                Help Shape the Future
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> SOC 2 Type II
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500" /> 99.9% Uptime SLA
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-fuchsia-500" /> GDPR-ready
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-400" /> SSO/SAML
              </span>
            </div>
          </div>

          {/* RIGHT — fixed-height terminal carousel + KPIs */}
          <div className="lg:col-span-6 flex flex-col">
            <TerminalCarousel />

            {/* Remove duplicate metrics here to keep them in one place later */}
          </div>
        </div>
      </div>

      {/* bottom scroll cue */}
      <button
        onClick={() => document.querySelector("#problems")?.scrollIntoView({ behavior: "smooth" })}
        className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-6 inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 backdrop-blur px-3 py-1.5 text-sm text-slate-700 shadow-sm"
      >
        <span className="i-lucide-chevron-down" /> Scroll
      </button>
    </section>
  );
}