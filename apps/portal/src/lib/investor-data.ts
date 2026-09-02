import "server-only";
import {
  User,
  InvestorOrg,
  Application,
  ApplicationSection,
  ApplicationWindow,
  Payment,
  ReviewAction,
  SiteVisitBooking,
  Document, ApplicationPlot,} from "@kip/db";
import {
  ApplicationWindowStatus,
  ReviewActionType,
  UserRole,
  COMPANY_TYPE_LABELS,
  BUSINESS_SECTOR_LABELS,
  type CompanyType,
  type BusinessSector,
} from "@kip/shared";
import type { StatusVariant } from "@/components/status-badge";

// ─── Section metadata ─────────────────────────────────────────────────────────

export const SECTION_ORDER = [
  "PRELIMINARY_INFO",
  "LAND_BUSINESS_PROFILE",
  "UTILITIES_INFRASTRUCTURE",
  "H3SE",
  "NATIONAL_CONTENT",
  "DECLARATION",
] as const;

export type SectionKey = (typeof SECTION_ORDER)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  PRELIMINARY_INFO:         "Preliminary Info",
  LAND_BUSINESS_PROFILE:    "Land & Business Profile",
  UTILITIES_INFRASTRUCTURE: "Utilities & Infrastructure",
  H3SE:                     "H3SE",
  NATIONAL_CONTENT:         "National Content",
  DECLARATION:              "Declaration",
};

// ─── Status → badge ───────────────────────────────────────────────────────────

export function statusBadgeProps(status: string): { variant: StatusVariant; label: string } {
  switch (status) {
    case "DRAFT_PAYMENT_PENDING":      return { variant: "payment-pending",  label: "Awaiting Payment" };
    case "DRAFT":                      return { variant: "eoi-draft",         label: "Draft" };
    case "SUBMITTED":                  return { variant: "eoi-submitted",     label: "Submitted" };
    case "UNDER_TC_REVIEW":            return { variant: "tc-in-progress",    label: "Under TC Review" };
    case "TC_CLARIFICATION_REQUESTED": return { variant: "status-pending",    label: "Clarification Needed" };
    case "SHORTLISTED":                return { variant: "tc-approved",       label: "Shortlisted" };
    case "NOT_SHORTLISTED":            return { variant: "tc-rejected",       label: "Not Shortlisted" };
    case "LAC_REVIEW":                 return { variant: "tc-in-progress",    label: "LAC Review" };
    case "LAC_APPROVED":               return { variant: "tc-approved",       label: "LAC Approved" };
    case "LAC_REJECTED":               return { variant: "tc-rejected",       label: "Rejected" };
    case "EXCO_REVIEW":                return { variant: "tc-in-progress",    label: "ExCo Review" };
    case "ALLOCATED":                  return { variant: "plot-allocated",    label: "Allocated" };
    case "WITHDRAWN":                  return { variant: "window-closed",     label: "Withdrawn" };
    default:                           return { variant: "eoi-draft",         label: status };
  }
}

// ─── Review action labels (investor-facing, anonymised) ──────────────────────

const ACTION_TEXT: Partial<Record<ReviewActionType, string>> = {
  [ReviewActionType.ASSIGNED]:               "Application assigned for review",
  [ReviewActionType.SHORTLISTED]:            "Shortlisted by Technical Committee",
  [ReviewActionType.NOT_SHORTLISTED]:        "Not shortlisted by Technical Committee",
  [ReviewActionType.LAC_APPROVED]:           "Approved by Land Allocation Committee",
  [ReviewActionType.LAC_REJECTED]:           "Rejected by Land Allocation Committee",
  [ReviewActionType.ALLOCATED]:              "Land plot allocated — welcome to KIP",
  [ReviewActionType.REQUESTED_CLARIFICATION]: "Clarification requested",
  [ReviewActionType.CLARIFICATION_PROVIDED]: "Clarification submitted",
};

