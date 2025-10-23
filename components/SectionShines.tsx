"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Layers, Database, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Polished "Where Avenai shines" section
 * - Clear ICPs with outcome-focused copy
 * - Optional metrics lines are written as outcome statements rather than hard % claims
 * - Hover affordances + gradient accents to match brand
 */

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

const tiles = [
  {
    icon: ShieldCheck,
    title: "Fintech & Compliance APIs",
    blurb:
      "Accelerate KYC/AML and risk workflows. Give developers exact steps, auth examples, and error fixes inline.",
    outcome: "Teams report onboarding cut from weeks to days.",
    cta: "See fintech example",
  },
  {
    icon: Layers,
    title: "SaaS APIs",
    blurb:
      "Reduce support load by embedding AI guidance directly into docs and sandboxes.",
    outcome: "Fewer onboarding tickets; faster time‑to‑first‑call.",
    cta: "See SaaS example",
  },
  {
    icon: Database,
    title: "Data & Analytics APIs",
    blurb:
      "Help devs navigate large schemas with context‑aware Q&A and runnable snippets.",
    outcome: "Clearer paths to correct queries and auth.",
    cta: "See data example",
  },
];

export default function SectionShines() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container max-w-7xl mx-auto px-6">
        <motion.div {...fadeUp} className="text-center mb-10 md:mb-14">
          <Badge variant="secondary" className="rounded-full">Ideal use cases</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">Where Avenai shines</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Built for API-first teams shipping fast. These are the use cases where pilots see the biggest impact.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {tiles.map(({ icon: Icon, title, blurb, outcome, cta }) => (
            <motion.div key={title} {...fadeUp}>
              <Card className="group h-full rounded-2xl border border-border/60 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>
                  <p className="mt-3 text-sm text-emerald-600">{outcome}</p>

                  <Button
                    variant="ghost"
                    className="mt-4 px-0 text-primary hover:text-primary hover:bg-transparent group-hover:translate-x-0.5 transition"
                  >
                    {cta}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
