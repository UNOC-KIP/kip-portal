/**
 * Pure mappers: DB-shaped input → table row view-models for the admin console.
 *
 * Intentionally free of any `@kip/db` / Sequelize import so this module can be
 * unit-tested in isolation (importing `@kip/db` instantiates a Sequelize client
 * against DATABASE_URL at module load, which would break tests). The query layer
 * (`./queries.ts`) pulls Sequelize rows, reduces them to the plain inputs below,
 * and calls these functions. Row shapes mirror the `*-table.tsx` client props.
 */

import {
  ApplicationStatus,
  ApplicationWindowStatus,
  PaymentStatus,
  COMPANY_TYPE_LABELS,
  BUSINESS_SECTOR_LABELS,
  INQUIRY_CHANNEL_LABELS,
  InquiryStatus,
  ReviewActionType,
  TIMELINE_KIND_LABELS,
  TIMELINE_STATUS_LABELS,
  TimelineMilestoneKind,
  TimelineMilestoneStatus,
  KIP_ZONES,
  SITE_VISIT_STATUS_LABELS,
  type CompanyType,
  type BusinessSector,
  type InquiryChannel,
  type SiteVisitStatus,
} from "@kip/shared";
import { formatDateTime, formatMoney, formatShortDate } from "../format";

// ─── Status helpers ──────────────────────────────────────────────────────────

/** Statuses at or beyond SUBMITTED — i.e. the EOI has been submitted. */
export const SUBMITTED_STATUSES = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_TC_REVIEW,
  ApplicationStatus.TC_CLARIFICATION_REQUESTED,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.NOT_SHORTLISTED,
  ApplicationStatus.LAC_REVIEW,
  ApplicationStatus.LAC_APPROVED,
  ApplicationStatus.LAC_REJECTED,
  ApplicationStatus.EXCO_REVIEW,
  ApplicationStatus.ALLOCATED,
] as const;

const SUBMITTED_SET = new Set<string>(SUBMITTED_STATUSES);

export function isSubmitted(status: string): boolean {
  return SUBMITTED_SET.has(status);
}

export function eoiLabel(status: string): "Submitted" | "Draft" {
  return isSubmitted(status) ? "Submitted" : "Draft";
}

/** Payment column label from an application's payments. */
export function paymentLabel(payments: { status: string }[]): "Confirmed" | "Pending" | "Not Paid" {
  if (payments.some((p) => p.status === PaymentStatus.CONFIRMED)) return "Confirmed";
  if (payments.length > 0) return "Pending";
  return "Not Paid";
}

/** TC-queue status from application status (shortlisted-or-beyond = TC approved). */
export function tcStatusLabel(appStatus: string): "Approved" | "Rejected" | "In progress" {
  switch (appStatus) {
    case ApplicationStatus.SHORTLISTED:
    case ApplicationStatus.LAC_REVIEW:
    case ApplicationStatus.LAC_APPROVED:
    case ApplicationStatus.EXCO_REVIEW:
    case ApplicationStatus.ALLOCATED:
      return "Approved";
    case ApplicationStatus.NOT_SHORTLISTED:
      return "Rejected";
    default:
      return "In progress";
  }
}

/**
 * Display labels produced by `tcStatusLabel` — import these constants instead
 * of raw strings so a rename in `tcStatusLabel` breaks at the import site rather
 * than silently breaking filter counts.
 */
export const TC_STATUS_LABELS = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_PROGRESS: "In progress",
} as const;

export function roleLabel(role: string): string {
  switch (role) {
    case "INVESTOR":
      return "Investor";
    case "TC_MEMBER":
    case "TC_CHAIR":
      return "TC Member";
    case "LAC_MEMBER":
      return "LAC Member";
    case "EXCO_MEMBER":
      return "Exco";
    case "ADMIN":
      return "Admin";
    default:
      return role;
  }
}

/** Maps the User.status DB value to a display label. */
export function userStatusLabel(
  rawStatus: string,
): "Active" | "Pending" | "Rejected" {
  switch (rawStatus) {
    case "ACTIVE":         return "Active";
    case "REJECTED":       return "Rejected";
    case "PENDING_REVIEW":
    default:               return "Pending";
  }
}

/** CompanyType enum value → display label. Em dash for missing; unknown values pass through. */
export function companyTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return COMPANY_TYPE_LABELS[value as CompanyType] ?? value;
}

