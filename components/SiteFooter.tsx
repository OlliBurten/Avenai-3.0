import React from "react";
import { Github, Linkedin, Globe, Mail } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Clean, scalable footer with product/resources/company columns and newsletter.
 * Swap links as needed. Minimal dependencies (shadcn Input/Button).
 */

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Docs", href: "/docs" },
      { label: "Security", href: "/#security" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Status", href: "/status" },
      { label: "Changelog", href: "/changelog" },
      { label: "Community", href: "/community" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#0B0B0F] text-white/90">
      <div className="container max-w-7xl mx-auto px-6 pt-14 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Brand + Social */}
          <div className="lg:col-span-4">
            <Link href="/" aria-label="Avenai home" className="shrink-0">
              <span className="px-2.5 py-1.5 rounded-lg bg-white text-black text-[18px] font-semibold tracking-tight">
                avenai
              </span>
            </Link>
            <p className="mt-3 text-sm text-white/70 max-w-sm">
              The AI‑native Onboarding OS for API‑first companies.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a href="#" className="p-2 rounded-md bg-white/5 hover:bg-white/10" aria-label="Website">
                <Globe className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-md bg-white/5 hover:bg-white/10" aria-label="Email">
                <Mail className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-md bg-white/5 hover:bg-white/10" aria-label="GitHub">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-md bg-white/5 hover:bg-white/10" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Columns */}
          <div className="lg:col-span-5 grid grid-cols-2 md:grid-cols-3 gap-8">
            {columns.map((col) => (
              <div key={col.heading}>
                <div className="text-sm font-semibold mb-3 text-white/90">{col.heading}</div>
                <ul className="space-y-2 text-sm">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-white/70 hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <div className="text-sm font-semibold mb-3 text-white/90">Stay ahead on API onboarding</div>
            <div className="flex items-center gap-2">
              <Input placeholder="Enter your email" className="bg-white/5 border-white/10 text-white placeholder:text-white/50" />
              <Button className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
                Subscribe
              </Button>
            </div>
            <p className="mt-2 text-xs text-white/50">Monthly essays on docs, onboarding, and dev experience. No spam.</p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div>© {new Date().getFullYear()} Avenai. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/status" className="hover:text-white">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
