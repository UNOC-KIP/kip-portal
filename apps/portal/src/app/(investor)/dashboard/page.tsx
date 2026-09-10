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
  Layers,
  Wallet,
  FileText,
  Download,
  LifeBuoy,
  MapPin,
  Activity,
  ArrowRight,
  ShieldAlert,
  Mail,
} from "lucide-react";
import {
  DOCUMENT_KIND_LABELS,
  KIP_ZONE_LABELS,
  canPreviewEoi,
  APPLICATION_FEE_ENABLED,
  PLOT_SELECTION_ENABLED,
  type DocumentKind,
  type KipZone,
} from "@kip/shared";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { SiteVisitSummary } from "@/components/site-visit-summary";
import { EoiGuideCallout } from "@/components/eoi-guide-callout";
import { StartEoiButton } from "./start-eoi-button";
import { FeeActions } from "./fee-actions";
import {
  getInvestorDashboardData,
  listInvestorApplications,
  type ApplicationSummary,
  getSiteVisitBooking,
  statusBadgeProps,
  type ActivityItem,
} from "@/lib/investor-data";
import { getTimelineData } from "@/lib/timeline-data";
import { getUnreadCount } from "@/lib/inbox-data";
import Link from "next/link";

// ─── Local formatters ─────────────────────────────────────────────────────────

/** Labels come from `DOCUMENT_KIND_LABELS` so this list can never fall behind
 *  the enum; the fallback only covers a value written before a deploy. */
