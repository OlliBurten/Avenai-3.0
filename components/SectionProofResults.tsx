"use client";

import React from "react";
import { motion } from "framer-motion";
import { Quote, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Polished "Proof / Results" section for early pilots
 * - Mix of KPI cards + attributed quotes
 * - Supports optional logos (swap placeholder spans with <img />)
 * - Uses brand accent and avoids unverifiable claims wording by default
 */

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

const testimonials = [
  {
    kpi: "−65%",
    kpiLabel: "integration time",
    quote:
      "Avenai helped us turn a multi‑week integration into days. The inline fixes inside the chat saved our team countless back‑and‑forths.",
    author: "VP Engineering",
    company: "Fintech (pilot)",
    // logo: "/logos/fintech.svg",
    accent: "from-[#7F56D9] to-[#9E77ED]",
  },
  {
    kpi: "−50%",
    kpiLabel: "onboarding tickets",
    quote:
      "Support volume dropped fast once devs could ask questions against our own docs and get runnable snippets.",
    author: "Head of CS",
    company: "Compliance API (pilot)",
    accent: "from-emerald-500 to-emerald-600",
  },
  {
    kpi: "↑ Dev satisfaction",
    kpiLabel: "docs that answer",
    quote:
      "Finally, docs that answer developers instead of frustrating them.",
    author: "Product Manager",
    company: "Data Platform (pilot)",
    accent: "from-fuchsia-500 to-purple-500",
  },
];

export default function SectionProofResults() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container max-w-7xl mx-auto px-6">
        <motion.div {...fadeUp} className="text-center mb-10 md:mb-14">
          <Badge variant="secondary" className="rounded-full">Proof</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">Early teams are seeing results</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Pilot teams cut onboarding time, reduced tickets, and gave developers docs that actually answer.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {testimonials.map((t, i) => (
            <motion.div key={i} {...fadeUp}>
              <Card className="h-full rounded-2xl border border-border/60 shadow-sm">
                <CardContent className="p-6 flex flex-col h-full">
                  {/* KPI pill */}
                  <div className={`inline-flex items-center gap-2 self-start rounded-full bg-gradient-to-r ${t.accent} text-white px-3 py-1 text-sm font-medium`}> 
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t.kpi}</span>
                    <span className="opacity-90">{t.kpiLabel}</span>
                  </div>

                  {/* Quote */}
                  <div className="mt-4 flex-1">
                    <Quote className="h-5 w-5 text-muted-foreground" />
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{t.quote}</p>
                  </div>

                  {/* Attribution */}
                  <div className="mt-5 flex items-center gap-3">
                    {/* Replace span with <img src={t.logo} alt={`${t.company} logo`} className="h-6" /> if you have logos */}
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-medium">{t.company.split(" ")[0][0]}</span>
                    <div className="text-sm">
                      <div className="font-medium">{t.author}</div>
                      <div className="text-muted-foreground">{t.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Optional: small legal copy */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Metrics are pilot‑reported and directional; results vary by team and workflow.
        </p>
      </div>
    </section>
  );
}
