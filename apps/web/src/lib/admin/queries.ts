/**
 * Admin console read layer — server-only.
 *
 * Per the hybrid data architecture (see CLAUDE.md → "Web data access"), read
 * paths query the database directly from Next.js server components via
 * `@kip/db`. This module is the single place admin pages get their data; pages
 * stay presentational. All row shaping is delegated to the pure `./mappers`
 * functions so the transforms are unit-tested without a database.
 *
 * Writes (confirm payment, TC/LAC/ExCo decisions) do NOT belong here — those go
 * through the Express API so its services own the status machine + n8n webhooks.
 */
import "server-only";
import {
  Application,
  ApplicationSection,
  ApplicationWindow,
  InvestorOrg,
  Payment,
  ReviewAction,
  User,
} from "@kip/db";
import { formatMoney, formatDateTime, formatShortDate } from "../format";
import { SECTION_ORDER, SECTION_LABELS } from "../investor-data";
import {
  SUBMITTED_STATUSES,
  hectaresFromSqm,
  roleLabel,
  toApplicationRow,
  toTcAppRow,
  toTransferRow,
  toUserRow,
  toWindowRow,
  type ApplicationRow,
  type TcAppRow,
  type TransferRow,
  type UserRow,
  type WindowRow,
} from "./mappers";

const PENDING_TRANSFER_STATUSES = ["PENDING", "PROOF_UPLOADED"];
const DRAFT_STATUSES = ["DRAFT", "DRAFT_PAYMENT_PENDING"];

function landSizeSqm(sections: { section: string; payload: unknown }[]): number | null {
  const land = sections.find((s) => s.section === "LAND_BUSINESS_PROFILE");
  const value = (land?.payload as { landSizeSqm?: unknown } | undefined)?.landSizeSqm;
  return typeof value === "number" ? value : null;
}

// ─── Applications list ───────────────────────────────────────────────────────

export async function listApplications(): Promise<ApplicationRow[]> {
  const apps = await Application.findAll({
    include: [
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName", "countryOfIncorporation"] },
      { model: Payment, as: "payments", attributes: ["status"] },
    ],
    order: [["createdAt", "DESC"]],
  });

  return apps.map((row) => {
    const a = row as Application & { investorOrg?: InvestorOrg; payments?: Payment[] };
    return toApplicationRow({
      reference: a.reference,
      status: a.status,
      createdAt: a.createdAt,
      orgName: a.investorOrg?.legalName ?? "—",
      country: a.investorOrg?.countryOfIncorporation ?? null,
      payments: (a.payments ?? []).map((p) => ({ status: p.status })),
    });
  });
}

// ─── Pending bank transfers ──────────────────────────────────────────────────

