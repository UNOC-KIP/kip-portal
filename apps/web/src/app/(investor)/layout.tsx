import type { ReactNode } from "react";
import { SidebarProvider } from "@/context/sidebar-context";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarInset } from "@/components/sidebar-inset";
import { requireRole } from "@/lib/rbac-server";
import { INVESTOR_ONLY } from "@/lib/rbac";

export default async function InvestorLayout({ children }: { children: ReactNode }) {
  // Defense in depth: every /dashboard route is investor-only.
  await requireRole(INVESTOR_ONLY);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-ink-100">
        <DashboardSidebar role="INVESTOR" />
        <SidebarInset>{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
