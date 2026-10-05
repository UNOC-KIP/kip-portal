import { CheckCircle, ClipboardList, Hourglass, UserCheck } from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getLacQueue } from "@/lib/admin/committee-queries";
import { requireRole } from "@/lib/rbac-server";
import { LAC_ROLES } from "@/lib/rbac";
import { LacQueueTable } from "./lac-queue-table";

export const dynamic = "force-dynamic";

// Access (LAC_MEMBER / ADMIN) is also enforced by the lac/ layout guard.
export default async function LacQueuePage() {
  const { session, role } = await requireRole(LAC_ROLES);
  const rows = await getLacQueue(session.user.id);

  const toReview = rows.filter((r) => r.stage === "To review");
  const awaiting = rows.filter((r) => r.stage === "Awaiting investor").length;
  const decided = rows.filter((r) => r.stage === "Decided").length;
  const reviewedByMe = toReview.filter((r) => r.myRecommendation).length;

  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopbar />
      <main className="flex-1 p-6">
        <PageHeader crumbs={[{ label: "LAC Review Queue" }]} />

        <p className="mb-5 max-w-3xl text-sm text-ink-500">
          Applications shortlisted by the Technical Committee. Each member records their own recommendation, then
          the committee&apos;s decision is recorded once: approve (sent to ExCo), reject, or ask the investor for more
          information.
        </p>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="To review" subtext="Waiting for a committee decision" value={toReview.length} highlight icon={ClipboardList} />
          {role === "LAC_MEMBER" && (
            <StatCard label="Reviewed by you" subtext={`Of the ${toReview.length} still open`} value={reviewedByMe} icon={UserCheck} />
          )}
          <StatCard label="Awaiting investor" subtext="More information requested" value={awaiting} icon={Hourglass} />
          <StatCard label="Decided" subtext="Approved, rejected or with ExCo" value={decided} icon={CheckCircle} />
        </div>

        <LacQueueTable rows={rows} />
      </main>
    </div>
  );
}
