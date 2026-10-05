import Link from "next/link";
import {
  FileText, Users, CreditCard, AlertTriangle, CheckCircle2,
  TrendingUp, Clock, BarChart3, ArrowRight, RefreshCw,
  DollarSign, UserCheck, Activity,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin-topbar";
import { getAdminDashboard } from "@/lib/admin/queries";
import { requireRole } from "@/lib/rbac-server";
import { ADMIN_ONLY } from "@/lib/rbac";
import { ApplicationStatus } from "@kip/shared";

// ─── Pipeline stage config ───────────────────────────────────────────────────

const PIPELINE_STAGES = [
  {
    key: "preparation",
    label: "In Preparation",
    statuses: [ApplicationStatus.DRAFT_PAYMENT_PENDING, ApplicationStatus.DRAFT],
    color: "bg-slate-300",
    dotColor: "bg-slate-400",
    textColor: "text-slate-500",
  },
  {
    key: "submitted",
    label: "Submitted",
    statuses: [ApplicationStatus.SUBMITTED],
    color: "bg-blue-400",
    dotColor: "bg-blue-500",
    textColor: "text-blue-700",
  },
  {
    key: "tc_review",
    label: "TC Review",
    statuses: [ApplicationStatus.UNDER_TC_REVIEW, ApplicationStatus.TC_CLARIFICATION_REQUESTED],
    color: "bg-violet-400",
    dotColor: "bg-violet-500",
    textColor: "text-violet-700",
  },
  {
    key: "shortlisted",
    label: "TC Shortlisted",
    statuses: [ApplicationStatus.SHORTLISTED],
    color: "bg-indigo-400",
    dotColor: "bg-indigo-500",
    textColor: "text-indigo-700",
  },
  {
    key: "lac_review",
    label: "LAC Review",
    statuses: [ApplicationStatus.LAC_REVIEW, ApplicationStatus.LAC_CLARIFICATION_REQUESTED],
    color: "bg-amber-400",
    dotColor: "bg-amber-500",
    textColor: "text-amber-700",
  },
  {
    key: "exco",
    label: "ExCo",
    statuses: [ApplicationStatus.LAC_APPROVED, ApplicationStatus.EXCO_REVIEW],
    color: "bg-orange-400",
    dotColor: "bg-orange-500",
    textColor: "text-orange-700",
  },
  {
    key: "allocated",
    label: "Allocated",
    statuses: [ApplicationStatus.ALLOCATED],
    color: "bg-green-500",
    dotColor: "bg-green-600",
    textColor: "text-green-700",
  },
  {
    key: "rejected",
    label: "Rejected / Withdrawn",
    statuses: [
      ApplicationStatus.NOT_SHORTLISTED,
      ApplicationStatus.LAC_REJECTED,
      ApplicationStatus.WITHDRAWN,
    ],
    color: "bg-red-400",
    dotColor: "bg-red-500",
    textColor: "text-red-600",
  },
] as const;

// ─── Payment status config ───────────────────────────────────────────────────

const PAYMENT_STAGES = [
  { key: "confirmed",  label: "Confirmed",       color: "bg-green-500" },
  { key: "proof",      label: "Proof Uploaded",  color: "bg-amber-400" },
  { key: "pending",    label: "Transfer Pending", color: "bg-slate-300" },
] as const;

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Review Bank Transfers", href: "/console/bank-transfers", icon: CreditCard,  urgent: false },
  { label: "Investors",             href: "/console/users",          icon: Users,        urgent: false },
  { label: "Manage Window",         href: "/console/windows",        icon: Clock,        urgent: false },
  { label: "Pipeline Report",       href: "/console/report",         icon: BarChart3,    urgent: false },
  { label: "All Applications",      href: "/console/applications",   icon: FileText,     urgent: false },
  { label: "Settings",              href: "/console/settings",       icon: Activity,     urgent: false },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminConsolePage() {
  await requireRole(ADMIN_ONLY);

  const dash = await getAdminDashboard();

  // Pre-compute pipeline counts
  const statusMap = new Map(dash.applicationsByStatus.map((s) => [s.status, s.count]));
  const pipeline = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: stage.statuses.reduce((sum, s) => sum + (statusMap.get(s) ?? 0), 0),
  }));
  const pipelineMax = Math.max(1, ...pipeline.map((s) => s.count));

  // Payment breakdown
  const paymentTotal = dash.paymentsConfirmed + dash.proofUploadedCount + dash.bankTransfersPending;
  const paymentBars = [
    { key: "confirmed", label: "Confirmed",        color: "bg-green-500", count: dash.paymentsConfirmed  },
    { key: "proof",     label: "Proof Uploaded",   color: "bg-amber-400", count: dash.proofUploadedCount },
    { key: "pending",   label: "Transfer Pending", color: "bg-slate-300", count: dash.bankTransfersPending },
  ];
  const paymentBarMax = Math.max(1, paymentTotal);

  // User account bars
  const userBars = [
    { label: "Active",   color: "bg-green-500", count: dash.activeUsers   },
    { label: "Pending",  color: "bg-amber-400", count: dash.pendingUsers  },
    { label: "Rejected", color: "bg-red-400",   count: dash.rejectedUsers },
  ];
  const userBarMax = Math.max(1, dash.totalInvestors);

  const transfersNeedingAction = dash.bankTransfersPending + dash.proofUploadedCount;

  return (
    <div className="flex min-h-screen flex-col bg-ink-100">
      <AdminTopbar />

      <main className="flex-1 space-y-5 p-6">

        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-ink-900">Admin Dashboard</h1>
            <p className="mt-0.5 text-xs text-ink-500">KIP Investor Portal — Phase 1 Round 1</p>
          </div>
          <Link
            href="/console/applications"
            className="flex items-center gap-1.5 rounded-lg border border-ink-300 bg-white px-4 py-2 text-xs font-semibold text-ink-700 shadow-sm transition hover:border-ink-400"
          >
            <RefreshCw size={13} />
            All Applications
          </Link>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">

          {/* Total Applications */}
          <div className="rounded-xl border border-ink-300 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-black">
              <FileText size={14} className="text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Total Applications</p>
            <p className="mt-2 text-2xl font-black text-ink-900">{dash.totalApplications}</p>
            <p className="mt-1 text-[10px] text-ink-400">all rounds</p>
          </div>

          {/* EOIs Submitted */}
          <div className="rounded-xl border border-ink-300 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <TrendingUp size={14} className="text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">EOIs Submitted</p>
            <p className="mt-2 text-2xl font-black text-ink-900">{dash.eoisSubmitted}</p>
            <p className="mt-1 text-[10px] text-ink-400">{dash.draftsInProgress} draft{dash.draftsInProgress !== 1 ? "s" : ""} in progress</p>
          </div>

          {/* Revenue Collected */}
          <div className="rounded-xl border border-brand-400 bg-brand-400 p-4 shadow-sm">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-black/10">
              <DollarSign size={14} className="text-black/70" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-black/60">Revenue Collected</p>
            <p className="mt-2 text-2xl font-black text-black">{dash.paymentsConfirmed}</p>
            <p className="mt-1 text-[10px] text-black/50">{dash.amountCollectedLabel}</p>
          </div>

          {/* Payments Confirmed */}
          <div className="rounded-xl border border-ink-300 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
              <CheckCircle2 size={14} className="text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Payments Confirmed</p>
            <p className="mt-2 text-2xl font-black text-ink-900">{dash.paymentsConfirmed}</p>
            <p className="mt-1 text-[10px] text-ink-400">of {dash.totalApplications} applications</p>
          </div>

          {/* Accounts Pending Approval */}
          <div className={`rounded-xl border p-4 shadow-sm ${dash.pendingUsers > 0 ? "border-amber-300 bg-amber-50" : "border-ink-300 bg-white"}`}>
            <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${dash.pendingUsers > 0 ? "bg-amber-500" : "bg-slate-400"}`}>
              <UserCheck size={14} className="text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Accounts Pending</p>
            <p className={`mt-2 text-2xl font-black ${dash.pendingUsers > 0 ? "text-amber-700" : "text-ink-900"}`}>{dash.pendingUsers}</p>
            <p className="mt-1 text-[10px] text-ink-400">investor registrations</p>
          </div>

          {/* Transfers Needing Review */}
          <div className={`rounded-xl border p-4 shadow-sm ${transfersNeedingAction > 0 ? "border-red-300 bg-red-50" : "border-ink-300 bg-white"}`}>
            <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${transfersNeedingAction > 0 ? "bg-red-500" : "bg-slate-400"}`}>
              <AlertTriangle size={14} className="text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Transfers to Review</p>
            <p className={`mt-2 text-2xl font-black ${transfersNeedingAction > 0 ? "text-red-700" : "text-ink-900"}`}>{transfersNeedingAction}</p>
            <p className="mt-1 text-[10px] text-ink-400">{dash.proofUploadedCount} proof uploaded</p>
          </div>
        </div>

        {/* ── Application Pipeline Funnel ── */}
        <div className="rounded-xl border border-ink-300 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <h2 className="text-sm font-bold text-ink-900">Application Pipeline</h2>
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                {dash.totalApplications} total
              </span>
            </div>
            <Link href="/console/applications" className="text-[11px] font-semibold text-ink-400 hover:text-ink-700">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4">
            {pipeline.map((stage) => (
              <div key={stage.key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${stage.dotColor}`} />
                    <span className="text-[11px] font-medium text-ink-600">{stage.label}</span>
                  </div>
                  <span className="text-[12px] font-black text-ink-800">{stage.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full transition-all ${stage.color}`}
                    style={{ width: stage.count === 0 ? "0%" : `${Math.max(4, (stage.count / pipelineMax) * 100)}%` }}
                  />
                </div>
                {dash.totalApplications > 0 && (
                  <p className="mt-1 text-[10px] text-ink-400">
                    {Math.round((stage.count / dash.totalApplications) * 100)}% of total
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Middle Row: Payment Breakdown + User Accounts + Activity ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Payment Status Breakdown */}
          <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <h2 className="text-sm font-bold text-ink-900">Payment Status</h2>
              </div>
              <Link href="/console/bank-transfers" className="text-[11px] font-semibold text-ink-400 hover:text-ink-700">
                Review →
              </Link>
            </div>

            {/* Stacked bar */}
            {paymentTotal > 0 ? (
              <>
                <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
                  {paymentBars.filter((b) => b.count > 0).map((b) => (
                    <div
                      key={b.key}
                      className={`h-full transition-all ${b.color}`}
                      style={{ width: `${(b.count / paymentBarMax) * 100}%` }}
                      title={`${b.label}: ${b.count}`}
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  {paymentBars.map((b) => (
                    <div key={b.key} className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${b.color}`} />
                      <span className="flex-1 text-[12px] text-ink-500">{b.label}</span>
                      <span className="text-[13px] font-bold text-ink-800">{b.count}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-ink-100 px-3 py-2 text-center">
                  <p className="text-[11px] text-ink-500">Total fee payments tracked</p>
                  <p className="text-base font-black text-ink-900">{paymentTotal}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-400">No payments yet.</p>
            )}
          </div>

          {/* Investor Account Summary */}
          <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <h2 className="text-sm font-bold text-ink-900">Investor Accounts</h2>
              </div>
              <Link href="/console/users" className="text-[11px] font-semibold text-ink-400 hover:text-ink-700">
                Manage →
              </Link>
            </div>

            <div className="space-y-3">
              {userBars.map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${b.color}`} />
                      <span className="text-[12px] text-ink-600">{b.label}</span>
                    </div>
                    <span className="text-[13px] font-bold text-ink-800">{b.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full transition-all ${b.color}`}
                      style={{ width: b.count === 0 ? "0%" : `${Math.max(4, (b.count / userBarMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-ink-100 px-3 py-2 text-center">
                <p className="text-[10px] text-ink-500">Total Registered</p>
                <p className="text-base font-black text-ink-900">{dash.totalInvestors}</p>
              </div>
              <div className="rounded-lg bg-ink-100 px-3 py-2 text-center">
                <p className="text-[10px] text-ink-500">Activation Rate</p>
                <p className="text-base font-black text-ink-900">
                  {dash.totalInvestors > 0 ? Math.round((dash.activeUsers / dash.totalInvestors) * 100) : 0}%
                </p>
              </div>
            </div>

            {dash.pendingUsers > 0 && (
              <Link
                href="/console/users"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                <AlertTriangle size={13} />
                {dash.pendingUsers} account{dash.pendingUsers !== 1 ? "s" : ""} awaiting approval
                <ArrowRight size={12} />
              </Link>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ink-400" />
              <h2 className="text-sm font-bold text-ink-900">Recent Activity</h2>
            </div>
            {dash.activity.length === 0 ? (
              <p className="text-sm text-ink-400">No review activity yet.</p>
            ) : (
              <ol className="relative border-l border-ink-200 pl-4">
                {dash.activity.map((item, i) => (
                  <li key={i} className="mb-4 last:mb-0">
                    <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-ink-300" />
                    <p className="text-[10px] text-ink-400">{item.time}</p>
                    <p className="text-[12px] font-medium leading-snug text-ink-700">{item.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ── Submission Conversion + Quick Actions ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Conversion Snapshot */}
          <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <h2 className="text-sm font-bold text-ink-900">Conversion Snapshot</h2>
            </div>
            {[
              {
                label: "Registered",
                count: dash.totalInvestors,
                max: Math.max(1, dash.totalInvestors),
                color: "bg-slate-400",
                pct: 100,
              },
              {
                label: "Payment Confirmed",
                count: dash.paymentsConfirmed,
                max: Math.max(1, dash.totalInvestors),
                color: "bg-blue-500",
                pct: dash.totalInvestors > 0 ? Math.round((dash.paymentsConfirmed / dash.totalInvestors) * 100) : 0,
              },
              {
                label: "EOI Submitted",
                count: dash.eoisSubmitted,
                max: Math.max(1, dash.totalInvestors),
                color: "bg-violet-500",
                pct: dash.totalInvestors > 0 ? Math.round((dash.eoisSubmitted / dash.totalInvestors) * 100) : 0,
              },
              {
                label: "Shortlisted",
                count: statusMap.get(ApplicationStatus.SHORTLISTED) ?? 0,
                max: Math.max(1, dash.totalInvestors),
                color: "bg-indigo-500",
                pct: dash.totalInvestors > 0
                  ? Math.round(((statusMap.get(ApplicationStatus.SHORTLISTED) ?? 0) / dash.totalInvestors) * 100)
                  : 0,
              },
              {
                label: "Allocated",
                count: statusMap.get(ApplicationStatus.ALLOCATED) ?? 0,
                max: Math.max(1, dash.totalInvestors),
                color: "bg-green-500",
                pct: dash.totalInvestors > 0
                  ? Math.round(((statusMap.get(ApplicationStatus.ALLOCATED) ?? 0) / dash.totalInvestors) * 100)
                  : 0,
              },
            ].map((row) => (
              <div key={row.label} className="mb-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] text-ink-600">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-400">{row.pct}%</span>
                    <span className="w-6 text-right text-[13px] font-bold text-ink-800">{row.count}</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full transition-all ${row.color}`}
                    style={{ width: row.count === 0 ? "0%" : `${Math.max(4, row.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              <h2 className="text-sm font-bold text-ink-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isUrgent = (action.href === "/console/bank-transfers" && transfersNeedingAction > 0)
                  || (action.href === "/console/users" && dash.pendingUsers > 0);
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`flex items-center gap-3 rounded-lg border p-3.5 text-[12px] font-semibold transition ${
                      isUrgent
                        ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-ink-200 bg-ink-50 text-ink-700 hover:border-ink-300 hover:bg-ink-100"
                    }`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isUrgent ? "bg-amber-500" : "bg-ink-200"}`}>
                      <Icon size={13} className={isUrgent ? "text-white" : "text-ink-600"} />
                    </div>
                    <span className="leading-snug">{action.label}</span>
                    {isUrgent && <AlertTriangle size={12} className="ml-auto text-amber-600" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
