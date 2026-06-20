/**
 * Pure mappers: DB-shaped input → table row view-models for the admin console.
 *
 * Intentionally free of any `@kip/db` / Sequelize import so this module can be
 * unit-tested in isolation (importing `@kip/db` instantiates a Sequelize client
 * against DATABASE_URL at module load, which would break tests). The query layer
 * (`./queries.ts`) pulls Sequelize rows, reduces them to the plain inputs below,
 * and calls these functions. Row shapes mirror the `*-table.tsx` client props.
 */

import { ApplicationStatus, ApplicationWindowStatus, PaymentStatus } from "@kip/shared";
import { formatShortDate } from "../format";

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

/** A user is "Active" once they can authenticate (verified email or a password set). */
export function userStatusLabel(
  emailVerified: Date | string | null | undefined,
  hasPassword: boolean,
): "Active" | "Pending" {
  return emailVerified || hasPassword ? "Active" : "Pending";
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
  company: string;
  email: string;
  role: string;
  ref: string;
  status: string;
  lastLogin: string;
};

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
  name: string;
  statusVariant: "window-active" | "window-scheduled" | "window-closed" | null;
  statusLabel: string | null;
  detail: string;
};

const NO_REF = "(draft)";
const DASH = "—";

export function toApplicationRow(a: {
  reference: string | null;
  status: string;
  createdAt: Date | string;
  orgName: string;
  country: string | null;
  payments: { status: string }[];
}): ApplicationRow {
  return {
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
}): TransferRow {
  const sla = computeTransferSla(t.uploadedAt, t.now);
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
  name: string | null;
  email: string;
  role: string;
  orgName: string | null;
  reference: string | null;
  emailVerified: Date | string | null;
  hasPassword: boolean;
}): UserRow {
  return {
    company: u.name ?? u.orgName ?? u.email,
    email: u.email,
    role: roleLabel(u.role),
    ref: u.reference ?? DASH,
    status: userStatusLabel(u.emailVerified, u.hasPassword),
    // Last login is not tracked: NextAuth uses JWT sessions, so no Session rows
    // are written on credential sign-in. Revisit if a lastLoginAt column lands.
    lastLogin: DASH,
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

export function toWindowRow(w: {
  name: string;
  status: string;
  openAt: Date | string;
  closeAt: Date | string;
  sequenceCounter: number;
}): WindowRow {
  const span = `Open: ${formatShortDate(w.openAt)} · Closes: ${formatShortDate(w.closeAt)}`;
  const received = `${w.sequenceCounter} reference${w.sequenceCounter === 1 ? "" : "s"} assigned`;
  switch (w.status) {
    case ApplicationWindowStatus.OPEN:
      return { name: w.name, statusVariant: "window-active",    statusLabel: "Active",    detail: `${span} · ${received}` };
    case ApplicationWindowStatus.DRAFT:
      return { name: w.name, statusVariant: "window-scheduled", statusLabel: "Scheduled", detail: `${span} · Not yet open` };
    case ApplicationWindowStatus.CLOSED:
      return { name: w.name, statusVariant: "window-closed",    statusLabel: "Closed",    detail: `${span} · ${received}` };
    case ApplicationWindowStatus.ARCHIVED:
      return { name: w.name, statusVariant: "window-closed",    statusLabel: "Archived",  detail: `${span} · ${received}` };
    default:
      return { name: w.name, statusVariant: null, statusLabel: null, detail: span };
  }
}
