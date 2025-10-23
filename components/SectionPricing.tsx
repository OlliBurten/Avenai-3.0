/* 
  Avenai — Pricing Section (from scratch)
  - Free & Pro cards (aligned)
  - Monthly/Annual toggle synced to ?billing=
  - Clean comparison table (no sticky headers, locked columns)
  - Accessible FAQ (native <details>)
  - Minimal deps (React + Tailwind only)
*/

import * as React from "react";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Billing = "monthly" | "annual";

const FEATURES_CORE = [
  {
    feature: "Datasets & knowledge base",
    free: "Single dataset",
    pro: "Multiple datasets",
  },
  {
    feature: "AI chat copilot",
    free: "Basic",
    pro: "Advanced (runnable snippets, context)",
  },
  {
    feature: "Embeddable AI copilot",
    free: "—",
    pro: "Included",
  },
  {
    feature: "Analytics dashboard",
    free: "Lite (time-to-first-call)",
    pro: "Full (funnels, stuck points, success %)",
  },
];

const FEATURES_SCALE = [
  { feature: "Projects", free: "1", pro: "Unlimited" },
  { feature: "Users", free: "1 admin", pro: "Team roles" },
  { feature: "Support", free: "Community", pro: "Email (business hours)" },
  { feature: "Onboarding assistance", free: "Self-serve", pro: "Guided pilot setup" },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Can we start free and upgrade later?",
    a: "Yes — begin on Free and upgrade to Pro at any time. Your datasets and chat history carry over.",
  },
  {
    q: "How fast can we run a pilot?",
    a: "Often under 1 hour. Upload docs, enable chat, and invite your team — no engineering effort required.",
  },
  {
    q: "Do you offer annual discounts?",
    a: "Yes — Pro is $79 per project/month when billed annually ($948 billed yearly).",
  },
  {
    q: "What counts as a project on Pro?",
    a: "A distinct API or product area with its own datasets, copilot, and analytics.",
  },
  {
    q: "Can we embed the AI copilot in our docs?",
    a: "Yes — included on Pro via a simple copy-paste integration.",
  },
  {
    q: "What about enterprise features?",
    a: "SSO, SOC 2, and private cloud are on our roadmap. Reach out if they're critical for evaluation.",
  },
];