/** BusinessSector enum value → display label. Em dash for missing; unknown values pass through. */
export function businessSectorLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return BUSINESS_SECTOR_LABELS[value as BusinessSector] ?? value;
}

/** Square metres → hectares, one decimal. Em dash for missing/invalid. */
export function hectaresFromSqm(sqm: number | null | undefined): string {
  if (sqm == null || !Number.isFinite(sqm) || sqm <= 0) return "—";
  return (sqm / 10_000).toFixed(1);
}

// ─── SLA ─────────────────────────────────────────────────────────────────────

export type SlaUrgency = "ok" | "warn" | "due" | "overdue";

/**
 * Bank-transfer confirmation SLA. Default window is 48h from upload.
 * `now` is injectable so this is deterministic under test.
 */
export function computeTransferSla(
  uploadedAt: Date | string,
  now: Date = new Date(),
  slaHours = 48,
): { label: string; urgency: SlaUrgency } {
  const start = new Date(uploadedAt).getTime();
  const hoursLeft = (start + slaHours * 3_600_000 - now.getTime()) / 3_600_000;
  if (hoursLeft <= 0) return { label: "Overdue", urgency: "overdue" };
  if (hoursLeft < 12) return { label: "Due today", urgency: "due" };
  if (hoursLeft < 24) return { label: "1 day left", urgency: "warn" };
  const days = Math.floor(hoursLeft / 24);
  return { label: `${days} day${days === 1 ? "" : "s"} left`, urgency: "ok" };
}

// ─── Row view-models (mirror *-table.tsx props) ──────────────────────────────

export type ApplicationRow = {
  id: string;
  ref: string;
  company: string;
  country: string;
  payment: string;
  eoi: string;
  date: string;
};

export type TransferRow = {
  paymentId: string;
  paymentStatus: string;
  ref: string;
  company: string;
  txRef: string;
  date: string;
  sla: string;
  slaUrgency: SlaUrgency;
};

export type UserRow = {
  id: string;
  company: string;
  email: string;
  role: string;
  ref: string;
  status: string;
  tin: string;
  country: string;
  phone: string;
  registeredAt: string;
};

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export function toStaffRow(u: {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date | string;
}): StaffRow {
  return {
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
    role: roleLabel(u.role),
    createdAt: formatShortDate(u.createdAt),
  };
}

export type TcAppRow = {
  ref: string;
  company: string;
  land: string;
  score: string;
  status: string;
  date: string;
  days: number;
};

export type WindowRow = {
  id: string;
  name: string;
  status: string;
  openAt: string;
  closeAt: string;
  statusVariant: "window-active" | "window-scheduled" | "window-closed" | null;
  statusLabel: string | null;
  detail: string;
  sequenceCounter: number;
};

const NO_REF = "(draft)";
const DASH = "—";

export function toApplicationRow(a: {
  id: string;
  reference: string | null;
  status: string;
  createdAt: Date | string;
  orgName: string;
  country: string | null;
  payments: { status: string }[];
}): ApplicationRow {
  return {
    id: a.id,
    ref: a.reference ?? NO_REF,
    company: a.orgName,
    country: a.country ?? DASH,
    payment: paymentLabel(a.payments),
    eoi: eoiLabel(a.status),
    date: formatShortDate(a.createdAt),
  };
}

export function toTransferRow(t: {
  id: string;
  status: string;
  reference: string | null;
  orgName: string;
  transferRef: string | null;
  uploadedAt: Date | string;
  now?: Date;
  slaHours?: number;
}): TransferRow {
  const sla = computeTransferSla(t.uploadedAt, t.now, t.slaHours);
  return {
    paymentId: t.id,
    paymentStatus: t.status,
    ref: t.reference ?? NO_REF,
    company: t.orgName,
    txRef: t.transferRef ?? DASH,
    date: formatShortDate(t.uploadedAt),
    sla: sla.label,
    slaUrgency: sla.urgency,
  };
}

