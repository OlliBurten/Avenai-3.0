"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Folder, Bot, BarChart3, Activity,
  User, KeyRound, CreditCard, Settings, Shield,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string; icon: React.ComponentType<any> };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
      { label: "Datasets",  href: "/datasets",  icon: Folder },
      { label: "Copilot",   href: "/chat",      icon: Bot   },
    ]
  },
  {
    title: "ANALYTICS & MONITORING",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Usage",     href: "/usage",     icon: Activity  },
    ]
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Profile", href: "/profile",  icon: User       },
      { label: "API Keys",href: "/api-keys", icon: KeyRound   },
      { label: "Billing", href: "/billing",  icon: CreditCard },
      { label: "Settings",href: "/settings", icon: Settings   },
      { label: "Admin",   href: "/admin",    icon: Shield     },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  /**
   * Layout approach
   * - The <aside> is a fixed 56px rail that never moves the content.
   * - Inside it, ONE absolutely positioned panel grows its width
   *   from 56px -> 256px on hover. No translate/slide; it's the same node.
   * - Because the container doesn't clip (overflow-visible), the panel
   *   "expands over" the page instead of pushing layout.
   */
  return (
    <aside
      className="group/sidebar pointer-events-none fixed inset-y-0 left-0 z-40 w-14"
      aria-label="Avenai navigation"
    >
      {/* Expanding panel (single element that becomes wider on hover) */}
      <div
        className={cn(
          "pointer-events-auto absolute inset-y-0 left-0",
          "w-14 group-hover/sidebar:w-64",                // width grows in place
          "transition-[width] duration-200 ease-out",
          "bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80",
          "border-r border-zinc-200 shadow-sm group-hover/sidebar:shadow-xl",
          "rounded-none group-hover/sidebar:rounded-r-2xl",
          "overflow-hidden"                               // clip labels when collapsed
        )}
      >
        {/* Header / Brand */}
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-full ring-2 ring-white bg-indigo-600 text-white">
            {/* Use your logo if you like */}
            {/* <AvenaiLogo variant="glyph" className="h-5 w-5 text-white" /> */}
            <span className="text-sm font-semibold">A</span>
          </div>
          <div
            className="text-sm font-medium text-zinc-900 opacity-0 translate-x-2 
                       group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 
                       transition-all duration-200 whitespace-nowrap"
          >
            Avenai
          </div>
        </div>

        {/* Nav groups */}
        <nav className="mt-1 flex h-[calc(100%-4.5rem)] flex-col">
          <div className="flex-1 overflow-y-auto px-1">
            {GROUPS.map((g) => (
              <div key={g.title} className="mt-4 first:mt-1">
                {/* Section label (appears only when expanded) */}
                <div
                  className="px-3 pb-2 text-[10px] font-semibold tracking-wide text-zinc-500 
                             opacity-0 translate-x-2 
                             group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 
                             transition-all duration-200"
                >
                  {g.title}
                </div>

                <ul className="space-y-1">
                  {g.items.map((it) => {
                    const Icon = it.icon;
                    const active = pathname === it.href;
                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          className={cn(
                            "group/navitem flex items-center gap-3 rounded-xl",
                            "px-3 py-2.5 mx-2",
                            active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-zinc-700 hover:bg-zinc-100"
                          )}
                        >
                          <Icon className={cn(
                            "shrink-0",
                            active ? "text-indigo-600" : "text-zinc-500",
                            "h-5 w-5" // consistent icon size
                          )} />
                          <span
                            className="text-sm opacity-0 translate-x-2 
                                       group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 
                                       transition-all duration-200"
                          >
                            {it.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Sign out row fixed at bottom (visible in both states) */}
          <form
            action="/api/auth/signout"
            method="post"
            className="border-t border-zinc-200/70 bg-white/80 backdrop-blur px-2 py-2"
          >
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-zinc-700 hover:bg-zinc-100"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5 text-zinc-500" />
              <span
                className="text-sm opacity-0 translate-x-2 
                           group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 
                           transition-all duration-200"
              >
                Sign out
              </span>
            </button>
          </form>
        </nav>
      </div>
    </aside>
  );
}