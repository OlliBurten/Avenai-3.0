"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AvenaiLogo from "@/components/brand/AvenaiLogo";

const NAV = [
  { label: "Features", href: "#get-started" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Security", href: "#security" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white pt-4">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
                 <Link href="/" aria-label="Avenai home" className="flex items-center">
                   <AvenaiLogo
                     variant="lockup"
                     gradient={true}
                     className="h-8 w-auto text-violet-500"
                     title="Avenai"
                   />
                 </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Button asChild className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-slate-300 text-slate-800 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden"
          />
          <div className="fixed inset-y-0 right-0 z-50 w-[84%] max-w-xs rounded-l-2xl bg-white shadow-2xl ring-1 ring-slate-200 md:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                aria-label="Avenai home"
                className="flex items-center"
              >
                     <AvenaiLogo
                       variant="lockup"
                       gradient={true}
                       className="h-6 w-auto text-violet-500"
                       title="Avenai"
                     />
              </Link>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-slate-300 text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 pb-4">
              <nav className="flex flex-col gap-4">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/auth/signin"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Button asChild className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
                  <Link href="/auth/signup" onClick={() => setOpen(false)}>Get Started Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}