export function toUserRow(u: {
  id: string;
  name: string | null;
  email: string;
  role: string;
  orgName: string | null;
  reference: string | null;
  rawStatus: string;
  tin: string | null;
  country: string | null;
  phone: string | null;
  createdAt: Date | string;
}): UserRow {
  return {
    id: u.id,
    company: u.orgName ?? u.name ?? u.email,
    email: u.email,
    role: roleLabel(u.role),
    ref: u.reference ?? DASH,
    status: userStatusLabel(u.rawStatus),
    tin: u.tin ?? DASH,
    country: u.country ?? DASH,
    phone: u.phone ?? DASH,
    registeredAt: formatShortDate(u.createdAt),
  };
}

export function toTcAppRow(a: {
  reference: string | null;
  orgName: string;
  landSizeSqm: number | null;
  status: string;
  submittedAt: Date | string | null;
  now?: Date;
}): TcAppRow {
  const now = a.now ?? new Date();
  const start = a.submittedAt ? new Date(a.submittedAt) : null;
  const days = start
    ? Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000))
    : 0;
  return {
    ref: a.reference ?? NO_REF,
    company: a.orgName,
    land: hectaresFromSqm(a.landSizeSqm),
    // AI screening scores are computed in n8n and kept internal — never stored
    // on the application, never shown here. Placeholder until/if surfaced.
    score: DASH,
    status: tcStatusLabel(a.status),
    date: formatShortDate(a.submittedAt),
    days,
  };
}

// ─── Inquiries & notify signups ──────────────────────────────────────────────

export function inquiryStatusLabel(rawStatus: string): "New" | "Responded" | "Closed" {
  switch (rawStatus) {
    case InquiryStatus.RESPONDED: return "Responded";
    case InquiryStatus.CLOSED:    return "Closed";
    case InquiryStatus.NEW:
    default:                      return "New";
  }
}

export function inquiryChannelLabel(channel: string): string {
  return INQUIRY_CHANNEL_LABELS[channel as InquiryChannel] ?? channel;
}

export type InquiryRow = {
  id: string;
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
  channel: string;
  status: string;
  rawStatus: string;
  respondedBy: string;
  respondedAt: string;
  receivedAt: string;
};

export function toInquiryRow(i: {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string | null;
  message: string;
  channel: string;
  rawStatus: string;
  respondedByName: string | null;
  respondedAt: Date | string | null;
  createdAt: Date | string;
}): InquiryRow {
  return {
    id: i.id,
    name: i.name,
    email: i.email,
    company: i.company ?? DASH,
    subject: i.subject ?? DASH,
    message: i.message,
    channel: inquiryChannelLabel(i.channel),
    status: inquiryStatusLabel(i.rawStatus),
    rawStatus: i.rawStatus,
    respondedBy: i.respondedByName ?? DASH,
    respondedAt: i.respondedAt ? formatDateTime(i.respondedAt) : DASH,
    receivedAt: formatDateTime(i.createdAt),
  };
}

export type SiteVisitRow = {
  id: string;
  /** Present on the admin tracker (modal detail); absent in report contexts. */
  investor?: SiteVisitInvestor;
  companyName: string;
  contactName: string;
  contactEmail: string;
  zone: string;
  zoneColor: string;
  landUse: string;
  description: string;
  acresLabel: string;
  status: string;
  rawStatus: string;
  handledBy: string;
  scheduledAt: string;
  requestedAt: string;
};

export function toSiteVisitRow(b: {
  id: string;
  investor?: SiteVisitInvestor;
  companyName: string | null;
  contactName: string | null;
  contactEmail: string;
  zone: string;
  landUse: string;
  description: string;
  acres: number;
  rawStatus: string;
  handledByName: string | null;
  scheduledAt: Date | string | null;
  createdAt: Date | string;
}): SiteVisitRow {
  const zoneMeta = KIP_ZONES.find((z) => z.key === b.zone);
  return {
    id: b.id,
    investor: b.investor,
    companyName: b.companyName ?? DASH,
    contactName: b.contactName ?? DASH,
    contactEmail: b.contactEmail,
    zone: zoneMeta?.label ?? b.zone,
    zoneColor: zoneMeta?.color ?? "bg-ink-300",
    landUse: b.landUse,
    description: b.description,
    acresLabel: `${b.acres} acre${b.acres === 1 ? "" : "s"}`,
    status: SITE_VISIT_STATUS_LABELS[b.rawStatus as SiteVisitStatus] ?? b.rawStatus,
    rawStatus: b.rawStatus,
    handledBy: b.handledByName ?? DASH,
    scheduledAt: b.scheduledAt ? formatShortDate(b.scheduledAt) : DASH,
    requestedAt: formatDateTime(b.createdAt),
  };
}

