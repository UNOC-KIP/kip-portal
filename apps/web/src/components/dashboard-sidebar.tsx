"use client";

import {
  AlertTriangle,
  BarChart2,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Inbox,
  Info,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  Smartphone,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSidebar } from "@/context/sidebar-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const TC_ROLES = new Set(["TC_MEMBER", "TC_CHAIR"]);

const FULL_NAV = [
  { icon: LayoutGrid,     href: "/console",               label: "Dashboard" },
  { icon: FileText,       href: "/console/applications",  label: "Applications" },
  { icon: ClipboardCheck, href: "/console/tc/queue",      label: "TC Review" },
  { icon: Bell,           href: "#",                      label: "Notifications" },
  { icon: Smartphone,     href: "/console/land-plots",    label: "Land Plots" },
  { icon: AlertTriangle,  href: "/console/bank-transfers",label: "Bank Transfers" },
  { icon: BarChart2,      href: "/console/report",        label: "Reports" },
  { icon: Users,          href: "/console/users",         label: "Investors" },
  { icon: Inbox,          href: "/console/inquiries",     label: "Inquiries" },
];

const TC_NAV = [
  { icon: LayoutGrid,     href: "/console",          label: "Dashboard" },
  { icon: ClipboardCheck, href: "/console/tc/queue", label: "TC Review" },
];

function getNavItems(role: string) {
  return TC_ROLES.has(role) ? TC_NAV : FULL_NAV;
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMIN: "Administrator",
    TC_MEMBER: "TC Member",
    TC_CHAIR: "TC Chair",
    GM_URHC: "GM, URHC",
    EXCO_MEMBER: "ExCo Member",
    INVESTMENT_COMMITTEE_MEMBER: "Investment Committee",
    BOARD_MEMBER: "Board Member",
  };
  return labels[role] ?? "UNOC Staff";
}

const bottomNav = [
  { icon: Settings, href: "/console/settings", label: "Settings" },
  { icon: Info,     href: "#",                 label: "Help" },
];

function NavLink({
  icon: Icon,
  href,
  label,
  collapsed,
}: {
  icon: React.ElementType;
  href: string;
  label: string;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    href !== "#" &&
    (pathname === href || (href !== "/console" && pathname.startsWith(href)));

  const link = (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white",
        isActive && "bg-white/10 text-white",
        collapsed ? "w-10 justify-center" : "w-full gap-3 px-3",
      )}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && (
        <span className="truncate text-sm font-medium">{label}</span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarNav({
  collapsed,
  role,
  onNavigate,
}: {
  collapsed: boolean;
  role: string;
  onNavigate?: () => void;
}) {
  const navItems = getNavItems(role);
  const roleLabel = getRoleLabel(role);
  const avatarInitial = roleLabel.charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col py-4">
      {/* Top nav */}
      <nav
        className={cn(
          "flex flex-1 flex-col gap-1",
          collapsed ? "items-center px-0" : "px-3",
        )}
        onClick={onNavigate}
      >
        {navItems.map((item) => (
          <NavLink key={item.label} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="px-3 py-2">
        <Separator className="bg-white/10" />
      </div>

      {/* Bottom nav */}
      <nav
        className={cn(
          "flex flex-col gap-1",
          collapsed ? "items-center px-0" : "px-3",
        )}
        onClick={onNavigate}
      >
        {bottomNav.map((item) => (
          <NavLink key={item.label} {...item} collapsed={collapsed} />
        ))}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
                className="flex h-10 w-10 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut size={20} className="shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Sign out</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="truncate text-sm font-medium">Sign out</span>
          </button>
        )}
      </nav>

      {/* Avatar */}
      <div
        className={cn(
          "mt-4 flex items-center gap-3",
          collapsed ? "justify-center px-0" : "px-4",
        )}
      >
        <Avatar className="h-8 w-8 shrink-0 bg-brand-600">
          <AvatarFallback className="bg-brand-600 text-xs font-bold text-white">
            {avatarInitial}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{roleLabel}</p>
            <p className="truncate text-xs text-white/50">UNOC Staff</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardSidebar({ role }: { role: string }) {
  const { isCollapsed, toggle } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-full flex-col bg-black transition-[width] duration-200 md:flex",
          isCollapsed ? "w-16" : "w-56",
        )}
      >
        {/* Logo + toggle */}
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-white/10 py-3",
            isCollapsed ? "justify-center px-3" : "justify-between px-3",
          )}
        >
          {!isCollapsed && (
            <Image src="/unoc-logo.svg" alt="UNOC" width={96} height={28} className="object-contain" priority />
          )}
          <button
            onClick={toggle}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white",
              isCollapsed && "mt-0",
            )}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>
        </div>

        <SidebarNav collapsed={isCollapsed} role={role} />
      </aside>

      {/* ── Mobile sidebar (Sheet overlay) ───────────── */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-md bg-black text-white shadow-md md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 border-0 bg-black p-0">
          <SidebarNav collapsed={false} role={role} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
