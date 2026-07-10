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
} from "@kip/db";
import { ApplicationWindowStatus, ReviewActionType, UserRole } from "@kip/shared";
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

// ─── Return types ─────────────────────────────────────────────────────────────

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
  } | null
  windowCloseAt: string | null
  windowName: string | null
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

export async function getInvestorDashboardData(userId: string): Promise<DashboardData> {
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

  const payment = app
    ? await Payment.findOne({
        where: { applicationId: app.id },
        order: [["createdAt", "DESC"]],
        attributes: ["id", "method", "status", "currency", "amount", "confirmedAt"],
      })
    : null;

  const org = (user as (User & { investorOrg?: InvestorOrg }) | null)?.investorOrg;
  const sections = (app as (Application & { sections?: ApplicationSection[] }) | null)?.sections ?? [];

  const sectionList = SECTION_ORDER.map((key) => ({
    key,
    label: SECTION_LABELS[key],
    complete:
      sections.some((s) => s.section === key && s.completedAt !== null) ?? false,
  }));

  return {
    orgName: org?.legalName ?? null,
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
        }
      : null,
    windowCloseAt: windowIsOpen ? activeWindow!.closeAt.toISOString() : null,
    windowName:    windowIsOpen ? activeWindow!.name : null,
  } satisfies DashboardData;
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

  const auditTrail: { time: string; text: string; actor: string }[] = [];

  if (payment?.paidAt) {
    auditTrail.push({ time: payment.paidAt.toISOString(), text: "Payment initiated", actor: "You" });
  }
  if (payment?.confirmedAt) {
    auditTrail.push({ time: payment.confirmedAt.toISOString(), text: "Payment confirmed", actor: "KIP Admin" });
  }
  if (app.submittedAt) {
    auditTrail.push({ time: app.submittedAt.toISOString(), text: "EOI submitted", actor: "You" });
  }

  for (const action of a.reviewActions) {
    const text = ACTION_TEXT[action.type as ReviewActionType];
    if (!text) continue;
    auditTrail.push({
      time:  action.createdAt!.toISOString(),
      text,
      actor: ACTOR_TEXT[action.actor.role as UserRole] ?? "KIP Admin",
    });
  }

  auditTrail.sort((x, y) => new Date(x.time).getTime() - new Date(y.time).getTime());

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
