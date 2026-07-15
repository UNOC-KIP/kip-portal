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
  Inquiry,
  InvestorOrg,
  NotifySignup,
  Payment,
  ReviewAction,
  SiteVisitBooking,
  TimelineMilestone,
  User,
} from "@kip/db";
import {
  ApplicationStatus,
  ApplicationWindowStatus,
  PaymentMethod,
  PaymentStatus,
  ReviewActionType,
  UserRole,
  UserStatus,
} from "@kip/shared";
import { formatMoney, formatDateTime, formatShortDate } from "../format";
import { SECTION_ORDER, SECTION_LABELS } from "../application-data";
import {
  SUBMITTED_STATUSES,
  businessSectorLabel,
  companyTypeLabel,
  hectaresFromSqm,
  isShortlistedOrBeyond,
  isSubmitted,
  roleLabel,
  toApplicationRow,
  toInquiryRow,
  toInvestorReportRow,
  toNotifySignupRow,
  toSiteVisitRow,
  toStaffRow,
  toTcAppRow,
  toTransferRow,
  toUserRow,
  toWindowRow,
  userStatusLabel,
  type ApplicationRow,
  type BreakdownRow,
  type FunnelRow,
  type InquiryRow,
  type InvestorReportRow,
  type NotifySignupRow,
  type ReportData,
  type SiteVisitRow,
  type StaffRow,
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
      id: a.id,
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
  const slaHoursEnv = process.env.BANK_TRANSFER_SLA_HOURS;
  const slaHours = slaHoursEnv != null ? Number(slaHoursEnv) : 48;

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
    attributes: ["id", "email", "name", "role", "status", "createdAt"],
    include: [
      {
        model: InvestorOrg,
        as: "investorOrg",
        attributes: ["legalName", "countryOfIncorporation", "tin", "phone"],
      },
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
      id: u.id,
      name: u.name ?? null,
      email: u.email,
      role: u.role,
      orgName: u.investorOrg?.legalName ?? null,
      reference: ref,
      rawStatus: u.status as string,
      tin: u.investorOrg?.tin ?? null,
      country: u.investorOrg?.countryOfIncorporation ?? null,
      phone: u.investorOrg?.phone ?? null,
      createdAt: u.createdAt,
    });
  });
}

// ─── Investors (INVESTOR role only) ──────────────────────────────────────────

export async function listInvestors(opts: { limit?: number; offset?: number } = {}): Promise<UserRow[]> {
  const users = await User.findAll({
    where: { role: UserRole.INVESTOR },
    attributes: ["id", "email", "name", "role", "status", "createdAt"],
    include: [
      {
        model: InvestorOrg,
        as: "investorOrg",
        attributes: ["legalName", "countryOfIncorporation", "tin", "phone"],
      },
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
      id: u.id,
      name: u.name ?? null,
      email: u.email,
      role: u.role,
      orgName: u.investorOrg?.legalName ?? null,
      reference: ref,
      rawStatus: u.status as string,
      tin: u.investorOrg?.tin ?? null,
      country: u.investorOrg?.countryOfIncorporation ?? null,
      phone: u.investorOrg?.phone ?? null,
      createdAt: u.createdAt,
    });
  });
}

// ─── Staff users (all non-INVESTOR roles) ────────────────────────────────────

const STAFF_ROLES = [
  UserRole.ADMIN,
  UserRole.TC_CHAIR,
  UserRole.TC_MEMBER,
  UserRole.LAC_MEMBER,
  UserRole.EXCO_MEMBER,
];

export async function listStaffUsers(opts: { limit?: number } = {}): Promise<StaffRow[]> {
  const users = await User.findAll({
    where: { role: STAFF_ROLES },
    attributes: ["id", "name", "email", "role", "createdAt"],
    order: [["createdAt", "ASC"]],
    limit: opts.limit ?? 200,
  });

  return users.map((u) =>
    toStaffRow({ id: u.id, name: u.name ?? null, email: u.email, role: u.role, createdAt: u.createdAt }),
  );
}

// ─── User detail ─────────────────────────────────────────────────────────────

