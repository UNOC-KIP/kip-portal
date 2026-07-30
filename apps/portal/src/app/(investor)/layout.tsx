import type { ReactNode } from "react";
import { SidebarProvider } from "@/context/sidebar-context";
import { InvestorSidebar } from "@/components/investor-sidebar";
import { SidebarInset } from "@/components/sidebar-inset";
import { IdleTimeout } from "@/components/idle-timeout";
import { requireInvestor } from "@/lib/rbac-server";
import { getUnreadCount } from "@/lib/inbox-data";

export default async function InvestorLayout({ children }: { children: ReactNode }) {
  const { session } = await requireInvestor();
  const userId = (session.user as { id?: string } | undefined)?.id;
  const unreadCount = userId ? await getUnreadCount(userId) : 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-ink-100">
        <InvestorSidebar unreadCount={unreadCount} />
        <SidebarInset>{children}</SidebarInset>
      </div>
      <IdleTimeout />
    </SidebarProvider>
  );
}
