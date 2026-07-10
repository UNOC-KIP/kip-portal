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
  KIP_ZONES,
  SITE_VISIT_STATUS_LABELS,
  type CompanyType,
  type BusinessSector,
  type InquiryChannel,
  type SiteVisitStatus,
} from "@kip/shared";
import { formatDateTime, formatShortDate } from "../format";

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