const ACTOR_TEXT: Partial<Record<UserRole, string>> = {
  [UserRole.TC_MEMBER]:   "TC Committee",
  [UserRole.TC_CHAIR]:    "TC Committee",
  [UserRole.LAC_MEMBER]:  "LAC Committee",
  [UserRole.EXCO_MEMBER]: "ExCo",
  [UserRole.ADMIN]:       "KIP Admin",
  [UserRole.INVESTOR]:    "You",
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

export type ActivityItem = { time: string; text: string; actor: string };

/**
 * Build the investor-facing, anonymised audit trail from a loaded application's
 * payment + review actions. Chronological (oldest → newest). Shared by the
 * dashboard "Recent Activity" feed and the full application-detail page so the
 * two never diverge.
 */
function buildAuditTrail(
  reviewActions: (ReviewAction & { actor: User })[],
  payment: Payment | null,
  submittedAt: Date | null,
): ActivityItem[] {
  const trail: ActivityItem[] = [];

  if (payment?.paidAt) {
    trail.push({ time: payment.paidAt.toISOString(), text: "Payment initiated", actor: "You" });
  }
  if (payment?.confirmedAt) {
    trail.push({ time: payment.confirmedAt.toISOString(), text: "Payment confirmed", actor: "KIP Admin" });
  }
  if (submittedAt) {
    trail.push({ time: submittedAt.toISOString(), text: "EOI submitted", actor: "You" });
  }
  for (const action of reviewActions) {
    const text = ACTION_TEXT[action.type as ReviewActionType];
    if (!text) continue;
    trail.push({
      time:  action.createdAt!.toISOString(),
      text,
      actor: ACTOR_TEXT[action.actor.role as UserRole] ?? "KIP Admin",
    });
  }

  trail.sort((x, y) => new Date(x.time).getTime() - new Date(y.time).getTime());
  return trail;
}

// ─── Return types ─────────────────────────────────────────────────────────────

export type DocumentItem = {
  id: string
  kind: string
  filename: string
  sizeBytes: number
  uploadedAt: string
}

export type DashboardData = {
  orgName: string | null
  application: {
    id: string
    reference: string | null
    status: string
    lotReference: string
    submittedAt: string | null
    sections: { key: SectionKey; label: string; complete: boolean }[]
    paymentStatus: string | null
    paymentMethod: string | null
    paymentCurrency: string | null
    paymentAmount: string | null
    paymentConfirmedAt: string | null
    plotCount: number
  } | null
  recentActivity: ActivityItem[]
  documents: DocumentItem[]
  windowCloseAt: string | null
  windowName: string | null
  /** True while the investor is still on the auto-generated password. */
  mustChangePassword: boolean
}

/** Lightweight per-application summary for the dashboard switcher / list. */
export type ApplicationSummary = {
  id: string
  reference: string | null
  createdAt: string
  status: string
  submittedAt: string | null
  completedCount: number
  totalSections: number
  /** 1-based index of the first incomplete section (for the resume link). */
  nextSectionNum: number
  plotCount: number
  paymentStatus: string | null
}

export type ApplicationDetail = {
  reference: string | null
  status: string
  lotReference: string
  orgName: string
  submittedAt: string | null
  sections: { key: SectionKey; label: string; complete: boolean }[]
  payment: {
    method: string
    status: string
    currency: string
    amount: string
    transferRef: string | null
    gatewayRef: string | null
    confirmedAt: string | null
  } | null
  auditTrail: { time: string; text: string; actor: string }[]
}

export type SiteVisitBookingView = {
  id: string
  zone: string
  landUse: string
  description: string
  acres: number
  status: string
  scheduledAt: string | null
  createdAt: string
}

/** Badge variant for a site-visit booking status. */
export function siteVisitBadgeProps(status: string): { variant: StatusVariant; label: string } {
  switch (status) {
    case "NEW":       return { variant: "status-pending",  label: "Awaiting Scheduling" };
    case "SCHEDULED": return { variant: "window-active",   label: "Visit Scheduled" };
    case "COMPLETED": return { variant: "tc-approved",     label: "Visit Completed" };
    case "CANCELLED": return { variant: "window-closed",   label: "Cancelled" };
    default:          return { variant: "eoi-draft",       label: status };
  }
}

/**
 * The investor's most recent site-visit request, if any. Reads go direct to
 * the DB; the booking itself is created through the Express API.
 */
export async function getSiteVisitBooking(userId: string): Promise<SiteVisitBookingView | null> {
  const booking = await SiteVisitBooking.findOne({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
  if (!booking) return null;

  return {
    id: booking.id,
    zone: booking.zone,
    landUse: booking.landUse,
    description: booking.description,
    acres: booking.acres,
    status: booking.status,
    scheduledAt: booking.scheduledAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
  };
}

// ─── Dashboard data ───────────────────────────────────────────────────────────

export async function getInvestorDashboardData(
  userId: string,
  applicationId?: string,
): Promise<DashboardData> {
  const [user, activeWindow] = await Promise.all([
    User.findByPk(userId, {
      include: [{ model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] }],
    }),
    ApplicationWindow.findOne({
      where: { status: ApplicationWindowStatus.OPEN },
      order: [["openAt", "DESC"]],
      attributes: ["name", "openAt", "closeAt"],
    }),
  ]);

  // A window is only actually open for applications when `now` is inside its
  // range — status OPEN alone is not enough (a stale window can be past its
  // closeAt). Treating an out-of-range window as open renders the EOI journey
  // prematurely and shows a negative-days countdown.
  const now = new Date();
  const windowIsOpen =
    activeWindow != null &&
    now >= activeWindow.openAt &&
    now <= activeWindow.closeAt;

  const app = await Application.findOne({
    // A specific application when asked for (owner-scoped so a foreign id can't
    // be selected); otherwise the most recent one.
    where: applicationId
      ? { id: applicationId, ownerUserId: userId }
      : { ownerUserId: userId },
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: ApplicationSection,
        as: "sections",
        attributes: ["section", "completedAt"],
      },
      {
        model: ReviewAction,
        as: "reviewActions",
        include: [{ model: User, as: "actor", attributes: ["role"] }],
      },
      // Falls back for a preview actor (ADMIN), whose own User row carries no
      // `investorOrgId` — their org hangs off the application instead.
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] },
    ],
  });

  // Payment + documents both hang off the application; fetch them together.
  const [payment, documents, plotCount] = app
    ? await Promise.all([
        Payment.findOne({
          where: { applicationId: app.id },
          order: [["createdAt", "DESC"]],
        }),
        Document.findAll({
          where: { applicationId: app.id },
          order: [["uploadedAt", "DESC"]],
        }),
        ApplicationPlot.count({ where: { applicationId: app.id } }),
      ])
    : [null, [] as Document[], 0];

  const org = (user as (User & { investorOrg?: InvestorOrg }) | null)?.investorOrg;
  const appWith = app as (Application & {
    sections?: ApplicationSection[];
    reviewActions?: (ReviewAction & { actor: User })[];
    investorOrg?: InvestorOrg;
  }) | null;
  const sections = appWith?.sections ?? [];

  const sectionList = SECTION_ORDER.map((key) => ({
    key,
    label: SECTION_LABELS[key],
    complete:
      sections.some((s) => s.section === key && s.completedAt !== null) ?? false,
  }));

  const recentActivity = app
    ? buildAuditTrail(appWith?.reviewActions ?? [], payment, app.submittedAt ?? null)
    : [];

  return {
    orgName: org?.legalName ?? appWith?.investorOrg?.legalName ?? null,
    application: app
      ? {
          id: app.id,
          reference: app.reference,
          status: app.status,
          lotReference: app.lotReference,
          submittedAt: app.submittedAt?.toISOString() ?? null,
          sections: sectionList,
          paymentStatus:      payment?.status ?? null,
          paymentMethod:      payment?.method ?? null,
          paymentCurrency:    payment?.currency ?? null,
          paymentAmount:      payment ? String(payment.amount) : null,
          paymentConfirmedAt: payment?.confirmedAt?.toISOString() ?? null,
          plotCount: plotCount ?? 0,
        }
      : null,
    recentActivity,
    documents: documents.map((d) => ({
      id: d.id,
      kind: d.kind,
      filename: d.filename,
      sizeBytes: d.sizeBytes,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    windowCloseAt: windowIsOpen ? activeWindow!.closeAt.toISOString() : null,
    windowName:    windowIsOpen ? activeWindow!.name : null,
    mustChangePassword: user ? user.passwordChangedAt == null : false,
  } satisfies DashboardData;
}

/**
 * Every application this investor owns, newest first, as compact summaries for
 * the dashboard switcher and the "your applications" list. Withdrawn ones are
 * excluded — they are not resumable.
 */
export async function listInvestorApplications(
  userId: string,
): Promise<ApplicationSummary[]> {
  // Withdrawn applications aren't resumable, so they're filtered out. (Done in
  // JS rather than a Sequelize `ne` operator to avoid importing sequelize's `Op`
  // into the portal, which doesn't depend on sequelize directly.)
  const allApps = await Application.findAll({
    where: { ownerUserId: userId },
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: ApplicationSection,
        as: "sections",
        attributes: ["section", "completedAt"],
      },
    ],
  });
  const apps = allApps.filter((a) => a.status !== "WITHDRAWN");

  const totalSections = SECTION_ORDER.length;

  const [payments, plotRows] = await Promise.all([
    Payment.findAll({
      where: { applicationId: apps.map((a) => a.id) },
      order: [["createdAt", "DESC"]],
      attributes: ["applicationId", "status", "createdAt"],
    }),
    ApplicationPlot.findAll({
      where: { applicationId: apps.map((a) => a.id) },
      attributes: ["applicationId"],
    }),
  ]);
  // Newest payment status per application (rows already sorted newest first).
  const paymentByApp = new Map<string, string>();
  for (const pmt of payments) {
    if (!paymentByApp.has(pmt.applicationId)) {
      paymentByApp.set(pmt.applicationId, pmt.status);
    }
  }
  const plotCountByApp = new Map<string, number>();
  for (const row of plotRows) {
    plotCountByApp.set(
      row.applicationId,
      (plotCountByApp.get(row.applicationId) ?? 0) + 1,
    );
  }

  return apps.map((app) => {
    const sections =
      (app as Application & { sections?: ApplicationSection[] }).sections ?? [];
    const completedKeys = new Set<string>(
      sections
        .filter((sc) => sc.completedAt != null)
        .map((sc) => String(sc.section)),
    );
    const firstIncompleteIdx = SECTION_ORDER.findIndex(
      (key) => !completedKeys.has(key),
    );
    return {
      id: app.id,
      reference: app.reference,
      status: app.status,
      createdAt: app.createdAt.toISOString(),
      submittedAt: app.submittedAt?.toISOString() ?? null,
      completedCount: completedKeys.size,
      totalSections,
      nextSectionNum: firstIncompleteIdx >= 0 ? firstIncompleteIdx + 1 : 1,
      plotCount: plotCountByApp.get(app.id) ?? 0,
      paymentStatus: paymentByApp.get(app.id) ?? null,
    } satisfies ApplicationSummary;
  });
}

