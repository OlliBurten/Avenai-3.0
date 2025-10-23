"use client";

import React from "react";
import { motion } from "framer-motion";
import { Upload, MessageSquare, BarChart3, CheckCircle2, Shield, FileText, Database, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Merged section combining:
 *  - "See Avenai in action" (3‑step narrative)
 *  - "What you can use right now" (live features checklist)
 *
 * Drop into your page and set the anchor to match your nav (e.g., id="get-started").
 * Keep metrics here and remove duplicates elsewhere to avoid redundancy.
 */

const features = [
  { icon: Database, label: "Dataset Management" },
  { icon: FileText, label: "Document Uploads" },
  { icon: MessageSquare, label: "AI Chat Copilot" },
  { icon: BarChart3, label: "Admin & Analytics" },
  { icon: CreditCard, label: "Subscriptions & Billing" },
  { icon: Shield, label: "Enterprise Security" },
];

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

function StepCard({
  step,
  title,
  icon: Icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <motion.div {...fadeUp}>
      <Card className="rounded-2xl shadow-sm border border-border/60">
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">Step {step}</div>
          </div>
          <h3 className="text-lg font-semibold tracking-tight mb-2">{title}</h3>
          <div className="text-sm text-muted-foreground space-y-3">{children}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CodeBlock() {
  const code = `fetch("/v1/users", {
  method: "POST",
  headers: { Authorization: "Bearer …" },
  body: JSON.stringify({ name: "Jane" })
})`;
  return (
    <pre
      aria-label="Code example"
      className="mt-3 rounded-xl bg-zinc-950 text-zinc-50 overflow-x-auto text-xs leading-relaxed p-4 border border-white/10"
    >
      {code}
    </pre>
  );
}

export default function SectionActionAndLive() {
  return (
    <section id="get-started" className="py-16 md:py-24 bg-background">
      <div className="container max-w-7xl mx-auto px-6">
        <motion.div {...fadeUp} className="mb-10 md:mb-14 text-center">
          <Badge variant="secondary" className="rounded-full">Product walkthrough</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">See Avenai in action — and what's live today</h2>
          <p className="mt-3 md:mt-4 text-muted-foreground max-w-2xl mx-auto">
            Upload your docs, let developers ask questions with an AI copilot, and track success in real time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
          {/* LEFT: 3‑step narrative */}
          <div className="space-y-5 md:space-y-6">
            <StepCard step={1} title="Upload Docs" icon={Upload}>
              <p>
                Drop your OpenAPI specs, guides, or PDFs. <span className="text-foreground">Avenai builds your knowledge base instantly.</span>
              </p>
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                swagger: "2.0" · info: title "User API" · version: "1.0.0"
              </div>
            </StepCard>

            <StepCard step={2} title="Ask Copilot" icon={MessageSquare}>
              <p>
                Developers ask onboarding questions and get answers with code & context.
              </p>
              <div className="rounded-xl bg-muted/60 p-3 text-xs">
                <div className="mb-2 text-muted-foreground">Developer: "How do I create a user?"</div>
                <div className="text-emerald-500">Copilot: "Use <span className='font-mono'>POST /v1/users</span> with bearer auth…"</div>
              </div>
              <CodeBlock />
            </StepCard>

            <StepCard step={3} title="Monitor Success" icon={BarChart3}>
              <p>
                See where developers get stuck, measure time‑to‑first‑call, and reduce churn risk.
              </p>
              <ul className="grid sm:grid-cols-2 gap-3 mt-4">
                <li className="flex items-center gap-2 rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Time to first call</div>
                  <div className="text-lg font-semibold">2.3 min</div>
                </li>
                <li className="flex items-center gap-2 rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Success rate</div>
                  <div className="text-lg font-semibold">94%</div>
                </li>
                {/* keep the metrics here; they're closest to the product experience */}
              </ul>
            </StepCard>
            <p className="mt-3 text-xs text-muted-foreground">
              Pilot setup in under 1 hour — no engineering effort required.
            </p>
          </div>

          {/* RIGHT: Live features list */}
          <div className="lg:pl-4">
            <motion.div {...fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border p-3 md:p-4 bg-card">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-sm font-medium">{label}</div>
                  <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" aria-hidden />
                </div>
              ))}
            </motion.div>

            <motion.p {...fadeUp} className="text-sm text-muted-foreground mt-4">
              These features are live today and powering pilot customers.
            </motion.p>

            <motion.div {...fadeUp} className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90"
                aria-label="Get Started Free - Start your free trial"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-2 hover:bg-gradient-to-r hover:from-[#7F56D9] hover:to-[#9E77ED] hover:text-white"
                aria-label="Book a Demo - Schedule a personalized demo"
              >
                Book a Demo
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