export default function SectionPricing() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const billingParam = (search.get("billing") as Billing) || "monthly";
  const [billing, setBilling] = React.useState<Billing>(billingParam);

  // sync state -> url
  React.useEffect(() => {
    const sp = new URLSearchParams(Array.from(search.entries()));
    sp.set("billing", billing);
    router.replace(`${pathname}?${sp.toString()}#pricing`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing]);

  const proPrice = useMemo(() => (billing === "annual" ? 79 : 99), [billing]);
  const proSuffix = billing === "annual" ? "/ project / mo (billed yearly)" : "/ project / month";

  return (
    <section id="pricing" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <header className="text-center">
          <h2 className="text-3xl/tight sm:text-4xl font-bold tracking-tight">
            Start free. Scale as you grow.
          </h2>
          <p className="mt-2 text-muted-foreground">
            Flexible pricing for every stage — from first docs upload to pilot success.
          </p>

          {/* Billing toggle */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-1 py-1 shadow-sm">
            <ToggleChip
              active={billing === "monthly"}
              onClick={() => setBilling("monthly")}
              label="Monthly"
            />
            <ToggleChip
              active={billing === "annual"}
              onClick={() => setBilling("annual")}
              label={
                <span className="flex items-center gap-2">
                  Annual <span className="text-emerald-600 text-xs font-medium">save ~20%</span>
                </span>
              }
            />
          </div>
        </header>

        {/* Cards */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Free */}
          <Card className="h-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold">Free</h3>
              <div className="mt-1 text-3xl font-bold">$0</div>
              <div className="text-sm text-muted-foreground">/ forever</div>
              <ul className="mt-6 space-y-2 text-sm">
                {[
                  "Upload docs, create datasets",
                  "Basic AI chat",
                  "Community support",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Dot /> <span>{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <PrimaryButton className="w-full">Get Started Free</PrimaryButton>
              </div>
            </div>
          </Card>

          {/* Pro */}
          <div className="relative">
            <div className="absolute -top-3 left-6 z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7F56D9]/10 to-[#9E77ED]/10 px-3 py-1 text-xs font-medium text-[#7F56D9]">
                Most Popular
              </div>
            </div>
            <Card className="h-full ring-1 ring-[#9E77ED]/50">
              <div className="p-6">
                <h3 className="text-lg font-semibold">Pro</h3>
                <div className="mt-1 text-3xl font-bold">${proPrice}</div>
                <div className="text-sm text-muted-foreground">{proSuffix}</div>
                <ul className="mt-6 space-y-2 text-sm">
                  {[
                    "Unlimited docs, analytics",
                    "Embeddable AI copilot",
                    "Email support",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <Dot /> <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <PrimaryButton className="w-full">Start Free Trial</PrimaryButton>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-12">
          <Card>
            <div className="overflow-x-auto rounded-2xl">
              <table className="min-w-full text-sm border-collapse">
                {/* lock widths so header/body never drift */}
                <colgroup>
                  <col style={{ width: "44%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "28%" }} />
                </colgroup>
                <thead className="bg-white border-b">
                  <tr className="align-middle">
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Features</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-900 border-l border-gray-200">
                      Free
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-900 border-l border-gray-200">
                      Pro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Core */}
                  <tr>
                    <td colSpan={3} className="px-6 py-2 text-[11px] tracking-wide text-gray-600 uppercase bg-gray-50">
                      Core
                    </td>
                  </tr>
                  {FEATURES_CORE.map((row) => (
                    <tr key={row.feature} className="hover:bg-gray-50 border-t border-gray-200">
                      <td className="px-6 py-3 font-medium text-gray-900">{row.feature}</td>
                      <td className="px-6 py-3 text-center border-l border-gray-200">{row.free}</td>
                      <td className="px-6 py-3 text-center border-l border-gray-200">
                        {row.pro === "Included" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Included
                          </span>
                        ) : (
                          row.pro
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Scale & Support */}
                  <tr>
                    <td colSpan={3} className="px-6 py-2 text-[11px] tracking-wide text-gray-600 uppercase bg-gray-50 border-t border-gray-200">
                      Scale &amp; Support
                    </td>
                  </tr>
                  {FEATURES_SCALE.map((row) => (
                    <tr key={row.feature} className="hover:bg-gray-50 border-t border-gray-200">
                      <td className="px-6 py-3 font-medium text-gray-900">{row.feature}</td>
                      <td className="px-6 py-3 text-center border-l border-gray-200">{row.free}</td>
                      <td className="px-6 py-3 text-center border-l border-gray-200">{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-6 pb-6 pt-3 text-center text-xs text-muted-foreground">
              Transparent limits. No hidden fees. Annual saves ~20%.
            </p>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <Card>
            <div className="px-6 py-6">
              <h3 className="text-lg font-semibold">Pricing FAQ</h3>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {FAQ.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-black/10 bg-white p-4 open:bg-gray-50 transition-colors"
                  >
                    <summary className="cursor-pointer list-none text-base font-medium marker:hidden outline-none focus-visible:ring-2 focus-visible:ring-[#9E77ED] focus-visible:ring-offset-2 rounded-lg">
                      {item.q}
                    </summary>
                    <div className="mt-2 text-sm text-muted-foreground">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- UI bits --------------------------- */

function Card({ className = "", children }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={
        "rounded-2xl border border-black/10 bg-white shadow-sm " + className
      }
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  className = "",
  children,
  onClick,
}: React.PropsWithChildren<{ className?: string; onClick?: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex w-auto items-center justify-center rounded-full px-5 py-2 text-sm font-medium text-white " +
        "bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] hover:opacity-90 focus-visible:outline-none " +
        "focus-visible:ring-2 focus-visible:ring-[#9E77ED] focus-visible:ring-offset-2 " +
        className
      }
    >
      {children}
    </button>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-3 py-1.5 text-sm transition " +
        (active
          ? "bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white shadow"
          : "text-gray-700 hover:bg-gray-100")
      }
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function Dot() {
  return <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />;
}