export async function listPendingBankTransfers(now: Date = new Date()): Promise<TransferRow[]> {
  const payments = await Payment.findAll({
    where: { method: "STANBIC_TRANSFER", status: PENDING_TRANSFER_STATUSES },
    include: [
      {
        model: Application,
        attributes: ["reference"],
        include: [{ model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] }],
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  return payments.map((row) => {
    const p = row as Payment & {
      Application?: Application & { investorOrg?: InvestorOrg };
    };
    return toTransferRow({
      reference: p.Application?.reference ?? null,
      orgName: p.Application?.investorOrg?.legalName ?? "—",
      transferRef: p.transferRef,
      uploadedAt: p.paidAt ?? p.createdAt,
      now,
    });
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function listUsers(): Promise<UserRow[]> {
  const users = await User.findAll({
    // passwordHash is read only to derive a boolean below — never returned.
    attributes: ["email", "name", "role", "emailVerified", "passwordHash"],
    include: [
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] },
      { model: Application, as: "applications", attributes: ["reference"], required: false },
    ],
    order: [["createdAt", "ASC"]],
  });

  return users.map((row) => {
    const u = row as User & { investorOrg?: InvestorOrg; applications?: Application[] };
    const ref = u.applications?.find((a) => a.reference)?.reference ?? null;
    return toUserRow({
      name: u.name ?? null,
      email: u.email,
      role: u.role,
      orgName: u.investorOrg?.legalName ?? null,
      reference: ref,
      emailVerified: u.emailVerified ?? null,
      hasPassword: Boolean(u.passwordHash),
    });
  });
}

// ─── Application windows ─────────────────────────────────────────────────────

export async function listWindows(): Promise<WindowRow[]> {
  const windows = await ApplicationWindow.findAll({ order: [["openAt", "DESC"]] });
  return windows.map((w) =>
    toWindowRow({
      name: w.name,
      status: w.status,
      openAt: w.openAt,
      closeAt: w.closeAt,
      sequenceCounter: w.sequenceCounter,
    }),
  );
}

// ─── TC review queue ─────────────────────────────────────────────────────────

export async function getTcQueue(now: Date = new Date()): Promise<TcAppRow[]> {
  const apps = await Application.findAll({
    where: { status: [...SUBMITTED_STATUSES] },
    include: [
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] },
      { model: ApplicationSection, as: "sections", attributes: ["section", "payload"] },
    ],
    order: [["submittedAt", "ASC"]],
  });

  return apps.map((row) => {
    const a = row as Application & { investorOrg?: InvestorOrg; sections?: ApplicationSection[] };
    return toTcAppRow({
      reference: a.reference,
      orgName: a.investorOrg?.legalName ?? "—",
      landSizeSqm: landSizeSqm(a.sections ?? []),
      status: a.status,
      submittedAt: a.submittedAt ?? null,
      now,
    });
  });
}

export type TcQueueView = {
  apps: TcAppRow[];
  locked: boolean;
  windowCloseLabel: string;
};

/**
 * TC queue plus the window-lock gate. TC access opens once the submission
 * window closes (CLAUDE.md business rule). As a dev stopgap until the
 * window-close workflow is wired (Phase 3, an API write path), the queue also
 * unlocks once review has begun — i.e. when any submitted application exists —
 * so seeded pipelines are visible during development.
 */
export async function getTcQueueView(now: Date = new Date()): Promise<TcQueueView> {
  const [apps, activeWindow] = await Promise.all([
    getTcQueue(now),
    ApplicationWindow.findOne({ where: { status: "OPEN" }, order: [["openAt", "DESC"]] }),
  ]);
  const windowOpenInFuture = activeWindow
    ? new Date(activeWindow.closeAt).getTime() > now.getTime()
    : false;
  return {
    apps,
    locked: windowOpenInFuture && apps.length === 0,
    windowCloseLabel: activeWindow ? formatShortDate(activeWindow.closeAt) : "—",
  };
}

// ─── Console dashboard stats ─────────────────────────────────────────────────

export type AdminDashboard = {
  totalApplications: number;
  paymentsConfirmed: number;
  amountCollectedLabel: string;
  eoisSubmitted: number;
  draftsInProgress: number;
  bankTransfersPending: number;
  methodSplit: { label: string; count: number }[];
  activity: { time: string; text: string }[];
};

const ACTIVITY_TEXT: Record<string, string> = {
  ASSIGNED: "assigned for review",
  SHORTLISTED: "shortlisted by TC",
  NOT_SHORTLISTED: "not shortlisted",
  LAC_APPROVED: "approved by LAC",
  LAC_REJECTED: "rejected by LAC",
  ALLOCATED: "land allocated by ExCo",
  REQUESTED_CLARIFICATION: "clarification requested",
  CLARIFICATION_PROVIDED: "clarification provided",
};

const METHOD_LABELS: Record<string, string> = {
  CARD: "Card",
  STANBIC_TRANSFER: "Stanbic Transfer",
};

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const [totalApplications, eoisSubmitted, draftsInProgress, confirmedPayments, recentActions] =
    await Promise.all([
      Application.count(),
      Application.count({ where: { status: [...SUBMITTED_STATUSES] } }),
      Application.count({ where: { status: DRAFT_STATUSES } }),
      Payment.findAll({ where: { status: "CONFIRMED" }, attributes: ["method", "currency", "amount"] }),
      ReviewAction.findAll({
        attributes: ["type", "createdAt"],
        include: [{ model: Application, attributes: ["reference"] }],
        order: [["createdAt", "DESC"]],
        limit: 6,
      }),
    ]);

  const bankTransfersPending = await Payment.count({
    where: { method: "STANBIC_TRANSFER", status: PENDING_TRANSFER_STATUSES },
  });

  // Amount collected (seed is all USD; sum per the dominant currency).
  const currency = confirmedPayments[0]?.currency ?? "USD";
  const total = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Payment method split among confirmed payments.
  const counts = new Map<string, number>();
  for (const p of confirmedPayments) counts.set(p.method, (counts.get(p.method) ?? 0) + 1);
  const methodSplit = [...counts.entries()].map(([method, count]) => ({
    label: METHOD_LABELS[method] ?? method,
    count,
  }));

  const activity = recentActions.map((row) => {
    const ra = row as ReviewAction & { Application?: Application };
    const ref = ra.Application?.reference ?? "Application";
    const what = ACTIVITY_TEXT[ra.type] ?? ra.type.toLowerCase().replace(/_/g, " ");
    return { time: formatDateTime(ra.createdAt), text: `${ref} — ${what}` };
  });

  return {
    totalApplications,
    paymentsConfirmed: confirmedPayments.length,
    amountCollectedLabel: `${formatMoney(total, currency)} collected`,
    eoisSubmitted,
    draftsInProgress,
    bankTransfersPending,
    methodSplit,
    activity,
  };
}

// ─── Admin application detail ────────────────────────────────────────────────

export type AdminApplicationDetail = {
  reference: string | null;
  status: string;
  orgName: string;
  lotReference: string;
  landHa: string;
  sectionsComplete: number;
  totalSections: number;
  sections: { key: string; label: string; complete: boolean }[];
  payment: { method: string; amountLabel: string; ref: string; confirmedAt: string } | null;
  auditTrail: { time: string; text: string; actor: string }[];
};

export async function getAdminApplicationDetail(ref: string): Promise<AdminApplicationDetail | null> {
  const app = await Application.findOne({
    where: { reference: ref },
    include: [
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] },
      { model: ApplicationSection, as: "sections", attributes: ["section", "payload", "completedAt"] },
      {
        model: ReviewAction,
        as: "reviewActions",
        include: [{ model: User, as: "actor", attributes: ["role", "name"] }],
      },
    ],
  });
  if (!app) return null;

  const a = app as Application & {
    investorOrg?: InvestorOrg;
    sections?: ApplicationSection[];
    reviewActions?: (ReviewAction & { actor?: User })[];
  };
  const sections = a.sections ?? [];

  const payment = await Payment.findOne({
    where: { applicationId: a.id },
    order: [["createdAt", "DESC"]],
  });

  const sectionList = SECTION_ORDER.map((key) => ({
    key,
    label: SECTION_LABELS[key],
    complete: sections.some((s) => s.section === key && s.completedAt !== null),
  }));

  // Collect with a sortable epoch, order chronologically, then format.
  const events: { ts: number; text: string; actor: string }[] = [];
  if (payment?.paidAt) {
    events.push({ ts: payment.paidAt.getTime(), text: "Payment initiated", actor: "Investor" });
  }
  if (payment?.confirmedAt) {
    events.push({ ts: payment.confirmedAt.getTime(), text: "Payment confirmed", actor: "KIP Admin" });
  }
  if (a.submittedAt) {
    events.push({ ts: a.submittedAt.getTime(), text: "EOI submitted", actor: "Investor" });
  }
  for (const ra of a.reviewActions ?? []) {
    const text = ACTIVITY_TEXT[ra.type];
    if (!text || !ra.createdAt) continue;
    events.push({
      ts: ra.createdAt.getTime(),
      text: text.charAt(0).toUpperCase() + text.slice(1),
      actor: ra.actor ? roleLabel(ra.actor.role) : "KIP Admin",
    });
  }
  events.sort((x, y) => x.ts - y.ts);
  const auditTrail = events.map((e) => ({ time: formatDateTime(e.ts), text: e.text, actor: e.actor }));

  return {
    reference: a.reference,
    status: a.status,
    orgName: a.investorOrg?.legalName ?? "—",
    lotReference: a.lotReference,
    landHa: hectaresFromSqm(landSizeSqm(sections)),
    sectionsComplete: sectionList.filter((s) => s.complete).length,
    totalSections: sectionList.length,
    sections: sectionList,
    payment: payment
      ? {
          method: payment.method === "STANBIC_TRANSFER" ? "Stanbic Bank Transfer" : "Card",
          amountLabel: formatMoney(payment.amount, payment.currency),
          ref: payment.transferRef ?? payment.gatewayRef ?? "—",
          confirmedAt: payment.confirmedAt ? formatDateTime(payment.confirmedAt) : "Not confirmed",
        }
      : null,
    auditTrail,
  };
}
