import { AdminTopbar } from "@/components/admin-topbar";
import { ReportTabs } from "@/components/report/report-tabs";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

/** Shared chrome for the reports hub — one tab per report. */
export default async function ReportLayout({ children }: { children: React.ReactNode }) {
  await requireRole(ADMIN_ONLY);
  return (
    <div className="flex min-h-screen flex-col bg-ink-100 print:bg-white">
      <AdminTopbar />
      <main className="flex-1 space-y-5 p-6 print:p-0">
        <ReportTabs />
        {children}
      </main>
    </div>
  );
}