export type NotifySignupRow = {
  id: string;
  email: string;
  signedUpAt: string;
};

export function toNotifySignupRow(s: {
  id: string;
  email: string;
  createdAt: Date | string;
}): NotifySignupRow {
  return {
    id: s.id,
    email: s.email,
    signedUpAt: formatDateTime(s.createdAt),
  };
}

// ─── Investor onboarding report ──────────────────────────────────────────────

/**
 * Human-readable stage label for an investor's EOI, granular enough to track
 * where each investor sits in the onboarding pipeline. `null` = the investor
 * has registered but not started an application yet.
 */
export function applicationStageLabel(status: string | null | undefined): string {
  if (!status) return "Not started";
  switch (status) {
    case ApplicationStatus.DRAFT_PAYMENT_PENDING:     return "Payment pending";
    case ApplicationStatus.DRAFT:                     return "Draft";
    case ApplicationStatus.SUBMITTED:                 return "Submitted";
    case ApplicationStatus.UNDER_TC_REVIEW:           return "Under TC review";
    case ApplicationStatus.TC_CLARIFICATION_REQUESTED:return "TC clarification";
    case ApplicationStatus.SHORTLISTED:               return "Shortlisted";
    case ApplicationStatus.NOT_SHORTLISTED:           return "Not shortlisted";
    case ApplicationStatus.LAC_REVIEW:                return "LAC review";
    case ApplicationStatus.LAC_APPROVED:              return "LAC approved";
    case ApplicationStatus.LAC_REJECTED:              return "LAC rejected";
    case ApplicationStatus.EXCO_REVIEW:               return "ExCo review";
    case ApplicationStatus.ALLOCATED:                 return "Allocated";
    case ApplicationStatus.WITHDRAWN:                 return "Withdrawn";
    default:                                          return status;
  }
}

/** Statuses at or beyond SHORTLISTED — i.e. the investor cleared TC screening. */
const SHORTLISTED_PLUS = new Set<string>([
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.LAC_REVIEW,
  ApplicationStatus.LAC_APPROVED,
  ApplicationStatus.LAC_REJECTED,
  ApplicationStatus.EXCO_REVIEW,
  ApplicationStatus.ALLOCATED,
]);

export function isShortlistedOrBeyond(status: string | null | undefined): boolean {
  return status != null && SHORTLISTED_PLUS.has(status);
}

/** One row in the detailed investor-onboarding table + CSV export. */
export type InvestorReportRow = {
  id: string;
  company: string;
  rep: string;
  email: string;
  country: string;
  sector: string;
  companyType: string;
  accountStatus: string; // Active / Pending / Rejected
  paymentStatus: string; // Confirmed / Pending / Not Paid
  eoiStage: string;      // applicationStageLabel(...)
  reference: string;     // KIP-EOI-… or —
  registeredAt: string;
};

export function toInvestorReportRow(u: {
  id: string;
  name: string | null;
  email: string;
  rawStatus: string;
  orgName: string | null;
  country: string | null;
  businessSector: string | null;
  companyType: string | null;
  reference: string | null;
  appStatus: string | null;
  payments: { status: string }[];
  createdAt: Date | string;
}): InvestorReportRow {
  return {
    id: u.id,
    company: u.orgName ?? u.name ?? u.email,
    rep: u.name ?? DASH,
    email: u.email,
    country: u.country ?? DASH,
    sector: businessSectorLabel(u.businessSector),
    companyType: companyTypeLabel(u.companyType),
    accountStatus: userStatusLabel(u.rawStatus),
    paymentStatus: paymentLabel(u.payments),
    eoiStage: applicationStageLabel(u.appStatus),
    reference: u.reference ?? DASH,
    registeredAt: formatShortDate(u.createdAt),
  };
}

/** A labelled count — used for the country / sector / company-type breakdowns. */
export type BreakdownRow = { label: string; count: number };

/** A funnel step — count plus its share of the top-of-funnel total. */
export type FunnelRow = { label: string; count: number; pct: number };