function docLabel(kind: string) {
  return (
    DOCUMENT_KIND_LABELS[kind as DocumentKind] ?? kind.replace(/_/g, " ")
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function shortDateYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

const TILE_TONE: Record<string, { ic: string; bar: string }> = {
  gold:   { ic: "bg-brand-100 text-brand-700",   bar: "bg-brand-400" },
  green:  { ic: "bg-green-100 text-green-700",    bar: "bg-green-500" },
  amber:  { ic: "bg-amber-100 text-amber-700",    bar: "bg-amber-500" },
  blue:   { ic: "bg-blue-100 text-blue-700",      bar: "bg-blue-500" },
  purple: { ic: "bg-purple-100 text-purple-700",  bar: "bg-purple-500" },
  ink:    { ic: "bg-ink-100 text-ink-500",        bar: "bg-ink-300" },
};

function StatTile({
  icon: Icon,
  tone,
  value,
  unit,
  label,
  pct,
  numeric = true,
}: {
  icon: React.ElementType;
  tone: keyof typeof TILE_TONE;
  value: string;
  unit?: string;
  label: string;
  pct?: number;
  numeric?: boolean;
}) {
  const t = TILE_TONE[tone]!;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.ic}`}>
        <Icon size={16} />
      </span>
      <p
        className={`mt-3 font-bold leading-none tracking-tight ${
          numeric ? "text-2xl tabular-nums" : "text-lg"
        }`}
      >
        {value}
        {unit && <span className="text-sm font-semibold text-ink-500">{unit}</span>}
      </p>
      <p className="mt-1.5 text-xs font-medium text-ink-500">{label}</p>
      {pct != null && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-ink-100">
          <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ─── Section card shell ───────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── Recent activity feed ─────────────────────────────────────────────────────

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const recent = [...items].reverse().slice(0, 5);
  return (
    <div className="flex flex-col">
      {recent.map((a, i) => (
        <div
          key={i}
          className="flex items-start gap-3 border-b border-ink-100 py-2.5 last:border-0"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
            <CheckCircle2 size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-snug text-ink-900">{a.text}</p>
            <p className="text-[11px] text-ink-500">{a.actor}</p>
          </div>
          <span className="shrink-0 whitespace-nowrap text-[11px] text-ink-500">
            {shortDate(a.time)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestorDashboardPage({
  searchParams,
}: {
  searchParams: { app?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const userId = (session.user as { id: string }).id;
  // The detailed view below focuses on ONE application — the one named in the
  // query, else the most recent. `applications` drives the switcher so the
  // investor can move between several and start more.
  const [data, applications, siteVisit, unreadMessages] = await Promise.all([
    getInvestorDashboardData(userId, searchParams.app),
    listInvestorApplications(userId),
    getSiteVisitBooking(userId),
    getUnreadCount(userId),
  ]);
  const {
    orgName,
    application: app,
    windowCloseAt,
    windowName,
    recentActivity,
    documents,
    mustChangePassword,
  } = data;

  const windowOpen = !!windowCloseAt;

  // A preview actor (ADMIN) reaches the EOI journey with no open window — the
  // API lifts the same gate, so the dashboard must not present a dead end the
  // server would have allowed. Only the journey unlocks; the countdown and the
  // deadline copy still need a real window and stay hidden.
  const previewMode = canPreviewEoi(
    (session.user as { role?: string } | undefined)?.role,
  );
  const eoiUnlocked = windowOpen || previewMode;

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

  // Submit-first: payment happens after submission (invoice-based), so the
  // fee no longer gates submission.
  const canSubmit =
    allSectionsComplete &&
    (app?.status === "DRAFT_PAYMENT_PENDING" || app?.status === "DRAFT") &&
    eoiUnlocked;

  const firstIncompleteIdx = sections.findIndex((s) => !s.complete);
  const nextSectionNum = firstIncompleteIdx >= 0 ? firstIncompleteIdx + 1 : 1;
  const nextSectionLabel = firstIncompleteIdx >= 0 ? sections[firstIncompleteIdx]?.label ?? null : null;
  const remaining = totalSections - completedCount;

  const daysToClose = windowCloseAt
    ? Math.ceil((new Date(windowCloseAt).getTime() - Date.now()) / 86_400_000)
    : null;
  const urgentDeadline = daysToClose !== null && daysToClose <= 7;

  const closeDate = windowCloseAt ? shortDateYear(windowCloseAt) : null;

  const plotCount = app?.plotCount ?? 0;
  const payCurrency = app?.paymentCurrency ?? "USD";
  const feeUsd = plotCount * 1000;
  // Show the actual payment amount once a payment exists, else the expected fee
  // from the plots chosen so far (USD 1,000 per plot).
  const payAmount = app?.paymentAmount
    ? parseFloat(app.paymentAmount).toLocaleString()
    : feeUsd > 0
      ? feeUsd.toLocaleString()
      : "—";

  // Post-submission review pipeline — single source for both the KPI tile and
  // the pipeline card so the "stage N of M" and the timeline never disagree.
  const pipelineSteps = app
    ? [
        { label: "EOI Submitted", sub: app.submittedAt ? shortDateYear(app.submittedAt) : "Reference assigned", done: true, active: false },
        {
          label: "Technical Committee Review",
          sub: "Scoring & shortlisting",
          done: ["SHORTLISTED", "NOT_SHORTLISTED", "LAC_REVIEW", "LAC_APPROVED", "LAC_REJECTED", "EXCO_REVIEW", "ALLOCATED"].includes(app.status),
          active: app.status === "UNDER_TC_REVIEW" || app.status === "TC_CLARIFICATION_REQUESTED",
        },
        {
          label: "Land Allocation Committee",
          sub: "Suitability review",
          done: ["LAC_APPROVED", "LAC_REJECTED", "EXCO_REVIEW", "ALLOCATED"].includes(app.status),
          active: app.status === "LAC_REVIEW",
        },
        {
          label: "ExCo Decision",
          sub: "Final approval",
          done: ["ALLOCATED"].includes(app.status),
          active: app.status === "EXCO_REVIEW",
        },
        { label: "Plot Allocation", sub: "Welcome to KIP", done: app.status === "ALLOCATED", active: false },
      ]
    : [];
  const stagesDone = pipelineSteps.filter((s) => s.done).length;

  const { timeline, siteVisit: siteVisitSchedule } = await getTimelineData();
  const activeTimelineIdx = timeline.findIndex((t) => t.active);
  // Same gate as the booking page and the API: no invitation to book once the
  // window has closed. Preview roles keep the CTA so staff can still exercise it.
  const siteVisitBookingOpen =
    previewMode || !siteVisitSchedule || siteVisitSchedule.bookingOpen;

  const firstName = (orgName ?? session.user?.name ?? "there").split(" ")[0];

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar />

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        {/* ── Fee CTA — sits right under the nav bar so paying or
            grabbing the invoice is the first thing in reach when an
            application is open. Hidden once the fee is confirmed. ──── */}
        {app && APPLICATION_FEE_ENABLED && !paymentConfirmed && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink-900">
                Application fee{app.reference ? ` · ${app.reference}` : ""}
              </p>
              <p className="text-xs text-ink-500">
                {paymentProofUploaded
                  ? "Proof received — we're verifying your payment."
                  : "Generate your invoice, then pay and upload your receipt."}
              </p>
            </div>
            <Button asChild size="sm">
              <Link href={`/dashboard/payment/bank?app=${app.id}`}>
                Pay / invoice →
              </Link>
            </Button>
          </div>
        )}

        {/* ── Greeting ──────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-ink-500">Here&apos;s where your KIP application stands.</p>
          </div>
          {app?.reference && (
            <p className="text-xs font-semibold text-ink-500">
              Ref <span className="font-black tracking-tight text-ink-900">{app.reference}</span>
            </p>
          )}
        </div>

        {/* ── Your applications — switch between them, or start another.
            Investors may run several EOIs at once (different plots or joint-
            venture compositions); the detailed view below tracks the selected
            one (?app=<id>, default newest). ───────────────────────────────── */}
        {applications.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {applications.length === 1
                    ? "Your application"
                    : `Your applications · ${applications.length}`}
                </p>
                <Link
                  href="/dashboard/applications"
                  className="text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
                >
                  View all →
                </Link>
              </div>
              {eoiUnlocked && (
                <StartEoiButton
                  label="Start another application"
                  variant="outline"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {applications.map((a: ApplicationSummary, i: number) => {
                const selected = a.id === app?.id;
                const badge = statusBadgeProps(a.status);
                // List is newest-first, so the oldest application is #1.
                const ordinal = applications.length - i;
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard?app=${a.id}`}
                    aria-current={selected ? "page" : undefined}
                    className={`flex min-w-[200px] flex-col gap-1 rounded-xl border px-4 py-3 transition ${
                      selected
                        ? "border-brand-400 bg-white ring-2 ring-brand-400/20"
                        : "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
                        Application {ordinal}
                      </span>
                      {selected && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                          Viewing
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-bold tracking-tight text-ink-900">
                      {a.reference ?? "Draft application"}
                    </span>
                    <span className="text-xs text-ink-500">
                      Created {shortDateYear(a.createdAt)}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
                      <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
                      <span>
                        {a.completedCount}/{a.totalSections} sections
                        {a.plotCount > 0
                          ? ` · ${a.plotCount} plot${a.plotCount === 1 ? "" : "s"}`
                          : ""}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Unread secretariat announcements. */}
        {unreadMessages > 0 && (
          <Link
            href="/dashboard/messages"
            className="mb-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 transition hover:bg-brand-100"
          >
            <Mail size={18} className="shrink-0 text-brand-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">
                You have {unreadMessages} unread message{unreadMessages === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-ink-600">
                New announcements from the KIP secretariat.
              </p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-brand-600" />
          </Link>
        )}

        {/* Nudge investors still on the auto-generated password. */}
        {mustChangePassword && (
          <Link
            href="/dashboard/settings#password"
            className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
          >
            <ShieldAlert size={18} className="shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-800">
                Secure your account — change your password
              </p>
              <p className="text-xs text-amber-700">
                You&apos;re still using the password we emailed you. Set one only you know.
              </p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-amber-600" />
          </Link>
        )}

        {/* Prominent EOI call-to-action — stays visible right through drafting,
            whether or not the application has been started yet. */}
        {eoiUnlocked && isPreSubmission && (
          <Card>
            {!app ? (
              <>
                <p className="text-lg font-bold text-ink-900">
                  The Call for Expressions of Interest is open
                </p>
                <p className="mt-1.5 max-w-2xl text-sm text-ink-600">
                  Starting creates your EOI application. Complete six sections
                  covering your company, the land and business you propose
                  {PLOT_SELECTION_ENABLED
                    ? " (including the plot or plots you want)"
                    : ""}
                  , utilities, H3SE, and national content
                  {APPLICATION_FEE_ENABLED
                    ? ", then pay the processing fee of USD 1,000 per plot at the end, before you submit."
                    : ", then submit."}{" "}
                  You can save and come back at any point before the window
                  closes.
                </p>
                <div className="mt-4">
                  <StartEoiButton />
                </div>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-ink-900">
                  {allSectionsComplete
                    ? "Your EOI is ready to review"
                    : "Continue your EOI application"}
                </p>
                <p className="mt-1.5 max-w-2xl text-sm text-ink-600">
                  {allSectionsComplete
                    ? "All six sections are complete. Review everything, pay the fee, and submit before the window closes."
                    : `You've completed ${completedCount} of ${totalSections} sections${nextSectionLabel ? ` — next up: ${nextSectionLabel}` : ""}. Your progress is saved; pick up right where you left off.`}
                </p>
                <div className="mt-4">
                  <Button asChild className="h-11 px-6 text-base">
                    <Link href={`/dashboard/eoi/${app.id}/${nextSectionNum}`}>
                      {allSectionsComplete
                        ? "Review EOI →"
                        : `Resume application · ${completedCount}/${totalSections} →`}
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ═══════════ MAIN COLUMN ═══════════ */}
          <div className="flex flex-col gap-4">
            {/* ── Hero ────────────────────────────────────────────── */}
            <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-black p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {windowName ?? "Kabalega Industrial Park"}
                </p>
                <h2 className="mt-1 truncate text-xl font-bold">
                  {orgName ?? session.user?.name ?? "Your Organisation"}
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Hoima, Uganda · <span className="text-white/80">Account verified</span>
                </p>
              </div>
              <div className="shrink-0 sm:text-right">
                {app?.reference ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      Reference
                    </p>
                    <p className="mt-1 text-lg font-black tracking-tight">{app.reference}</p>
                  </>
                ) : app ? (
                  <p className="text-xs text-white/40">Reference assigned on submission</p>
                ) : null}
                {statusBadge && (
                  <div className="mt-2">
                    <StatusBadge variant={statusBadge.variant}>{statusBadge.label}</StatusBadge>
                  </div>
                )}
              </div>
            </div>

            {/* ── KPI row ──────────────────────────────────────────── */}
            {app && isPreSubmission && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile
                  icon={Layers}
                  tone="gold"
                  value={String(completedCount)}
                  unit={`/${totalSections}`}
                  label="EOI sections complete"
                  pct={progressPct}
                />
                {APPLICATION_FEE_ENABLED && (
                  <StatTile
                    icon={paymentConfirmed ? CheckCircle2 : Wallet}
                    tone={paymentConfirmed ? "green" : "amber"}
                    value={paymentConfirmed ? "Paid" : paymentProofUploaded ? "Pending" : "Due"}
                    numeric={false}
                    label={`Fee · ${payCurrency} ${payAmount}`}
                    pct={paymentConfirmed ? 100 : paymentProofUploaded ? 66 : 0}
                  />
                )}
                <StatTile
                  icon={Clock}
                  tone={urgentDeadline ? "amber" : windowOpen ? "blue" : "ink"}
                  value={windowOpen ? String(daysToClose) : "—"}
                  unit={windowOpen ? " days" : undefined}
                  label={windowOpen ? "Until window closes" : "Window not open"}
                />
                <StatTile
                  icon={MapPin}
                  tone="blue"
                  value={
                    siteVisit
                      ? siteVisit.scheduledAt
                        ? shortDate(siteVisit.scheduledAt)
                        : "Requested"
                      : "Not booked"
                  }
                  numeric={false}
                  label={
                    siteVisit
                      ? KIP_ZONE_LABELS[siteVisit.zone as KipZone] ?? "Site visit"
                      : "Book a site visit"
                  }
                />
              </div>
            )}

            {app && !isPreSubmission && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile
                  icon={Activity}
                  tone="purple"
                  value={statusBadge!.label}
                  numeric={false}
                  label="Current review stage"
                />
                <StatTile
                  icon={Layers}
                  tone="gold"
                  value={String(stagesDone)}
                  unit={`/${pipelineSteps.length}`}
                  label="Pipeline stage reached"
                  pct={Math.round((stagesDone / pipelineSteps.length) * 100)}
                />
                <StatTile
                  icon={CheckCircle2}
                  tone="green"
                  value={app.submittedAt ? shortDate(app.submittedAt) : "—"}
                  numeric={false}
                  label={`Submitted${app.submittedAt ? ` · ${new Date(app.submittedAt).getFullYear()}` : ""}`}
                />
                <StatTile
                  icon={FileText}
                  tone="blue"
                  value={String(documents.length)}
                  label="Documents on file"
                />
              </div>
            )}

            {/* ── Window closed notice ─────────────────────────────── */}
            {isPreSubmission && !eoiUnlocked && (
              <Card>
                <p className="text-sm font-semibold text-ink-900">
                  The EOI application window is not currently open
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  We&apos;ll email you as soon as the next Call for Expressions of Interest opens.
                  In the meantime, book a site visit to see the park for yourself.
                </p>
              </Card>
            )}

            {/* ── Pre-submission journey ───────────────────────────── */}
            {app && isPreSubmission && eoiUnlocked && (
              <>
                {/* 3 steps */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Step 1 â Complete EOI */}
                  <div
                    className={`rounded-xl border p-4 shadow-sm ${
                      allSectionsComplete
                        ? "border-green-200 bg-green-50/40"
                        : "border-brand-400 bg-white ring-2 ring-brand-400/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          allSectionsComplete ? "bg-green-100 text-green-700" : "bg-brand-100 text-brand-700"
                        }`}
                      >
                        {allSectionsComplete ? "✓" : "1"}
                      </span>
                      {allSectionsComplete && <CheckCircle2 size={18} className="text-green-500" />}
                    </div>
                    <h3 className="mt-3 text-sm font-bold">Complete your EOI</h3>
                    <p className="mt-1 text-xs text-ink-500">
                      {allSectionsComplete
                        ? "All 6 sections complete"
                        : `${remaining} of ${totalSections} remaining${nextSectionLabel ? ` · next: ${nextSectionLabel}` : ""}`}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="mt-3 w-full"
                      variant={allSectionsComplete ? "outline" : "default"}
                    >
                      <Link href={`/dashboard/eoi/${app.id}/${nextSectionNum}`}>
                        {allSectionsComplete ? "Review EOI" : `Resume · ${completedCount}/${totalSections} →`}
                      </Link>
                    </Button>
                  </div>

                  {/* Step 3 â Submit */}
                  <div
                    className={`rounded-xl border p-4 shadow-sm ${
                      canSubmit ? "border-brand-400 bg-white" : "border-gray-200 bg-white opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          canSubmit ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"
                        }`}
                      >
                        2
                      </span>
                      {!canSubmit && <Lock size={14} className="text-ink-500" />}
                    </div>
                    <h3 className="mt-3 text-sm font-bold">Submit EOI</h3>
                    <p className="mt-1 text-xs text-ink-500">
                      {!allSectionsComplete
                        ? `${remaining} section${remaining !== 1 ? "s" : ""} remaining`
                        : "Ready to submit!"}
                    </p>
                    {canSubmit ? (
                      <Button asChild size="sm" className="mt-3 w-full bg-green-600 hover:bg-green-700">
                        <Link href={`/dashboard/eoi/${app.id}/6`}>Submit EOI →</Link>
                      </Button>
                    ) : (
                      <Button size="sm" disabled className="mt-3 w-full bg-green-600 hover:bg-green-700">
                        Submit EOI →
                      </Button>
                    )}
                  </div>
                </div>

                {/* EOI section checklist */}
                {app && (
                  <Card>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-bold">EOI Application Sections</h2>
                      <span className="text-xs font-semibold text-ink-500">
                        {completedCount}/{totalSections} complete
                      </span>
                    </div>

                    <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex flex-col">
                      {sections.map((s, idx) => {
                        const sectionNum = idx + 1;
                        const isNextUp = !s.complete && sections.slice(0, idx).every((p) => p.complete);
                        return (
                          <Link
                            key={s.key}
                            href={`/dashboard/eoi/${app.id}/${sectionNum}`}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-ink-100/60"
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
                                  ? "text-ink-500 line-through"
                                  : isNextUp
                                    ? "font-semibold text-ink-900"
                                    : "text-ink-500"
                              }`}
                            >
                              {s.label}
                            </span>
                            {isNextUp && (
                              <span className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                                Next up
                              </span>
                            )}
                            <ChevronRight size={14} className={isNextUp ? "text-brand-600" : "text-ink-300"} />
                          </Link>
                        );
                      })}
                    </div>

                    {canSubmit && (
                      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-green-800">
                            All sections complete — ready to submit!
                          </p>
                          {closeDate && (
                            <p className="mt-0.5 text-xs text-green-700">Submit before {closeDate}</p>
                          )}
                        </div>
                        <Button asChild className="shrink-0 bg-green-600 hover:bg-green-700">
                          <Link href={`/dashboard/eoi/${app.id}/6`}>Submit EOI →</Link>
                        </Button>
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}

            {/* ── Post-submission ──────────────────────────────────── */}
            {app && !isPreSubmission && (
              <>
                {APPLICATION_FEE_ENABLED && (
                  <FeeActions
                    applicationId={app.id}
                    plotCount={app.plotCount}
                    billing={data.billing}
                  />
                )}
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
                        Application
                      </p>
                      <h2 className="mt-1 text-lg font-bold">{app.reference}</h2>
                    </div>
                    <StatusBadge variant={statusBadge!.variant}>{statusBadge!.label}</StatusBadge>
                  </div>
                  <p className="mt-3 text-sm text-ink-500">
                    Your EOI is progressing through the KIP review pipeline. You&apos;ll be notified
                    by email of any updates or requests for clarification.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/application/${app.reference}`}>
                        View application details →
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/dashboard/documents">My documents</Link>
                    </Button>
                  </div>
                </Card>

                <Card>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Review Pipeline</h3>
                    <span className="text-xs font-semibold text-ink-500">
                      Stage {stagesDone} of {pipelineSteps.length}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {pipelineSteps.map((step, i) => (
                      <div key={i} className="flex items-stretch gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              step.done
                                ? "bg-green-100 text-green-700"
                                : step.active
                                  ? "bg-brand-100 text-brand-700"
                                  : "bg-ink-100 text-ink-500"
                            }`}
                          >
                            {step.done ? "✓" : i + 1}
                          </span>
                          {i < pipelineSteps.length - 1 && (
                            <span
                              className={`w-0.5 flex-1 ${step.done ? "bg-green-200" : "bg-ink-100"}`}
                            />
                          )}
                        </div>
                        <div className={i < pipelineSteps.length - 1 ? "pb-4" : ""}>
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm ${
                                step.done
                                  ? "font-semibold text-ink-900"
                                  : step.active
                                    ? "font-semibold text-ink-900"
                                    : "text-ink-500"
                              }`}
                            >
                              {step.label}
                            </p>
                            {step.active && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-brand-600">
                                <Clock size={11} /> In progress
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-500">{step.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* ── Site visit ───────────────────────────────────────── */}
            {/* The full booking summary once a visit is booked (so a scheduled
                visit is visible at a glance on sign-in), otherwise the booking
                CTA for any pre-submission investor. */}
            {siteVisit ? (
              <SiteVisitSummary booking={siteVisit} />
            ) : isPreSubmission && siteVisitBookingOpen ? (
              <div className="flex flex-col gap-3 rounded-xl border border-brand-300 bg-brand-50/60 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                    <CalendarDays size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold">See the park in person</h3>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Tell us the zone, land use and acreage you need — we&apos;ll arrange a visit.
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link href="/dashboard/site-visit">Book Site Visit →</Link>
                </Button>
              </div>
            ) : null}

            {/* ── Recent activity ──────────────────────────────────── */}
            {app && recentActivity.length > 0 && (
              <Card>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Recent Activity</h3>
                  {app.reference && (
                    <Link
                      href={`/dashboard/application/${app.reference}`}
                      className="text-[11px] font-semibold text-ink-500 hover:text-ink-900"
                    >
                      View all
                    </Link>
                  )}
                </div>
                <ActivityFeed items={recentActivity} />
              </Card>
            )}
          </div>

          {/* ═══════════ RIGHT RAIL ═══════════ */}
          <div className="flex flex-col gap-4">
            {/* Countdown (pre) / What's next (post) */}
            {isPreSubmission && windowOpen && (
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Submission Deadline</h3>
                  <StatusBadge variant={urgentDeadline ? "status-rejected" : "window-active"}>
                    {urgentDeadline ? "Closing soon" : "Open"}
                  </StatusBadge>
                </div>
                <div className="text-center">
                  <CountdownTimer closeAt={windowCloseAt} />
                </div>
                <p className="mt-3 text-center text-xs text-ink-500">
                  Window closes <span className="font-semibold text-ink-900">{closeDate}</span>
                </p>
              </Card>
            )}

            {app && !isPreSubmission && (
              <Card>
                <h3 className="mb-2 text-sm font-bold">What happens next</h3>
                <p className="text-xs leading-relaxed text-ink-500">
                  {app.status === "ALLOCATED"
                    ? "Your plot has been allocated. The KIP secretariat will be in touch about lease signing and site handover."
                    : app.status === "NOT_SHORTLISTED" || app.status === "LAC_REJECTED"
                      ? "A decision has been reached on your application. See the details page for the full audit trail."
                      : "Your application is under committee review. You'll be emailed the moment a decision is made or if clarification is needed."}
                </p>
              </Card>
            )}

            {/* Phase 2 key dates */}
            <Card>
              <h3 className="mb-3 text-sm font-bold">Phase 2 Key Dates</h3>
              <div className="flex flex-col">
                {timeline.map((t, i) => {
                  const past = activeTimelineIdx >= 0 && i < activeTimelineIdx;
                  return (
                    <div key={i} className="flex gap-3 border-b border-ink-100 py-2 last:border-0">
                      <span
                        className={`w-16 shrink-0 pt-0.5 text-[10px] font-bold ${
                          t.active ? "text-brand-600" : "text-ink-500"
                        }`}
                      >
                        {t.date}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-xs leading-snug ${
                            t.active
                              ? "font-semibold text-ink-900"
                              : past
                                ? "text-ink-500"
                                : "text-ink-700"
                          }`}
                        >
                          {t.label}
                        </p>
                        {t.active && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-brand-600">
                            You are here
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Documents preview */}
            <Card>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-bold">Documents</h3>
                <Link
                  href="/dashboard/documents"
                  className="text-[11px] font-semibold text-ink-500 hover:text-ink-900"
                >
                  Open library
                </Link>
              </div>
              {documents.length === 0 ? (
                <p className="py-2 text-xs text-ink-500">
                  Documents you upload with your EOI will appear here.
                </p>
              ) : (
                <div className="flex flex-col">
                  {documents.slice(0, 4).map((d) => (
                    <Link
                      key={d.id}
                      href="/dashboard/documents"
                      className="flex items-center gap-3 border-b border-ink-100 py-2.5 last:border-0"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[9px] font-black text-red-600">
                        {d.filename.split(".").pop()?.slice(0, 4).toUpperCase() ?? "DOC"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink-900">{docLabel(d.kind)}</p>
                        <p className="text-[10px] text-ink-500">
                          {formatFileSize(d.sizeBytes)} · {shortDate(d.uploadedAt)}
                        </p>
                      </div>
                      <Download size={14} className="shrink-0 text-ink-300" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* EOI Investor Guide — the reference an applicant needs open while
                filling the six sections, not just before they start. */}
            <EoiGuideCallout variant="dark" />

            {/* Support */}
            <div className="rounded-xl border-0 bg-gradient-to-br from-black to-ink-800 p-5 text-white shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <LifeBuoy size={16} className="text-brand-400" />
                <h3 className="text-sm font-bold">Need a hand?</h3>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-white/60">
                KIP Investor Relations is available Mon–Fri, 8am–5pm EAT to help with your application.
              </p>
              <Button asChild size="sm" className="w-full bg-brand-400 text-black hover:bg-brand-300">
                <a href="mailto:kipinvestorrelations@unoc.com">
                  Contact secretariat <ArrowRight size={14} className="ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
