import {
  LayoutGrid, Folder, MessageSquare, BarChart3, Activity,
  User2, Shield, KeyRound, CreditCard, Settings
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  section?: "MAIN" | "CONTENT" | "ANALYTICS" | "ADMIN" | "ACCOUNT";
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutGrid, href: "/dashboard", section: "MAIN" },
  { label: "Datasets",  icon: Folder,      href: "/datasets", section: "CONTENT" },
  { label: "Copilot",   icon: MessageSquare, href: "/chat", section: "CONTENT" },
  { label: "Analytics", icon: BarChart3,   href: "/analytics", section: "ANALYTICS" },
  { label: "Usage",     icon: Activity,    href: "/usage", section: "ANALYTICS" },
  { label: "Profile",   icon: User2,       href: "/profile", section: "ACCOUNT" },
  { label: "Users",     icon: User2,       href: "/users", section: "ADMIN" },
  { label: "Admin",     icon: Shield,      href: "/admin", section: "ADMIN" },
  { label: "API Keys",  icon: KeyRound,    href: "/api-keys", section: "ACCOUNT" },
  { label: "Billing",   icon: CreditCard,  href: "/billing", section: "ACCOUNT" },
  { label: "Settings",  icon: Settings,    href: "/settings", section: "ACCOUNT" },
];
