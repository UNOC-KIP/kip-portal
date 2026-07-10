import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  CheckCircle2,
  AlertCircle,
  Lock,
  ChevronRight,
  Clock,
  CalendarDays,
} from "lucide-react";
import { KIP_ZONE_LABELS, type KipZone } from "@kip/shared";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { CountdownTimer } from "@/components/countdown-timer";
import {
  getInvestorDashboardData,
  getSiteVisitBooking,
  siteVisitBadgeProps,
  statusBadgeProps,
} from "@/lib/investor-data";
import Link from "next/link";

export default async function InvestorDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  const [data, siteVisit] = await Promise.all([
    getInvestorDashboardData(userId),
    getSiteVisitBooking(userId),
  ]);
  const { orgName, application: app, windowCloseAt, windowName } = data;

  // `windowCloseAt` is null exactly when no ApplicationWindow is OPEN. With no
  // window there is nothing to apply for, so the EOI journey is hidden and the
  // site visit becomes the primary call to action.
  const windowOpen = !!windowCloseAt;

  const paymentStatus = app?.paymentStatus ?? null;
  const paymentConfirmed = paymentStatus === "CONFIRMED";
  const paymentProofUploaded = paymentStatus === "PROOF_UPLOADED";
  const isPreSubmission =
    !app || app.status === "DRAFT_PAYMENT_PENDING" || app.status === "DRAFT";

  const statusBadge = app ? statusBadgeProps(app.status) : null;

  const sections = app?.sections ?? [];
  const completedCount = sections.filter((s) => s.complete).length;
  const totalSections = 6;
  const allSectionsComplete = completedCount === totalSections;
  const progressPct = Math.round((completedCount / totalSections) * 100);

  const canSubmit =
    paymentConfirmed &&
    allSectionsComplete &&
    app?.status === "DRAFT" &&
    !!windowCloseAt;

  const firstIncompleteIdx = sections.findIndex((s) => !s.complete);
  const nextSectionNum = firstIncompleteIdx >= 0 ? firstIncompleteIdx + 1 : 1;

  const daysToClose = windowCloseAt
    ? Math.ceil(
        (new Date(windowCloseAt).getTime() - Date.now()) / 86_400_000,
      )
    : null;
  const urgentDeadline = daysToClose !== null && daysToClose <= 7;

  const closeDate = windowCloseAt
    ? new Date(windowCloseAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />

      <main className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-black p-5 text-white sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
              {windowName ?? "KIP Investor Portal"}
            </p>
            <h1 className="mt-1 text-xl font-bold">
              {orgName ?? session.user?.name ?? "Your Organisation"}
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Kabalega Industrial Park · Account verified ✓
            </p>
          </div>
          <div className="shrink-0 sm:text-right">
            {app?.reference && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                  Reference
                </p>
                <p className="mt-1 text-lg font-black tracking-tight">
                  {app.reference}
                </p>
              </div>
            )}
            {!app?.reference && app && (
              <p className="text-xs text-white/30">Application in progress</p>
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

        {/* ── Site visit ───────────────────────────────────────── */}
        {isPreSubmission && (
          <div className="mb-5 rounded-xl border border-brand-300 bg-white p-5">
            {siteVisit ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="shrink-0 text-brand-600" />
                    <h3 className="text-sm font-bold">Site Visit</h3>
                    <StatusBadge variant={siteVisitBadgeProps(siteVisit.status).variant}>
                      {siteVisitBadgeProps(siteVisit.status).label}
                    </StatusBadge>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-500">
                    {KIP_ZONE_LABELS[siteVisit.zone as KipZone] ?? siteVisit.zone} ·{" "}
                    {siteVisit.landUse} · {siteVisit.acres} acre
                    {siteVisit.acres === 1 ? "" : "s"}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href="/dashboard/site-visit">View request →</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="shrink-0 text-brand-600" />
                    <h3 className="text-sm font-bold">Book a Site Visit</h3>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-500">
                    See the park in person. Tell us the zone, land use and acreage you
                    need, and we&apos;ll arrange a visit.
                  </p>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link href="/dashboard/site-visit">Book Site Visit →</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Application window closed ────────────────────────── */}
        {isPreSubmission && !windowOpen && (
          <div className="rounded-xl border border-ink-200 bg-white px-5 py-4">
            <p className="text-sm font-semibold text-ink-800">
              The EOI application window is not currently open
            </p>
            <p className="mt-1 text-xs text-ink-500">
              We&apos;ll email you as soon as the next Call for Expressions of Interest
              opens. In the meantime, book a site visit to see the park for yourself.
            </p>
          </div>
        )}

        {/* ── Deadline banner ──────────────────────────────────── */}
        {windowCloseAt && isPreSubmission && (
          <div
            className={`mb-5 flex flex-col gap-3 rounded-xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
              urgentDeadline
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div>
              <p
                className={`text-sm font-semibold ${urgentDeadline ? "text-red-700" : "text-amber-700"}`}
              >
                {urgentDeadline
                  ? "⚠️ Deadline approaching — submit soon!"
                  : "⏰ Application window is open"}
              </p>
              <p className="mt-0.5 text-xs text-ink-600">
                Window closes{" "}
                <strong>{closeDate}</strong>
                {daysToClose !== null && ` · ${daysToClose} day${daysToClose !== 1 ? "s" : ""} left`}
              </p>
            </div>
            <CountdownTimer closeAt={windowCloseAt} />
          </div>
        )}

        {/* ── Pre-submission journey ────────────────────────────── */}
        {isPreSubmission && windowOpen && (
          <>
            {/* 3-step cards */}
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Step 1 — EOI Form (fillable straight away) */}
              <div
                className={`rounded-xl border bg-white p-5 ${
                  allSectionsComplete
                    ? "border-green-200 bg-green-50/30"
                    : "border-brand-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      allSectionsComplete
                        ? "bg-green-100 text-green-700"
                        : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    1
                  </span>
                  {allSectionsComplete && (
                    <CheckCircle2 size={18} className="text-green-500" />
                  )}
                </div>
                <h3 className="mt-3 text-sm font-bold">EOI Application</h3>
                <p className="mt-1 text-xs text-ink-500">
                  {completedCount} of {totalSections} sections complete
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-3 w-full"
                  variant={allSectionsComplete ? "outline" : "default"}
                >
                  <Link href={`/dashboard/eoi/${nextSectionNum}`}>
                    {completedCount === 0
                      ? "Start EOI →"
                      : allSectionsComplete
                        ? "Review EOI"
                        : "Continue EOI →"}
                  </Link>
                </Button>
              </div>

              {/* Step 2 — Payment */}
              <div
                className={`rounded-xl border bg-white p-5 ${
                  paymentConfirmed
                    ? "border-green-200 bg-green-50/30"
                    : "border-amber-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      paymentConfirmed
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    2
                  </span>
                  {paymentConfirmed ? (
                    <CheckCircle2 size={18} className="text-green-500" />
                  ) : (
                    <AlertCircle size={18} className="text-amber-500" />
                  )}
                </div>
                <h3 className="mt-3 text-sm font-bold">Application Fee</h3>

                {paymentConfirmed && (
                  <>
                    <p className="mt-1 text-xs font-medium text-green-700">
                      ✓ Payment confirmed
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {app?.paymentCurrency}{" "}
                      {parseFloat(app?.paymentAmount ?? "1000").toLocaleString()}{" "}
                      · Bank transfer
                    </p>
                    <Link
                      href="/dashboard/payment"
                      className="mt-3 inline-block text-xs text-ink-400 underline hover:text-ink-600"
                    >
                      View receipt →
                    </Link>
                  </>
                )}

                {paymentProofUploaded && !paymentConfirmed && (
                  <>
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Proof submitted — awaiting admin confirmation
                    </p>
                    <Link
                      href="/dashboard/payment"
                      className="mt-3 inline-block text-xs text-ink-400 underline hover:text-ink-600"
                    >
                      Check status →
                    </Link>
                  </>
                )}

                {!paymentConfirmed && !paymentProofUploaded && (
                  <>
                    <p className="mt-1 text-xs text-ink-500">
                      USD 1,000 · Stanbic Bank transfer · Non-refundable
                    </p>
                    <Button asChild size="sm" className="mt-3 w-full">
                      <Link href="/dashboard/payment">Pay Now →</Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Step 3 — Submit */}
              <div
                className={`rounded-xl border bg-white p-5 ${
                  canSubmit ? "border-brand-400" : "border-ink-200 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      canSubmit
                        ? "bg-brand-100 text-brand-700"
                        : "bg-ink-100 text-ink-400"
                    }`}
                  >
                    3
                  </span>
                  {!canSubmit && <Lock size={14} className="text-ink-400" />}
                </div>
                <h3 className="mt-3 text-sm font-bold">Submit EOI</h3>
                <p className="mt-1 text-xs text-ink-500">
                  {!allSectionsComplete
                    ? `${totalSections - completedCount} section${totalSections - completedCount !== 1 ? "s" : ""} remaining`
                    : !paymentConfirmed
                      ? "Pay the application fee to submit"
                      : "Ready to submit!"}
                </p>

                {canSubmit ? (
                  <Button
                    asChild
                    size="sm"
                    className="mt-3 w-full bg-green-600 hover:bg-green-700"
                  >
                    <Link href="/dashboard/eoi/6">Submit EOI →</Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled
                    className="mt-3 w-full bg-green-600 hover:bg-green-700"
                  >
                    Submit EOI →
                  </Button>
                )}
              </div>
            </div>

            {/* EOI section checklist */}
            {app && (
              <div className="rounded-xl border border-ink-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold">EOI Application Sections</h2>
                  <span className="text-xs text-ink-500">
                    {completedCount}/{totalSections} complete
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="space-y-0.5">
                  {sections.map((s, idx) => {
                    const sectionNum = idx + 1;
                    const isNextUp =
                      !s.complete &&
                      sections.slice(0, idx).every((prev) => prev.complete);

                    return (
                      <Link
                        key={s.key}
                        href={`/dashboard/eoi/${sectionNum}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-ink-50"
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            s.complete
                              ? "bg-green-100 text-green-700"
                              : isNextUp
                                ? "bg-brand-100 text-brand-700"
                                : "bg-ink-100 text-ink-500"
                          }`}
                        >
                          {s.complete ? "✓" : sectionNum}
                        </span>
                        <span
                          className={`flex-1 text-sm ${
                            s.complete
                              ? "text-ink-600 line-through"
                              : isNextUp
                                ? "font-semibold text-ink-900"
                                : "text-ink-500"
                          }`}
                        >
                          {s.label}
                        </span>
                        <ChevronRight
                          size={14}
                          className={isNextUp ? "text-brand-500" : "text-ink-300"}
                        />
                      </Link>
                    );
                  })}
                </div>

                {!allSectionsComplete && (
                  <div className="mt-4">
                    <Button asChild className="w-full sm:w-auto">
                      <Link href={`/dashboard/eoi/${nextSectionNum}`}>
                        {completedCount === 0
                          ? "Start Section 1 →"
                          : `Continue — Section ${nextSectionNum} →`}
                      </Link>
                    </Button>
                  </div>
                )}

                {allSectionsComplete && !paymentConfirmed && (
                  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        All sections complete — one step left
                      </p>
                      <p className="mt-0.5 text-xs text-amber-700">
                        Pay the USD 1,000 application fee to submit your EOI.
                      </p>
                    </div>
                    <Button asChild className="shrink-0">
                      <Link href="/dashboard/payment">Pay Application Fee →</Link>
                    </Button>
                  </div>
                )}

                {canSubmit && (
                  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        All sections complete — ready to submit!
                      </p>
                      {closeDate && (
                        <p className="mt-0.5 text-xs text-green-700">
                          Submit before {closeDate}
                        </p>
                      )}
                    </div>
                    <Button
                      asChild
                      className="shrink-0 bg-green-600 hover:bg-green-700"
                    >
                      <Link href="/dashboard/eoi/6">Submit EOI →</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Post-submission view ─────────────────────────────── */}
        {app && !isPreSubmission && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ink-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                    Application Status
                  </p>
                  <h2 className="mt-1 text-lg font-bold">{app.reference}</h2>
                </div>
                <StatusBadge variant={statusBadge!.variant}>
                  {statusBadge!.label}
                </StatusBadge>
              </div>

              <p className="mt-3 text-sm text-ink-600">
                Your EOI application has been submitted and is progressing
                through the KIP review pipeline. You will be notified by email
                of any updates or requests for clarification.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="outline">
                  <Link href={`/dashboard/application/${app.reference}`}>
                    View Application Details →
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/dashboard/documents">My Documents</Link>
                </Button>
              </div>
            </div>

            {/* Pipeline progress indicator */}
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-bold">Review Pipeline</h3>
              <ol className="space-y-3">
                {[
                  { label: "EOI Submitted", done: true },
                  {
                    label: "Technical Committee Review",
                    done: ["SHORTLISTED", "NOT_SHORTLISTED", "LAC_REVIEW", "LAC_APPROVED", "LAC_REJECTED", "EXCO_REVIEW", "ALLOCATED"].includes(app.status),
                    active: app.status === "UNDER_TC_REVIEW" || app.status === "TC_CLARIFICATION_REQUESTED",
                  },
                  {
                    label: "Land Allocation Committee",
                    done: ["LAC_APPROVED", "LAC_REJECTED", "EXCO_REVIEW", "ALLOCATED"].includes(app.status),
                    active: app.status === "LAC_REVIEW",
                  },
                  {
                    label: "ExCo Decision",
                    done: ["ALLOCATED"].includes(app.status),
                    active: app.status === "EXCO_REVIEW",
                  },
                  {
                    label: "Plot Allocation",
                    done: app.status === "ALLOCATED",
                  },
                ].map((step, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.done
                          ? "bg-green-100 text-green-700"
                          : step.active
                            ? "bg-brand-100 text-brand-700"
                            : "bg-ink-100 text-ink-400"
                      }`}
                    >
                      {step.done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-sm ${
                        step.done
                          ? "text-ink-600"
                          : step.active
                            ? "font-semibold text-ink-900"
                            : "text-ink-400"
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.active && (
                      <span className="ml-auto flex items-center gap-1 text-xs font-medium text-brand-600">
                        <Clock size={12} /> In progress
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* No application yet — only unexpected while a window is actually open. */}
        {!app && windowOpen && (
          <div className="rounded-xl border border-ink-200 bg-white p-8 text-center">
            <p className="text-sm text-ink-500">
              No EOI application found. Contact the KIP secretariat at{" "}
              <a
                href="mailto:kipinvestorrelations@unoc.com"
                className="font-medium underline"
              >
                kipinvestorrelations@unoc.com
              </a>{" "}
              if this is unexpected.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
