"use client";

import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useSidebar } from "@/context/sidebar-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const INVESTOR_NAV = [
  { icon: LayoutDashboard, href: "/dashboard",           label: "Overview" },
  { icon: FolderOpen,      href: "/dashboard/documents", label: "Documents" },
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
    (pathname === href ||
      (href !== "/dashboard" && pathname.startsWith(href.split("/").slice(0, 3).join("/"))));

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
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { data: session } = useSession();
  const displayName = session?.user?.name ?? "Investor";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col py-4">
      <nav
        className={cn(
          "flex flex-1 flex-col gap-1",
          collapsed ? "items-center px-0" : "px-3",
        )}
        onClick={onNavigate}
      >
        {INVESTOR_NAV.map((item) => (
          <NavLink key={item.label} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="px-3 py-2">
        <Separator className="bg-white/10" />
      </div>

      <nav
        className={cn(
          "flex flex-col gap-1",
          collapsed ? "items-center px-0" : "px-3",
        )}
        onClick={onNavigate}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex h-10 w-10 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Sign out
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="truncate text-sm font-medium">Sign out</span>
          </button>
        )}
      </nav>

      <div
        className={cn(
          "mt-4 flex items-center gap-3",
          collapsed ? "justify-center px-0" : "px-4",
        )}
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-brand-400 text-xs font-bold text-black">
            {avatarInitial}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-white/50">KIP Investor Portal</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function InvestorSidebar() {
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

        <SidebarNav collapsed={isCollapsed} />
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
          <SidebarNav collapsed={false} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