// ─── Application detail ───────────────────────────────────────────────────────

export async function getApplicationDetail(userId: string, ref: string): Promise<ApplicationDetail | null> {
  const app = await Application.findOne({
    where: { reference: ref },
    include: [
      { model: InvestorOrg, as: "investorOrg", attributes: ["legalName"] },
      { model: ApplicationSection, as: "sections", attributes: ["section", "completedAt"] },
      {
        model: ReviewAction,
        as: "reviewActions",
        include: [{ model: User, as: "actor", attributes: ["role"] }],
        order: [["createdAt", "ASC"]],
      },
    ],
  });

  if (!app || app.ownerUserId !== userId) return null;

  const payment = await Payment.findOne({
    where: { applicationId: app.id },
    order: [["createdAt", "DESC"]],
  });

  type AppWithIncludes = Application & {
    investorOrg?: InvestorOrg;
    sections: ApplicationSection[];
    reviewActions: (ReviewAction & { actor: User })[];
  };

  const a = app as AppWithIncludes;

  const auditTrail = buildAuditTrail(a.reviewActions, payment, app.submittedAt ?? null);

  return {
    reference:   app.reference,
    status:      app.status,
    lotReference: app.lotReference,
    orgName:     a.investorOrg?.legalName ?? "—",
    submittedAt: app.submittedAt?.toISOString() ?? null,
    sections: SECTION_ORDER.map((key) => ({
      key,
      label:    SECTION_LABELS[key],
      complete: a.sections.some((s) => s.section === key && s.completedAt !== null),
    })),
    payment: payment
      ? {
          method:      String(payment.method),
          status:      String(payment.status),
          currency:    String(payment.currency),
          amount:      String(payment.amount),
          transferRef: payment.transferRef ?? null,
          gatewayRef:  payment.gatewayRef ?? null,
          confirmedAt: payment.confirmedAt?.toISOString() ?? null,
        }
      : null,
    auditTrail,
  };
}