export type ReportStats = {
  totalRegistered: number;
  activeAccounts: number;
  pendingAccounts: number;
  newLast7Days: number;
  newLast30Days: number;
  paymentsConfirmed: number;
  eoisSubmitted: number;
  shortlisted: number;
  allocated: number;
  siteVisitsRequested: number;
  feesCollected: string;
  feesCollectedRaw: number;
  daysToClose: number | null;
};

/** Full payload for the investor-onboarding report page + its exports. */
export type ReportData = {
  generatedAt: string;
  windowName: string;
  stats: ReportStats;
  byCountry: BreakdownRow[];
  bySector: BreakdownRow[];
  byCompanyType: BreakdownRow[];
  conversionFunnel: FunnelRow[];
  investors: InvestorReportRow[];
};

export function toWindowRow(w: {
  id: string;
  name: string;
  status: string;
  openAt: Date | string;
  closeAt: Date | string;
  sequenceCounter: number;
}): WindowRow {
  const span = `Open: ${formatShortDate(w.openAt)} · Closes: ${formatShortDate(w.closeAt)}`;
  const received = `${w.sequenceCounter} reference${w.sequenceCounter === 1 ? "" : "s"} assigned`;
  const base = {
    id: w.id,
    name: w.name,
    status: w.status,
    openAt: formatShortDate(w.openAt),
    closeAt: formatShortDate(w.closeAt),
    sequenceCounter: w.sequenceCounter,
  };
  switch (w.status) {
    case ApplicationWindowStatus.OPEN:
      return { ...base, statusVariant: "window-active",    statusLabel: "Active",    detail: `${span} · ${received}` };
    case ApplicationWindowStatus.DRAFT:
      return { ...base, statusVariant: "window-scheduled", statusLabel: "Scheduled", detail: `${span} · Not yet open` };
    case ApplicationWindowStatus.CLOSED:
      return { ...base, statusVariant: "window-closed",    statusLabel: "Closed",    detail: `${span} · ${received}` };
    case ApplicationWindowStatus.ARCHIVED:
      return { ...base, statusVariant: "window-closed",    statusLabel: "Archived",  detail: `${span} · ${received}` };
    default:
      return { ...base, statusVariant: null, statusLabel: null, detail: span };
  }
}

// ─── Reports hub: pure aggregation helpers ───────────────────────────────────

const DAY_MS = 86_400_000;

/** Terminal pipeline states — an application here is no longer "aging". */
export const TERMINAL_STATUSES = new Set<string>([
  ApplicationStatus.NOT_SHORTLISTED,
  ApplicationStatus.LAC_REJECTED,
  ApplicationStatus.ALLOCATED,
  ApplicationStatus.WITHDRAWN,
]);

