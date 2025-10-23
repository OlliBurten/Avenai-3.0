"use client";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const current = theme ?? resolvedTheme ?? "light";

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-popover px-2 py-1 text-sm">
      <button
        aria-label="Light theme"
        onClick={() => setTheme("light")}
        className={`rounded-md p-1 ${current==="light" ? "bg-muted" : ""}`}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        aria-label="Dark theme"
        onClick={() => setTheme("dark")}
        className={`rounded-md p-1 ${current==="dark" ? "bg-muted" : ""}`}
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        aria-label="System theme"
        onClick={() => setTheme("system")}
        className={`rounded-md p-1 ${current==="system" ? "bg-muted" : ""}`}
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
}
