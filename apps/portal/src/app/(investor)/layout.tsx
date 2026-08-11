import type { ReactNode } from "react";
import { canPreviewEoi } from "@kip/shared";
import { SidebarProvider } from "@/context/sidebar-context";
import { InvestorSidebar } from "@/components/investor-sidebar";
import { SidebarInset } from "@/components/sidebar-inset";
import { IdleTimeout } from "@/components/idle-timeout";
import { AdminPreviewBanner } from "@/components/admin-preview-banner";
import { requirePortalWorkspace } from "@/lib/rbac-server";
import { getUnreadCount } from "@/lib/inbox-data";

export default async function InvestorLayout({ children }: { children: ReactNode }) {
  const { session, role } = await requirePortalWorkspace();
  const userId = (session.user as { id?: string } | undefined)?.id;
  const unreadCount = userId ? await getUnreadCount(userId) : 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-ink-100">
        <InvestorSidebar unreadCount={unreadCount} />
        <SidebarInset>
          {canPreviewEoi(role) && <AdminPreviewBanner />}
          {children}
        </SidebarInset>
      </div>
      <IdleTimeout />
    </SidebarProvider>
  );
}