/** Sorted label/count breakdown from view rows, keyed by a string field. */
export function countRowsBy<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
  limit = 8,
): BreakdownRow[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const label = String(r[key] ?? "Unknown");
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

/**
 * Bucket timestamps into trailing calendar weeks ending at `now`.
 * Index 0 = oldest week, last index = the week containing `now`.
 */
export function bucketWeekly(
  dates: (Date | string | null | undefined)[],
  now: Date,
  weeks = 12,
): number[] {
  const WEEK = 7 * DAY_MS;
  const end = now.getTime();
  const start = end - weeks * WEEK;
  const buckets: number[] = new Array(weeks).fill(0);
  for (const d of dates) {
    if (d == null) continue;
    const t = new Date(d).getTime();
    if (Number.isNaN(t) || t <= start || t > end) continue;
    const idx = Math.min(weeks - 1, Math.floor((t - start) / WEEK));
    buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  return buckets;
}

// ─── Applications & review-pipeline report ───────────────────────────────────

export type StageDuration = { label: string; days: number | null; samples: number };

const TC_DECISIONS = new Set<string>([
  ReviewActionType.SHORTLISTED,
  ReviewActionType.NOT_SHORTLISTED,
]);
const LAC_DECISIONS = new Set<string>([
  ReviewActionType.LAC_APPROVED,
  ReviewActionType.LAC_REJECTED,
]);

/**
 * Average days spent in each review stage, mined from the append-only
 * `ReviewAction` log: submission → first TC decision, TC shortlisting → LAC
 * decision, LAC approval → ExCo allocation. `days: null` = no samples yet.
 */
export function computeStageDurations(
  apps: { id: string; submittedAt: Date | string | null }[],
  actions: { applicationId: string; type: string; createdAt: Date | string }[],
): StageDuration[] {
  // Earliest timestamp per application for each milestone.
  const first = (types: Set<string> | string) => {
    const m = new Map<string, number>();
    for (const a of actions) {
      const hit = typeof types === "string" ? a.type === types : types.has(a.type);
      if (!hit) continue;
      const t = new Date(a.createdAt).getTime();
      const prev = m.get(a.applicationId);
      if (prev === undefined || t < prev) m.set(a.applicationId, t);
    }
    return m;
  };
  const tcAt = first(TC_DECISIONS);
  const shortlistedAt = first(ReviewActionType.SHORTLISTED);
  const lacAt = first(LAC_DECISIONS);
  const lacApprovedAt = first(ReviewActionType.LAC_APPROVED);
  const allocatedAt = first(ReviewActionType.ALLOCATED);

  const spans = { tc: [] as number[], lac: [] as number[], exco: [] as number[] };
  for (const app of apps) {
    const submitted = app.submittedAt ? new Date(app.submittedAt).getTime() : null;
    const tc = tcAt.get(app.id);
    if (submitted != null && tc !== undefined && tc >= submitted) spans.tc.push(tc - submitted);
    const sl = shortlistedAt.get(app.id);
    const lac = lacAt.get(app.id);
    if (sl !== undefined && lac !== undefined && lac >= sl) spans.lac.push(lac - sl);
    const lacOk = lacApprovedAt.get(app.id);
    const alloc = allocatedAt.get(app.id);
    if (lacOk !== undefined && alloc !== undefined && alloc >= lacOk) spans.exco.push(alloc - lacOk);
  }
  const avg = (xs: number[]): number | null =>
    xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length / DAY_MS) * 10) / 10;

  return [
    { label: "Submission → TC decision", days: avg(spans.tc), samples: spans.tc.length },
    { label: "Shortlisted → LAC decision", days: avg(spans.lac), samples: spans.lac.length },
    { label: "LAC approval → allocation", days: avg(spans.exco), samples: spans.exco.length },
  ];
}

/** One row in the applications report table + CSV. */
export type AppsReportRow = {
  id: string;
  reference: string;
  company: string;
  country: string;
  stage: string;
  rawStatus: string;
  submitted: string;
  /** Days since submission (or creation) for non-terminal apps; null when decided. */
  ageDays: number | null;
  ageLabel: string;
};

export function toAppsReportRow(
  a: {
    id: string;
    reference: string | null;
    status: string;
    orgName: string | null;
    country: string | null;
    submittedAt: Date | string | null;
    createdAt: Date | string;
  },
  now: Date,
): AppsReportRow {
  const terminal = TERMINAL_STATUSES.has(a.status);
  const since = a.submittedAt ?? a.createdAt;
  const ageDays = terminal
    ? null
    : Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / DAY_MS));
  return {
    id: a.id,
    reference: a.reference ?? DASH,
    company: a.orgName ?? DASH,
    country: a.country ?? DASH,
    stage: applicationStageLabel(a.status),
    rawStatus: a.status,
    submitted: a.submittedAt ? formatShortDate(a.submittedAt) : DASH,
    ageDays,
    ageLabel: ageDays == null ? DASH : `${ageDays}d`,
  };
}

// ─── Payments report ─────────────────────────────────────────────────────────

export function paymentMethodLabel(method: string): string {
  if (method === "STANBIC_TRANSFER") return "Stanbic Transfer";
  if (method === "CARD") return "Card";
  return method;
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case PaymentStatus.PENDING:        return "Pending";
    case PaymentStatus.PROOF_UPLOADED: return "Proof Uploaded";
    case PaymentStatus.CONFIRMED:      return "Confirmed";
    case PaymentStatus.FAILED:         return "Failed";
    case PaymentStatus.REFUNDED:       return "Refunded";
    default:                           return status;
  }
}

/** One row in the payments report table + CSV. */
export type PaymentReportRow = {
  id: string;
  company: string;
  reference: string;
  amount: string;
  method: string;
  status: string;
  rawStatus: string;
  initiated: string;
  confirmed: string;
  /** Days from initiation to confirmation; null while unconfirmed. */
  lagDays: number | null;
};