// ─── Investor profile (settings) ──────────────────────────────────────────────

export type InvestorProfile = {
  name: string
  email: string
  designation: string | null
  phone: string | null
  role: string
  memberSince: string
  passwordChangedAt: string | null
  org: {
    legalName: string
    tradingName: string | null
    registrationNumber: string | null
    ursbRegistrationNumber: string | null
    companyType: string | null
    companyTypeLabel: string | null
    businessSector: string | null
    businessSectorLabel: string | null
    countryOfIncorporation: string | null
    tin: string | null
    address: string | null
    phone: string | null
    email: string | null
  } | null
}

/** The signed-in investor's own account + company profile, for the settings page. */
export async function getInvestorProfile(userId: string): Promise<InvestorProfile | null> {
  const user = await User.findByPk(userId, {
    include: [{ model: InvestorOrg, as: "investorOrg" }],
  });
  if (!user) return null;

  const org = (user as User & { investorOrg?: InvestorOrg }).investorOrg;

  return {
    name: user.name ?? "",
    email: user.email,
    designation: user.designation ?? null,
    phone: user.phone ?? null,
    role: user.role,
    memberSince: user.createdAt.toISOString(),
    passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
    org: org
      ? {
          legalName: org.legalName,
          tradingName: org.tradingName ?? null,
          registrationNumber: org.registrationNumber ?? null,
          ursbRegistrationNumber: org.ursbRegistrationNumber ?? null,
          companyType: org.companyType ?? null,
          companyTypeLabel: org.companyType
            ? COMPANY_TYPE_LABELS[org.companyType as CompanyType] ?? org.companyType
            : null,
          businessSector: org.businessSector ?? null,
          businessSectorLabel: org.businessSector
            ? BUSINESS_SECTOR_LABELS[org.businessSector as BusinessSector] ?? org.businessSector
            : null,
          countryOfIncorporation: org.countryOfIncorporation ?? null,
          tin: org.tin ?? null,
          address: org.address ?? null,
          phone: org.phone ?? null,
          email: org.email ?? null,
        }
      : null,
  };
}
