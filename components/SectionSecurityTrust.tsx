"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, KeyRound, Cloud, FileCheck2, Globe2, Database, ClipboardList, Bug, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Revamped Security & Trust section
 * - Clear split: What we have today vs. On the roadmap
 * - Brand‑aligned icons and buttons
 * - Action buttons for whitepaper/DPA/report vulnerability
 */

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

const now = [
  { icon: ShieldCheck, title: "SOC 2 Type II (ready)", desc: "Controls aligned; audit preparedness in place." },
  { icon: Lock, title: "Data encryption", desc: "AES‑256 at rest, TLS 1.2+ in transit." },
  { icon: KeyRound, title: "SSO / SAML", desc: "Enterprise authentication (Okta, Azure AD)." },
  { icon: Database, title: "Row‑level security", desc: "Per‑tenant isolation by default." },
  { icon: Cloud, title: "Private cloud / VPC", desc: "Isolated deployments for enterprises." },
  { icon: ClipboardList, title: "Audit logs", desc: "Admin visibility into actions & access." },
];

const roadmap = [
  { icon: Globe2, title: "Data residency", desc: "EU/US regional hosting options." },
  { icon: FileCheck2, title: "DPA templates", desc: "Standardized DPAs for faster review." },
  { icon: KeyRound, title: "SCIM provisioning", desc: "Automated user lifecycle management." },
  { icon: ShieldCheck, title: "Pen‑testing", desc: "Annual third‑party penetration tests." },
];

export default function SectionSecurityTrust() {
  return (
    <section className="py-16 md:py-24 bg-background" id="security">
      <div className="container max-w-7xl mx-auto px-6">
        <motion.div {...fadeUp} className="text-center mb-10 md:mb-14">
          <Badge variant="secondary" className="rounded-full">Security & Trust</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">Enterprise-grade security by default</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Avenai aligns with SOC 2 Type II controls (audit in progress), is GDPR-conscious, and supports SSO/SAML.
            With RLS, private cloud/VPC options, and encryption at rest and in transit, teams can evaluate securely from day one.
            Enterprise features graduate from roadmap as pilots mature.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* What's available now */}
          <motion.div {...fadeUp}>
            <Card className="rounded-2xl border border-border/60 shadow-sm h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-[#7F56D9] to-[#9E77ED]" />
                  <h3 className="text-lg font-semibold">Available now</h3>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {now.map(({ icon: Icon, title, desc }) => (
                    <li key={title} className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{title}</div>
                        <div className="text-sm text-muted-foreground">{desc}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Roadmap items */}
          <motion.div {...fadeUp}>
            <Card className="rounded-2xl border border-border/60 shadow-sm h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-muted" />
                  <h3 className="text-lg font-semibold">On the roadmap</h3>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {roadmap.map(({ icon: Icon, title, desc }) => (
                    <li key={title} className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{title}</div>
                        <div className="text-sm text-muted-foreground">{desc}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Actions */}
        <motion.div {...fadeUp} className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button size="lg" className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90" aria-label="Download Security Whitepaper">
            Security whitepaper
            <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
          <Button size="lg" variant="outline" className="rounded-full border-2 hover:bg-gradient-to-r hover:from-[#7F56D9] hover:to-[#9E77ED] hover:text-white" aria-label="View Data Processing Agreement">
            View DPA
          </Button>
          <Button size="lg" variant="ghost" className="rounded-full" aria-label="Report a Security Vulnerability">
            <Bug className="mr-1.5 h-4 w-4" aria-hidden="true" /> Report a vulnerability
          </Button>
        </motion.div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Some items are in progress or available on request; talk to sales for details.
        </p>
      </div>
    </section>
  );
}
