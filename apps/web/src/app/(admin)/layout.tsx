import type { ReactNode } from "react";
import { SidebarProvider } from "@/context/sidebar-context";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarInset } from "@/components/sidebar-inset";
import { requireStaff } from "@/lib/rbac-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Base gate for the whole /console area: internal staff only (blocks
  // investors / unauthenticated). Finer per-area roles are enforced by nested
  // layouts (tc/) and by each page's own requireRole(...) call.
  const { role } = await requireStaff();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-ink-100">
        <DashboardSidebar role={role} />
        <SidebarInset>{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
