import { FileText } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApplicationsTable } from "./applications-table";
import { listApplications } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";

export default async function ApplicationsPage() {
  await requireRole(ADMIN_ONLY);

  const apps = await listApplications();
  const submitted = apps.filter((a) => a.eoi === "Submitted").length;
  const drafts = apps.length - submitted;

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "All Applications" },
          ]}
        />

        <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-800">
          <AlertDescription>
            {apps.length} application{apps.length === 1 ? "" : "s"} in this round —{" "}
            {submitted} submitted EOI{submitted === 1 ? "" : "s"} and {drafts} draft
            {drafts === 1 ? "" : "s"} in progress.
          </AlertDescription>
        </Alert>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Applications" subtext="All applications in this round"   value={apps.length} highlight icon={FileText} />
          <StatCard label="Submitted EOIs"     subtext="Past the submission gate"          value={submitted}   icon={FileText} />
          <StatCard label="Drafts In Progress" subtext="Not yet submitted"                 value={drafts}      icon={FileText} />
        </div>

        {apps.length === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            No applications yet.
          </div>
        ) : (
          <ApplicationsTable data={apps} />
        )}
      </main>
    </div>
  );
}
