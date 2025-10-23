import { type LucideIcon } from "lucide-react";

export function Icon({ as: As, className = "h-5 w-5" }: { as: LucideIcon; className?: string }) {
  return <As className={className} aria-hidden="true" />;
}
