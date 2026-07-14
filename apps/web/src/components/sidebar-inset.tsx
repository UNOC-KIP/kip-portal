"use client";

import { useSidebar } from "@/context/sidebar-context";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SidebarInset({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();
  return (
    <div
      className={cn(
        "flex-1 transition-[padding-left] duration-200 print:!pl-0",
        isCollapsed ? "md:pl-16" : "md:pl-56",
      )}
    >
      {children}
    </div>
  );
}
