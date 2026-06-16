import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Lock, CheckCircle2 } from "lucide-react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { getInvestorDashboardData, statusBadgeProps } from "@/lib/investor-data";
import Link from "next/link";

export default async function InvestorDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  const data = await getInvestorDashboardData(userId);

  const { orgName, application: app, windowCloseAt, windowName } = data;

  const paymentConfirmed = app?.paymentStatus === "CONFIRMED";
  const isPreSubmission =
    !app || app.status === "DRAFT_PAYMENT_PENDING" || app.status === "DRAFT";

  const statusBadge = app ? statusBadgeProps(app.status) : null;

  const completedSections = app?.sections.filter((s) => s.complete).length ?? 0;
  const totalSections = app?.sections.length ?? 6;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />

      <main className="flex-1 p-4 sm:p-6">
        {/* Hero card */}
        <div
          className="mb-4 flex flex-col gap-3 rounded-xl p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6"
          style={{ backgroundColor: "#5C5418" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Investor Portal
            </p>
            <h1 className="mt-1 text-xl font-bold">
              {orgName ?? session.user?.name ?? "Your Organisation"}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {windowName ?? "KIP Phase 1 — Round 1"} · Account verified ✓
            </p>
          </div>
          <div className="sm:text-right">
            {app?.reference ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  Application Reference
                </p>
                <p className="mt-1 text-xl font-black">{app.reference}</p>
              </>
            ) : (
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Application in progress
              </p>
            )}
            {statusBadge && (
              <div className="mt-2">
                <StatusBadge variant={statusBadge.variant}>
                  {statusBadge.label}
                </StatusBadge>
              </div>
            )}
          </div>
        </div>

        {/* Countdown — only show while window is open and application is pre-submission */}
        {windowCloseAt && isPreSubmission && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-ink-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-700">
              ⏰ Window closes — don&apos;t miss the deadline
            </p>
            <CountdownTimer closeAt={windowCloseAt} />
          </div>
        )}

        {/* Post-submission: application status card */}
        {app && !isPreSubmission && (
          <div className="mb-4 rounded-xl border border-ink-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                  Application Status
                </p>
                <h2 className="mt-1 text-base font-bold">{app.reference}</h2>
              </div>
              <StatusBadge variant={statusBadge!.variant}>{statusBadge!.label}</StatusBadge>
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/dashboard/application/${app.reference}`}>
                View Application Details
              </Link>
            </Button>
          </div>
        )}

        {/* Steps — only show pre-submission */}
        {isPreSubmission && (
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Step 1 — Payment */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              {paymentConfirmed ? (
                <>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                    <CheckCircle2 size={14} /> Step 1 — Complete
                  </p>
                  <h2 className="mt-2 text-base font-bold">💳 Application Fee Paid</h2>
                  <p className="mt-1 text-sm text-ink-500">
                    {app?.paymentCurrency ?? "USD"}{" "}
                    {parseFloat(app?.paymentAmount ?? "1000").toLocaleString()} ·{" "}
                    {app?.paymentMethod === "STANBIC_TRANSFER" ? "Bank transfer confirmed" : "Card payment confirmed"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-amber-600">Step 1 — Required</p>
                  <h2 className="mt-2 text-base font-bold">💳 Pay Application Fee</h2>
                  <p className="mt-1 text-sm text-ink-500">
                    USD 1,000 · Bank transfer or card. Non-refundable.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/payment">Pay Now</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Step 2 — Submit EOI */}
            {paymentConfirmed ? (
              <div className="rounded-xl border border-ink-200 bg-white p-5">
                <p className="text-xs font-semibold text-brand-600">Step 2 — In Progress</p>
                <h2 className="mt-2 text-base font-bold">📋 Submit EOI Application</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {completedSections} of {totalSections} sections complete
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/eoi/PRELIMINARY_INFO">Continue EOI</Link>
                </Button>
              </div>
            ) : (
              <div className="relative rounded-xl border border-ink-200 bg-white p-5 opacity-60">
                <Lock size={16} className="absolute right-4 top-4 text-ink-500" />
                <p className="text-xs font-semibold text-ink-500">
                  Step 2 — Locked until payment
                </p>
                <h2 className="mt-2 text-base font-bold">📋 Submit EOI Application</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {completedSections} of {totalSections} sections complete · Draft saved
                </p>
                <Button variant="outline" disabled className="mt-4">
                  Awaiting Payment
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Section progress — only show while in DRAFT or DRAFT_PAYMENT_PENDING */}
        {app && (app.status === "DRAFT" || app.status === "DRAFT_PAYMENT_PENDING") && (
          <div className="rounded-xl border border-ink-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <h2 className="text-base font-bold">EOI Completion Progress</h2>
              </div>
              <span className="text-sm text-ink-500">
                {completedSections} of {totalSections} sections complete
              </span>
            </div>

            <div className="space-y-2.5">
              {app.sections.map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-sm text-ink-700">{s.label}</span>
                  <StatusBadge variant={s.complete ? "status-active" : "eoi-draft"}>
                    {s.complete ? "Complete" : "Not started"}
                  </StatusBadge>
                </div>
              ))}
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${(completedSections / totalSections) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* No application yet */}
        {!app && (
          <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
            <p className="text-sm text-ink-500">
              No EOI application found. Contact KIP Admin if this is unexpected.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
