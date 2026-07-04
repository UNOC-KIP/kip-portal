import type { ReactNode } from "react";
import { SidebarProvider } from "@/context/sidebar-context";
import { InvestorSidebar } from "@/components/investor-sidebar";
import { SidebarInset } from "@/components/sidebar-inset";
import { IdleTimeout } from "@/components/idle-timeout";
import { requireInvestor } from "@/lib/rbac-server";

export default async function InvestorLayout({ children }: { children: ReactNode }) {
  await requireInvestor();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-ink-100">
        <InvestorSidebar />
        <SidebarInset>{children}</SidebarInset>
      </div>
      <IdleTimeout />
    </SidebarProvider>
  );
}
