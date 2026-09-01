import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { StartEoiButton } from "../start-eoi-button";
import {
  listInvestorApplications,
  statusBadgeProps,
  type ApplicationSummary,
} from "@/lib/investor-data";

/** Statuses the investor can still edit — a "Resume" lands in the wizard. */
const EDITABLE_STATUSES = new Set([
  "DRAFT_PAYMENT_PENDING",
  "DRAFT",
  "TC_CLARIFICATION_REQUESTED",
]);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Kampala",
  });
}

/** Where the row action leads, given the application's stage. */
function destinationFor(a: ApplicationSummary): { href: string; label: string } {
  if (EDITABLE_STATUSES.has(a.status)) {
    return {
      href: `/dashboard/eoi/${a.id}/${a.nextSectionNum}`,
      label: a.completedCount === a.totalSections ? "Review" : "Resume",
    };
  }
  return {
    href: a.reference
      ? `/dashboard/application/${a.reference}`
      : `/dashboard?app=${a.id}`,
    label: "View",
  };
}

/**
 * Table view of every application this investor owns. Investors may run several
 * at once, so this is the place to see them side by side and jump back into any
 * one — a draft resumes in the wizard, a submitted one opens its detail.
 */
export default async function ApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  const applications = await listInvestorApplications(userId);
  const total = applications.length;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />
      <main className="flex-1 p-4 sm:p-6">
        <PageHeader
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Applications" },
          ]}
        />

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">My applications</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              {total === 0
                ? "You haven't started an application yet."
                : `You have ${total} application${total === 1 ? "" : "s"}. Resume a draft or review a submitted one.`}
            </p>
          </div>
          <StartEoiButton label="Start new application" />
        </div>

        {total === 0 ? (
          <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
            <p className="text-sm text-ink-500">
              Once you start an application it will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Progress</th>
                  <th className="px-4 py-3 font-semibold">Plots</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a, i) => {
                  const badge = statusBadgeProps(a.status);
                  const dest = destinationFor(a);
                  // List is newest-first, so the oldest application is #1.
                  const ordinal = total - i;
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50"
                    >
                      <td className="px-4 py-3 font-semibold text-ink-500">
                        {ordinal}
                      </td>
                      <td className="px-4 py-3 font-bold tracking-tight text-ink-900">
                        {a.reference ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={badge.variant}>
                          {badge.label}
                        </StatusBadge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                        {a.completedCount}/{a.totalSections} sections
                      </td>
                      <td className="px-4 py-3 text-ink-600">{a.plotCount}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={dest.href}>{dest.label} →</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