export type UserDetail = {
  id: string;
  email: string;
  role: string;
  status: string;
  rawStatus: string;
  registeredAt: string;
  /** Formatted date of the last self-service password change; null = still on the emailed password. */
  passwordChangedAt: string | null;
  isInvestor: boolean;
  appStage: string;
  company: string;
  tradingName: string;
  registrationNumber: string;
  ursbRegistrationNumber: string;
  companyType: string;
  businessSector: string;
  address: string;
  tin: string;
  country: string;
  phone: string;
  orgEmail: string;
  repName: string;
  repDesignation: string;
  repPhone: string;
  ref: string;
  appStatus: string | null;
  /** Raw (unformatted) values for the admin edit form. */
  edit: {
    name: string;
    designation: string;
    phone: string;
    email: string;
    role: string;
    hasOrg: boolean;
    org: {
      legalName: string;
      tradingName: string;
      registrationNumber: string;
      ursbRegistrationNumber: string;
      companyType: string;
      businessSector: string;
      countryOfIncorporation: string;
      tin: string;
      address: string;
      phone: string;
      email: string;
    };
  };
};

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  const user = await User.findByPk(id, {
    attributes: [
      "id", "email", "name", "designation", "phone", "role", "status", "createdAt", "passwordChangedAt",
    ],
    include: [
      { model: InvestorOrg, as: "investorOrg" },
      {
        model: Application,
        as: "applications",
        attributes: ["reference", "status"],
        required: false,
      },
    ],
  });
  if (!user) return null;

  const u = user as User & {
    investorOrg?: InvestorOrg;
    applications?: Application[];
  };
  const latestApp = u.applications?.find((a) => a.reference) ?? u.applications?.[0] ?? null;
  const rawStatus = u.status as string;

  return {
    id: u.id,
    email: u.email,
    role: roleLabel(u.role),
    status: userStatusLabel(rawStatus),
    rawStatus,
    registeredAt: formatDateTime(u.createdAt),
    passwordChangedAt: u.passwordChangedAt ? formatDateTime(u.passwordChangedAt) : null,
    isInvestor: u.role === UserRole.INVESTOR,
    appStage: applicationStageLabel(latestApp?.status ?? null),
    company: u.investorOrg?.legalName ?? "—",
    tradingName: u.investorOrg?.tradingName ?? "—",
    registrationNumber: u.investorOrg?.registrationNumber ?? "—",
    ursbRegistrationNumber: u.investorOrg?.ursbRegistrationNumber ?? "—",
    companyType: companyTypeLabel(u.investorOrg?.companyType),
    businessSector: businessSectorLabel(u.investorOrg?.businessSector),
    address: u.investorOrg?.address ?? "—",
    tin: u.investorOrg?.tin ?? "—",
    country: u.investorOrg?.countryOfIncorporation ?? "—",
    phone: u.investorOrg?.phone ?? "—",
    orgEmail: u.investorOrg?.email ?? "—",
    repName: u.name ?? "—",
    repDesignation: u.designation ?? "—",
    repPhone: u.phone ?? "—",
    ref: latestApp?.reference ?? "—",
    appStatus: latestApp?.status ?? null,
    edit: {
      name: u.name ?? "",
      designation: u.designation ?? "",
      phone: u.phone ?? "",
      email: u.email,
      role: u.role,
      hasOrg: u.investorOrg != null,
      org: {
        legalName: u.investorOrg?.legalName ?? "",
        tradingName: u.investorOrg?.tradingName ?? "",
        registrationNumber: u.investorOrg?.registrationNumber ?? "",
        ursbRegistrationNumber: u.investorOrg?.ursbRegistrationNumber ?? "",
        companyType: u.investorOrg?.companyType ?? "",
        businessSector: u.investorOrg?.businessSector ?? "",
        countryOfIncorporation: u.investorOrg?.countryOfIncorporation ?? "",
        tin: u.investorOrg?.tin ?? "",
        address: u.investorOrg?.address ?? "",
        phone: u.investorOrg?.phone ?? "",
        email: u.investorOrg?.email ?? "",
      },
    },
  };
}

// ─── Application windows ─────────────────────────────────────────────────────

