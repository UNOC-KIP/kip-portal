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
import {
  ApplicationStatus,
  ApplicationWindowStatus,
  PaymentMethod,
  PaymentStatus,
  ReviewActionType,
} from "@kip/shared";
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

const PENDING_TRANSFER_STATUSES = [PaymentStatus.PENDING, PaymentStatus.PROOF_UPLOADED];
const DRAFT_STATUSES = [ApplicationStatus.DRAFT, ApplicationStatus.DRAFT_PAYMENT_PENDING];

function landSizeSqm(sections: { section: string; payload: unknown }[]): number | null {
  const land = sections.find((s) => s.section === "LAND_BUSINESS_PROFILE");
  const value = (land?.payload as { landSizeSqm?: unknown } | undefined)?.landSizeSqm;
  return typeof value === "number" ? value : null;
}

// ─── Applications list ───────────────────────────────────────────────────────

export async function listApplications(opts: { limit?: number; offset?: number } = {}): Promise<ApplicationRow[]> {
  const apps = await Application.findAll({
    include: [
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName", "countryOfIncorporation"] },
      { model: Payment, as: "payments", attributes: ["status"] },
    ],
    order: [["createdAt", "DESC"]],
    limit: opts.limit ?? 200,
    offset: opts.offset ?? 0,
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
  const slaHours = Number(process.env.BANK_TRANSFER_SLA_HOURS) || 48;

  const payments = await Payment.findAll({
    where: { method: PaymentMethod.STANBIC_TRANSFER, status: PENDING_TRANSFER_STATUSES },
    include: [
      {
        model: Application,
        attributes: ["reference"],
        include: [{ model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] }],
      },
    ],
    order: [["createdAt", "ASC"]],
    limit: 200,
  });

  return payments.map((row) => {
    const p = row as Payment & {
      Application?: Application & { investorOrg?: InvestorOrg };
    };
    return toTransferRow({
      id: p.id,
      status: p.status,
      reference: p.Application?.reference ?? null,
      orgName: p.Application?.investorOrg?.legalName ?? "—",
      transferRef: p.transferRef,
      uploadedAt: p.paidAt ?? p.createdAt,
      now,
      slaHours,
    });
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function listUsers(opts: { limit?: number; offset?: number } = {}): Promise<UserRow[]> {
  const users = await User.findAll({
    // passwordHash is read only to derive a boolean below — never returned.
    attributes: ["email", "name", "role", "emailVerified", "passwordHash"],
    include: [
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] },
      { model: Application, as: "applications", attributes: ["reference"], required: false },
    ],
    order: [["createdAt", "ASC"]],
    limit: opts.limit ?? 500,
    offset: opts.offset ?? 0,
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
  const windows = await ApplicationWindow.findAll({ order: [["openAt", "DESC"]], limit: 1000 });
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
      { model: ApplicationSection, as: "sections", attributes: ["section", "payload"],
        where: { section: "LAND_BUSINESS_PROFILE" }, required: false },
    ],
    order: [["submittedAt", "ASC"]],
    limit: 500,
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
  /** Window close date + 21 days — TC pre-screening deadline. */
  tcDeadlineLabel: string;
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
    ApplicationWindow.findOne({ where: { status: ApplicationWindowStatus.OPEN }, order: [["openAt", "DESC"]] }),
  ]);
  const windowOpenInFuture = activeWindow
    ? new Date(activeWindow.closeAt).getTime() > now.getTime()
    : false;

  let tcDeadlineLabel = "—";
  if (activeWindow) {
    const deadline = new Date(activeWindow.closeAt);
    deadline.setUTCDate(deadline.getUTCDate() + 21);
    tcDeadlineLabel = formatShortDate(deadline);
  }

  return {
    apps,
    locked: windowOpenInFuture && apps.length === 0,
    windowCloseLabel: activeWindow ? formatShortDate(activeWindow.closeAt) : "—",
    tcDeadlineLabel,
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

const ACTIVITY_TEXT: Partial<Record<ReviewActionType, string>> = {
  [ReviewActionType.ASSIGNED]:                "assigned for review",
  [ReviewActionType.SHORTLISTED]:             "shortlisted by TC",
  [ReviewActionType.NOT_SHORTLISTED]:         "not shortlisted",
  [ReviewActionType.LAC_APPROVED]:            "approved by LAC",
  [ReviewActionType.LAC_REJECTED]:            "rejected by LAC",
  [ReviewActionType.ALLOCATED]:               "land allocated by ExCo",
  [ReviewActionType.REQUESTED_CLARIFICATION]: "clarification requested",
  [ReviewActionType.CLARIFICATION_PROVIDED]:  "clarification provided",
};

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const [
    totalApplications,
    eoisSubmitted,
    draftsInProgress,
    paymentsConfirmed,
    confirmedAmountSum,
    dominantCurrencyRow,
    cardCount,
    bankCount,
    recentActions,
    bankTransfersPending,
  ] = await Promise.all([
    Application.count(),
    Application.count({ where: { status: [...SUBMITTED_STATUSES] } }),
    Application.count({ where: { status: DRAFT_STATUSES } }),
    Payment.count({ where: { status: PaymentStatus.CONFIRMED } }),
    // sum() avoids loading all rows; returns null when no confirmed payments exist
    Payment.sum("amount", { where: { status: PaymentStatus.CONFIRMED } }),
    // fetch just the currency of the first confirmed payment (USD is dominant, but be explicit)
    Payment.findOne({
      where: { status: PaymentStatus.CONFIRMED },
      attributes: ["currency"],
      order: [["createdAt", "ASC"]],
    }),
    Payment.count({ where: { status: PaymentStatus.CONFIRMED, method: PaymentMethod.CARD } }),
    Payment.count({ where: { status: PaymentStatus.CONFIRMED, method: PaymentMethod.STANBIC_TRANSFER } }),
    ReviewAction.findAll({
      attributes: ["type", "createdAt"],
      include: [{ model: Application, attributes: ["reference"] }],
      order: [["createdAt", "DESC"]],
      limit: 6,
    }),
    Payment.count({
      where: { method: PaymentMethod.STANBIC_TRANSFER, status: PENDING_TRANSFER_STATUSES },
    }),
  ]);

  const currency = dominantCurrencyRow?.currency ?? "USD";
  const total = confirmedAmountSum ?? 0;

  const methodSplit = [
    { label: "Card", count: cardCount },
    { label: "Stanbic Transfer", count: bankCount },
  ].filter((m) => m.count > 0);

  const activity = recentActions.map((row) => {
    const ra = row as ReviewAction & { Application?: Application };
    const ref = ra.Application?.reference ?? "Application";
    const what = ACTIVITY_TEXT[ra.type as ReviewActionType] ?? ra.type.toLowerCase().replace(/_/g, " ");
    return { time: formatDateTime(ra.createdAt), text: `${ref} — ${what}` };
  });

  return {
    totalApplications,
    paymentsConfirmed,
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
    const text = ACTIVITY_TEXT[ra.type as ReviewActionType];
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
          method: payment.method === PaymentMethod.STANBIC_TRANSFER ? "Stanbic Bank Transfer" : "Card",
          amountLabel: formatMoney(payment.amount, payment.currency),
          ref: payment.transferRef ?? payment.gatewayRef ?? "—",
          confirmedAt: payment.confirmedAt ? formatDateTime(payment.confirmedAt) : "Not confirmed",
        }
      : null,
    auditTrail,
  };
}
