import { CheckCircle, FileText, Lock, XCircle } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TcQueueTable } from "./tc-queue-table";
import { getTcQueueView } from "@/lib/admin/queries";
import { TC_STATUS_LABELS } from "@/lib/admin/mappers";

// Access (TC_MEMBER / TC_CHAIR / ADMIN) is enforced by the tc/ layout guard.
export default async function TcQueuePage() {
  const {
    apps,
    locked: WINDOW_OPEN,
    windowCloseLabel: WINDOW_CLOSE_DATE,
    tcDeadlineLabel: TC_DEADLINE,
  } = await getTcQueueView();

  const total    = apps.length;
  const approved = apps.filter((a) => a.status === TC_STATUS_LABELS.APPROVED).length;
  const rejected = apps.filter((a) => a.status === TC_STATUS_LABELS.REJECTED).length;
  const pending  = apps.filter((a) => a.status === TC_STATUS_LABELS.IN_PROGRESS).length;

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/console" },
            { label: "TC Review Queue" },
          ]}
        />

        {WINDOW_OPEN ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-ink-200 bg-white px-8 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-100">
              <Lock size={28} className="text-ink-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-900">Applications Not Yet Available</h2>
              <p className="mt-1.5 max-w-md text-sm text-ink-500">
                The submission window is still open. TC review access is granted
                only after the window closes on{" "}
                <strong className="text-ink-700">{WINDOW_CLOSE_DATE}</strong>.
                Check back after that date.
              </p>
            </div>
          </div>
        ) : (
          <>
            <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-800">
              <AlertDescription>
                The application window closed on {WINDOW_CLOSE_DATE}. You now have access
                to all {total} submitted EOIs. Pre-screening must be completed within
                3 weeks (deadline: <strong>{TC_DEADLINE}</strong>).{" "}
                <strong>{pending} application{pending !== 1 ? "s" : ""}</strong> still
                require a TC decision.
              </AlertDescription>
            </Alert>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Total Applications"
                subtext="All submitted EOIs in this window"
                value={total}
                highlight
                icon={FileText}
              />
              <StatCard
                label="Approved"
                subtext="TC-approved and proceeding to PI"
                value={approved}
                icon={CheckCircle}
              />
              <StatCard
                label="Rejected"
                subtext="Applications that did not pass TC"
                value={rejected}
                icon={XCircle}
              />
            </div>

            <TcQueueTable data={apps} />
          </>
        )}
      </main>
    </div>
  );
}