export async function listWindows(): Promise<WindowRow[]> {
  const windows = await ApplicationWindow.findAll({ order: [["openAt", "DESC"]], limit: 1000 });
  return windows.map((w) =>
    toWindowRow({
      id: w.id,
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

// ─── Inquiries & notify signups ──────────────────────────────────────────────

export type InquiriesView = {
  inquiries: InquiryRow[];
  signups: NotifySignupRow[];
  newCount: number;
};

export async function getInquiriesView(): Promise<InquiriesView> {
  const [inquiries, signups] = await Promise.all([
    Inquiry.findAll({
      include: [{ model: User, as: "respondedBy", attributes: ["name", "email"], required: false }],
      order: [["createdAt", "DESC"]],
      limit: 500,
    }),
    NotifySignup.findAll({ order: [["createdAt", "DESC"]], limit: 1000 }),
  ]);

  const inquiryRows = inquiries.map((row) => {
    const i = row as Inquiry & { respondedBy?: User };
    return toInquiryRow({
      id: i.id,
      name: i.name,
      email: i.email,
      company: i.company ?? null,
      subject: i.subject ?? null,
      message: i.message,
      channel: i.channel,
      rawStatus: i.status,
      respondedByName: i.respondedBy?.name ?? i.respondedBy?.email ?? null,
      respondedAt: i.respondedAt ?? null,
      createdAt: i.createdAt,
    });
  });

  return {
    inquiries: inquiryRows,
    signups: signups.map((s) => toNotifySignupRow({ id: s.id, email: s.email, createdAt: s.createdAt })),
    newCount: inquiryRows.filter((i) => i.rawStatus === "NEW").length,
  };
}

// ─── Site visit bookings ─────────────────────────────────────────────────────

export type SiteVisitsView = {
  bookings: SiteVisitRow[];
  newCount: number;
  scheduledCount: number;
};

export async function getSiteVisitsView(): Promise<SiteVisitsView> {
  const rows = await SiteVisitBooking.findAll({
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email", "designation", "phone", "status", "createdAt"],
        required: false,
        include: [
          { model: Application, as: "applications", attributes: ["reference", "status"], required: false },
        ],
      },
      { model: User, as: "handledBy", attributes: ["name", "email"], required: false },
      {
        model: InvestorOrg,
        as: "investorOrg",
        attributes: ["legalName", "countryOfIncorporation", "businessSector", "companyType", "registrationNumber"],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: 500,
  });

  const bookings = rows.map((row) => {
    const b = row as SiteVisitBooking & {
      user?: User & { applications?: Application[] };
      handledBy?: User;
      investorOrg?: InvestorOrg;
    };
    const investor = b.user
      ? toSiteVisitInvestor({
          userId: b.user.id,
          name: b.user.name ?? null,
          designation: b.user.designation ?? null,
          email: b.user.email,
          phone: b.user.phone ?? null,
          rawStatus: b.user.status,
          createdAt: b.user.createdAt,
          orgName: b.investorOrg?.legalName ?? null,
          country: b.investorOrg?.countryOfIncorporation ?? null,
          businessSector: b.investorOrg?.businessSector ?? null,
          companyType: b.investorOrg?.companyType ?? null,
          registrationNumber: b.investorOrg?.registrationNumber ?? null,
          applications: (b.user.applications ?? []).map((a) => ({
            reference: a.reference,
            status: a.status,
          })),
        })
      : undefined;
    return toSiteVisitRow({
      investor,
      id: b.id,
      companyName: b.investorOrg?.legalName ?? null,
      contactName: b.user?.name ?? null,
      contactEmail: b.user?.email ?? "—",
      zone: b.zone,
      landUse: b.landUse,
      description: b.description,
      acres: b.acres,
      rawStatus: b.status,
      handledByName: b.handledBy?.name ?? b.handledBy?.email ?? null,
      scheduledAt: b.scheduledAt ?? null,
      createdAt: b.createdAt,
    });
  });

  return {
    bookings,
    newCount: bookings.filter((b) => b.rawStatus === "NEW").length,
    scheduledCount: bookings.filter((b) => b.rawStatus === "SCHEDULED").length,
  };
}

// ─── Console dashboard stats ─────────────────────────────────────────────────

export type AdminDashboard = {
  totalApplications: number;
  paymentsConfirmed: number;
  amountCollectedLabel: string;
  amountCollectedRaw: number;
  eoisSubmitted: number;
  draftsInProgress: number;
  bankTransfersPending: number;
  proofUploadedCount: number;
  methodSplit: { label: string; count: number }[];
  activity: { time: string; text: string }[];
  // per-status counts for pipeline funnel
  applicationsByStatus: { status: string; count: number }[];
  // investor account breakdown
  pendingUsers: number;
  activeUsers: number;
  rejectedUsers: number;
  totalInvestors: number;
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
    allStatusRows,
    pendingUsers,
    activeUsers,
    rejectedUsers,
    proofUploadedCount,
  ] = await Promise.all([
    Application.count(),
    Application.count({ where: { status: [...SUBMITTED_STATUSES] } }),
    Application.count({ where: { status: DRAFT_STATUSES } }),
    Payment.count({ where: { status: PaymentStatus.CONFIRMED } }),
    Payment.sum("amount", { where: { status: PaymentStatus.CONFIRMED } }),
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
      limit: 8,
    }),
    Payment.count({
      where: { method: PaymentMethod.STANBIC_TRANSFER, status: PENDING_TRANSFER_STATUSES },
    }),
    Application.count({ group: ["status"] }) as unknown as Promise<{ status: string; count: number }[]>,
    User.count({ where: { status: UserStatus.PENDING_REVIEW, role: UserRole.INVESTOR } }),
    User.count({ where: { status: UserStatus.ACTIVE, role: UserRole.INVESTOR } }),
    User.count({ where: { status: UserStatus.REJECTED, role: UserRole.INVESTOR } }),
    Payment.count({ where: { status: PaymentStatus.PROOF_UPLOADED } }),
  ]);

  const currency = dominantCurrencyRow?.currency ?? "USD";
  const total = confirmedAmountSum ?? 0;

  const methodSplit = [
    { label: "Stanbic Transfer", count: bankCount },
    { label: "Card", count: cardCount },
  ].filter((m) => m.count > 0);

  const activity = recentActions.map((row) => {
    const ra = row as ReviewAction & { Application?: Application };
    const ref = ra.Application?.reference ?? "Application";
    const what = ACTIVITY_TEXT[ra.type as ReviewActionType] ?? ra.type.toLowerCase().replace(/_/g, " ");
    return { time: formatDateTime(ra.createdAt), text: `${ref} — ${what}` };
  });

  const applicationsByStatus = (allStatusRows as { status: string; count: number }[]).map(
    ({ status, count }) => ({ status, count }),
  );

  return {
    totalApplications,
    paymentsConfirmed,
    amountCollectedLabel: `${formatMoney(total, currency)} collected`,
    amountCollectedRaw: total,
    eoisSubmitted,
    draftsInProgress,
    bankTransfersPending,
    proofUploadedCount,
    methodSplit,
    activity,
    applicationsByStatus,
    pendingUsers,
    activeUsers,
    rejectedUsers,
    totalInvestors: pendingUsers + activeUsers + rejectedUsers,
  };
}

// ─── Admin application detail ────────────────────────────────────────────────

export type AdminApplicationDetail = {
  id: string;
  reference: string | null;
  status: string;
  orgName: string;
  lotReference: string;
  landHa: string;
  sectionsComplete: number;
  totalSections: number;
  sections: { key: string; label: string; complete: boolean; payload: unknown }[];
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
    payload: sections.find((s) => s.section === key)?.payload ?? null,
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
    id: a.id,
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

// ─── Investor onboarding report ──────────────────────────────────────────────

/**
 * Everything the /console/report page and its CSV / PDF / summary exports need
 * to convey how investors are moving through onboarding. All INVESTOR users are
 * fetched once (with their org + applications + payments) and the aggregates,
 * breakdowns, funnel and per-investor rows are derived in JS — cheaper than a
 * fan-out of `count({ group })` queries at this data scale and keeps the "reads
 * → direct DB" rule with all shaping delegated to the pure `./mappers` helpers.
 */
export async function getReportData(now: Date = new Date()): Promise<ReportData> {
  const [investorUsers, confirmedAmountSum, dominantCurrencyRow, activeWindow, siteVisitsRequested] =
    await Promise.all([
      User.findAll({
        where: { role: UserRole.INVESTOR },
        attributes: ["id", "name", "email", "status", "createdAt"],
        include: [
          {
            model: InvestorOrg,
            as: "investorOrg",
            attributes: ["legalName", "countryOfIncorporation", "businessSector", "companyType"],
          },
          {
            model: Application,
            as: "applications",
            attributes: ["reference", "status", "createdAt"],
            required: false,
            include: [{ model: Payment, as: "payments", attributes: ["status"], required: false }],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
      Payment.sum("amount", { where: { status: PaymentStatus.CONFIRMED } }),
      Payment.findOne({
        where: { status: PaymentStatus.CONFIRMED },
        attributes: ["currency"],
        order: [["createdAt", "ASC"]],
      }),
      ApplicationWindow.findOne({
        where: { status: ApplicationWindowStatus.OPEN },
        order: [["openAt", "DESC"]],
      }),
      SiteVisitBooking.count(),
    ]);

  const DAY = 86_400_000;
  const last7 = now.getTime() - 7 * DAY;
  const last30 = now.getTime() - 30 * DAY;

  const countryCounts = new Map<string, number>();
  const sectorCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();

  let activeAccounts = 0;
  let pendingAccounts = 0;
  let newLast7Days = 0;
  let newLast30Days = 0;
  let paymentsConfirmed = 0;
  let eoisSubmitted = 0;
  let shortlisted = 0;
  let allocated = 0;

  const investors: InvestorReportRow[] = [];

  for (const row of investorUsers) {
    const u = row as User & {
      investorOrg?: InvestorOrg;
      applications?: (Application & { payments?: Payment[] })[];
    };
    const org = u.investorOrg;
    const apps = u.applications ?? [];
    // Primary application: the one that reached a reference, else the newest.
    const primary = apps.find((a) => a.reference) ?? apps[0] ?? null;
    const primaryPayments = (primary?.payments ?? []).map((p) => ({ status: p.status }));

    if (u.status === UserStatus.ACTIVE) activeAccounts++;
    else if (u.status === UserStatus.PENDING_REVIEW) pendingAccounts++;

    const created = new Date(u.createdAt).getTime();
    if (created >= last7) newLast7Days++;
    if (created >= last30) newLast30Days++;

    // Funnel: an investor "reaches" a stage if any of their applications did.
    if (apps.some((a) => (a.payments ?? []).some((p) => p.status === PaymentStatus.CONFIRMED))) paymentsConfirmed++;
    if (apps.some((a) => isSubmitted(a.status))) eoisSubmitted++;
    if (apps.some((a) => isShortlistedOrBeyond(a.status))) shortlisted++;
    if (apps.some((a) => a.status === ApplicationStatus.ALLOCATED)) allocated++;

    const country = org?.countryOfIncorporation ?? "Unknown";
    countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
    const sectorKey = org?.businessSector ? businessSectorLabel(org.businessSector) : "Unspecified";
    sectorCounts.set(sectorKey, (sectorCounts.get(sectorKey) ?? 0) + 1);
    const typeKey = org?.companyType ? companyTypeLabel(org.companyType) : "Unspecified";
    typeCounts.set(typeKey, (typeCounts.get(typeKey) ?? 0) + 1);

    investors.push(
      toInvestorReportRow({
        id: u.id,
        name: u.name ?? null,
        email: u.email,
        rawStatus: u.status as string,
        orgName: org?.legalName ?? null,
        country: org?.countryOfIncorporation ?? null,
        businessSector: org?.businessSector ?? null,
        companyType: org?.companyType ?? null,
        reference: primary?.reference ?? null,
        appStatus: primary?.status ?? null,
        payments: primaryPayments,
        createdAt: u.createdAt,
      }),
    );
  }

  const totalRegistered = investorUsers.length;

  const toSortedBreakdown = (m: Map<string, number>, limit = 8): BreakdownRow[] =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([label, count]) => ({ label, count }));

  const currency = dominantCurrencyRow?.currency ?? "USD";
  const total = confirmedAmountSum ?? 0;

  const daysToClose = activeWindow
    ? Math.max(0, Math.floor((new Date(activeWindow.closeAt).getTime() - now.getTime()) / DAY))
    : null;

  const conversionFunnel: FunnelRow[] = [
    { label: "Registered", count: totalRegistered },
    { label: "Payment confirmed", count: paymentsConfirmed },
    { label: "EOI submitted", count: eoisSubmitted },
    { label: "Shortlisted", count: shortlisted },
    { label: "Allocated", count: allocated },
  ].map((r) => ({ ...r, pct: totalRegistered > 0 ? Math.round((r.count / totalRegistered) * 100) : 0 }));

  return {
    generatedAt: formatDateTime(now),
    windowName: activeWindow?.name ?? "",
    stats: {
      totalRegistered,
      activeAccounts,
      pendingAccounts,
      newLast7Days,
      newLast30Days,
      paymentsConfirmed,
      eoisSubmitted,
      shortlisted,
      allocated,
      siteVisitsRequested,
      feesCollected: formatMoney(total, currency),
      feesCollectedRaw: total,
      daysToClose,
    },
    byCountry: toSortedBreakdown(countryCounts),
    bySector: toSortedBreakdown(sectorCounts),
    byCompanyType: toSortedBreakdown(typeCounts),
    conversionFunnel,
    investors,
  };
}

// ─── Reports hub — applications / payments / engagement / overview ───────────

import { computeTimeline, InquiryStatus } from "@kip/shared";
import {
  applicationStageLabel,
  bucketWeekly,
  computeStageDurations,
  countRowsBy,
  toAppsReportRow,
  toPaymentReportRow,
  toSiteVisitInvestor,
  toTimelineMilestoneRow,
  type AppsReportRow,
  type PaymentReportRow,
  type StageDuration,
  type TimelineMilestoneRow,
} from "./mappers";

/** Statuses at or beyond SHORTLISTED — for aggregate counts (mirror of mappers). */
const SHORTLISTED_PLUS_STATUSES = [
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.LAC_REVIEW,
  ApplicationStatus.LAC_APPROVED,
  ApplicationStatus.LAC_REJECTED,
  ApplicationStatus.EXCO_REVIEW,
  ApplicationStatus.ALLOCATED,
];

const IN_REVIEW_STATUSES = new Set<string>([
  ApplicationStatus.UNDER_TC_REVIEW,
  ApplicationStatus.TC_CLARIFICATION_REQUESTED,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.LAC_REVIEW,
  ApplicationStatus.LAC_APPROVED,
  ApplicationStatus.EXCO_REVIEW,
]);
const DECIDED_STATUSES = new Set<string>([
  ApplicationStatus.NOT_SHORTLISTED,
  ApplicationStatus.LAC_REJECTED,
  ApplicationStatus.ALLOCATED,
]);

export type ApplicationsReport = {
  generatedAt: string;
  stats: { total: number; submitted: number; inReview: number; decided: number; clarifications: number };
  byStatus: BreakdownRow[];
  decisions: BreakdownRow[];
  stageDurations: StageDuration[];
  rows: AppsReportRow[];
};

export async function getApplicationsReportData(now: Date = new Date()): Promise<ApplicationsReport> {
  const [apps, actions] = await Promise.all([
    Application.findAll({
      attributes: ["id", "reference", "status", "submittedAt", "createdAt"],
      include: [
        { model: InvestorOrg, as: "investorOrg", attributes: ["legalName", "countryOfIncorporation"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: 500,
    }),
    ReviewAction.findAll({ attributes: ["applicationId", "type", "createdAt"], limit: 5000 }),
  ]);

  let submitted = 0;
  let inReview = 0;
  let decided = 0;
  const rows: AppsReportRow[] = [];
  for (const row of apps) {
    const a = row as Application & { investorOrg?: InvestorOrg };
    if (isSubmitted(a.status)) submitted++;
    if (IN_REVIEW_STATUSES.has(a.status)) inReview++;
    if (DECIDED_STATUSES.has(a.status)) decided++;
    rows.push(
      toAppsReportRow(
        {
          id: a.id,
          reference: a.reference,
          status: a.status,
          orgName: a.investorOrg?.legalName ?? null,
          country: a.investorOrg?.countryOfIncorporation ?? null,
          submittedAt: a.submittedAt,
          createdAt: a.createdAt,
        },
        now,
      ),
    );
  }

  const actionInputs = actions.map((ra) => ({
    applicationId: ra.applicationId,
    type: ra.type,
    createdAt: ra.createdAt,
  }));
  const DECISION_LABELS: [string, string][] = [
    [ReviewActionType.SHORTLISTED, "TC shortlisted"],
    [ReviewActionType.NOT_SHORTLISTED, "TC not shortlisted"],
    [ReviewActionType.LAC_APPROVED, "LAC approved"],
    [ReviewActionType.LAC_REJECTED, "LAC rejected"],
    [ReviewActionType.ALLOCATED, "ExCo allocated"],
  ];
  const decisions: BreakdownRow[] = DECISION_LABELS.map(([type, label]) => ({
    label,
    count: actionInputs.filter((a) => a.type === type).length,
  })).filter((d) => d.count > 0);

  return {
    generatedAt: formatDateTime(now),
    stats: {
      total: apps.length,
      submitted,
      inReview,
      decided,
      clarifications: actionInputs.filter((a) => a.type === ReviewActionType.REQUESTED_CLARIFICATION).length,
    },
    byStatus: countRowsBy(rows as unknown as Record<string, unknown>[], "stage", 13),
    decisions,
    stageDurations: computeStageDurations(
      apps.map((a) => ({ id: a.id, submittedAt: a.submittedAt })),
      actionInputs,
    ),
    rows,
  };
}

export type PaymentsReport = {
  generatedAt: string;
  stats: {
    confirmedCount: number;
    feesCollected: string;
    pendingCount: number;
    proofUploadedCount: number;
    agingOver7: number;
    avgLagDays: number | null;
  };
  methodSplit: BreakdownRow[];
  weeklyConfirmed: number[];
  rows: PaymentReportRow[];
};

export async function getPaymentsReportData(now: Date = new Date()): Promise<PaymentsReport> {
  const payments = await Payment.findAll({
    attributes: ["id", "amount", "currency", "method", "status", "createdAt", "confirmedAt"],
    include: [
      {
        model: Application,
        attributes: ["reference"],
        include: [{ model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] }],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: 500,
  });

  const rows: PaymentReportRow[] = [];
  const confirmedDates: (Date | string | null)[] = [];
  let confirmedCount = 0;
  let confirmedTotal = 0;
  let pendingCount = 0;
  let proofUploadedCount = 0;
  let agingOver7 = 0;
  let currency = "USD";
  const lags: number[] = [];
  const WEEK7 = now.getTime() - 7 * 86_400_000;

  for (const row of payments) {
    const p = row as Payment & { Application?: Application & { investorOrg?: InvestorOrg } };
    const r = toPaymentReportRow({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      status: p.status,
      createdAt: p.createdAt,
      confirmedAt: p.confirmedAt,
      orgName: p.Application?.investorOrg?.legalName ?? null,
      reference: p.Application?.reference ?? null,
    });
    rows.push(r);
    if (p.status === PaymentStatus.CONFIRMED) {
      confirmedCount++;
      confirmedTotal += Number(p.amount);
      currency = p.currency;
      confirmedDates.push(p.confirmedAt ?? p.createdAt);
      if (r.lagDays != null) lags.push(r.lagDays);
    } else if (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.PROOF_UPLOADED) {
      pendingCount++;
      if (p.status === PaymentStatus.PROOF_UPLOADED) proofUploadedCount++;
      if (new Date(p.createdAt).getTime() < WEEK7) agingOver7++;
    }
  }

  const avgLagDays =
    lags.length === 0 ? null : Math.round((lags.reduce((a, b) => a + b, 0) / lags.length) * 10) / 10;

  return {
    generatedAt: formatDateTime(now),
    stats: {
      confirmedCount,
      feesCollected: formatMoney(confirmedTotal, currency),
      pendingCount,
      proofUploadedCount,
      agingOver7,
      avgLagDays,
    },
    methodSplit: countRowsBy(rows as unknown as Record<string, unknown>[], "method", 4),
    weeklyConfirmed: bucketWeekly(confirmedDates, now),
    rows,
  };
}

export type EngagementReport = {
  generatedAt: string;
  stats: {
    totalVisits: number;
    newVisits: number;
    scheduledVisits: number;
    completedVisits: number;
    totalInquiries: number;
    openInquiries: number;
    respondedInquiries: number;
    signups: number;
  };
  visitsByZone: BreakdownRow[];
  visitsByLandUse: BreakdownRow[];
  visitsByStatus: BreakdownRow[];
  inquiriesByChannel: BreakdownRow[];
  visits: SiteVisitRow[];
  inquiries: InquiryRow[];
};

export async function getEngagementReportData(now: Date = new Date()): Promise<EngagementReport> {
  const [sv, iq] = await Promise.all([getSiteVisitsView(), getInquiriesView()]);
  const visits = sv.bookings;
  const inquiries = iq.inquiries;

  return {
    generatedAt: formatDateTime(now),
    stats: {
      totalVisits: visits.length,
      newVisits: sv.newCount,
      scheduledVisits: sv.scheduledCount,
      completedVisits: visits.filter((b) => b.rawStatus === "COMPLETED").length,
      totalInquiries: inquiries.length,
      openInquiries: iq.newCount,
      respondedInquiries: inquiries.filter((i) => i.rawStatus === InquiryStatus.RESPONDED).length,
      signups: iq.signups.length,
    },
    visitsByZone: countRowsBy(visits as unknown as Record<string, unknown>[], "zone", 6),
    visitsByLandUse: countRowsBy(visits as unknown as Record<string, unknown>[], "landUse", 8),
    visitsByStatus: countRowsBy(visits as unknown as Record<string, unknown>[], "status", 4),
    inquiriesByChannel: countRowsBy(inquiries as unknown as Record<string, unknown>[], "channel", 2),
    visits,
    inquiries,
  };
}

export type OverviewReport = {
  generatedAt: string;
  windowName: string;
  stats: {
    investors: number;
    eoisSubmitted: number;
    feesCollected: string;
    siteVisits: number;
    openInquiries: number;
    daysToClose: number | null;
  };
  trends: { registrations: number[]; submissions: number[]; payments: number[] };
  funnel: FunnelRow[];
};

export async function getOverviewReportData(now: Date = new Date()): Promise<OverviewReport> {
  const [
    investorCreated,
    submittedApps,
    confirmedPayments,
    shortlistedCount,
    allocatedCount,
    confirmedAmountSum,
    dominantCurrencyRow,
    activeWindow,
    siteVisits,
    openInquiries,
  ] = await Promise.all([
    User.findAll({ where: { role: UserRole.INVESTOR }, attributes: ["createdAt"] }),
    Application.findAll({ where: { status: [...SUBMITTED_STATUSES] }, attributes: ["submittedAt", "createdAt"] }),
    Payment.findAll({ where: { status: PaymentStatus.CONFIRMED }, attributes: ["confirmedAt", "createdAt"] }),
    Application.count({ where: { status: SHORTLISTED_PLUS_STATUSES } }),
    Application.count({ where: { status: ApplicationStatus.ALLOCATED } }),
    Payment.sum("amount", { where: { status: PaymentStatus.CONFIRMED } }),
    Payment.findOne({
      where: { status: PaymentStatus.CONFIRMED },
      attributes: ["currency"],
      order: [["createdAt", "ASC"]],
    }),
    ApplicationWindow.findOne({
      where: { status: ApplicationWindowStatus.OPEN },
      order: [["openAt", "DESC"]],
    }),
    SiteVisitBooking.count(),
    Inquiry.count({ where: { status: InquiryStatus.NEW } }),
  ]);

  const investors = investorCreated.length;
  const eoisSubmitted = submittedApps.length;
  const paymentsConfirmed = confirmedPayments.length;
  const currency = dominantCurrencyRow?.currency ?? "USD";
  const daysToClose = activeWindow
    ? Math.max(0, Math.floor((new Date(activeWindow.closeAt).getTime() - now.getTime()) / 86_400_000))
    : null;

  const funnel: FunnelRow[] = [
    { label: "Registered", count: investors },
    { label: "Payment confirmed", count: paymentsConfirmed },
    { label: "EOI submitted", count: eoisSubmitted },
    { label: "Shortlisted", count: shortlistedCount },
    { label: "Allocated", count: allocatedCount },
  ].map((r) => ({ ...r, pct: investors > 0 ? Math.round((r.count / investors) * 100) : 0 }));

  return {
    generatedAt: formatDateTime(now),
    windowName: activeWindow?.name ?? "",
    stats: {
      investors,
      eoisSubmitted,
      feesCollected: formatMoney(confirmedAmountSum ?? 0, currency),
      siteVisits,
      openInquiries,
      daysToClose,
    },
    trends: {
      registrations: bucketWeekly(investorCreated.map((u) => u.createdAt), now),
      submissions: bucketWeekly(submittedApps.map((a) => a.submittedAt ?? a.createdAt), now),
      payments: bucketWeekly(confirmedPayments.map((p) => p.confirmedAt ?? p.createdAt), now),
    },
    funnel,
  };
}

// ─── Application timeline (admin settings) ───────────────────────────────────

export async function listTimelineMilestones(
  now: Date = new Date(),
): Promise<TimelineMilestoneRow[]> {
  const rows = await TimelineMilestone.findAll({ order: [["position", "ASC"]] });
  const data = rows.map((m) => ({
    id: m.id,
    position: m.position,
    kind: m.kind,
    title: m.title,
    dateLabel: m.dateLabel,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    status: m.status,
  }));
  const items = computeTimeline(data, now);
  const activeId = items.find((i) => i.active)?.id ?? null;
  const effectiveById = new Map<string, string>(items.map((i) => [i.id, i.status as string]));
  return data.map((m) => toTimelineMilestoneRow(m, activeId, effectiveById.get(m.id) ?? "UPCOMING"));
}