export function toPaymentReportRow(p: {
  id: string;
  amount: string | number;
  currency: string;
  method: string;
  status: string;
  createdAt: Date | string;
  confirmedAt: Date | string | null;
  orgName: string | null;
  reference: string | null;
}): PaymentReportRow {
  const lagDays = p.confirmedAt
    ? Math.max(
        0,
        Math.round(
          ((new Date(p.confirmedAt).getTime() - new Date(p.createdAt).getTime()) / DAY_MS) * 10,
        ) / 10,
      )
    : null;
  return {
    id: p.id,
    company: p.orgName ?? DASH,
    reference: p.reference ?? DASH,
    amount: formatMoney(Number(p.amount), p.currency),
    method: paymentMethodLabel(p.method),
    status: paymentStatusLabel(p.status),
    rawStatus: p.status,
    initiated: formatShortDate(p.createdAt),
    confirmed: p.confirmedAt ? formatShortDate(p.confirmedAt) : DASH,
    lagDays,
  };
}

// ─── Site-visit investor detail (admin tracker modal) ────────────────────────

/** Investor profile block shown in the site-visit detail modal. */
export type SiteVisitInvestor = {
  userId: string;
  repName: string;
  designation: string;
  email: string;
  phone: string;
  accountStatus: string;
  rawAccountStatus: string;
  memberSince: string;
  orgName: string;
  country: string;
  sector: string;
  companyType: string;
  registrationNumber: string;
  applicationRef: string;
  applicationStage: string;
};

export function toSiteVisitInvestor(u: {
  userId: string;
  name: string | null;
  designation: string | null;
  email: string;
  phone: string | null;
  rawStatus: string;
  createdAt: Date | string;
  orgName: string | null;
  country: string | null;
  businessSector: string | null;
  companyType: string | null;
  registrationNumber: string | null;
  /** The org's applications; the referenced one (else newest) is surfaced. */
  applications: { reference: string | null; status: string }[];
}): SiteVisitInvestor {
  const primary = u.applications.find((a) => a.reference) ?? u.applications[0] ?? null;
  return {
    userId: u.userId,
    repName: u.name ?? DASH,
    designation: u.designation ?? DASH,
    email: u.email,
    phone: u.phone ?? DASH,
    accountStatus: userStatusLabel(u.rawStatus),
    rawAccountStatus: u.rawStatus,
    memberSince: formatShortDate(u.createdAt),
    orgName: u.orgName ?? DASH,
    country: u.country ?? DASH,
    sector: businessSectorLabel(u.businessSector),
    companyType: companyTypeLabel(u.companyType),
    registrationNumber: u.registrationNumber ?? DASH,
    applicationRef: primary?.reference ?? DASH,
    applicationStage: applicationStageLabel(primary?.status ?? null),
  };
}

// ─── Application timeline (admin settings) ───────────────────────────────────

/** One editable timeline milestone row for the settings page. */
export type TimelineMilestoneRow = {
  id: string;
  position: number;
  kind: string;
  kindLabel: string;
  title: string;
  dateLabel: string;
  /** ISO strings for the edit form (datetime-local friendly). */
  startsAtIso: string;
  endsAtIso: string | null;
  startsAtLabel: string;
  isActive: boolean;
  /** Stored status: AUTO or a manual override. */
  status: string;
  statusLabel: string;
  /** What the public timeline actually shows for this row. */
  effectiveStatus: string;
};

export function toTimelineMilestoneRow(
  m: {
    id: string;
    position: number;
    kind: string;
    title: string;
    dateLabel: string;
    startsAt: Date | string;
    endsAt: Date | string | null;
    status: string;
  },
  activeId: string | null,
  effectiveStatus: string,
): TimelineMilestoneRow {
  return {
    id: m.id,
    position: m.position,
    kind: m.kind,
    kindLabel: TIMELINE_KIND_LABELS[m.kind as TimelineMilestoneKind] ?? m.kind,
    title: m.title,
    dateLabel: m.dateLabel,
    startsAtIso: new Date(m.startsAt).toISOString(),
    endsAtIso: m.endsAt ? new Date(m.endsAt).toISOString() : null,
    startsAtLabel: formatShortDate(m.startsAt),
    isActive: m.id === activeId,
    status: m.status,
    statusLabel: TIMELINE_STATUS_LABELS[m.status as TimelineMilestoneStatus] ?? m.status,
    effectiveStatus,
  };
}
